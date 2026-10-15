import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import type {State} from '../shared/types.js';
export interface KeyCodec {kind:string; encrypt?:(value:string)=>Buffer; decrypt?:(value:Buffer)=>string}
export class Store {
  state:State={schemaVersion:1,projects:[],providers:[],audits:[],rewrites:[],monitors:[],runs:[],settings:{enginePath:'',browserPath:''}};
  private keys=new Map<string,string>(); private encrypted:Record<string,string>={}; private pending=Promise.resolve(); private keyPending=Promise.resolve();
  constructor(public dir:string,public codec:KeyCodec={kind:'session-only'}){}
  async init(){
    await mkdir(this.dir,{recursive:true,mode:0o700});
    try{const parsed=JSON.parse(await readFile(path.join(this.dir,'state.json'),'utf8'));if(parsed.schemaVersion!==1)throw Error('不支持的数据版本');this.state=parsed;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    try{this.encrypted=JSON.parse(await readFile(path.join(this.dir,'keys.json'),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    for(const a of this.state.audits)if(a.status==='running'){a.status='failed';a.error='应用上次退出时任务中断，请重新诊断';}
    for(const r of this.state.runs)if(r.status==='running'){r.status='failed';r.error='应用退出导致采样中断';}
    await this.save();
  }
  async save(){const text=JSON.stringify(this.state,null,2);this.pending=this.pending.catch(()=>{}).then(()=>this.atomic('state.json',text));await this.pending;}
  private async atomic(name:string,text:string){const target=path.join(this.dir,name);const tmp=target+'.tmp';await writeFile(tmp,text,{mode:0o600});await rename(tmp,target);}
  async setKey(id:string,key:string){this.keyPending=this.keyPending.catch(()=>{}).then(async()=>{if(this.codec.encrypt){const next={...this.encrypted,[id]:this.codec.encrypt(key).toString('base64')};await this.atomic('keys.json',JSON.stringify(next));this.encrypted=next;}this.keys.set(id,key);});await this.keyPending;}
  key(id:string){if(this.keys.has(id))return this.keys.get(id)!;if(this.encrypted[id]&&this.codec.decrypt){try{return this.codec.decrypt(Buffer.from(this.encrypted[id],'base64'));}catch{throw Error('无法解密密钥，请重新填写');}}return '';}
  async deleteKey(id:string){this.keyPending=this.keyPending.catch(()=>{}).then(async()=>{const next={...this.encrypted};delete next[id];await this.atomic('keys.json',JSON.stringify(next));this.encrypted=next;this.keys.delete(id);});await this.keyPending;}
  publicState():State {const state=structuredClone(this.state);state.providers=state.providers.map(p=>{let hasKey=false;try{hasKey=!!this.key(p.id);}catch{/* Settings must remain available to replace an unreadable key. */}return {...p,hasKey,keyStorage:this.codec.kind};});return state;}
}
