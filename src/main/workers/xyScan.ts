import {
  fetchProxyInfo,
  handleSliderCaptcha,
  launchBrowserContext,
  sendData,
  sendLogDebug,
  sendLogError,
  sendLogInfo
} from './utils'
import { BrowserContext, Page } from 'playwright'

const parentPort = (process as any).parentPort

// ==================== 常量定义 ====================
const PAGE_URLS = {
  home: 'https://passport.goofish.com/ac/password_find.htm?from_site=77&lang=zh_cn&app_name=##from##&tracelog=signin_main_pass',
  captcha: '/punish',
  verify: '/to_iv.htm'
} as const

const SELECTORS = {
  // 滑块验证码
  sliderHandle: '#nc_1_n1z',
  sliderTrack: '#nc_1_n1t',
  sliderRefresh: '[id="`nc_1_refresh1`"]',
  // 表单元素
  accountInput: '#J-accName',
  submitButton: '#submitBtn',
  formError: '.ui-form-error-service',
  // 验证码
  clickCaptcha: '.click-captcha-question',
  clickCaptcha2: '#puzzle-captcha-question-img',
  // iframe 内容
  iframe: '#iframe1',
  qrCode: '#J_Qrcode',
  phoneCheckcode: '#J_Phone_Checkcode',
  newPassword: '#newPwd'
} as const

const CONFIG = {
  sliderMaxRetry: 3,
  loopDelay: 300,
  waitPhoneDelay: 999
} as const

// ==================== 类型定义 ====================
interface WorkerState {
  running: boolean
  executedLoop: boolean
  currentPhone: string
  browserContext: BrowserContext | null
  page: Page | null
  enableProxy: boolean
  fetchProxyUrl: string
}

type VerifyResult = 'authenticated' | 'not_authenticated' | 'account_not_exist' | 'error'

// ==================== 状态管理 ====================
let state: WorkerState = {
  running: false,
  executedLoop: false,
  currentPhone: '',
  browserContext: null,
  page: null,
  enableProxy: false,
  fetchProxyUrl: '',
}

// ==================== 工具函数 ====================
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function navigateToHome(page: Page): Promise<void> {
  if (page.url() === PAGE_URLS.home) {
    await page.reload()
  } else {
    await page.goto(PAGE_URLS.home)
  }
}

function sendVerifyResult(result: VerifyResult, reason?: string): void {
  const statusMap: Record<VerifyResult, number> = {
    authenticated: 2,
    not_authenticated: 3,
    account_not_exist: 3,
    error: -1
  }

  state.running = false
  console.log(`发出信息${{result,reason}}`)
  sendData({
    status: statusMap[result],
    reason
  })
}

// ==================== 页面状态处理器 ====================
/**
 * 页面状态处理器 - 将复杂的页面状态判断逻辑封装成独立的处理方法
 * 每个方法返回 boolean 表示是否处理了该状态
 */
class PageStateHandler {
  private sliderRetryCount = 0

  constructor(private page: Page) {}

  /** 处理滑块验证码 */
  async handleSliderCaptcha(): Promise<boolean> {
    if ((await this.page.locator(SELECTORS.sliderHandle).count()) > 0) {
      await handleSliderCaptcha(
        this.page,
        SELECTORS.sliderHandle,
        SELECTORS.sliderTrack,
        async () => (await this.page.locator(SELECTORS.sliderRefresh).count()) < 1
      )
      return true
    }
    return false
  }

  /** 处理滑块验证码失败重试 */
  async handleSliderRetry(): Promise<boolean> {
    if ((await this.page.locator(SELECTORS.sliderRefresh).count()) > 0) {
      if (this.sliderRetryCount > CONFIG.sliderMaxRetry) {
        sendLogError('滑块验证码失败,刷新浏览器')
        this.sliderRetryCount = 0
        await navigateToHome(this.page)
        return true
      }
      await this.page.locator(SELECTORS.sliderRefresh).click()
      this.sliderRetryCount++
      return true
    }
    return false
  }

  /** 处理表单错误提示 */
  async handleFormError(): Promise<boolean> {
    if ((await this.page.locator(SELECTORS.formError).count()) > 0) {
      const txt = await this.page.locator(SELECTORS.formError).innerText()
      if (!txt || txt.includes('请输入')) {
        await this.page.locator(SELECTORS.accountInput).fill(state.currentPhone)
        await this.page.locator(SELECTORS.submitButton).click()
      } else if(txt.includes('账号不存在')){
        sendVerifyResult('account_not_exist', '账号不存在')
        await this.page.locator(SELECTORS.accountInput).clear()
      }
      return true
    }
    return false
  }

  /** 处理账号输入框 */
  async handleAccountInput(): Promise<boolean> {
    if ((await this.page.locator(SELECTORS.accountInput).count()) > 0) {
      const inputValue = await this.page.locator(SELECTORS.accountInput).inputValue()
      if (inputValue) {
        sendLogInfo(`已输入账号${inputValue} ${inputValue.length}, 可能是人在操作,等待`)
      } else {
        await this.page.locator(SELECTORS.accountInput).fill(state.currentPhone)
        await this.page.locator(SELECTORS.submitButton).click()
      }
      return true
    }
    return false
  }

  /** 处理点击验证码 */
  async handleClickCaptcha(): Promise<boolean> {
    if ((await this.page.locator(SELECTORS.clickCaptcha).count()) > 0) {
      if(state.enableProxy && state.fetchProxyUrl){
        sendLogDebug('惩罚验证码,获取代理')
        const proxy = await fetchProxyInfo(state.fetchProxyUrl)
        if(!proxy){
          sendLogError('获取代理失败')
          return true
        }
        // todo 获取代理
        // 关闭旧的浏览器上下文
        await state.browserContext?.close()
        state.browserContext = null
        state.page = null
        // 创建新的上下文
        await initBrowserContext()
        await initPage()
      }else{
        sendLogError('惩罚验证码,等待人工通过校验')
      }
      return true
    } else if ((await this.page.locator(SELECTORS.clickCaptcha2).count()) > 0) {
      sendLogError('遇到了图片滑块验证码,清空并重启浏览器')
      // 关闭旧的浏览器上下文
      await state.browserContext?.close()
      state.browserContext = null
      state.page = null
      // 创建新的上下文
      await initBrowserContext()
      await initPage()
      return true
    }
    return false
  }

  /** 处理 iframe 内的验证结果 */
  async handleIframe(): Promise<boolean> {
    if ((await this.page.locator(SELECTORS.iframe).count()) > 0) {
      const frame = this.page.frameLocator(SELECTORS.iframe)
      await frame.locator('body').waitFor()

      if ((await frame.locator(SELECTORS.qrCode).count()) > 0) {
        sendVerifyResult('authenticated')
        await navigateToHome(this.page)
      } else if ((await frame.locator(SELECTORS.phoneCheckcode).count()) > 0) {
        sendVerifyResult('not_authenticated', '未认证')
        await navigateToHome(this.page)
      } else if (
        await frame
          .locator('p.ui-tipbox-explain', { hasText: '不需要安全验证，直接进入下一步...' })
          .isVisible()
      ) {
        sendVerifyResult('not_authenticated', '未认证')
        await navigateToHome(this.page)
      }
      return true
    }
    return false
  }

  /** 处理新密码页面 */
  async handleNewPassword(): Promise<boolean> {
    if ((await this.page.locator(SELECTORS.newPassword).count()) > 0) {
      sendVerifyResult('not_authenticated', '未认证')
      await navigateToHome(this.page)
      return true
    }
    return false
  }

  /** 处理未知状态 */
  async handleUnknownState(): Promise<void> {
    const url = this.page.url()
    if (!url.includes(PAGE_URLS.home)) {
      await navigateToHome(this.page)
    }
    sendLogError('未知状态')
  }
}

// 主工作循环
async function workLoop() {
  while (state.running) {
    if (!state.currentPhone) {
      sendLogDebug('等待接收号码')
      await sleep(CONFIG.waitPhoneDelay)
      continue
    }

    try {
      await initIfNecessary()
      const page = state.page
      if (!page) {
        state.running = false
        sendLogError('任务启动失败,没有页面可以控制,请检查浏览器是否正常启动')
        return
      }

      await page.waitForLoadState('networkidle')

      const handler = new PageStateHandler(page)

      // 按优先级处理各种页面状态
      if (await handler.handleSliderCaptcha()) continue
      if (await handler.handleSliderRetry()) continue
      if (await handler.handleFormError()) continue
      if (await handler.handleAccountInput()) continue
      if (await handler.handleClickCaptcha()) continue
      if (await handler.handleIframe()) continue
      if (await handler.handleNewPassword()) continue

      await handler.handleUnknownState()

      await page.waitForLoadState('networkidle')
      await sleep(CONFIG.loopDelay)
    } catch (e: any) {
      const msg = e.toString()
      if (!msg || !msg.toLowerCase().includes('timeout')) {
        throw e
      }
    }
  }

  sendLogDebug('工作循环已停止')
  state.executedLoop = false
}

// ==================== 浏览器初始化 ====================
async function initBrowserContext(): Promise<void> {
  // 使用非持久化模式，每次创建新的上下文
  const { ctx } = await launchBrowserContext()
  state.browserContext = ctx
  if (!state.browserContext) {
    sendLogError('启动浏览器失败: 无法创建上下文')
    return
  }

  state.browserContext.on('close', () => {
    sendLogInfo('浏览器上下文已被关闭')
    state.browserContext = null
    state.page = null
    // state.running = false
  })
}

async function initPage(): Promise<void> {
  if (!state.browserContext) {
    await initBrowserContext()
  }
  if (!state.page && state.browserContext) {
    state.page = await state.browserContext.newPage()
  }
  if (state.page) {
    await state.page.goto(PAGE_URLS.home)
    state.page.on('close', () => {
      sendLogInfo('页面已被关闭,浏览器任务停止')
      state.page = null
      // state.running = false
    })
  }
}

async function initIfNecessary(): Promise<void> {
  if (!state.browserContext) {
    await initBrowserContext()
    if (!state.browserContext) {
      return
    }
    await initPage()
  } else if (!state.page) {
    await initPage()
  }
}

// ==================== 消息处理器 ====================
async function handleResetBrowser(): Promise<void> {
  state.executedLoop = false
  try {
    await state.browserContext?.close()
    state.browserContext = null
    state.page = null
    // 不再需要删除持久化目录
  } catch (e) {
    console.error(e)
    sendLogError(`${e}`)
  } finally {
    state.executedLoop = true
    await initIfNecessary()
  }
}

function startWorkLoopIfNeeded(): void {
  if (state.running && !state.executedLoop) {
    sendLogInfo('开始执行脚本')
    workLoop().catch((err) => {
      console.error('工作循环出错:', err)
      sendLogError(String(err))
    })
    state.executedLoop = true
  }
}

if (parentPort) {
  parentPort.on('message', async (messageEvent: { data: any }) => {
    const msg = messageEvent.data
    try {
      switch (msg.command) {
        case 'resetBrowser':
          await handleResetBrowser()
          break
        case 'syncStatus':
          // 切换号码 自动开始
          if (msg.payload?.currentPhone && state.currentPhone !== msg.payload?.currentPhone) {
            state.running = true
            sendLogDebug(`开始测试新号码: ${msg.payload?.currentPhone}`)
          } else {
            sendLogDebug(`同步未收到号码`)
          }
          state = { ...state, ...msg.payload }
          startWorkLoopIfNeeded()
          break

        case 'start':
          startWorkLoopIfNeeded()
          break

        case 'stop':
          state.running = false
          sendLogInfo('收到通知脚本命令')
          break

        default:
          console.warn('未知的消息类型:', msg.command)
          sendLogError(`未知的消息类型: ${msg.command}`)
      }
    } catch (error: any) {
      console.error('处理消息时发生错误:', error)
      sendLogError(String(error))
    }
  })
}
