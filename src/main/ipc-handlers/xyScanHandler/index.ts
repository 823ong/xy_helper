import { app, BrowserWindow, ipcMain, shell, utilityProcess } from "electron";
import path, { join } from "path";
import { TransferCommand, TransferLog } from "../../../preload/types/api";
import { XYWorkerBaseInfo, XYWorkerInfo } from "../../../preload/types/XYWorker";
import { getAPI } from "../../utils/smsCode/smsCodePlatformAPI";
import { PhoneData } from "../../database/entities/PhoneData";
import fs from "fs";
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;

export const xyScanInfo: XYWorkerInfo & { getInfo: () => XYWorkerBaseInfo } = {
  running: false,
  checkRunning: false,
  currentPhoneInfo: null,
  phoneList: [],
  xyWorkerProcess: null,
  webContents: null,
  currentPlatform: '',
  successCount: 0,
  balance: '',
  getInfo(): XYWorkerBaseInfo {
    return {
      running: this.running,
      currentPlatform: this.currentPlatform,
      checkRunning: this.checkRunning,
      currentPhoneInfo: this.currentPhoneInfo,
      phoneList: this.phoneList,
      successCount: this.successCount,
      balance: this.balance
    }
  }
}

export function registerXyScanHandler() {
  const initProcess = async (event: IpcMainInvokeEvent) => {
    xyScanInfo.webContents = event.sender
    try {
      startWorkerProcess()
    } catch (error: any) {
      console.error(error)
    }
  }
  ipcMain.handle('xyScan:update', async (event, data: TransferCommand) => {
    if (!xyScanInfo.xyWorkerProcess) {
      await initProcess(event)
    }
    const command = data.command
    switch (command) {
      case 'start':
        if (!xyScanInfo.running) {
          xyScanInfo.running = true
          workLoop().catch((error) => {
            xySendLog2UI({
              type: 'log',
              level: 'error',
              content: error.message
            })
          })
          sendToWorker(data)
        }
        break
      case 'stop':
        xyScanInfo.running = false
        sendToWorker(data)
        break
      case 'switchPlatform':
        xyScanInfo.currentPlatform = data.payload as string
        break
      case 'getRefresh':
        try {
          const platformAPI = getAPI(xyScanInfo.currentPlatform)
          // 配置信息覆盖API初始信息
          xyScanInfo.balance = await platformAPI.getMoney()
        } catch (error) {
          xySendLog2UI({
            type: 'log',
            level: 'error',
            content: `"获取余额错误:${error}`
          })
        }
        break
      case 'openSuccessFile':
        const filePath = path.join(app.getPath('userData'), '可用号码.txt')
        if (fs.existsSync(filePath)) {
          await shell.openPath(filePath)
        } else {
          xySendLog2UI({
            type: 'log',
            level: 'error',
            content: '结果文件不存在，请先运行任务！'
          })
        }
        break
    }
    broadcastXyScanInfoUpdate()
  })
}

function sendToWorker(message: any): void {
  if (!xyScanInfo.xyWorkerProcess) {
    console.log('process is null, send fail')
    return
  }
  xyScanInfo.xyWorkerProcess.postMessage(message)
}

function broadcastXyScanInfoUpdate() {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    if (win.webContents) {
      win.webContents.send('xyScan:onUpdated', xyScanInfo.getInfo())
    }
  })
  sendToWorker({
    command: 'syncStatus',
    payload: {
      running: xyScanInfo.running,
      currentPhone: xyScanInfo.currentPhoneInfo?.phone
    }
  })
}

export function xySendLog2UI(message: TransferLog): void {
  const webContents = xyScanInfo.webContents
  if (!webContents) {
    console.log('webContents is null, send fail')
    return
  }
  webContents.send('xyScan:log', message)
}

function appendLineToFile(line: string) {
  const filePath = path.join(app.getPath('userData'), '可用号码.txt')
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // 使用追加模式写入文件，自动创建文件（如果不存在）
  fs.appendFile(filePath, line + '\n', (err) => {
    if (err) {
      console.error('写入文件失败:', err)
    } else {
      console.log(`成功追加一行到文件: ${filePath}`)
    }
  })
}
function isExist(phone: string): boolean {
  const filePath = path.join(app.getPath('userData'), '可用号码.txt')

  // 1. 文件不存在 → 肯定不存在该号码
  if (!fs.existsSync(filePath)) {
    return false
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return content.includes(phone.trim())
  } catch (err) {
    console.error('读取文件失败:', err)
    xySendLog2UI({
      type: 'log',
      level: 'error',
      content: '读取文件失败: ' + err
    })
    return false
  }
}

let lastSendLog = ''

// 获取 worker 文件路径
function getWorkerPath(): string {
  if (app.isPackaged) {
    // 打包后：workers 被打包到 out/main/workers/，打包後相對路徑可能改變
    // 實際上 Vite 打包後，main 的入口在 out/main/index.js
    // workers 在 out/main/workers/
    // app.getAppPath() 指向 Resources/app.asar
    return join(app.getAppPath(), 'out', 'main', 'workers', 'xyScan.js')
  } else {
    // 開發環境：electron-vite 會將 main 打包到 out/main/
    return join(app.getAppPath(), 'out', 'main', 'workers', 'xyScan.js')
  }
}

function startWorkerProcess(): void {
  console.log('开始启动')
  const workerProcessPath = getWorkerPath()
  console.log('启动路径:', workerProcessPath)

  const workerProcess = utilityProcess.fork(workerProcessPath, [], {
    serviceName: 'xyScan Service',
    stdio: 'pipe',
    env: {
      ...process.env,
      USER_DATA_PATH: app.getPath('userData')
    }
  })
  xyScanInfo.xyWorkerProcess = workerProcess

  // 监听 worker 消息
  workerProcess.on('message', async (message: any) => {
    // console.log("收到 Worker 消息:", message);

    switch (message.type) {
      case 'log': {
        // console.log("发送日志到UI");
        if (message.content) {
          if (message.content === lastSendLog) {
            break
          }
          lastSendLog = message.content
        }
        xySendLog2UI(message as TransferLog)
        break
      }
      case 'data': {
        const data = message.content as {
          status: number
          reason: string
        }
        const currentPhoneInfo = xyScanInfo.currentPhoneInfo
        if (!currentPhoneInfo) {
          console.error('worker receiveData error, currentPhoneInfo null')
          break
        }
        const phone = currentPhoneInfo.phone
        // const pt = currentPhoneInfo.pt;
        // const reason = data.reason;
        const noPass = data.status === -1 || data.status === 3
        xySendLog2UI({
          type: 'log',
          level: 'info',
          content: `处理结果: ${!noPass ? '可用' : '无用'}`
        })
        if (noPass) {
          const api = getAPI(xyScanInfo.currentPlatform)
          try{
            await api.blockPhone(phone);
            xySendLog2UI({
              type: 'log',
              level: 'debug',
              content: `已拉黑号码${phone}`
            })
          }catch (e){
            xySendLog2UI({
              type: 'log',
              level: 'debug',
              content: `拉黑号码失败`
            })
          }
        } else {
          const api = getAPI(xyScanInfo.currentPlatform)
          appendLineToFile(
            `${new Date().toISOString().substring(0, 23)}-${xyScanInfo.currentPlatform}-${api.projectId}-${phone}`
          )
          xyScanInfo.successCount++
        }
        // 处理完毕了,当前号码置空,让工作循环自动处理
        xyScanInfo.currentPhoneInfo = null
        xyScanInfo.checkRunning = false
        broadcastXyScanInfoUpdate()
      }
    }
  })

  // 监听标准输出
  if (workerProcess.stdout) {
    workerProcess.stdout.on('data', (data) => {
      // console.log("[Worker stdout]:", data.toString());
      if (data?.toString() === lastSendLog) {
        return
      }
      lastSendLog = data?.toString()
      xySendLog2UI({
        type: 'log',
        level: 'info',
        content: data.toString()
      })
    })
  }
  // 监听标准错误
  if (workerProcess.stderr) {
    workerProcess.stderr.on('data', (data) => {
      // console.error("[Worker stderr]:", data.toString());
      xySendLog2UI({
        type: 'log',
        level: 'error',
        content: data.toString()
      })
    })
  }
}

async function workLoop() {
  const sleep = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms))
  while (xyScanInfo.running) {
    // 正在检查
    if (xyScanInfo.currentPhoneInfo?.phone) {
      await sleep(1000)
      continue
    }
    try {
      const phone = await getAPI(xyScanInfo.currentPlatform).getPhone()
      xySendLog2UI({
        type: 'log',
        level: 'info',
        content: `平台${xyScanInfo.currentPlatform}获取到号码:${phone}`
      })
      if (isExist(phone)) {
        xySendLog2UI({
          type: 'log',
          level: 'info',
          content: `号码${phone}已存在,重新获取`
        })
        continue
      }
      xyScanInfo.currentPhoneInfo = {
        phone,
        pt: xyScanInfo.currentPlatform
      } as PhoneData
      if (!phone) {
        xySendLog2UI({
          type: 'log',
          level: 'error',
          content: '未找到可用手机'
        })
        xyScanInfo.running = false
      }
      broadcastXyScanInfoUpdate()
    } catch (e) {
      xyScanInfo.running = false
      console.log(e)
      xySendLog2UI({
        type: 'log',
        level: 'error',
        content: `获取手机失败:${e}`
      })
      broadcastXyScanInfoUpdate()
    }
    await sleep(1000)
  }
}
