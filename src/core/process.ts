import {spawn} from 'node:child_process';
export function runProcess(command:string,args:string[],options:{cwd?:string;input?:string;signal?:AbortSignal;timeout?:number;onLog?:(text:string)=>void}={}):Promise<{stdout:string;stderr:string}>{
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{cwd:options.cwd,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});let stdout='',stderr='',settled=false;
  const stop=()=>{if(!child.pid)return;if(process.platform==='win32')spawn('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true});else try{process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}};
  const abort=()=>{stop();finish(Error('任务已取消'));};
  const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);options.signal?.removeEventListener('abort',abort);error?reject(error):resolve({stdout,stderr});};
  const timer=setTimeout(()=>{stop();finish(Error('任务超时'));},options.timeout||180_000);
  options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted){abort();return;}
  child.stdout.on('data',(b:Buffer)=>{stdout+=b.toString();if(stdout.length>40_000_000){stop();finish(Error('组件输出过大'));}});
  child.stderr.on('data',(b:Buffer)=>{const text=b.toString();stderr=(stderr+text).slice(-16000);options.onLog?.(text);});
  child.on('error',()=>finish(Error('组件无法启动，请检查组件安装和路径')));child.on('close',code=>finish(code===0?undefined:Error('组件执行失败（'+code+'）'+(stderr?': '+stderr.slice(-600):''))));
  if(options.input)child.stdin.end(options.input);else child.stdin.end();
 });
}
