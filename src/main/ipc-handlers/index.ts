import { registerAxiosHandler, unregisterAxiosHandler } from "./axiosHandler";
import { registerXyScanHandler } from "./xyScanHandler";
import { registerSystemSettingsHandler, unregisterSystemSettingsHandler } from "./systemSettingsHandler";
import { registerDatabaseHandler } from "./databaseHandler";
import { registerPhoneDataHandler } from "./phoneDataHandler";
import { registerXyCKGetterHandler } from './cookiePickerHandler'
import { initUpdater } from "./updaterHandler"

/**
 * 注册所有的IPC handlers
 */
export function registerAllHandlers(): void {
  // 注册axios请求handler
  registerSystemSettingsHandler()
  registerAxiosHandler()
  registerXyScanHandler()
  registerXyCKGetterHandler()
  registerDatabaseHandler()
  registerPhoneDataHandler()
  // 初始化更新模块
  initUpdater()

  console.log('all IPC handlers registered')
}

/**
 * 移除所有的IPC handlers
 */
export function unregisterAllHandlers(): void {
  // 移除axios请求handler
  unregisterAxiosHandler()
  unregisterSystemSettingsHandler()

  console.log('all IPC handlers removed')
}
