import type {ModelAnswer} from './types';
export function metrics(samples:{answer?:ModelAnswer;mentioned?:boolean;cited?:boolean;error?:string}[]){
 const valid=samples.filter(s=>!s.error&&!!s.answer?.text);const web=valid.filter(s=>s.answer!.searchObserved);
 return {valid:valid.length,failed:samples.filter(s=>!!s.error).length,web:web.length,mentionRate:valid.length?valid.filter(s=>s.mentioned).length/valid.length:null,citationRate:web.length?web.filter(s=>s.cited).length/web.length:null};
}
