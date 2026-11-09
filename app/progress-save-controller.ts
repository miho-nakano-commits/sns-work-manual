import type { SavedState } from "./progress";
import { stableProgress } from "./progress-protocol";
export type ProgressSaveResult={ok:boolean;status:number;revision?:string};
export class ProgressSaveController {
  private acknowledged:string;
  private pending:SavedState;
  private queue=Promise.resolve(true);
  private blocked=false;
  constructor(initial:SavedState,private revision:string,private transport:(value:SavedState,revision:string)=>Promise<ProgressSaveResult>,private draft:(value:SavedState,revision:string)=>void,private status:(value:"saved"|"saving"|"error",message:string)=>void){this.pending=initial;this.acknowledged=stableProgress(initial);}
  observe(value:SavedState){this.pending=value;}
  flush(){
    const snapshot=this.pending;const fingerprint=stableProgress(snapshot);
    if(fingerprint===this.acknowledged)return Promise.resolve(true);
    this.draft(snapshot,this.revision);
    if(this.blocked)return Promise.resolve(false);
    this.status("saving","");
    const request=this.queue.then(async()=>{
      if(this.blocked)return false;
      if(fingerprint===this.acknowledged)return true;
      try{
        const result=await this.transport(snapshot,this.revision);
        if(!result.ok||!result.revision){
          if([401,412,426,428].includes(result.status))this.blocked=true;
          this.status("error",[412,426,428].includes(result.status)?"別の画面の更新、または画面の版が変わりました。未保存の内容は端末に保管しています。画面を更新して確認してください。":"保存できませんでした。未保存の内容は端末に保管しています。");
          return false;
        }
        this.revision=result.revision;this.acknowledged=fingerprint;
        if(stableProgress(this.pending)===fingerprint)this.status("saved","");
        return true;
      }catch{this.status("error","通信できませんでした。未保存の内容は端末に保管しています。");return false;}
    });
    this.queue=request;return request;
  }
}
