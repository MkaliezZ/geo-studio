import type {ReactNode} from 'react';
import {Search} from 'lucide-react';
export function Empty({children}:{children:ReactNode}){return <div className="empty"><Search size={32}/><p>{children}</p></div>;}
export function Field({label,children,className=''}:{label:string;children:ReactNode;className?:string}){return <label className={'field '+className}><span>{label}</span>{children}</label>;}
export function Status({value}:{value:string}){const names:Record<string,string>={pass:'通过',fail:'需处理',unknown:'待确认',running:'执行中',completed:'已完成',failed:'失败',cancelled:'已取消'};return <span className={'status '+value}>{names[value]||value}</span>;}
export function Note({children}:{children:ReactNode}){return <div className="note">{children}</div>;}
