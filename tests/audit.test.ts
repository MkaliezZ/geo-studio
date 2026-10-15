import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/core/store.js';
import {ComponentManager} from '../src/core/components.js';
import {Service} from '../src/core/service.js';
import {runProcess} from '../src/core/process.js';
test('真实组件闭环：诊断→修改→复检，中文与 robots 证据正确',{timeout:90000},async()=>{
 let fixed=false;const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');if(req.url==='/robots.txt'){res.setHeader('Content-Type','text/plain');res.end('User-agent: *\nDisallow: /private/\n');return;}if(req.url==='/missing'){res.statusCode=404;res.end('Not found');return;}if(!fixed)res.setHeader('X-Robots-Tag','noindex');res.end(`<html lang="zh"><head><title>受控测试页面</title><meta name="description" content="测试网页"></head><body><h1>产品说明</h1><p>这段中文正文无需脚本即可读取。</p><a href="/missing">Missing</a><a href="/private/secret">Private</a></body></html>`);});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const dir=await mkdtemp(path.join(os.tmpdir(),'geo-audit-'));
 try{const store=new Store(dir);await store.init();const service=new Service(store,new ComponentManager(process.cwd(),path.resolve('resources')),{allowPrivateForTests:true});const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/`;
 const project=await service.request('project.create',{name:'真实组件测试',url});
 const run=async()=>{const {id}=await service.request('audit.start',{projectId:project.id,limit:10,render:false});for(let i=0;i<600;i++){const a=store.state.audits.find(a=>a.id===id)!;if(a.status!=='running')return a;await new Promise(r=>setTimeout(r,100));}throw Error('audit timeout');};
 const first=await run();assert.equal(first.status,'completed',first.error);assert.ok(first.findings.some(f=>f.rule==='noindex'&&f.status==='fail'));assert.ok(first.findings.some(f=>f.rule==='body'&&f.status==='pass'));assert.ok(first.pages.some(p=>p.status===404));assert.ok(!first.pages.some(p=>p.url.endsWith('/private/secret')));assert.ok(first.findings.some(f=>f.rule==='robots:OAI-SearchBot'&&f.status==='pass'));
 fixed=true;const second=await run();assert.equal(second.status,'completed',second.error);const diff=await service.request('audit.compare',{projectId:project.id});assert.ok(diff.resolved.some((f:{rule:string})=>f.rule==='noindex'));service.stop();
 }finally{await new Promise<void>(r=>server.close(()=>r()));await rm(dir,{recursive:true,force:true});}
});
test('取消任务会终止实际子进程',{timeout:6000},async()=>{const controller=new AbortController();const job=runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{signal:controller.signal});setTimeout(()=>controller.abort(),150);await assert.rejects(job,/取消/);});
