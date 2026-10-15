import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,copyFile,chmod,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {runProcess} from './process.js';
import manifest from '../../resources/engine-manifest.json';
export async function installEngine(resourceRoot:string,tag=process.platform+'-'+process.arch){
 const asset=(manifest as Record<string,{url:string;sha256:string;name:string}>)[tag];if(!asset)throw Error('暂不支持此系统/架构，请选择本地引擎');
 const dir=path.join(resourceRoot,'bin',tag);await mkdir(dir,{recursive:true});const temp=path.join(dir,'download');await mkdir(temp,{recursive:true});
 try{
  const response=await fetch(asset.url,{signal:AbortSignal.timeout(120_000)});if(!response.ok)throw Error('引擎下载失败 HTTP '+response.status);
  const buffer=Buffer.from(await response.arrayBuffer());if(buffer.length>80_000_000)throw Error('组件包过大');
  if(createHash('sha256').update(buffer).digest('hex')!==asset.sha256)throw Error('引擎 SHA256 校验失败');
  const archive=path.join(temp,asset.name);await writeFile(archive,buffer);await runProcess('tar',['-xf',archive,'-C',temp],{timeout:30_000});
  const basename='siteone-crawler'+(tag.startsWith('win32')?'.exe':'');
  const find=async(folder:string):Promise<string|undefined>=>{for(const item of await readdir(folder,{withFileTypes:true})){if(item.isFile()&&item.name===basename)return path.join(folder,item.name);if(item.isDirectory()){const found=await find(path.join(folder,item.name));if(found)return found;}}};
  const binary=await find(temp);if(!binary)throw Error('发布包中缺少引擎');await copyFile(binary,path.join(dir,basename));if(!tag.startsWith('win32'))await chmod(path.join(dir,basename),0o755);
  const license=path.join(temp,'siteone-crawler','LICENSE');try{const text=await readFile(license,'utf8');await mkdir(path.join(resourceRoot,'licenses'),{recursive:true});await writeFile(path.join(resourceRoot,'licenses','SiteOne-MIT.txt'),text);}catch{/* bundled notices also carry upstream text */}
  return path.join(dir,basename);
 }finally{await rm(temp,{recursive:true,force:true});}
}
