import {spawn} from 'node:child_process';
import {build} from 'esbuild';
const children=[];const launch=(cmd,args)=>{const c=spawn(cmd,args,{stdio:'inherit',shell:false});children.push(c);return c;};
const npm=process.platform==='win32'?'npm.cmd':'npm';
launch(npm,['run','preview']);launch(process.execPath,['node_modules/vite/bin/vite.js']);
await import('./build-main.mjs');
for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
const electron=launch(process.platform==='win32'?'node_modules/.bin/electron.cmd':'node_modules/.bin/electron',['.']);
const stop=()=>{for(const c of children)c.kill();};electron.on('exit',stop);process.on('SIGINT',()=>{stop();process.exit();});
