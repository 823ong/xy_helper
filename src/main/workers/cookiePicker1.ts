import { handleSliderCaptcha, launchBrowserContext, sendData, sendLogError, sendLogInfo } from './utils.mjs'

/**
 *
 * @type {{running: boolean, currentPhone: string, browserContext: import('playwright').BrowserContext, page: import('playwright').Page}}
 */
export let info = {
  running: false,
  currentPhone: '',
  browserContext: null,
  page: null
}
const pageUrl = {
  home: 'https://h5.m.goofish.com/app/msd/auth-cert-h5/index.html?scene=xianyu_wechat_certify#/'
}
const contextInit = async () => {
  const { ctx } = await launchBrowserContext('./browserUserData/ck', {
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
  info.browserContext.on('close', () => {
    sendLogInfo('浏览器上下文已被关闭')
    info.browserContext = null
    info.page = null
    info.running = false
  })
}
const pageInit = async () => {
  try {
    info.page = await info.browserContext.newPage()
  } catch (e) {
    // 可能上下文没有清理干净,这里重试一次
    await contextInit()
    info.page = await info.browserContext.newPage()
  }
  await info.page.goto(pageUrl.home)
  info.page?.on('close', () => {
    sendLogInfo('页面已被关闭,浏览器任务停止')
    info.page = null
    info.running = false
  })
}
export const initIfNecessary = async () => {
  if (!info.browserContext && !info.browserContext?.browser()?.isConnected()) {
    await contextInit()
    if (!info.browserContext) {
      return
    }
    await pageInit()
  } else if (!info.page && !info.page?.url()) {
    await pageInit()
  }
}
