import {createServer} from 'node:http';
import path from 'node:path';
import {Store} from '../src/core/store.js';
import {ComponentManager} from '../src/core/components.js';
import {Service} from '../src/core/service.js';
export async function startPreview(port=4319,dir=path.resolve('.data'),allowPrivateForTests=false){
 const store=new Store(dir);await store.init();const service=new Service(store,new ComponentManager(process.cwd(),path.resolve('resources')), {allowPrivateForTests});
 const server=createServer(async(req,res)=>{
  const origin=req.headers.origin;if(origin&&!['http://127.0.0.1:5173','http://localhost:5173'].includes(origin)){res.writeHead(403);res.end();return;}
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'||req.url!=='/api'){res.writeHead(404);res.end('{}');return;}
  let body='';try{for await(const b of req){body+=b;if(body.length>300000)throw Error('请求过大');}const {action,payload}=JSON.parse(body);const data=await service.request(action,payload);res.end(JSON.stringify({ok:true,data}));}catch(e){res.writeHead(400);res.end(JSON.stringify({ok:false,error:e instanceof Error?e.message:'请求失败'}));}
 });await new Promise<void>(resolve=>server.listen(port,'127.0.0.1',resolve));const timer=setInterval(()=>void service.tick(),30000);timer.unref();
 return {server,service,close:()=>{clearInterval(timer);service.stop();server.close();}};
}
if(process.argv[1]?.endsWith('preview.ts')){await startPreview();console.log('本地开发 API: http://127.0.0.1:4319（密钥仅会话保存）');}
