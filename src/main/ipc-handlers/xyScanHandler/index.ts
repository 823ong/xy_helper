import { app, BrowserWindow, ipcMain, shell, utilityProcess } from "electron";
import path, { join } from "path";
import { TransferCommand, TransferLog } from "../../../preload/types/api";
import { XYWorkerBaseInfo, XYWorkerInfo } from "../../../preload/types/XYWorker";
import { getAPI } from "../../utils/smsCode/smsCodePlatformAPI";
import { PhoneData } from "../../database/entities/PhoneData";
import { getRepository } from "../../database/dataSource";
import fs from "fs";
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;
import { currentConfig } from '../systemSettingsHandler'
import * as vm from 'node:vm'
import axios from 'axios'

export const xyScanInfo: XYWorkerInfo & { getInfo: () => XYWorkerBaseInfo } = {
  running: false,
  checkRunning: false,
  currentPhoneInfo: null,
  xyWorkerProcess: null,
  webContents: null,
  currentPlatform: '',
  successCount: 0,
  balance: '',
  getPhoneInterval: 5000, // 默认500s
  enableProxy: false,
  fetchProxyUrl: '',
  getInfo(): XYWorkerBaseInfo {
    const info  = Object.assign({}, xyScanInfo) as any
    info.xyWorkerProcess = undefined
    info.webContents = undefined
    return info
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
      case 'resetBrowser':
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
        try {
          // 从数据库导出成功号码到文件
          const repository = await getRepository(PhoneData)
          const successPhones = await repository.find({
            where: { status: 2 },
            order: { createAt: 'DESC' }
          })

          if (successPhones.length === 0) {
            xySendLog2UI({
              type: 'log',
              level: 'error',
              content: '没有可用号码，请先运行任务！'
            })
            break
          }

          // 生成文件内容
          const lines = successPhones.map(
            (p) => `${p.createAt.toISOString().substring(0, 23)}-${p.pt}-${p.xmid}-${p.phone}`
          )

          // 写入文件
          const dir = path.dirname(filePath)
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }
          fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')

          // 打开文件
          await shell.openPath(filePath)
        } catch (error) {
          xySendLog2UI({
            type: 'log',
            level: 'error',
            content: `导出文件失败: ${error}`
          })
        }
        break
      case 'setGetPhoneInterval':
        const interval = data.payload as number
        if (interval > 0) {
          xyScanInfo.getPhoneInterval = interval
        }
        break
      case 'testExecAfter': {
        console.log('执行测试代码')
        execJsAfterSuccess(true, data.payload ?? '')
        break
      }
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

// 保存成功号码到数据库
async function saveSuccessPhone(phone: string, platform: string, projectId: string, status: number = 2, reason: string | null = null) {
  try {
    const repository = await getRepository(PhoneData);
    const phoneData = new PhoneData();
    phoneData.phone = phone;
    phoneData.pt = platform;
    phoneData.xmid = projectId;
    phoneData.status = status;
    phoneData.reason = reason;

    await repository.save(phoneData);
    console.log(`save phone to database: ${phone}`);
  } catch (err) {
    console.error('save to database error:', err);
    xySendLog2UI({
      type: 'log',
      level: 'error',
      content: 'save to database error: ' + err
    });
  }
}
// 检查号码是否已存在于数据库
async function isExist(phone: string): Promise<boolean> {
  try {
    const repository = await getRepository(PhoneData);
    const count = await repository.count({
      where: { phone: phone.trim() }
    });
    return count > 0;
  } catch (err) {
    console.error('query database error:', err);
    xySendLog2UI({
      type: 'log',
      level: 'error',
      content: 'query database error: ' + err
    });
    return false;
  }
}

let lastSendLog = ''

function execJsAfterSuccess(test = false, jsStr?: string) {
  try {
    const xyScanConfig = currentConfig.xyScan!
    if (
      test &&
      (!xyScanConfig ||
      !xyScanConfig.execJsAfterSuccess ||
      !xyScanConfig.execJsAfterContent)
    ) {
      return
    }
    const api = getAPI(xyScanInfo.currentPlatform)
    const xmid = api.projectId
    const phone = xyScanInfo.currentPhoneInfo?.phone
    const pt = xyScanInfo.currentPlatform
    const jsContent = jsStr ?? xyScanConfig.execJsAfterContent
    const context = {
      xyScanInfo,
      xySendLog2UI,
      api,
      phone,
      pt,
      xmid,
      fetch,
      URLSearchParams,
      axios
    }
    vm.createContext(context)
    vm.runInContext(jsContent, context)
  } catch (e) {
    xySendLog2UI({
      type: 'log',
      level: 'error',
      content: '执行动态代码错误: ' + e
    })
  }
}

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
  const workerProcessPath = getWorkerPath()
  console.log('worker path:', workerProcessPath)

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
        const noPass = data.status === -1 || data.status === 3
        xySendLog2UI({
          type: 'log',
          level: 'info',
          content: `处理结果: ${!noPass ? '可用' : '无用'}`
        })
        if (noPass) {
          const api = getAPI(xyScanInfo.currentPlatform)
          try{
            const b = await api.blockPhone(phone)
            xySendLog2UI({
              type: 'log',
              level: 'debug',
              content: `已拉黑号码${phone},拉黑结果:${b}`
            })
          }catch (e){
            xySendLog2UI({
              type: 'log',
              level: 'debug',
              content: `拉黑号码失败`
            })
          }
          // 保存失败号码到数据库
          await saveSuccessPhone(
            phone,
            xyScanInfo.currentPlatform,
            api.projectId ?? '',
            data.status,
            data.reason
          )
        } else {
          const api = getAPI(xyScanInfo.currentPlatform)
          execJsAfterSuccess()
          await saveSuccessPhone(
            phone,
            xyScanInfo.currentPlatform,
            api.projectId ?? '',
            2,
            data.reason
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
  let nextInvokeTime = Date.now();
  while (xyScanInfo.running) {
    // 正在检查
    if (xyScanInfo.currentPhoneInfo?.phone) {
      await sleep(1000)
      continue
    }
    try {
      if(Date.now() < nextInvokeTime) {
        await sleep(300)
        continue
      }
      const phone = await getAPI(xyScanInfo.currentPlatform).getPhone()
      nextInvokeTime = Date.now() + xyScanInfo.getPhoneInterval
      xySendLog2UI({
        type: 'log',
        level: 'info',
        content: `平台${xyScanInfo.currentPlatform}获取到号码:${phone}`
      })
      if (!phone || (await isExist(phone))) {
        xySendLog2UI({
          type: 'log',
          level: 'info',
          content: `号码${phone}有误或已存在,重新获取`
        })
        continue
      }
      xyScanInfo.currentPhoneInfo = {
        phone,
        pt: xyScanInfo.currentPlatform
      } as PhoneData
      xyScanInfo.checkRunning = true
      xyScanInfo.running = true
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
      console.log('fetch phone or send info to worker error',e)
      xySendLog2UI({
        type: 'log',
        level: 'error',
        content: `获取手机失败:${e}`
      })
      broadcastXyScanInfoUpdate()
    }
  }
}
