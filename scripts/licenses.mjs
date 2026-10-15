import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const notices=[];
async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(!entry.isDirectory()||entry.name.startsWith('.'))continue;const folder=path.join(dir,entry.name);if(entry.name.startsWith('@')){await scan(folder);continue;}try{const p=JSON.parse(await readFile(path.join(folder,'package.json'),'utf8'));let text='';for(const file of await readdir(folder))if(/^licen[sc]e(?:\.|$)/i.test(file)){text=await readFile(path.join(folder,file),'utf8');break;}notices.push({name:p.name,version:p.version,license:p.license||'see package',text});}catch{}}}
await scan('node_modules');await mkdir('resources/licenses',{recursive:true});
await writeFile('resources/licenses/npm-notices.json',JSON.stringify(notices,null,2));
await writeFile('resources/licenses/THIRD-PARTY.txt',notices.map(n=>`${n.name}@${n.version} | ${n.license}\n${n.text}`).join('\n\n----------------\n\n'));
console.log(`Recorded ${notices.length} installed package notices; dependency identification is not legal certification.`);
