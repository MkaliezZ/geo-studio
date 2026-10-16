import {useCallback,useEffect,useState} from 'react';
import {Search,FilePenLine,ChartNoAxesCombined,Settings,FolderOpen,ChevronDown,Plus,Trash2,Info,RefreshCw} from 'lucide-react';
import type {Components,State,OptimizationTask} from '../shared/types';
import {api} from './api';
import {AuditView} from './AuditView';
import {RewriteView} from './RewriteView';
import {MonitorView} from './MonitorView';
import {SettingsView} from './SettingsView';
type Section='audit'|'rewrite'|'monitor'|'settings';
const nav=[{id:'audit',name:'网站诊断',icon:Search},{id:'rewrite',name:'AI 改写',icon:FilePenLine},{id:'monitor',name:'引用监测',icon:ChartNoAxesCombined},{id:'settings',name:'模型设置',icon:Settings}] as const;
export type ViewProps={state:State;projectId:string;refresh:()=>Promise<void>;act:<T=unknown>(action:string,payload?:unknown)=>Promise<T>;notify:(s:string)=>void;navigate:(section:Section)=>void;onOptimize:(task:OptimizationTask)=>void;optimizationTask?:OptimizationTask;onRecheck:(auditId:string)=>void;recheckTask?:{auditId:string;requestedAt:number}};
export function App(){
 const [recheckTask,setRecheckTask]=useState<{auditId:string;requestedAt:number}>();const [optimizationTask,setOptimizationTask]=useState<OptimizationTask>();const [section,setSection]=useState<Section>('audit');const [state,setState]=useState<State>();const [components,setComponents]=useState<Components>();const [projectId,setProjectId]=useState('');const [message,setMessage]=useState('');const [creating,setCreating]=useState(false);const [name,setName]=useState('');const [url,setUrl]=useState('');const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{const s=await api.request<State>('state');setState(s);setProjectId(current=>s.projects.some(p=>p.id===current)?current:s.projects[0]?.id||'');},[]);
 const act=useCallback(async<T,>(action:string,payload?:unknown):Promise<T>=>{try{const result=await api.request<T>(action,payload);await refresh();return result;}catch(e){const msg=e instanceof Error?e.message:'操作失败';setMessage(msg);throw e;}},[refresh]);
 useEffect(()=>{void refresh().catch(e=>setMessage(String(e)));void api.request<Components>('components.status').then(setComponents).catch(e=>setMessage(String(e)));},[refresh]);
 const active=state?.audits.some(a=>a.status==='running')||state?.runs.some(r=>r.status==='running');
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>void refresh().catch(()=>{}),1200);return()=>clearInterval(timer);},[active,refresh]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),9000);return()=>clearTimeout(timer);},[message]);
 async function createProject(e:React.FormEvent){e.preventDefault();setBusy(true);try{const p=await act<{id:string}>('project.create',{name,url});setProjectId(p.id);setCreating(false);setName('');setUrl('');}catch{}finally{setBusy(false);}}
 const current=nav.find(n=>n.id===section)!;
 const props=state?{state,projectId,refresh,act,notify:setMessage,navigate:setSection,recheckTask,onRecheck:(auditId:string)=>{if(!state.audits.some(a=>a.id===auditId&&a.projectId===projectId)){setMessage('原诊断记录已不存在，请重新诊断');return;}setRecheckTask({auditId,requestedAt:Date.now()});setSection('audit');},onOptimize:(task:OptimizationTask)=>{setOptimizationTask(task);setSection('rewrite');},optimizationTask:optimizationTask?.projectId===projectId?optimizationTask:undefined}:undefined;
 return <div className="app-shell">
  <aside><div className="brand"><span className="brandmark">G</span><strong>GEO Studio</strong></div><nav aria-label="主导航">{nav.map(({id,name,icon:Icon})=><button key={id} aria-label={name} className={section===id?'selected':''} onClick={()=>setSection(id)}><Icon size={21}/><span>{name}</span></button>)}</nav><div className="sidebar-bottom"><div><FolderOpen size={19}/><span>本地工作空间</span></div></div></aside>
  <div className="workspace"><header><div>工作空间 <span className="slash">/</span> <strong>{current.name}</strong></div><span className="local">本地优先</span></header>
   <main><div className="projectbar"><div className="project-picker"><FolderOpen size={17}/><select aria-label="当前项目" value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">选择项目</option>{state?.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><button className="quiet" onClick={()=>setCreating(true)}><Plus size={16}/>新建项目</button>{projectId?<button className="iconbutton" title="删除当前项目" onClick={()=>{if(confirm('删除项目及本地诊断、改写和监测记录？'))void act('project.delete',{id:projectId}).catch(()=>{});}}><Trash2 size={16}/></button>:null}</div>
   {props?<><section className="getting-started" aria-label="使用引导"><div><strong>从诊断到验证</strong><span>技术诊断无需 Key；AI 请求按提供商计费。草稿需人工应用，复检后再确认修复。</span></div><div className="guide-steps"><button onClick={()=>projectId?setSection('audit'):setCreating(true)}>{projectId?'✓':'1'} 创建网站项目</button><button onClick={()=>setSection('audit')}>2 诊断并选择优化项</button><button onClick={()=>setSection('settings')}>{state!.providers.some(p=>p.hasKey)?'✓':'3'} 配置 AI 模型</button><button onClick={()=>setSection('monitor')}>4 验证联网与引用</button></div></section><div hidden={section!=='audit'}><AuditView {...props}/></div><div hidden={section!=='rewrite'}><RewriteView key={props.projectId} {...props}/></div><div hidden={section!=='monitor'}><MonitorView {...props}/></div><div hidden={section!=='settings'}><SettingsView {...props} onComponents={setComponents}/></div></>:<div className="empty">正在打开本地工作空间…</div>}
   </main><footer><span className="footer-state"><span className={'dot '+(components?.engine.ready?'ready':'')}/>{components?.engine.ready?'采集引擎就绪':'采集引擎未安装'}</span><span className="footer-platform">Windows · macOS · Linux</span><button onClick={()=>setSection('settings')}>管理组件</button></footer>
  </div>
  {message?<div className="toast" role="status"><Info size={18}/><span>{message}</span><button onClick={()=>setMessage('')} aria-label="关闭提示">×</button></div>:null}
  {creating?<div className="modal-backdrop"><form className="modal" onSubmit={createProject}><h2>新建项目</h2><label className="field"><span>项目名称</span><input autoFocus required value={name} onChange={e=>setName(e.target.value)} placeholder="例如：品牌官网"/></label><label className="field"><span>网站地址</span><input required type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com"/></label><div className="actions"><button type="button" onClick={()=>setCreating(false)}>取消</button><button className="primary" disabled={busy}>{busy?'正在创建…':'创建项目'}</button></div></form></div>:null}
 </div>;
}
