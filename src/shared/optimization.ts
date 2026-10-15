import type {Audit,OptimizationTask} from './types';

const goals:Record<string,string>={
 description:'生成准确、简洁的页面摘要，以及可复制的 <meta name="description" content="…"> 标签。保持原文语言，不捏造卖点或数据。',
 title:'生成准确且独特的页面标题，以及可复制的 <title> 标签。保持原文语言，不承诺排名或引用增长。',
 heading:'建议清晰的页面一级标题，给出可复制的 <h1> 标签及放置说明，不凭空增加原文没有的事实。',
 body:'改善正文结构，直接回答读者问题；输出 Markdown 草稿，保留原有事实与有效引用。',
 jsonld:'解释结构化数据语法错误，提供与现有可见内容一致的 JSON-LD 修复建议。信息不足时标注【需核实】，不捏造类型或属性。',
};
export function canOptimize(rule:string){return Object.hasOwn(goals,rule);}
export function prepareOptimization(audit:Audit,findingId:string):OptimizationTask{
 if(audit.status!=='completed')throw Error('请先完成诊断');
 const finding=audit.findings.find(f=>f.id===findingId);
 if(!finding||finding.status!=='fail'||!canOptimize(finding.rule))throw Error('该检查项需要人工配置修复，不能生成内容优化任务');
 const page=audit.pages.find(p=>p.url===finding.url);
 if(!page)throw Error('诊断页面不存在');
 const source=`页面：${page.finalUrl}\n现有标题：${page.title||'未获取'}\n诊断证据：${finding.evidence.slice(0,3000)}\n\n页面正文：\n${(page.renderedMarkdown??page.markdown).slice(0,50000)}`;
 return {projectId:audit.projectId,source,goal:goals[finding.rule]+'\n仅基于下方原文。人工应用到网站后必须重新诊断，生成草稿不代表问题已解决。',context:{auditId:audit.id,findingId:finding.id,pageUrl:page.url,rule:finding.rule,title:finding.title,evidence:finding.evidence.slice(0,3000),suggestion:finding.suggestion}};
}
