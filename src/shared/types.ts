export type Protocol = 'openai-responses' | 'compatible-chat' | 'perplexity-agent' | 'deepseek-search';
export type OptimizationContext = {auditId:string;findingId:string;pageUrl:string;rule:string;title:string;evidence:string;suggestion:string};
export type OptimizationTask = {projectId:string;source:string;goal:string;context:OptimizationContext};
export type Provider = { id:string; name:string; protocol:Protocol; baseUrl:string; model:string; hasKey:boolean; keyStorage?:string;webVerification?:{at:string;status:WebVerification['status'];resultCount:number;citationCount:number;reachableCount:number} };
export type Project = { id:string; name:string; url:string; createdAt:string };
export type Finding = { id:string; rule:string; url:string; title:string; status:'pass'|'fail'|'unknown'; severity:'error'|'warning'|'info'; evidence:string; suggestion:string; source?:string };
export type Page = {url:string; finalUrl:string; status:number; title:string; markdown:string; renderedMarkdown?:string; html?:string; contentChars:number; headers:Record<string,string>; error?:string};
export type Audit = {id:string; projectId:string; createdAt:string; completedAt?:string; status:'running'|'completed'|'failed'|'cancelled'; options:{limit:number;render:boolean}; pages:Page[]; findings:Finding[]; log:string; error?:string; engineVersion:string; ruleVersion:string; cancelled?:boolean};
export type Citation = {url:string;title:string;origin:'provider-annotation'|'provider-search-reference'};
export type ModelAnswer = {text:string;citations:Citation[];links:string[];searchObserved:boolean;model:string;usage:Record<string,unknown>;responseId?:string;searchEvidence?:{toolCalls:number;resultCount:number;errorCount:number};retrievedSources?:{url:string;title:string}[]};
export type WebVerification = {providerId:string;at:string;status:'verified'|'no-search'|'no-citation'|'unreachable';answer:ModelAnswer;checks:{url:string;status?:number;reachable:boolean;error?:string}[]};
export type Rewrite = {id:string;projectId:string;providerId:string;source:string;draft:string;goal:string;createdAt:string;model:string;usage:Record<string,unknown>;optimization?:OptimizationContext};
export type Monitor = {id:string;projectId:string;name:string;brand:string;aliases:string[];domain:string;questions:string[];providerIds:string[];repeats:number;intervalHours:number;enabled:boolean;nextRunAt?:string;createdAt:string};
export type Sample = {id:string;providerId:string;providerName:string;protocol:Protocol;endpoint:string;question:string;at:string;answer?:ModelAnswer;mentioned?:boolean;cited?:boolean;error?:string};
export type MonitorRun = {id:string;monitorId:string;projectId:string;createdAt:string;completedAt?:string;status:'running'|'completed'|'failed'|'cancelled';samples:Sample[];expected:number;error?:string};
export type State = {schemaVersion:1;projects:Project[];providers:Provider[];audits:Audit[];rewrites:Rewrite[];monitors:Monitor[];runs:MonitorRun[];settings:{enginePath:string;browserPath:string}};
export type Components = {engine:{ready:boolean;path:string;version?:string};robots:{ready:boolean;path:string};browser:{ready:boolean;path:string};platform:string;keyStorage:string};
export type API = {request<T=unknown>(action:string,payload?:unknown):Promise<T>};
declare global {interface Window {geo?:API}}
