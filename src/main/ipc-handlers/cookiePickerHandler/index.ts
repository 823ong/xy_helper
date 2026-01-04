import { BrowserWindow, app, ipcMain, utilityProcess } from 'electron'
import { join } from 'path'
import { TransferCommand, TransferLog } from '../../../preload/types/api'
import { XYWorkerBaseInfo, XYWorkerInfo } from '../../../preload/types/XYWorker'
import { getCertifiedPhone, updatePhoneStatus } from '../xyScanHandler/fetchPhone'
import { getAPI } from '../../utils/smsCode/smsCodePlatformAPI'
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent

export const xyCKGetterInfo: XYWorkerInfo & { getInfo: () => XYWorkerBaseInfo } = {
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
      checkRunning: this.checkRunning,
      currentPhoneInfo: this.currentPhoneInfo,
      phoneList: this.phoneList,
      currentPlatform: '',
      successCount: this.successCount,
      balance: this.balance
    }
  }
}

export function registerXyCKGetterHandler() {
  const initProcess = async (event: IpcMainInvokeEvent) => {
    xyCKGetterInfo.webContents = event.sender
    try {
      startWorkerProcess()
    } catch (error: any) {
      console.error(error)
    }
  }
  ipcMain.handle('xyCKGetter:update', async (event, data: TransferCommand) => {
    if (!xyCKGetterInfo.xyWorkerProcess) {
      await initProcess(event)
    }
    const command = data.command
    switch (command) {
      case 'start':
        if (!xyCKGetterInfo.running) {
          xyCKGetterInfo.running = true
          sendToWorker(data)
          workLoop().catch((error) => {
            xySendLog2UI({
              type: 'log',
              level: 'error',
              content: error.message
            })
          })
        }
        break
      case 'stop':
        xyCKGetterInfo.running = false
        sendToWorker(data)
        break
    }
    broadcastXyCKGetterInfoUpdate()
  })
}

function sendToWorker(message: any): void {
  if (!xyCKGetterInfo.xyWorkerProcess) {
    console.log('process is null, send fail')
    return
  }
  xyCKGetterInfo.xyWorkerProcess.postMessage(message)
}

function broadcastXyCKGetterInfoUpdate() {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    if (win.webContents) {
      win.webContents.send('xyCKGetter:onUpdated', xyCKGetterInfo.getInfo())
    }
  })
  sendToWorker({
    command: 'syncStatus',
    payload: {
      running: xyCKGetterInfo.running,
      currentPhone: xyCKGetterInfo.currentPhoneInfo?.phone
    }
  })
}

export function xySendLog2UI(message: TransferLog): void {
  const webContents = xyCKGetterInfo.webContents
  if (!webContents) {
    console.log('webContents is null, send fail')
    return
  }
  webContents.send('xyCKGetter:log', message)
}

let lastSendLog = ''

// 获取 worker 文件路径
function getWorkerPath(): string {
  return join(app.getAppPath(), 'out', 'main', 'workers', 'xyCKGetter.js')
}

function startWorkerProcess(): void {
  let workerProcess = xyCKGetterInfo.xyWorkerProcess
  console.log('开始启动')
  const workerProcessPath = getWorkerPath()
  console.log('启动路径:', workerProcessPath)

  workerProcess = utilityProcess.fork(workerProcessPath, [], {
    serviceName: 'xyCKGetter Service',
    stdio: 'pipe',
    env: {
      ...process.env,
      USER_DATA_PATH: app.getPath('userData')
    }
  })
  xyCKGetterInfo.xyWorkerProcess = workerProcess

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
        const currentPhoneInfo = xyCKGetterInfo.currentPhoneInfo
        if (!currentPhoneInfo) {
          console.error('worker receiveData error, currentPhoneInfo null')
          break
        }
        const phone = currentPhoneInfo.phone
        const pt = currentPhoneInfo.pt
        const reason = data.reason
        const noPass = data.status === -1 || data.status === 3
        xySendLog2UI({
          type: 'log',
          level: 'info',
          content: `处理结果: ${!noPass ? '可用' : '无用'}`
        })
        if (noPass) {
          const api = getAPI(pt)
          try {
            await api.blockPhone(phone)
            await updatePhoneStatus(phone, pt, 3, reason)
          } catch (error) {
            console.error(error)
          }
        } else {
          await updatePhoneStatus(phone, pt, 2)
        }
        // 处理完毕了,当前号码置空,让工作循环自动处理
        xyCKGetterInfo.currentPhoneInfo = null
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

  while (xyCKGetterInfo.running) {
    // 正在检查
    if (xyCKGetterInfo.checkRunning) {
      await sleep(1000)
      continue
    }

    // const checkPhone = await getCertifiedPhone();
    const checkPhone = { phone: '18254388680', pt: 'jd' } as any
    if (!checkPhone) {
      xyCKGetterInfo.running = false
      xyCKGetterInfo.currentPhoneInfo = null
      broadcastXyCKGetterInfoUpdate()
      xySendLog2UI({
        type: 'log',
        level: 'error',
        content: '未找到可用手机,尝试拉取新号码'
      })
      const isGot = await getCertifiedPhone()
      // 没拿到号码,直接停止
      if (!isGot) {
        continue
      } else {
        xyCKGetterInfo.running = true
      }
    }
    xyCKGetterInfo.currentPhoneInfo = checkPhone
    broadcastXyCKGetterInfoUpdate()
    await sleep(1000)
  }
}
