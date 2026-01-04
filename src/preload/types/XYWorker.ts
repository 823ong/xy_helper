import { UtilityProcess } from "electron";
import { PhoneData } from "../../main/database/entities/PhoneData";
import WebContents = Electron.WebContents;

export interface XYWorkerBaseInfo {
  running: boolean;
  checkRunning: boolean;
  currentPhoneInfo: PhoneData | null;
  phoneList: PhoneData[];
  currentPlatform: string;
  successCount: number;
  balance: string;
}

export interface XYWorkerInfo extends XYWorkerBaseInfo {
  webContents: WebContents | null;
  xyWorkerProcess: UtilityProcess | null;
}
