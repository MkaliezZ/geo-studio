import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
import TurndownService from 'turndown';
import {randomUUID} from 'node:crypto';
import type {Audit,Finding,Page} from '../shared/types.js';
import {ComponentManager} from './components.js';
import {runProcess} from './process.js';
import {requestUrl,type WireResponse} from './network.js';
const SOURCE='https://developers.google.com/search/docs/appearance/ai-features';
export const BOTS=['OAI-SearchBot','Googlebot','Bingbot','Claude-SearchBot','PerplexityBot'];
export function analyzePage(page:Page):Finding[]{
 const found:Finding[]=[];const add=(rule:string,title:string,status:Finding['status'],evidence:string,suggestion:string,severity:Finding['severity']='warning')=>found.push({id:randomUUID(),rule,url:page.url,title,status,evidence,suggestion,severity,source:SOURCE});
 if(page.error||page.status!==200){add('http','页面访问',page.error?'unknown':'fail',page.error||'HTTP '+page.status,'检查服务器响应、跳转与访问策略','error');return found;}
 add('http','页面访问','pass','HTTP '+page.status,'');
 if(!page.html){add('html','原始 HTML','unknown','未获取到可解析 HTML','重试检查，不能用缺失数据推断页面内容');return found;}
 const $=load(page.html);const tags=[$('meta[name="robots"]').attr('content'),$('meta[name="googlebot"]').attr('content'),page.headers['x-robots-tag']].filter(Boolean).join(', ');
 add('noindex','索引限制',/\b(noindex|none)\b/i.test(tags)?'fail':'pass',tags||'未发现 noindex 指令','若页面需要进入搜索索引，检查并移除不必要的 noindex','error');
 add('snippet','摘要限制',/nosnippet|max-snippet\s*:\s*0\b/i.test(tags)?'fail':'pass',tags||'未发现摘要限制','检查 nosnippet 和 max-snippet 是否符合业务意图');
 const title=$('title').first().text().trim();page.title=title;
 add('title','页面标题',title?'pass':'fail',title||'缺少 title','为页面提供准确、独特的标题');
 const description=$('meta[name="description"]').attr('content')?.trim();add('description','页面描述',description?'pass':'fail',description||'缺少 description','补充真实、简洁的内容摘要');
 const canonical=$('link[rel="canonical"]').map((_,el)=>$(el).attr('href')).get();
 let canonicalOk=false;try{canonicalOk=canonical.length===1&&new URL(canonical[0],page.finalUrl).href===new URL(page.finalUrl).href;}catch{/* invalid */}
 add('canonical','规范网址',canonicalOk?'pass':'fail',canonical.join(', ')||'未声明 canonical','检查规范 URL，指向其他页面可能是有意设置，请人工确认');
 add('heading','一级标题',$('h1').length===1?'pass':'fail',`H1 数量：${$('h1').length}`,'建议用清晰的一级标题表达本页主题');
 const schemas=$('script[type="application/ld+json"]').map((_,el)=>$(el).text()).get();let errors=0;for(const schema of schemas)try{JSON.parse(schema);}catch{errors++;}
 add('jsonld','结构化数据语法',errors?'fail':schemas.length?'pass':'unknown',`${schemas.length} 个 JSON-LD，${errors} 个语法错误`,'仅为页面真实可见信息补充适用类型；语法通过不代表 Schema 语义合规');
 $('script,style,noscript,template').remove();const text=$('body').text().replace(/\s+/g,' ').trim();page.contentChars=[...text].length;
 add('body','原始正文',text?'pass':'fail',`原始正文 ${page.contentChars} 个字符`,'若正文仅在交互或脚本执行后出现，考虑 SSR 或可访问的静态内容','error');
 if(page.renderedMarkdown!==undefined){const raw=page.markdown.replace(/\s/g,'');const rendered=page.renderedMarkdown.replace(/\s/g,'');add('render','渲染前后对照',!raw&&rendered?'fail':'pass',`原始 Markdown ${raw.length} 字符；渲染后 ${rendered.length} 字符`,'对比差异并人工检查关键正文是否依赖脚本；该结果不代表真实 AI 爬虫行为');}
 return found;
}
export function compareAudits(before:Audit,after:Audit){const key=(f:Finding)=>f.rule+'|'+f.url;const old=new Map(before.findings.filter(f=>f.status==='fail').map(f=>[key(f),f]));const now=new Map(after.findings.filter(f=>f.status==='fail').map(f=>[key(f),f]));return {resolved:[...old].filter(([k])=>after.findings.some(f=>key(f)===k&&f.status==='pass')).map(([,v])=>v),added:[...now].filter(([k])=>!old.has(k)).map(([,v])=>v),persisting:[...now].filter(([k])=>old.has(k)).map(([,v])=>v),unverified:[...old].filter(([k])=>!after.findings.some(f=>key(f)===k&&['pass','fail'].includes(f.status))).map(([,v])=>v)};}
export function robotsStatus(response:WireResponse|undefined,error?:string):'rules'|'allow'|'unknown'{if(error||!response)return'unknown';if(response.status===200)return'rules';if(response.status>=400&&response.status<500&&response.status!==429)return'allow';return'unknown';}
export class Auditor {
 constructor(private components:ComponentManager,private dataDir:string,private allowPrivateForTests=false){}
 async run(audit:Audit,url:string,settings:{enginePath:string;browserPath:string},signal:AbortSignal,onUpdate:()=>Promise<void>){
  const dir=path.join(this.dataDir,'audits',audit.id);await mkdir(dir,{recursive:true,mode:0o700});
  const engine=await this.components.engine(settings.enginePath);if(!await this.components.exists(engine))throw Error('SiteOne 引擎未安装，请前往模型设置 → 管理组件');
  const crawl=async(render:boolean)=>{
   const mode=render?'browser':'raw';const report=path.join(dir,mode+'.json');const markdownDir=path.join(dir,mode);
   const args=[`--url=${url}`,`--max-visited-urls=${audit.options.limit}`,'--workers=2','--max-reqs-per-sec=3','--no-cache','--output=json','--output-html-report=',`--output-json-file=${report}`,`--markdown-export-dir=${markdownDir}`];
   if(render){const browser=await this.components.browser(settings.browserPath);if(!browser)throw Error('未找到 Chromium，请在模型设置填写浏览器路径');args.push('--browser',`--browser-path=${browser}`,'--browser-workers=1','--browser-timeout=20');}
   await runProcess(engine,args,{cwd:dir,signal,timeout:240_000,onLog:text=>{audit.log=(audit.log+text).replace(/\x1b\[[0-9;]*m/g,'').slice(-10000);}});
   const data=JSON.parse(await readFile(report,'utf8'));const pages:Page[]=[];
   for(const item of data.results||[]){if(item.type!==1&&item.status==='200')continue;let markdown='';if(item.markdownFilePath){const md=path.resolve(markdownDir,item.markdownFilePath);if(!md.startsWith(path.resolve(markdownDir)+path.sep))throw Error('引擎返回了不安全的文件路径');try{markdown=await readFile(md,'utf8');}catch{/* no markdown */}}
    pages.push({url:item.url,finalUrl:item.url,status:Number(item.status)||0,title:'',markdown,contentChars:0,headers:{}});
   }return pages;
  };
  audit.log='正在采集原始页面…\n';await onUpdate();audit.pages=await crawl(false);if(!audit.pages.length)throw Error('未采集到页面，请检查网址、robots 与网络');await onUpdate();
  if(audit.options.render){audit.log+='正在进行浏览器渲染…\n';await onUpdate();const rendered=await crawl(true);for(const page of audit.pages){const match=rendered.find(p=>p.url===page.url);if(match)page.renderedMarkdown=match.markdown;}}
  for(const page of audit.pages){signal.throwIfAborted();if(page.status===200){try{const r=await requestUrl(page.url,{signal,redirects:5,allowPrivate:this.allowPrivateForTests});page.finalUrl=r.url;page.headers=r.headers;page.status=r.status;if(r.headers['content-type']?.includes('html'))page.html=r.text;else page.error='响应不是 HTML';}catch(e){signal.throwIfAborted();page.error=e instanceof Error?e.message:'抓取失败';}}audit.findings.push(...analyzePage(page));}
  const origins=[...new Set(audit.pages.map(p=>new URL(p.finalUrl).origin))];
  for(const origin of origins){let response:WireResponse|undefined;let error:string|undefined;try{response=await requestUrl(origin+'/robots.txt',{signal,redirects:5,maxBytes:512000,allowPrivate:this.allowPrivateForTests});}catch(e){signal.throwIfAborted();error=e instanceof Error?e.message:'读取失败';}
   const state=robotsStatus(response,error);const urls=audit.pages.filter(p=>new URL(p.finalUrl).origin===origin).map(p=>p.finalUrl);let policies:{url:string;bot:string;allowed:boolean}[]=[];let parserError='';
   if(state==='rules')try{policies=await this.components.parseRobots(response!.text,urls,BOTS,signal);}catch(e){signal.throwIfAborted();parserError=e instanceof Error?e.message:'解析失败';}
   for(const url of urls)for(const bot of BOTS){const policy=policies.find(p=>p.url===url&&p.bot===bot);const status=state==='allow'?'pass':state==='unknown'||parserError?'unknown':policy?(policy.allowed?'pass':'fail'):'unknown';audit.findings.push({id:randomUUID(),rule:'robots:'+bot,url,title:bot+' 访问规则',status,severity:'error',evidence:error||parserError||`robots HTTP ${response?.status}；目标 ${new URL(url).pathname}；${state==='rules'?response!.text.slice(0,1500):'未获取到规则文件，按协议回退'}`,suggestion:'核对目标 URL 对应的规则；训练爬虫与搜索爬虫权限应分别管理',source:'https://www.rfc-editor.org/rfc/rfc9309.html'});}
  }
  signal.throwIfAborted();audit.completedAt=new Date().toISOString();audit.status='completed';audit.log+='诊断完成。\n';await onUpdate();
 }
}
