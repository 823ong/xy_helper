import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";
import { DBParams, MainAPI, TransferCommand } from "./types/api";
import { XYWorkerBaseInfo } from "./types/XYWorker";

// Custom APIs for renderer
const api: MainAPI = {
  // 系统设置
  systemSettings: {
    get: async () => await ipcRenderer.invoke("systemSettings:get"),
    set: async (settings: Record<string, any>) => await ipcRenderer.invoke("systemSettings:set", settings),
    onChange: (func) => ipcRenderer.on("systemSettings:onChange", (_event, args) => func(args)),
    refreshAllBalance: async () => await ipcRenderer.invoke("systemSettings:refreshAllBalance"),
    refreshBalance: async () => await ipcRenderer.invoke("systemSettings:refreshBalance"),
    listSyncConfigs: async () => await ipcRenderer.invoke("systemSettings:listSyncConfigs"),
    createSyncConfig: async (name: string, config: any) => await ipcRenderer.invoke("systemSettings:createSyncConfig", name, config),
    deleteSyncConfig: async (id: number) => await ipcRenderer.invoke("systemSettings:deleteSyncConfig", id),
    getSyncConfig: async (id: number) => await ipcRenderer.invoke("systemSettings:getSyncConfig", id),
  },
  database: {
    testConnection: async (config?: any) => await ipcRenderer.invoke("db:test-connection", config),
    exec: async (param?: DBParams) => await ipcRenderer.invoke("db:exec", param)
  },
  onGlobalLog: (func) => ipcRenderer.on("global:log", (_event, arg) => func(arg)),
  // 发起HTTP请求的IPC接口
  axiosRequest: (config: any) => ipcRenderer.invoke("axios-request", config),
  xyScan: {
    update: async (command: TransferCommand) => await ipcRenderer.invoke("xyScan:update", command),
    listenLog: (func) => ipcRenderer.on("xyScan:log", (_event, ...args) => func(...args)),
    onUpdated: (func) => ipcRenderer.on("xyScan:onUpdated", (_event, info: XYWorkerBaseInfo) => func(info))
  },
  xyCKGetter: {
    update: async (command: TransferCommand) => await ipcRenderer.invoke("xyCKGetter:update", command),
    listenLog: (func) => ipcRenderer.on("xyCKGetter:log", (_event, ...args) => func(...args)),
    onUpdated: (func) => ipcRenderer.on("xyCKGetter:onUpdated", (_event, info: XYWorkerBaseInfo) => func(info))
  },
  // 自动更新相关接口
  updater: {
    checkForUpdates: async () => await ipcRenderer.invoke("updater:checkForUpdates"),
    downloadUpdate: async () => await ipcRenderer.invoke("updater:downloadUpdate"),
    installUpdate: async () => await ipcRenderer.invoke("updater:installUpdate"),
    getCurrentVersion: async () => await ipcRenderer.invoke("updater:getCurrentVersion"),
    onDownloadProgress: (callback) => ipcRenderer.on("updater:downloadProgress", (_event, progress) => callback(progress)),
    onUpdateDownloaded: (callback) => ipcRenderer.on("updater:updateDownloaded", (_event, info) => callback(info)),
    onError: (callback) => ipcRenderer.on("updater:error", (_event, error) => callback(error))
  }
};

try {
  contextBridge.exposeInMainWorld("electron", electronAPI);
  contextBridge.exposeInMainWorld("api", api);
} catch (error) {
  console.error(error);
}
