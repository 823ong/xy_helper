import {
  handleSliderCaptcha,
  launchBrowserContext,
  sendData,
  sendLogError,
  sendLogInfo
} from './utils'
import { BrowserContext, Page } from 'playwright'
import { join } from 'path'
const parentPort = (process as any).parentPort

/**
 *
 * @type {{running: boolean, currentPhone: string, browserContext: import("playwright").BrowserContext, page: import("playwright").Page}}
 */
let info: {
  running: boolean
  currentPhone: string
  browserContext: BrowserContext | null
  page: Page | null
} = {
  running: false,
  currentPhone: '',
  browserContext: null,
  page: null
}

const pageUrl = {
  home: 'https://h5.m.goofish.com/app/msd/auth-cert-h5/index.html?scene=xianyu_wechat_certify#/'
}

// 定義 sleep 工具函數
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const pageGoHome = async () => {
  if (info.page) {
    if (info.page.url() === pageUrl.home) {
      await info.page.reload()
    } else {
      await info.page.goto(pageUrl.home)
    }
  }
}

const sendResult = (res: boolean | null, reason?: string) => {
  if (res !== true) {
    info.running = false
  }
  // -1: 不可用 0: 未檢查,1:檢查中,2:已認證,3:未認證,
  sendData({
    status: res === true ? 2 : res === false ? 3 : -1,
    reason
  })
}

// 主工作循环
async function workLoop() {
  while (info.running) {
    try {
      let page = info.page
      if (!page) {
        info.running = false
        sendLogError('任务启动失败,没有页面可以控制,请检查浏览器是否正常启动')
        return
      }
      // 等待加载完毕
      await page.waitForLoadState('networkidle')

      // 非阻塞等待 200ms
      await sleep(300)
    } catch (e: any) {
      const msg = e.toString()
      if (msg && msg.toLowerCase().includes('timeout')) {
        // 忽略
      } else {
        throw e
      }
    }
  }
  console.log('工作循环已停止')
}

if (parentPort) {
  // 监听父进程消息
  parentPort.on('message', async (messageEvent: { data: any }) => {
    const msg = messageEvent.data
    try {
      switch (msg.command) {
        case 'syncStatus':
          // 切换号码 自动开始
          if (msg.payload?.currentPhone && info.currentPhone !== msg.payload?.currentPhone) {
            info.running = true
            sendLogInfo(`ck:开始测试新号码: ${msg.payload?.currentPhone}`)
          }
          info = { ...info, ...msg.payload }
          break

        case 'start':
          if (!info.running) {
            info.running = true
            sendLogInfo('开始执行脚本')
            await initIfNecessary()
            if (!info.page) {
              info.running = false
              return
            }
            // 启动工作循环（只启动一次）
            workLoop().catch((err) => {
              console.error('工作循环出错:', err)
              sendLogError(String(err))
            })
          }
          break

        case 'stop':
          info.running = false
          sendLogInfo('已停止脚本')
          break

        default:
          console.warn('未知的消息类型:', msg.command)
          sendLogError(`未知的消息类型: ${msg.command}`)
      }
    } catch (error: any) {
      console.error('处理消息时發生錯誤:', error)
      sendLogError(String(error))
    }
  })
}

const contextInit = async () => {
  const userDataPath = process.env.USER_DATA_PATH || './'
  const { ctx } = await launchBrowserContext(join(userDataPath, 'browserUserData/ck'), {
    args: [
      '--window-position=1,1',
      '--window-size=376,584',
      '--lang=zh-CN',
      '--disable-blink-features=AutomationControlled',
      '--disable-session-crashed-bubble',
      '--disable-infobars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=RestoreOnStartup'
    ]
  })
  info.browserContext = ctx
  if (!info.browserContext) {
    sendLogError('启动浏览器失败: 无法创建上下文')
    return
  }
  if (info.browserContext) {
    info.browserContext.on('close', () => {
      sendLogInfo('瀏覽器上下文已被關閉')
      info.browserContext = null
      info.page = null
      info.running = false
    })
  }
}

const pageInit = async () => {
  if (info.browserContext) {
    try {
      info.page = await info.browserContext.newPage()
    } catch (e) {
      // 可能上下文没有清理干净,这里重试一次
      await contextInit()
      if (info.browserContext) {
        info.page = await info.browserContext.newPage()
      }
    }
    if (info.page) {
      await pageFilter()
      await info.page.goto(pageUrl.home)
      info.page.on('close', () => {
        sendLogInfo('頁面已被關閉,瀏覽器任務停止')
        info.page = null
        info.running = false
      })
    }
  }
}

const initIfNecessary = async () => {
  if (!info.browserContext) {
    await contextInit()
    if (!info.browserContext) {
      return
    }
    await pageInit()
  } else if (!info.page) {
    await pageInit()
  }
}

const pageFilter = async () => {
  // 拦截所有请求
  if (info.page) {
    await info.page.route('**/*', async (route) => {
      const request = route.request()
      console.log('→ Request:', request.method(), request.url(), await request.allHeaders())

      // 继续请求（不中断）
      await route.continue()

      // 监听对应的响应
      const response = await request.response()
      if (response) {
        console.log('← Response:', response.status(), response.url(), await request.allHeaders())
        // 如果需要响应体（注意：部分响应体可能不可读）
        try {
          const body = await response.body()
          console.log('Body length:', body.length)
        } catch (e: any) {
          console.warn('Could not read response body:', e.message)
        }
      }
    })
  }
}
