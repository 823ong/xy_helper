import d1jiemaAPI from "./d1jiemaAPI";
import taxinAPI from "./taxinAPI";
import eomsgAPI from "./eomsgAPI";
import haozhuAPI from "./haozhuAPI";
import axios, { AxiosRequestConfig } from "axios";
import { currentConfig } from "../../ipc-handlers/systemSettingsHandler";
import testAPI from "./testAPI";

export interface SmsPlatformInfo {
  name: string
  enable?: boolean
  baseURL: string
  projectId?: string
  token?: string
  username?: string
  password?: string
  balance?: string
}

export interface PlatformAPI {
  name: string
  enable?: boolean
  baseURL: string
  projectId?: string
  token?: string
  username?: string
  password?: string
  balance?: string
  getPhone: () => Promise<string>
  getMoney: () => Promise<string>
  blockPhone: (phone: string) => Promise<boolean>
  init: () => Promise<void>
}

export const SmsPlatformAPIs: Record<string, PlatformAPI> = {
  d1jiema: d1jiemaAPI,
  eomsg: eomsgAPI,
  '豪猪': haozhuAPI,
  '他信': taxinAPI,
  'test': testAPI
}

/**
 * 给当前文件夹用的, 统一设置请求参数
 * @param config
 */
export const axiosRequest = async (config: AxiosRequestConfig) => {
  return await axios(Object.assign({
    timeout: 10000
  }, config))
}

export const getAPI = (platform: string): PlatformAPI => {
  const smsPlatformList = currentConfig.smsPlatform;
  const info = smsPlatformList.find(p => p.name === platform);
  const smsPlatformAPI = SmsPlatformAPIs[platform];
  if (info && smsPlatformAPI) {
    Object.assign(smsPlatformAPI, info);
  }
  return smsPlatformAPI;
};
