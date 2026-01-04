import type { WinAPI, AxiosRequestConfig, AxiosResponse } from "./types/api";

declare global {
  // 使用共享的 Window 接口扩展
  interface Window extends WinAPI {
  }
}

// 导出类型供其他地方使用
export type { AxiosRequestConfig, AxiosResponse } from "./types/api";
