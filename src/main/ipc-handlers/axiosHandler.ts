import axios from 'axios'
import { ipcMain } from 'electron'

/**
 * 注册axios请求的IPC handler
 * 用于处理来自渲染进程的HTTP请求，避免CORS跨域问题
 */
export function registerAxiosHandler(): void {
  ipcMain.handle('axios-request', async (_event, config) => {
    try {
      const response = await axios({ timeout: 30000, ...config })
      const { data, status, statusText, headers } = response
      return { data, status, statusText, headers }
    } catch (error: any) {
      // 返回错误信息
      if (error.response) {
        const { data, status, statusText, headers } = error.response
        return {
          error: true,
          message: error.message,
          response: { data, status, statusText, headers }
        }
      }
      return { error: true, message: error.message, code: error.code }
    }
  })
}

/**
 * 移除axios请求的IPC handler
 */
export function unregisterAxiosHandler(): void {
  ipcMain.removeHandler('axios-request')
}
