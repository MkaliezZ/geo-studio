import https from 'node:https';
import http from 'node:http';
import dns from 'node:dns/promises';
import net from 'node:net';
export function isPrivateIp(ip:string):boolean{
 if(net.isIP(ip)===6)return !/^[23][0-9a-f]{3}:/i.test(ip);
 const p=ip.split('.').map(Number);return p.length!==4||p.some(n=>!Number.isInteger(n)||n<0||n>255)||p[0]===0||p[0]===10||p[0]===127||p[0]>=224||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&(p[1]===168||p[1]===0))||(p[0]===100&&p[1]>=64&&p[1]<=127)||(p[0]===198&&(p[1]===18||p[1]===19));
}
export function validateUrl(value:string,httpsOnly=false){const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||(httpsOnly&&u.protocol!=='https:'))throw Error(httpsOnly?'API 地址必须使用 HTTPS 且不能包含凭据':'请输入有效的 HTTP(S) 地址');return u;}
export type WireResponse={status:number;url:string;headers:Record<string,string>;text:string};
export async function requestUrl(url:string,options:{method?:string;headers?:Record<string,string>;body?:unknown;signal?:AbortSignal;maxBytes?:number;allowPrivate?:boolean;redirects?:number}={}):Promise<WireResponse>{
 const u=validateUrl(url);const hostname=u.hostname.replace(/^\[|\]$/g,'');
 const addresses=net.isIP(hostname)?[{address:hostname,family:net.isIP(hostname)}]:await dns.lookup(hostname,{all:true});
 if(!addresses.length||(!options.allowPrivate&&addresses.some(a=>isPrivateIp(a.address))))throw Error('不能访问本地、私有或保留地址');
 const first=addresses[0];const body=options.body===undefined?undefined:JSON.stringify(options.body);
 const response=await new Promise<WireResponse>((resolve,reject)=>{
  const req=(u.protocol==='https:'?https:http).request(u,{method:options.method||'GET',headers:options.headers,signal:options.signal,family:first.family,
    lookup:((_host:unknown,_opts:unknown,callback:(err:null,address:string,family:number)=>void)=>callback(null,first.address,first.family)) as never},res=>{
    const chunks:Buffer[]=[];let size=0;res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>(options.maxBytes||4_000_000)){res.destroy(Error('响应超过大小限制'));return;}chunks.push(chunk);});
    res.on('error',reject);res.on('end',()=>{const headers:Record<string,string>={};for(const[k,v]of Object.entries(res.headers))headers[k]=Array.isArray(v)?v.join(', '):v||'';resolve({status:res.statusCode||0,url:u.href,headers,text:Buffer.concat(chunks).toString('utf8')});});
  });req.setTimeout(30_000,()=>req.destroy(Error('请求超时')));req.on('error',reject);if(body)req.write(body);req.end();
 });
 if([301,302,303,307,308].includes(response.status)){
  if(options.method&&options.method!=='GET')throw Error('API 不允许重定向，请检查 Base URL');
  if(!(options.redirects||0))throw Error('跳转次数超限或不允许跳转');
  const target=new URL(response.headers.location||'',url);if(!response.headers.location)throw Error('重定向缺少 Location');
  return requestUrl(target.href,{...options,redirects:(options.redirects||0)-1});
 }return response;
}
