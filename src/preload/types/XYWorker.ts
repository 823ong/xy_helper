import { UtilityProcess } from "electron";
import { PhoneData } from "../../main/database/entities/PhoneData";
import WebContents = Electron.WebContents;

export interface XYWorkerBaseInfo {
  running: boolean;
  checkRunning: boolean;
  currentPhoneInfo: PhoneData | null;
  currentPlatform: string;
  successCount: number;
  balance: string;
  // 单位:毫秒
  getPhoneInterval: number;
  enableProxy: boolean;
  fetchProxyUrl: string;
}

export interface XYWorkerInfo extends XYWorkerBaseInfo {
  webContents: WebContents | null;
  xyWorkerProcess: UtilityProcess | null;
}
