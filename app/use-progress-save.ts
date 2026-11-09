"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeProgress, type SavedState } from "./progress";
import { PROGRESS_CLIENT, PROGRESS_CLIENT_HEADER, stableProgress } from "./progress-protocol";
import { ProgressSaveController } from "./progress-save-controller";
const draftKey=(id:string)=>`sns-manual-pending:${process.env.NEXT_PUBLIC_REVIEW_MODE==="true"?"review:":""}${id}`;
// Previously saved drafts remain on the device. Never silently submit an old
// device snapshot when opening a newer server record.
export function restoreDraft(_id:string,server:SavedState){return normalizeProgress(server);}
export type ProgressBaseline={progress:SavedState;revision:string};
export function useProgressSave(saved:SavedState,userId:string|undefined,enabled:boolean,baseline:ProgressBaseline|null){
 const [saveStatus,setSaveStatus]=useState<"saved"|"saving"|"error">("saved");
 const [saveError,setSaveError]=useState("");
 const [hasStoredDraft,setHasStoredDraft]=useState(false);
 const current=useRef({saved,enabled});current.current={saved,enabled};
 const controller=useMemo(()=>{
  if(!userId||!baseline)return null;
  const key=draftKey(userId);
  return new ProgressSaveController(normalizeProgress(baseline.progress),baseline.revision,async(snapshot,revision)=>{
   const response=await fetch("/api/progress",{method:"PUT",headers:{"Content-Type":"application/json",[PROGRESS_CLIENT_HEADER]:PROGRESS_CLIENT,"If-Match":revision},body:JSON.stringify(snapshot),keepalive:true});
   const result=await response.json() as {revision?:string};
   if(response.ok){try{const pending=JSON.parse(localStorage.getItem(key)||"null");if(pending&&stableProgress(pending.progress)===stableProgress(snapshot)){localStorage.removeItem(key);setHasStoredDraft(false);}}catch{/* Retain an unreadable draft. */}}
   return {ok:response.ok,status:response.status,revision:result.revision};
  },(snapshot,revision)=>{
   try{
    const previous=localStorage.getItem(key);
    if(previous){let old: {baseRevision?:string;client?:string};try{old=JSON.parse(previous);}catch{old={};}
     if(old.baseRevision!==revision||old.client!==PROGRESS_CLIENT)localStorage.setItem(key+":retained:"+Date.now(),previous);
    }
    localStorage.setItem(key,JSON.stringify({client:PROGRESS_CLIENT,baseRevision:revision,progress:snapshot}));setHasStoredDraft(true);
   }catch{/* Server errors are still shown if device storage is unavailable. */}
  },(status,message)=>{setSaveStatus(status);setSaveError(message);});
 },[userId,baseline?.revision]);
 useEffect(()=>{setSaveStatus("saved");setSaveError("");try{setHasStoredDraft(!!userId&&!!localStorage.getItem(draftKey(userId)));}catch{setHasStoredDraft(false);}},[userId,baseline?.revision]);
 const flush=useCallback(()=>{
  if(!controller||!current.current.enabled)return Promise.resolve(true);
  controller.observe(current.current.saved);return controller.flush();
 },[controller]);
 useEffect(()=>{if(enabled&&userId&&controller){controller.observe(saved);void controller.flush();}},[saved,userId,enabled,controller]);
 useEffect(()=>{const retry=()=>{void flush();};window.addEventListener("online",retry);return()=>window.removeEventListener("online",retry);},[flush]);
 return {saveStatus,flush,saveError,hasStoredDraft};
}
