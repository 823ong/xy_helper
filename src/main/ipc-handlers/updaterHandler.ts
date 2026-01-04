import { ipcMain, app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

// 配置 autoUpdater logger
autoUpdater.logger = log
autoUpdater.autoDownload = false // 不自动下载，让用户选择
autoUpdater.autoInstallOnAppQuit = false // 不在退出时自动安装

// 更新状态接口
interface UpdateInfo {
  version: string
  releaseDate?: string
  updateContent?: string
}

// 检查更新
ipcMain.handle('updater:checkForUpdates', async () => {
  try {
    log.info('Checking for updates...')
    const updateResult = await autoUpdater.checkForUpdates()

    if (!updateResult) {
      return {
        success: true,
        hasUpdate: false,
        updateInfo: null
      }
    }

    const updateInfo: UpdateInfo = {
      version: updateResult.updateInfo.version,
      releaseDate: updateResult.updateInfo.releaseDate,
      updateContent: updateResult.updateInfo.releaseNotes as string
    }

    return {
      success: true,
      hasUpdate: updateResult !== null,
      updateInfo
    }
  } catch (error: any) {
    log.error('Check for updates failed:', error)
    return {
      success: false,
      error: error.message || '检查更新失败'
    }
  }
})

// 下载更新
ipcMain.handle('updater:downloadUpdate', async () => {
  try {
    log.info('Downloading update...')
    await autoUpdater.downloadUpdate()

    return {
      success: true
    }
  } catch (error: any) {
    log.error('Download update failed:', error)
    return {
      success: false,
      error: error.message || '下载更新失败'
    }
  }
})

// 安装更新并重启
ipcMain.handle('updater:installUpdate', async () => {
  try {
    log.info('Installing update...')
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true)
    })

    return {
      success: true
    }
  } catch (error: any) {
    log.error('Install update failed:', error)
    return {
      success: false,
      error: error.message || '安装更新失败'
    }
  }
})

// 获取当前版本
ipcMain.handle('updater:getCurrentVersion', async () => {
  return {
    success: true,
    version: app.getVersion()
  }
})

// 监听更新下载进度
autoUpdater.on('download-progress', (progress) => {
  log.info('Download progress:', progress)
  // 转发进度到渲染进程
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    mainWindow.webContents.send('updater:downloadProgress', {
      percent: Math.floor(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    })
  }
})

// 监听更新下载完成
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info)
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    mainWindow.webContents.send('updater:updateDownloaded', {
      version: info.version
    })
  }
})

// 监听更新错误
autoUpdater.on('error', (error) => {
  log.error('Updater error:', error)
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    mainWindow.webContents.send('updater:error', {
      error: error.message || '更新出错'
    })
  }
})

// 导出初始化函数
export function initUpdater() {
  log.info('Updater initialized')
}
