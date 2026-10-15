import type {Citation,ModelAnswer,Provider} from '../shared/types.js';
import {requestUrl,validateUrl} from './network.js';
type Json=Record<string,any>;
export function safeLink(value:string){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:undefined;}catch{return undefined;}}
export function parseAnswer(raw:Json,protocol:Provider['protocol']):ModelAnswer {
 const citations:Citation[]=[];let text='';let searchObserved=false;
 const add=(url:string,title:string,origin:Citation['origin'])=>{const safe=safeLink(url);if(safe&&!citations.some(c=>c.url===safe))citations.push({url:safe,title:title||safe,origin});};
 if(protocol==='compatible-chat')text=String(raw.choices?.[0]?.message?.content||'');
 else if(protocol==='deepseek-search'){
  const blocks=Array.isArray(raw.content)?raw.content:[];
  const calls=new Set(blocks.filter((b:Json)=>b.type==='server_tool_use'&&b.name==='web_search').map((b:Json)=>b.id));
  const results:Json[]=[];let errors=0;
  for(const b of blocks){
   if(b.type==='text')text+=String(b.text||'')+'\n';
   if(b.type==='web_search_tool_result'&&calls.has(b.tool_use_id)&&Array.isArray(b.content))for(const item of b.content){if(item.type==='web_search_result'&&safeLink(item.url))results.push(item);if(item.type==='web_search_tool_result_error')errors++;}
  }
  searchObserved=results.length>0;
  const normalized=(url:string)=>{const u=new URL(url);u.hash='';for(const [key,value] of [...u.searchParams])if(/^utm_/i.test(key)||['gclid','fbclid'].includes(key.toLowerCase())||(key==='source'&&/^post_page-/.test(value)))u.searchParams.delete(key);return u.href;};
  // DeepSeek currently also returns plain-text source URLs. Only a URL that
  // matches a correlated, successful provider search result counts as cited.
  const responseLinks=[...text.matchAll(/https?:\/\/[^\s)\]>"'，。；]+/g)].map(m=>safeLink(m[0])).filter((u):u is string=>!!u);
  for(const result of results){const match=responseLinks.find(url=>normalized(url)===normalized(result.url));if(match)add(normalized(match),result.title,'provider-search-reference');}
  for(const b of blocks)if(b.type==='text')for(const c of b.citations||[])if(c.type==='web_search_result_location'&&safeLink(c.url)&&results.some(r=>normalized(r.url)===normalized(c.url)))add(normalized(c.url),c.title,'provider-annotation');
  const answer={text:text.trim(),citations,links:responseLinks,searchObserved,model:String(raw.model||''),usage:raw.usage||{},responseId:raw.id,searchEvidence:{toolCalls:calls.size,resultCount:results.length,errorCount:errors},retrievedSources:results.filter((r,i)=>results.findIndex(x=>x.url===r.url)===i).map(r=>({url:safeLink(r.url)!,title:String(r.title||r.url)}))};
  return answer;
 }
 else {
  for(const item of raw.output||[]){
   if(item.type==='web_search_call'&&item.status==='completed')searchObserved=true;
   if(item.type==='search_results')searchObserved=true;
   if(item.type==='message')for(const part of item.content||[]){
    if(part.type==='output_text')text+=String(part.text||'');
    for(const a of part.annotations||[])if(a.type==='url_citation')add(a.url||a.url_citation?.url,a.title||a.url_citation?.title,'provider-annotation');
   }
  }
  if(protocol==='perplexity-agent'){
   const ids=new Set([...text.matchAll(/\[(\d+)\]/g)].map(m=>Number(m[1])));
   for(const item of raw.output||[])if(item.type==='search_results')for(const source of item.results||[])if(ids.has(Number(source.id)))add(source.url,source.title,'provider-search-reference');
  }
 }
 const links=[...text.matchAll(/https?:\/\/[^\s)\]>"']+/g)].map(m=>safeLink(m[0])).filter((s):s is string=>!!s);
 return {text,citations,links:[...new Set(links)],searchObserved,model:String(raw.model||''),usage:raw.usage||{},responseId:raw.id};
}
export function domainMatches(url:string,domain:string){try{const host=new URL(url).hostname.toLowerCase().replace(/\.$/,'');const target=domain.toLowerCase().replace(/^www\./,'').replace(/\.$/,'');return !!target&&(host===target||host.endsWith('.'+target));}catch{return false;}}
export function mentions(text:string,names:string[]){return names.filter(Boolean).some(name=>{const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return /\p{Script=Han}/u.test(name)?text.toLowerCase().includes(name.toLowerCase()):new RegExp('(?<![\\p{L}\\p{N}_])'+escaped+'(?![\\p{L}\\p{N}_])','iu').test(text);});}
export {metrics} from '../shared/metrics.js';
export type ModelTransport=typeof requestUrl;
export async function callModel(provider:Provider,key:string,input:string,options:{search?:boolean;system?:string;signal?:AbortSignal;transport?:ModelTransport}={}):Promise<ModelAnswer>{
 if(!key)throw Error('请先在模型设置中填写 API Key');validateUrl(provider.baseUrl,true);
 const base=provider.baseUrl.replace(/\/$/,'');let endpoint:string;let body:Json;
 if(provider.protocol==='compatible-chat'){
  endpoint=base+'/chat/completions';body={model:provider.model,messages:[{role:'system',content:options.system||'回答用户的问题；不要捏造引用。'},{role:'user',content:input}],max_tokens:2400};
 }else if(provider.protocol==='deepseek-search'){
  endpoint=base+'/v1/messages';body={model:provider.model,max_tokens:2400,thinking:{type:'disabled'},system:(options.system||'请基于可核验来源回答，不捏造引用。')+(options.search?' 必须使用联网搜索。回答结束列出实际使用的来源，并从工具成功返回的结果中原样复制 URL（包括路径和查询参数），不凭记忆替换链接，不将失败的工具结果当作来源。':''),messages:[{role:'user',content:input}]};
  if(options.search)body.tools=[{type:'web_search_20250305',name:'web_search',max_uses:1}];
 }else if(provider.protocol==='perplexity-agent'){
  endpoint=base+'/agent';body={preset:provider.model,input:(options.system?options.system+'\n\n':'')+input};
 }else{
  endpoint=base+'/responses';body={model:provider.model,input,instructions:options.system,max_output_tokens:2400,store:false};
  if(options.search){body.tools=[{type:'web_search'}];body.tool_choice='required';}
 }
 const response=await (options.transport||requestUrl)(endpoint,{method:'POST',body,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Accept':'application/json',...(provider.protocol==='deepseek-search'?{'anthropic-version':'2023-06-01'}:{})},signal:options.signal,maxBytes:3_000_000});
 if(response.status<200||response.status>=300)throw Error(`模型接口返回 HTTP ${response.status}，请检查密钥、模型和额度`);
 let raw:Json;try{raw=JSON.parse(response.text);}catch{throw Error('模型接口返回了非 JSON 响应');}
 if(raw.error)throw Error('模型接口报告错误，请检查模型与配额');
 if(raw.status&&['incomplete','failed','cancelled'].includes(raw.status))throw Error('模型未完成回答，请调整限制后重试');
 if(raw.stop_reason==='max_tokens'||raw.stop_reason==='pause_turn')throw Error('回答被截断或搜索未完成，请缩短问题后重试');
 const answer=parseAnswer(raw,provider.protocol);if(!answer.text.trim())throw Error('模型未返回有效文本');
 answer.model=answer.model||provider.model;return answer;
}
