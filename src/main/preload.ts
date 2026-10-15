import {contextBridge,ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('geo',{request:(action:string,payload:unknown)=>ipcRenderer.invoke('geo:request',action,payload)});
