import { BrowserWindow, app, ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";
import { SystemSettings } from "../../preload/types/api";
import { SmsPlatformAPIs } from "../utils/smsCode/smsCodePlatformAPI";
import { SystemConfig } from "../database/entities/SystemConfig";
import { getRepository } from "../database/dataSource";
import dayjs from "dayjs";
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;

export const defaultConfig: SystemSettings = {
  theme: "light",
  database: {
    url: "",
    username: "",
    password: "",
    database: ""
  },
  smsPlatform: [
    { name: "eomsg", baseURL: "http://api.eomsg.com/zc/data.php" },
    { name: "d1jiema", baseURL: "http://api.d1jiema.com/zc/data.php" },
    { name: "豪猪", baseURL: "https://api.haozhuyun.com" },
    { name: "他信", baseURL: "http://api.my531.com" }
  ]
};
export let currentConfig: SystemSettings = defaultConfig;

// 获取系统设置文件路径
function getSettingsFilePath(): string {
  if (app.isPackaged) {
    // 打包环境：使用 userData 目录（用户有写入权限）
    return path.join(app.getPath('userData'), 'system.setting.json')
  } else {
    // 开发环境：使用项目根目录
    return path.join(process.cwd(), 'system.setting.json')
  }
}

export function registerSystemSettingsHandler(): void {
  ipcMain.handle("systemSettings:set", setConfig);
  ipcMain.handle("systemSettings:get", getConfig);

  ipcMain.handle("systemSettings:refreshBalance", refreshBalance);
  ipcMain.handle("systemSettings:refreshAllBalance", refreshAllBalance);

  ipcMain.handle("systemSettings:listSyncConfigs", listSyncConfigs);
  ipcMain.handle("systemSettings:createSyncConfig", createSyncConfig);
  ipcMain.handle("systemSettings:deleteSyncConfig", deleteSyncConfig);
  ipcMain.handle("systemSettings:getSyncConfig", getSyncConfig);
}

/**
 * 移除axios请求的IPC handler
 */
export function unregisterSystemSettingsHandler(): void {
  ipcMain.removeHandler("systemSettings:set");
  ipcMain.removeHandler("systemSettings:get");
  ipcMain.removeHandler("systemSettings:listSyncConfigs");
  ipcMain.removeHandler("systemSettings:createSyncConfig");
  ipcMain.removeHandler("systemSettings:deleteSyncConfig");
  ipcMain.removeHandler("systemSettings:getSyncConfig");
}

const sanitizeConfig = (config: SystemSettings): Partial<SystemSettings> => {
  const { database, ...rest } = config;
  return rest;
};

const setConfig = async (_event: IpcMainInvokeEvent, config: SystemSettings) => {
  try {
    // 将配置对象序列化为JSON字符串
    const configJson = JSON.stringify(config);
    // 写入文件
    fs.writeFileSync(getSettingsFilePath(), configJson, "utf8");
    try {
      const repository = await getRepository(SystemConfig);
      await repository.save({
        configName: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        config: sanitizeConfig(config)
      });
    } catch (e) {
      console.error(e);
    }

    // Update currentConfig in memory
    Object.assign(currentConfig, config);
    broadcastSystemSettingsChange();
    return { success: true };
  } catch (error) {
    console.error("Failed to save system settings:", error);
    return { success: false, error: JSON.stringify(error) };
  }
};

const getConfig = async (_event: IpcMainInvokeEvent) => {
  try {
    // 检查文件是否存在
    const settingsPath = getSettingsFilePath()
    if (!fs.existsSync(settingsPath)) {
      return defaultConfig;
    }

    // 读取文件内容
    const configJson = fs.readFileSync(settingsPath, "utf8");

    // 解析JSON
    const config = JSON.parse(configJson);
    Object.assign(currentConfig, config);
    return config;
  } catch (error) {
    console.error("Failed to load system settings:", error);
    // 读取失败或解码失败时返回默认配置
    return defaultConfig;
  }
};

const broadcastSystemSettingsChange = async () => {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(win => {
    if (win.webContents) {
      win.webContents.send("systemSettings:onChange", currentConfig);
    }
  });
}
const refreshBalance = async (_event: IpcMainInvokeEvent, platformName: string) => {
  try {
    let changed = false;
    const name = platformName;
    const platformAPI = SmsPlatformAPIs[name];
    const platform = currentConfig.smsPlatform.find(p => p.name === name);
    // 配置信息覆盖API初始信息
    if (platformAPI && platform) {
      Object.assign(platformAPI, platform);
      try {
        platform.balance = await platformAPI.getMoney();
        changed = true;
      } catch (error) {
        console.warn("getMoney error:", platform, error);
      }
    }
    if (changed) {
      await setConfig(_event, currentConfig);
    }
    return changed;
  } catch (error) {
    console.error("refreshAllBalance error:", error);
    return false;
  }
};
const refreshAllBalance = async (_event: IpcMainInvokeEvent) => {
  try {
    let changed = false;
    for (const platform of currentConfig.smsPlatform) {
      const name = platform.name;
      const platformAPI = SmsPlatformAPIs[name];
      // 配置信息覆盖API初始信息
      Object.assign(platformAPI, platform);
      if (platformAPI) {
        try {
          platform.balance = await platformAPI.getMoney();
          changed = true;
        } catch (error) {
          console.warn("getMoney error:", platform, error);
        }
      }
    }
    if (changed) {
      await setConfig(_event, currentConfig);
    }
    return changed;
  } catch (error) {
    console.error("refreshAllBalance error:", error);
    return false;
  }
};

const listSyncConfigs = async () => {
  try {
    const repository = await getRepository(SystemConfig);
    return await repository.find({
      order: {
        updateAt: "DESC"
      }
    });
  } catch (error) {
    console.error("Failed to list sync configs:", error);
    return [];
  }
};

const createSyncConfig = async (_event: IpcMainInvokeEvent, name: string, config: SystemSettings) => {
  try {
    const repository = await getRepository(SystemConfig);
    const newConfig = new SystemConfig();
    newConfig.configName = name;
    newConfig.config = sanitizeConfig(config);
    await repository.save(newConfig);
    return { success: true };
  } catch (error) {
    console.error("Failed to create sync config:", error);
    return { success: false, error: JSON.stringify(error) };
  }
};

const deleteSyncConfig = async (_event: IpcMainInvokeEvent, id: number) => {
  try {
    const repository = await getRepository(SystemConfig);
    await repository.delete(id);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete sync config:", error);
    return { success: false, error: JSON.stringify(error) };
  }
};

const getSyncConfig = async (_event: IpcMainInvokeEvent, id: number) => {
  try {
    const repository = await getRepository(SystemConfig);
    const config = await repository.findOne({ where: { id } });
    return config ? sanitizeConfig(config.config) : null;
  } catch (error) {
    console.error("Failed to get sync config:", error);
    return null;
  }
};
