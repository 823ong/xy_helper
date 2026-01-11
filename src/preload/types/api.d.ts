import { SmsPlatformInfo } from "../../main/utils/smsCode/smsCodePlatformAPI";
import { EntityTarget } from "typeorm";
import { ElectronAPI } from "@electron-toolkit/preload";

export interface SystemSettings extends Record<string, any> {
  theme: "light" | "dark" | "auto";
  database?: {
    url: string;
    username: string;
    password: string;
    database: string;
  };
  smsPlatform: SmsPlatformInfo[];
  xyScan?: {
    fetchSize: number
    autoFetchTriggerSize: number
  };
}

export interface SyncConfig {
  id: number;
  configName: string;
  config: SystemSettings;
  updateAt: Date;
}

/**
 * API相关的类型定义
 * 这些类型由主进程、preload进程和渲染进程共享
 */
export interface AxiosRequestConfig {
  url?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  baseURL?: string;
  headers?: Record<string, string>;
  params?: any;
  data?: any;
  timeout?: number;
  responseType?: "json" | "text" | "blob" | "arraybuffer";

  [key: string]: any;
}

export interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
}

export interface AxiosError {
  error: true;
  message: string;
  code?: string;
  response?: {
    data: any
    status: number
    statusText: string
    headers: Record<string, string>
  };
}

/**
 * 所有 Transfer 消息的基类型（可辨识联合）
 */
export type TransferMessage = TransferData<any> | TransferLog | TransferCommand

/**
 * 结构化数据消息
 */
export interface TransferData<T = Record<string, unknown>> {
  type: "data";
  content: T;
}

/**
 * 日志消息
 */
export interface TransferLog {
  type: "log";
  level: "debug" | "info" | "warn" | "error";
  content: string;
}

/**
 * 命令消息（用于触发主进程操作）
 */
export interface TransferCommand {
  type: "command";
  command: string; // 命令名，如 'open-file', 'save-config'
  payload?: unknown; // 可选参数
}

interface DBParams<T = any> {
  sql: string;
  args?: any[];
  entity?: EntityTarget<T>; // 如果提供 entity，结果可自动映射为 T[]
}

export interface MainAPI {
  systemSettings: {
    get: () => Promise<Record<string, any>>
    set: (settings: Record<string, any>) => Promise<void>
    onChange: (func: (setting: SystemSettings) => void) => void,
    refreshAllBalance: () => Promise<boolean>
    refreshBalance: (string) => Promise<boolean>
    listSyncConfigs: () => Promise<SyncConfig[]>
    createSyncConfig: (name: string, config: Record<string, any>) => Promise<{ success: boolean; error?: string }>
    deleteSyncConfig: (id: number) => Promise<{ success: boolean; error?: string }>
    getSyncConfig: (id: number) => Promise<Record<string, any> | null>
  },
  database: {
    testConnection: (config: Record<string, any>) => Promise<{ success: boolean; error?: string }>
    exec: (param: DBParams<T>) => Promise<any>
  }
  // 发起HTTP请求的IPC接口
  axiosRequest: (config: AxiosRequestConfig) => Promise<AxiosResponse>
  xyScan: {
    update: (command: TransferCommand) => Promise<any>
    listenLog: (func: Function) => void
    onUpdated: (func: Function) => void
  },
  xyCKGetter: {
    update: (command: TransferCommand) => Promise<any>
    listenLog: (func: Function) => void
    onUpdated: (func: Function) => void
  }
  onGlobalLog: (func: (message: TransferLog) => void) => void
  // 自动更新相关接口
  updater: {
    checkForUpdates: () => Promise<UpdaterCheckResult>
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>
    installUpdate: () => Promise<{ success: boolean; error?: string }>
    getCurrentVersion: () => Promise<{ success: boolean; version: string }>
    onDownloadProgress: (callback: (progress: UpdateProgress) => void) => void
    onUpdateDownloaded: (callback: (info: { version: string }) => void) => void
    onError: (callback: (error: { error: string }) => void) => void
  }
}

// 更新相关类型定义
export interface UpdateInfo {
  version: string
  releaseDate?: string
  updateContent?: string
}

export interface UpdaterCheckResult {
  success: boolean
  hasUpdate?: boolean
  updateInfo?: UpdateInfo
  error?: string
}

export interface UpdateProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

export interface WinAPI {
  electron: ElectronAPI;
  api: MainAPI;
}
