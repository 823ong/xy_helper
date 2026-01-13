import {
  handleSliderCaptcha,
  launchBrowserContext,
  resetBrowserContext,
  sendData,
  sendLogDebug,
  sendLogError,
  sendLogInfo
} from './utils'
import { BrowserContext, Page } from 'playwright'
import { join } from 'path'
import fs from 'fs'

const parentPort = (process as any).parentPort

/**
 *
 * @type {{running: boolean, currentPhone: string, browserContext: import("playwright").BrowserContext, page: import("playwright").Page}}
 */
let info: {
  running: boolean
  executedLoop: boolean
  currentPhone: string
  browserContext: BrowserContext | null
  page: Page | null
  browserProfileDirPath: string
} = {
  running: false,
  executedLoop: false,
  currentPhone: '',
  browserContext: null,
  browserProfileDirPath: join(process.env.USER_DATA_PATH ?? './', 'browserUserData/xyScan'),
  page: null
}

const pageUrl = {
  home: 'https://passport.goofish.com/ac/password_find.htm?from_site=77&lang=zh_cn&app_name=##from##&tracelog=signin_main_pass',
  // home: "https://promotion.aliyun.com/ntms/act/captchaIntroAndDemo.html",
  captcha: '/punish',
  verify: '/to_iv.htm'
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
  let sliderRetryCount = 0
  const sliderTipLocator = '[id="`nc_1_refresh1`"]'
  while (info.running) {
    if (!info.currentPhone) {
      sendLogDebug('等待接收号码')
      await sleep(999)
      continue
    }
    try {
      await initIfNecessary()
      let page = info.page
      if (!page) {
        info.running = false
        sendLogError('任务启动失败,没有页面可以控制,请检查浏览器是否正常启动')
        return
      }
      // 等待加载完毕
      await page.waitForLoadState('networkidle')

      if ((await page.locator('#nc_1_n1z').count()) > 0) {
        // 处理滑块验证码
        await handleSliderCaptcha(
          page,
          '#nc_1_n1z',
          '#nc_1_n1t',
          async () => (await page.locator(sliderTipLocator).count()) < 1
        )
      } else if ((await page.locator(sliderTipLocator).count()) > 0) {
        // 处理滑块验证码失败
        if (sliderRetryCount > 3) {
          sendLogError('滑块验证码失败,刷新浏览器')
          sliderRetryCount = 0
          await pageGoHome()
          continue
        }
        await page.locator(sliderTipLocator).click()
        sliderRetryCount++
      } else if ((await page.locator('.ui-form-error-service').count()) > 0) {
        const txt = await page.locator('.ui-form-error-service').innerText()
        if (!txt && !txt.includes('请输入')) {
          await page.locator('#J-accName').fill(info.currentPhone)
          await page.locator('#submitBtn').click()
        } else {
          // 账号不存在
          sendResult(false, '账号不存在')
          await page.locator('#J-accName').clear()
        }
      } else if ((await page.locator('#J-accName').count()) > 0) {
        // 输入框填值
        const inputValue = await page.locator('#J-accName').inputValue()
        if (inputValue) {
          sendLogInfo(`已输入账号${inputValue} ${inputValue.length}, 可能是人在操作,等待`)
        } else {
          await page.locator('#J-accName').fill(info.currentPhone)
          await page.locator('#submitBtn').click()
        }
      } else if ((await page.locator('.click-captcha-question').count()) > 0) {
        // 图形验证码
        sendLogError('todo 遇到了惩罚验证码,需要人工输入')
      } else if ((await page.locator('#iframe1').count()) > 0) {
        // 框架
        const frame = page.frameLocator('#iframe1')
        await frame.locator('body').waitFor()
        if ((await frame.locator('#J_Qrcode').count()) > 0) {
          sendResult(true)
          await pageGoHome()
        } else if ((await frame.locator('#J_Phone_Checkcode').count()) > 0) {
          sendResult(false, '未认证')
          await pageGoHome()
        } else if (
          await frame
            .locator('p.ui-tipbox-explain', { hasText: '不需要安全验证，直接进入下一步...' })
            .isVisible()
        ) {
          sendResult(false, '未认证')
          await pageGoHome()
        }
      } else if ((await page.locator('#newPwd').count()) > 0) {
        sendResult(false, '未认证')
        await pageGoHome()
      } else {
        const url = page.url()
        if (!url.includes(page.url())) {
          await pageGoHome()
        }
        sendLogError('未知状态')
      }
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
  sendLogDebug('工作循环已停止')
  info.executedLoop = false
}

if (parentPort) {
  // 监听父进程消息
  parentPort.on('message', async (messageEvent: { data: any }) => {
    const msg = messageEvent.data
    try {
      switch (msg.command) {
        case 'resetBrowser':
          info.executedLoop = false
          try {
            await info.browserContext?.close()
            info.browserContext = null
            info.page = null
            if (fs.existsSync(info.browserProfileDirPath)) {
              fs.rmSync(info.browserProfileDirPath, { recursive: true, force: true })
            }
          } catch (e) {
            console.error(e)
            sendLogError(`${e}`)
          } finally {
            info.executedLoop = true
            await initIfNecessary()
          }
          break
        case 'syncStatus':
          // 切换号码 自动开始
          if (msg.payload?.currentPhone && info.currentPhone !== msg.payload?.currentPhone) {
            info.running = true
            sendLogDebug(`开始测试新号码: ${msg.payload?.currentPhone}`)
          }
          info = { ...info, ...msg.payload }
          if (info.running) {
            sendLogInfo('开始执行脚本')
            // 启动工作循环（只启动一次）
            if (!info.executedLoop) {
              workLoop().catch((err) => {
                console.error('工作循环出错:', err)
                sendLogError(String(err))
              })
              info.executedLoop = true
            }
          }
          break

        case 'start':
          if (info.running) {
            sendLogInfo('开始执行脚本')
            // 启动工作循环（只启动一次）
            if (!info.executedLoop) {
              workLoop().catch((err) => {
                console.error('工作循环出错:', err)
                sendLogError(String(err))
              })
              info.executedLoop = true
            }
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
  const { ctx } = await launchBrowserContext(info.browserProfileDirPath)
  info.browserContext = ctx
  if (!info.browserContext) {
    sendLogError('启动浏览器失败: 无法创建上下文')
    return
  }
  if (info.browserContext) {
    info.browserContext.on('close', () => {
      sendLogInfo('浏览器上下文已被关闭')
      info.browserContext = null
      info.page = null
      info.running = false
    })
  }
}

const pageInit = async () => {
  if (!info.browserContext) {
    await contextInit()
  }
  if (!info.page && info.browserContext) {
    info.page = await info.browserContext.newPage()
  }
  if (info.page) {
    await info.page.goto(pageUrl.home)
    info.page.on('close', () => {
      sendLogInfo('页面已被关闭,浏览器任务停止')
      info.page = null
      info.running = false
    })
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
