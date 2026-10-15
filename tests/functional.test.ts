import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,access,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {Store} from '../src/core/store.js';
import {Service} from '../src/core/service.js';
import {ComponentManager} from '../src/core/components.js';
import {Auditor} from '../src/core/audit.js';
import type {Audit} from '../src/shared/types.js';

test('真实 Chromium 对照能采集脚本生成的中文正文',{timeout:90000},async(t)=>{
 const x=await setup();let server:ReturnType<typeof createServer>|undefined;
 try{if(!await x.components.browser()){t.skip('环境未安装 Chromium');return;}
 server=createServer((req,res)=>{if(req.url==='/robots.txt'){res.setHeader('Content-Type','text/plain');res.end('User-agent: *\nDisallow:\n');return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html lang="zh"><head><title>脚本渲染验收</title></head><body><div id="app"></div><script>document.getElementById("app").innerHTML="<h1>渲染后的产品指南</h1><p>这段正文由浏览器执行脚本后生成，原始页面中没有可见正文。</p>";</script></body></html>');});
 await new Promise<void>(r=>server!.listen(0,'127.0.0.1',r));const audit={id:pid,projectId:pid,status:'running',options:{limit:1,render:true},pages:[],findings:[],log:''} as unknown as Audit;
 await new Auditor(x.components,x.dir,true).run(audit,`http://127.0.0.1:${(server.address() as {port:number}).port}/`,{enginePath:'',browserPath:''},new AbortController().signal,async()=>{});
 assert.equal(audit.status,'completed');assert.ok(audit.pages[0].renderedMarkdown?.includes('渲染后的产品指南'));assert.ok(!audit.pages[0].markdown.includes('渲染后的产品指南'));
 }finally{server?.closeAllConnections();if(server)await new Promise<void>(r=>server!.close(()=>r()));await rm(x.dir,{recursive:true,force:true});}
});

const pid='11111111-1111-4111-8111-111111111111';
const codec={kind:'test-codec',encrypt:(s:string)=>Buffer.from(s),decrypt:(b:Buffer)=>b.toString()};
async function setup(){const dir=await mkdtemp(path.join(os.tmpdir(),'geo-functional-'));const store=new Store(dir);await store.init();const components=new ComponentManager(process.cwd(),path.resolve('resources'));return{dir,store,components,service:new Service(store,components)};}
const provider={id:pid,name:'受控提供商',protocol:'openai-responses',baseUrl:'https://fixture.invalid/v1',model:'fixture-model',key:'fixture-key-not-a-real-credential'};

test('密钥解密失败仍能打开设置并重新填写',async()=>{const x=await setup();try{await x.service.request('provider.save',provider);x.store.codec=codec;await x.store.setKey(pid,'fixture-value');const next=new Store(x.dir,{kind:'test-codec',decrypt:()=>{throw Error('simulated unavailable keychain');}});await next.init();let state;assert.doesNotThrow(()=>{state=next.publicState();});assert.equal(state!.providers[0].hasKey,false);next.codec=codec;await next.setKey(pid,"replacement-fixture");assert.equal(next.publicState().providers[0].hasKey,true);const restored=new Store(x.dir,codec);await restored.init();assert.equal(restored.key(pid),"replacement-fixture");}finally{await rm(x.dir,{recursive:true,force:true});}});
test('并发保存两份密钥不会丢失或因临时文件重命名失败',async()=>{const x=await setup();try{x.store.codec=codec;const r=await Promise.allSettled([x.store.setKey('a','first-fixture'),x.store.setKey('b','second-fixture')]);assert.equal(r.filter(r=>r.status==='fulfilled').length,2);const next=new Store(x.dir,codec);await next.init();assert.equal(next.key('a'),'first-fixture');assert.equal(next.key('b'),'second-fixture');}finally{await rm(x.dir,{recursive:true,force:true});}});
test('并发启动诊断只能接受一项任务',{timeout:10000},async()=>{const server=createServer((_req,res)=>setTimeout(()=>res.end(''),60));await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const x=await setup();const service=new Service(x.store,x.components,{allowPrivateForTests:true});try{const project=await service.request('project.create',{name:'启动并发',url:`http://127.0.0.1:${(server.address() as {port:number}).port}/`});
 (service as any).auditor={run:async(a:Audit,_u:unknown,_s:unknown,signal:AbortSignal)=>new Promise<void>((resolve)=>{signal.addEventListener('abort',()=>{a.status='cancelled';resolve();},{once:true});})};
 const r=await Promise.allSettled([service.request('audit.start',{projectId:project.id,limit:1,render:false}),service.request('audit.start',{projectId:project.id,limit:1,render:false})]);assert.equal(r.filter(r=>r.status==='fulfilled').length,1);
}finally{service.stop();await new Promise(r=>setTimeout(r,30));server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(x.dir,{recursive:true,force:true});}});
test('删除项目同时删除该项目采集的原始文件',async()=>{const x=await setup();try{const p=await x.service.request('project.create',{name:'删除验收',url:'https://example.com'});const a={id:pid,projectId:p.id,status:'completed'} as Audit;x.store.state.audits.push(a);const dir=path.join(x.dir,'audits',pid);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'raw.json'),'fixture');await x.service.request('project.delete',{id:p.id});await assert.rejects(access(dir));assert.equal(x.store.state.projects.length,0);}finally{await rm(x.dir,{recursive:true,force:true});}});
test('改写请求返回前删除项目，不产生孤立改写记录',async()=>{const x=await setup();let finish!:()=>void;const gate=new Promise<void>(r=>finish=r);const service=new Service(x.store,x.components,{transport:async()=>{await gate;return{status:200,url:'',headers:{},text:JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:'Fixture draft'}]}]})};}});try{const p=await service.request('project.create',{name:'晚返回验收',url:'https://example.com'});await service.request('provider.save',provider);const job=service.request('rewrite.run',{projectId:p.id,providerId:pid,source:'Original fixture',goal:'Clarify'});await service.request('project.delete',{id:p.id});finish();await assert.rejects(job,/项目不存在/);assert.equal(x.store.state.rewrites.length,0);}finally{finish?.();await rm(x.dir,{recursive:true,force:true});}});
test('robots 检查阶段取消不能被标记为完成',{timeout:60000},async()=>{const server=createServer((req,res)=>{if(req.url==='/robots.txt'){res.setHeader('Content-Type','text/plain');res.end('User-agent: *\nDisallow:\n');return;}res.setHeader('Content-Type','text/html');res.end('<html><head><title>Fixture</title></head><body><h1>Fixture</h1>Static content</body></html>');});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const x=await setup();const controller=new AbortController();try{x.components.parseRobots=async()=>{controller.abort();throw Error('cancelled');};const auditor=new Auditor(x.components,x.dir,true);const audit={id:pid,projectId:pid,status:'running',options:{limit:1,render:false},pages:[],findings:[],log:''} as unknown as Audit;
await assert.rejects(auditor.run(audit,`http://127.0.0.1:${(server.address() as {port:number}).port}/`,{enginePath:'',browserPath:''},controller.signal,async()=>{}));assert.notEqual(audit.status,'completed');
}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(x.dir,{recursive:true,force:true});}});
