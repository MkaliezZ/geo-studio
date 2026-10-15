import {app,BrowserWindow,ipcMain,safeStorage,shell} from 'electron';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import {Store,type KeyCodec} from '../core/store.js';
import {ComponentManager} from '../core/components.js';
import {Service} from '../core/service.js';
const here=path.dirname(fileURLToPath(import.meta.url));let service:Service|undefined;let timer:NodeJS.Timeout|undefined;
const smoke=process.argv.includes('--smoke-test');const dev=!app.isPackaged&&!smoke;
if(smoke)console.log('GEO_SMOKE_STAGE entry');
if(smoke)app.setPath('userData',mkdtempSync(path.join(os.tmpdir(),'geo-native-')));
// Do not await app.whenReady at ESM top level: Electron waits for entry evaluation.
void app.whenReady().then(async()=>{
if(smoke)console.log('GEO_SMOKE_STAGE ready');
const safe=safeStorage.isEncryptionAvailable()&&!(process.platform==='linux'&&safeStorage.getSelectedStorageBackend()==='basic_text');
const codec:KeyCodec=safe?{kind:'OS-encrypted',encrypt:s=>safeStorage.encryptString(s),decrypt:b=>safeStorage.decryptString(b)}:{kind:'session-only'};
const store=new Store(app.getPath('userData'),codec);await store.init();
if(smoke)console.log('GEO_SMOKE_STAGE store');
service=new Service(store,new ComponentManager(app.getAppPath(),app.isPackaged?process.resourcesPath:path.join(app.getAppPath(),'resources'),app.isPackaged));
function createWindow(){
 const win=new BrowserWindow({width:1440,height:1000,minWidth:900,minHeight:650,show:!smoke,title:'GEO Studio',backgroundColor:'#ffffff',webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//.test(url))void shell.openExternal(url);return {action:'deny'};});
 win.webContents.on('will-navigate',(event,url)=>{if(dev?new URL(url).origin!=='http://127.0.0.1:5173':!url.startsWith('file:'))event.preventDefault();});
 if(smoke)win.webContents.once('did-finish-load',async()=>{
  try{const status=await service!.request('components.status');const rules=await service!.components.parseRobots('User-agent: *\nDisallow: /private/\n',['https://example.com/private/a'],['OAI-SearchBot']);const encryptionRoundTrip=safe?codec.decrypt!(codec.encrypt!('round-trip-probe'))==='round-trip-probe':null;
   const result={rendererLoaded:true,components:status,robotsDenied:rules[0]?.allowed===false,keyStorage:codec.kind,encryptionRoundTrip,platform:process.platform,arch:process.arch};writeFileSync(path.join(app.getPath('userData'),'smoke.json'),JSON.stringify(result,null,2));console.log('GEO_NATIVE_SMOKE '+JSON.stringify(result));app.exit(status.engine.ready&&status.robots.ready&&rules[0]?.allowed===false?0:1);
  }catch(e){console.error('GEO_NATIVE_SMOKE_FAILED',e instanceof Error?e.message:'failed');app.exit(1);}
 });
 if(dev)void win.loadURL('http://127.0.0.1:5173');else void win.loadFile(path.join(here,'../renderer/index.html'));
}
ipcMain.handle('geo:request',async(event,action,payload)=>{
 const url=event.senderFrame?.url||'';if(dev?!url.startsWith('http://127.0.0.1:5173/'):!url.startsWith('file:'))throw Error('不允许的请求来源');
 try{return await service!.request(action,payload);}catch(e){throw Error(e instanceof Error?e.message:'操作失败');}
});
createWindow();timer=setInterval(()=>void service?.tick(),30000);timer.unref();
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('before-quit',()=>{if(timer)clearInterval(timer);service?.stop();});
}).catch(e=>{console.error(e instanceof Error?e.message:'应用启动失败');app.exit(1);});
