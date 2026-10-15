import {access,constants} from 'node:fs/promises';
import path from 'node:path';
import {runProcess} from './process.js';
import type {Components} from '../shared/types.js';
export class ComponentManager {
 constructor(public root:string,public resourceRoot:string,public packaged=false){}
 get tag(){return process.platform+'-'+process.arch;}
 get binDir(){return path.join(this.resourceRoot,'bin',this.tag);}
 async exists(p:string){try{await access(p,constants.F_OK);return true;}catch{return false;}}
 async engine(custom=''){return custom||path.join(this.binDir,'siteone-crawler'+(process.platform==='win32'?'.exe':''));}
 async browser(custom=''){
  const candidates=[custom,process.env.GEO_CHROMIUM_PATH||'',...(process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']:process.platform==='win32'?[path.join(process.env.PROGRAMFILES||'C:\\Program Files','Google/Chrome/Application/chrome.exe'),path.join(process.env['PROGRAMFILES(X86)']||'C:\\Program Files (x86)','Microsoft/Edge/Application/msedge.exe')]:['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'])];
  for(const p of candidates)if(p&&await this.exists(p))return p;return '';
 }
 async robotsCommand():Promise<{command:string;args:string[]}>{
  const binary=path.join(this.binDir,'geo-robots'+(process.platform==='win32'?'.exe':''));if(await this.exists(binary))return{command:binary,args:[]};
  if(!this.packaged){const python=path.join(this.root,'.runtime','robots-env',process.platform==='win32'?'Scripts/python.exe':'bin/python');if(await this.exists(python))return{command:python,args:[path.join(this.resourceRoot,'robots_worker.py')]};}
  throw Error('robots 组件未安装，请安装组件后重试');
 }
 async parseRobots(text:string,urls:string[],bots:string[],signal?:AbortSignal):Promise<{url:string;bot:string;allowed:boolean}[]>{const c=await this.robotsCommand();
  // The packaged one-file Python sidecar extracts its runtime on each launch.
  // Cold starts measured 10–12 seconds locally and can exceed 15 seconds under load.
  const result=await runProcess(c.command,c.args,{input:JSON.stringify({text,urls,bots}),signal,timeout:45000});const parsed=JSON.parse(result.stdout);if(!Array.isArray(parsed))throw Error('robots 组件返回无效结果');return parsed;}
 async status(settings:{enginePath:string;browserPath:string},keyStorage:string):Promise<Components>{
  const engine=await this.engine(settings.enginePath);const browser=await this.browser(settings.browserPath);let robots={ready:false,path:''};try{const c=await this.robotsCommand();robots={ready:true,path:c.command};}catch{/* explicit missing */}
  return {engine:{ready:await this.exists(engine),path:engine,version:'2.5.1'},browser:{ready:!!browser,path:browser},robots,platform:this.tag,keyStorage};
 }
}
