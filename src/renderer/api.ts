import type {API} from '../shared/types';
export const api:API=window.geo||{async request<T>(action:string,payload:unknown={}){const r=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload})});const data=await r.json();if(!data.ok)throw Error(data.error||'请求失败');return data.data as T;}};
export function download(name:string,text:string,type='text/markdown;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function date(value?:string){return value?new Date(value).toLocaleString('zh-CN',{hour12:false}):'—';}
