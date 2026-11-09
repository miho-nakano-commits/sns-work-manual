import { getD1, jsonError, requireUser } from "./server-auth";
import { normalizeProgress, parseJson, STEP4_CHECK_PREFIX, STEP4_CHECK_COUNT } from "./progress";
import { PROGRESS_CLIENT, PROGRESS_CLIENT_HEADER, stableProgress } from "./progress-protocol";

export type ProgressRow = { current_step: number; completed_steps: string; positions: string; checks: string; form_values: string; last_worked_step: number; updated_at: string | null };
const columns = ["current_step","completed_steps","positions","checks","form_values","last_worked_step","updated_at"] as const;
const select = "SELECT current_step, completed_steps, positions, checks, form_values, last_worked_step, updated_at FROM user_progress WHERE user_id = ?";
function rawState(row: ProgressRow | null) {
  return row ? { completed: parseJson(row.completed_steps, []), position: parseJson(row.positions), checks: parseJson(row.checks), form: parseJson(row.form_values), currentStep: row.current_step, lastWorkedStep: row.last_worked_step } : {completed:[],position:{},checks:{},form:{},currentStep:1,lastWorkedStep:1};
}
export async function progressRevision(userId: string, row: ProgressRow | null) {
  const bytes = new TextEncoder().encode(stableProgress({userId,row}));
  return '"' + Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("") + '"';
}
function compatibilityState(row: ProgressRow | null, body: Record<string,unknown>) {
  const raw=rawState(row);
  const record=(value:unknown):Record<string,unknown>=>value && typeof value==="object" && !Array.isArray(value)?value as Record<string,unknown>:{};
  const position={...record(raw.position)};
  for(const [key,value] of Object.entries(record(body.position)))if(/^[1-4]$/.test(key)&&typeof value==="number"&&Number.isInteger(value)&&value>=0)position[key]=value;
  const checks={...record(raw.checks)};
  for(const [key,value] of Object.entries(record(body.checks)))if((/^[1-4]-/.test(key)||key.startsWith("step3-analysis-v2-"))&&typeof value==="boolean")checks[key]=value;
  const form={...record(raw.form)};
  const incomingForm=record(body.form);if(typeof incomingForm.analysisSheetUrl==="string")form.analysisSheetUrl=incomingForm.analysisSheetUrl;
  const historical=Array.isArray(raw.completed)?raw.completed.filter((v):v is number=>Number.isInteger(v)&&v>=5):[];
  const basic=Array.isArray(body.completed)?body.completed.filter((v):v is number=>Number.isInteger(v)&&v>=1&&v<=4):[];
  const oldStep=(v:unknown)=>Math.min(4,Math.max(1,Math.trunc(Number(v)||1)));
  return {completed:[...new Set([...basic,...historical])],position,checks,form,
    currentStep:Number(raw.currentStep)>=5?Number(raw.currentStep):oldStep(body.currentStep),
    lastWorkedStep:Number(raw.lastWorkedStep)>=5?Number(raw.lastWorkedStep):oldStep(body.lastWorkedStep??body.currentStep)};
}

export function createProgressHandlers(compatibility=false) {
  async function GET() {
    try {
      const user=await requireUser();
      const row=await getD1().prepare(select).bind(user.id).first<ProgressRow>();
      const revision=await progressRevision(user.id,row);
      const progress=compatibility?rawState(row):normalizeProgress(rawState(row));
      return Response.json({progress:{...progress,updatedAt:row?.updated_at??null},revision,client:PROGRESS_CLIENT},{headers:{"Cache-Control":"private, no-store",ETag:revision}});
    }catch(error){return jsonError(error);}
  }
  async function PUT(request:Request) {
    try {
      const user=await requireUser();
      if(request.headers.get(PROGRESS_CLIENT_HEADER)!==PROGRESS_CLIENT)return Response.json({code:"CLIENT_UPDATE_REQUIRED",error:"画面を更新してください。古い画面からは進捗を保存できません。"},{status:426});
      const origin=request.headers.get("Origin");
      if((origin&&origin!==new URL(request.url).origin)||request.headers.get("Sec-Fetch-Site")==="cross-site")return Response.json({error:"この操作は利用できません"},{status:403});
      const expected=request.headers.get("If-Match");
      if(!expected)return Response.json({code:"REVISION_REQUIRED",error:"最新の進捗を読み込んでください。"},{status:428});
      const db=getD1();const row=await db.prepare(select).bind(user.id).first<ProgressRow>();
      const revision=await progressRevision(user.id,row);
      const conflict=()=>Response.json({code:"PROGRESS_CONFLICT",error:"別の画面で進捗が変わりました。未保存の内容は端末に保管しています。画面を更新して確認してください。"},{status:412,headers:{"Cache-Control":"no-store"}});
      if(expected!==revision)return conflict();
      const body=await request.json() as Record<string,unknown>;
      const state=compatibility?compatibilityState(row,body):normalizeProgress(body);
      if(!compatibility&&state.completed.includes(4)&&!Array.from({length:STEP4_CHECK_COUNT},(_,i)=>(state.checks as Record<string,unknown>)[`${STEP4_CHECK_PREFIX}-${i}`]===true).every(Boolean)){
        const previous=parseJson(row?.completed_steps,[]);
        if(!Array.isArray(previous)||!previous.includes(4))return Response.json({error:"STEP4のすべての項目を確認してください"},{status:400});
      }
      const payloads=[state.completed,state.position,state.checks,state.form].map(value=>JSON.stringify(value));
      if(payloads.some(value=>value.length>100_000))return Response.json({error:"保存内容が大きすぎます"},{status:413});
      // A no-op must not update timestamps or rewrite legacy serialization.
      if(row&&stableProgress(compatibility?rawState(row):normalizeProgress(rawState(row)))===stableProgress(state))return Response.json({ok:true,revision,unchanged:true,updatedAt:row.updated_at});
      const updatedAt=new Date().toISOString();
      const nextRow:ProgressRow={current_step:state.currentStep,completed_steps:payloads[0],positions:payloads[1],checks:payloads[2],form_values:payloads[3],last_worked_step:state.lastWorkedStep,updated_at:updatedAt};
      const values=columns.map(key=>nextRow[key]);
      const result=row
        ?await db.prepare(`UPDATE user_progress SET current_step=?, completed_steps=?, positions=?, checks=?, form_values=?, last_worked_step=?, updated_at=? WHERE user_id=? AND ${columns.map(key=>`${key} IS ?`).join(" AND ")}`).bind(...values,user.id,...columns.map(key=>row[key])).run()
        :await db.prepare("INSERT INTO user_progress (current_step,completed_steps,positions,checks,form_values,last_worked_step,updated_at,user_id) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO NOTHING").bind(...values,user.id).run();
      const changes=Number((result as unknown as {meta?:{changes?:number};changes?:number|bigint}).meta?.changes??(result as unknown as {changes?:number|bigint}).changes??0);
      if(changes!==1)return conflict();
      return Response.json({ok:true,revision:await progressRevision(user.id,nextRow),updatedAt});
    }catch(error){return jsonError(error);}
  }
  return {GET,PUT};
}
