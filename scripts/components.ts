import path from 'node:path';
import {installEngine} from '../src/core/installer.js';
import {runProcess} from '../src/core/process.js';
const resourceRoot=path.resolve('resources');
console.log('安装 SiteOne 2.5.1（SHA256 校验）…');
await installEngine(resourceRoot);
if(process.argv.includes('--release')){
 const tag=process.platform+'-'+process.arch;const dir=path.join(resourceRoot,'bin',tag);
 await runProcess(process.platform==='win32'?'python':'python3',['-m','venv','.runtime/build-env'],{timeout:60000});
 const buildPython=path.join('.runtime','build-env',process.platform==='win32'?'Scripts/python.exe':'bin/python');
 await runProcess(buildPython,['-m','pip','install','protego==0.7.0','pyinstaller==6.16.0'],{timeout:180000});
 await runProcess(buildPython,['-m','PyInstaller','--onefile','--name','geo-robots','--distpath',dir,'--workpath','.runtime/pyinstaller','--specpath','.runtime','resources/robots_worker.py'],{timeout:180000});
}else{
 const python=path.join('.runtime','robots-env',process.platform==='win32'?'Scripts/python.exe':'bin/python');
 await runProcess('uv',['venv','.runtime/robots-env'],{timeout:60000});
 await runProcess('uv',['pip','install','--python',python,'protego==0.7.0'],{timeout:60000});
}
console.log('组件安装完成。');
