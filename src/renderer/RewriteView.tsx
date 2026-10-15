import {useEffect,useMemo,useState} from 'react';
import {diffLines} from 'diff';
import {Download,FilePenLine,Save} from 'lucide-react';
import type {Rewrite} from '../shared/types';
import type {ViewProps} from './App';
import {date,download} from './api';
import {Field,Note} from './ui';
export function RewriteView({state,projectId,act,notify}:ViewProps){
 const [providerId,setProvider]=useState('');const [source,setSource]=useState('');const [goal,setGoal]=useState('改善内容结构，直接回答读者问题，保留原有事实与引用。');const [draft,setDraft]=useState('');const [recordId,setRecordId]=useState('');const [busy,setBusy]=useState(false);const [tab,setTab]=useState('editor');
 const records=state.rewrites.filter(r=>r.projectId===projectId).toReversed();const pages=state.audits.filter(a=>a.projectId===projectId&&a.status==='completed').at(-1)?.pages||[];
 useEffect(()=>{setSource('');setDraft('');setRecordId('');},[projectId]);
 const changes=useMemo(()=>diffLines(source,draft),[source,draft]);
 async function generate(){setBusy(true);try{const r=await act<Rewrite>('rewrite.run',{projectId,providerId,source,goal});setDraft(r.draft);setRecordId(r.id);}catch{}finally{setBusy(false);}}
 function open(r:Rewrite){setSource(r.source);setDraft(r.draft);setGoal(r.goal);setProvider(r.providerId);setRecordId(r.id);}
 return <><div className="page-heading"><h1>AI 改写</h1><p>让内容更清晰，保留事实，并逐项审核修改。</p></div><div className="form-row"><Field label="提供商" className="grow"><select value={providerId} onChange={e=>setProvider(e.target.value)}><option value="">选择已配置模型</option>{state.providers.map(p=><option key={p.id} value={p.id}>{p.name} · {p.model}</option>)}</select></Field><Field label="导入页面" className="grow"><select value="" onChange={e=>{const p=pages.find(p=>p.url===e.target.value);if(p){setSource(p.renderedMarkdown||p.markdown);setRecordId('');}}}><option value="">从最近诊断导入正文</option>{pages.map(p=><option key={p.url} value={p.url}>{p.title||p.url}</option>)}</select></Field><button className="primary align-bottom" disabled={!projectId||!providerId||!source.trim()||busy} onClick={()=>void generate()}><FilePenLine size={17}/>{busy?'正在改写…':'生成改写稿'}</button></div>
 <Field label="改写目标与约束"><textarea className="goal" value={goal} onChange={e=>setGoal(e.target.value)}/></Field><Note>原文将发送至所选提供商并产生 API 费用。草稿需人工核查，不会自动发布到网站。</Note>
 <section className="results-panel"><div className="panel-toolbar"><div className="tabs"><button className={tab==='editor'?'active':''} onClick={()=>setTab('editor')}>原文与草稿</button><button className={tab==='diff'?'active':''} onClick={()=>setTab('diff')}>修改差异</button></div><div className="actions"><button disabled={!recordId||busy} onClick={()=>void act('rewrite.save',{id:recordId,draft}).then(()=>notify('草稿已保存')).catch(()=>{})}><Save size={16}/>保存</button><button disabled={!draft} onClick={()=>download('geo-rewrite.md',draft)}><Download size={16}/>导出草稿</button></div></div>{tab==='editor'?<div className="editor-grid"><Field label="原始内容"><textarea aria-label="原始内容" className="editor" value={source} placeholder="粘贴需要优化的正文，或从最近诊断导入。" onChange={e=>setSource(e.target.value)}/></Field><Field label="可编辑草稿"><textarea aria-label="可编辑草稿" className="editor" value={draft} placeholder="生成后在这里审核、编辑和保存。" onChange={e=>setDraft(e.target.value)}/></Field></div>:<pre className="diff-view">{draft?changes.map((part,i)=><span key={i} className={part.added?'added':part.removed?'removed':''}>{part.value}</span>):'生成草稿后查看差异。'}</pre>}</section>
 {records.length?<section className="history-list"><h2>改写历史</h2>{records.map(r=><button key={r.id} onClick={()=>open(r)}><span>{r.goal.slice(0,60)}</span><small>{date(r.createdAt)} · {r.model}</small></button>)}</section>:null}</>;
}
