import { chromium } from 'playwright-extra'
import { Page, BrowserContext } from 'playwright'
import { rmSync } from 'fs'
import { join } from 'path'

const parentPort = (process as any).parentPort

/**
 * 发送进度消息
 * @param {string} level - 日志级别
 * @param {string} content - 日志信息
 */
export function sendLog(level: string, content: string) {
  if (parentPort) {
    parentPort.postMessage({
      type: 'log',
      level,
      content: content
    })
  }
}

export function sendLogDebug(content: string) {
  sendLog('debug', content)
}

export function sendLogInfo(content: string) {
  sendLog('info', content)
}

export function sendLogError(content: string) {
  sendLog('error', content)
}

export function sendData(data: any) {
  if (parentPort) {
    parentPort.postMessage({
      type: 'data',
      content: data
    })
  }
}

/**
 * 生成贝塞尔曲线轨迹点 - 模拟人类滑动的自然曲线
 * @param {number} start - 起始位置
 * @param {number} end - 结束位置
 * @param {number} steps - 轨迹点数量
 * @returns {number[]} 轨迹点数组
 */
function generateBezierCurve(start: number, end: number, steps: number = 50) {
  const points: number[] = []
  const distance = end - start

  // 随机控制点，增加轨迹的自然性
  const cp1 = start + distance * (0.2 + Math.random() * 0.1)
  const cp2 = start + distance * (0.7 + Math.random() * 0.1)

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // 三次贝塞尔曲线公式
    const point =
      Math.pow(1 - t, 3) * start +
      3 * Math.pow(1 - t, 2) * t * cp1 +
      3 * (1 - t) * Math.pow(t, 2) * cp2 +
      Math.pow(t, 3) * end

    points.push(point)
  }

  return points
}

/**
 * 生成人类化的滑动轨迹（包含加速、减速、抖动等行为）
 * @param {number} distance - 需要滑动的距离
 * @returns {Array<{x: number, y: number, delay: number}>} 轨迹数组
 */
function generateHumanLikeTrack(distance: number) {
  const track: any[] = []
  // n到n+10个轨迹点
  const steps = 5 + Math.floor(Math.random() * 10)

  // 生成基础贝塞尔曲线轨迹
  const xPoints = generateBezierCurve(0, distance, steps)

  for (let i = 0; i < xPoints.length; i++) {
    const progress = i / (xPoints.length - 1)

    // 模拟人类滑动的速度变化：快-慢-快-慢
    let delay
    if (progress < 0.2) {
      // 起始阶段：加速
      delay = 10 + Math.random() * 5
    } else if (progress < 0.8) {
      // 中间阶段：匀速
      delay = 5 + Math.random() * 3
    } else {
      // 结束阶段：减速
      delay = 15 + Math.random() * 10
    }

    // 添加垂直方向的轻微抖动（模拟人手不稳）
    const yJitter = (Math.random() - 0.5) * 3

    track.push({
      x: Math.round(xPoints[i]),
      y: Math.round(yJitter),
      delay: Math.round(delay)
    })
  }

  // 在 70%-90% 的位置添加轻微回退（人类常见行为）
  if (Math.random() > 0.3) {
    const backtrackIndex = Math.floor(track.length * (0.7 + Math.random() * 0.2))
    const backtrackAmount = -5 - Math.random() * 5
    track.splice(backtrackIndex, 0, {
      x: track[backtrackIndex].x + backtrackAmount,
      y: (Math.random() - 0.5) * 2,
      delay: 20 + Math.random() * 10
    })
  }

  return track
}

/**
 * 滑块处理方法
 * @param {import('playwright').Page} page - Playwright 页面对象
 * @param {string} sliderSelector - 滑块元素的选择器
 * @param {string} containerSelector - 滑块容器的选择器（用于计算滑动距离）
 * @param {() => Promise<boolean>} [checkMethod] 检查方法
 * @returns {Promise<boolean>} 是否成功通过滑块验证
 */
export async function handleSliderCaptcha(
  page: Page,
  sliderSelector: string,
  containerSelector: string,
  checkMethod?: () => Promise<boolean>
) {
  try {
    sendLogDebug('开始处理滑块验证码...')

    // 1. 等待滑块元素出现
    const slider = await page.locator(sliderSelector).first()
    const sliderBox = await slider.boundingBox({ timeout: 1000 })

    if (!sliderBox) {
      sendLogError('无法获取滑块位置信息')
      return false
    }

    // 2. 获取容器宽度，计算需要滑动的距离
    const container = await page.locator(containerSelector).first()
    const containerBox = await container.boundingBox({ timeout: 1000 })

    if (!containerBox) {
      sendLogError('无法获取容器位置信息')
      return false
    }

    // 计算滑动距离（容器宽度 - 滑块宽度 - 一些边距）
    const distance = containerBox.width - sliderBox.width + 30

    // 3. 移动到滑块中心位置（加入随机偏移）
    const startX = sliderBox.x + sliderBox.width / 2 + (Math.random() - 0.5) * 5
    const startY = sliderBox.y + sliderBox.height / 2 + (Math.random() - 0.5) * 5

    await page.mouse.move(startX, startY, {
      steps: 5 + Math.floor(Math.random() * 5)
    })

    // 4. 模拟人类按下鼠标的延迟
    await page.waitForTimeout(100 + Math.random() * 100)
    await page.mouse.down()

    // 5. 轻微延迟（模拟人类反应时间）
    await page.waitForTimeout(50 + Math.random() * 50)

    // 6. 生成人类化的滑动轨迹
    const track = generateHumanLikeTrack(distance)

    // 7. 按照轨迹滑动
    let currentX = startX
    let currentY = startY

    for (const point of track) {
      currentX = startX + point.x
      currentY = startY + point.y

      await page.mouse.move(currentX, currentY)
      await page.waitForTimeout(point.delay)
    }

    // 8. 到达终点后，模拟人类的轻微调整
    await page.waitForTimeout(100 + Math.random() * 100)

    // 9. 释放鼠标
    await page.mouse.up()

    sendLogDebug('滑块滑动完成')

    // 10. 等待验证结果（等待滑块消失或出现成功/失败提示）
    await page.waitForTimeout(1000)

    if (checkMethod) {
      const res = await checkMethod()
      if (res) {
        sendLogDebug('滑块验证成功！')
        return true
      } else {
        sendLogError('滑块验证失败')
        return false
      }
    } else {
      // 检查滑块是否还存在（如果消失了说明验证成功）
      const sliderCount = await page.locator(sliderSelector).count()
      if (sliderCount === 0) {
        sendLogDebug('滑块验证成功！')
        return true
      } else {
        sendLogError('滑块验证失败')
        return false
      }
    }
  } catch (error: any) {
    sendLogError(`滑塊處理失敗: ${error.message}`)
    return false
  }
}

/**
 * 智能等待并处理滑块（带重试机制）
 * @param {import('playwright').Page} page - Playwright 页面对象
 * @param {string} sliderSelector - 滑块选择器
 * @param {string} containerSelector - 容器选择器
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<boolean>} 是否成功
 */
export async function handleSliderWithRetry(
  page: Page,
  sliderSelector: string,
  containerSelector: string,
  maxRetries: number = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    sendLogDebug(`第 ${attempt}/${maxRetries} 次尝试处理滑块...`)

    const success = await handleSliderCaptcha(page, sliderSelector, containerSelector)

    if (success) {
      return true
    }

    if (attempt < maxRetries) {
      // 等待一段时间后重试（可能需要等待页面刷新滑块）
      await page.waitForTimeout(2000 + Math.random() * 1000)

      // 检查是否有刷新按钮，尝试点击
      const refreshButton = page.locator('#nc_1_refresh1').first()
      const refreshCount = await refreshButton.count()

      if (refreshCount > 0) {
        await refreshButton.click()
        await page.waitForTimeout(1000)
      }
    }
  }

  sendLogError(`滑块验证失败，已尝试 ${maxRetries} 次`)
  return false
}

/**
 *
 * @param userDataDir string
 * @param options  object
 * @returns {Promise<{ctx: import('playwright').BrowserContext}>}
 */
export async function launchBrowserContext(
  userDataDir: string = '',
  options: any = {}
): Promise<{ ctx: BrowserContext }> {
  options = Object.assign(
    {
      headless: false,
      // channel: "msedge",
      channel: 'chrome',
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--window-position=1,1',
        '--window-size=1024,768',
        '--lang=zh-CN',
        '--disable-blink-features=AutomationControlled',
        '--disable-session-crashed-bubble',
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-features=RestoreOnStartup'
      ]
    },
    options
  )
  let browserContext:any = null
  try {
    browserContext = await chromium.launchPersistentContext(userDataDir, options)
  } catch (e) {
    if (process.platform !== 'win32') {
      throw new Error('msedge channel is only supported on Windows')
    }
    options.channel = 'msedge'
    browserContext = await chromium.launchPersistentContext(userDataDir, options)
  }
  return { ctx: browserContext }
}

/**
 * 重置浏览器上下文 - 删除指定的用户数据文件夹
 * @param {string} userDataDir - 用户数据文件夹路径（必填）
 * @returns {Promise<boolean>} 是否成功删除
 */
export async function resetBrowserContext(userDataDir: string): Promise<boolean> {
  if (!userDataDir) {
    sendLogError('userDataDir is required')
    return false
  }

  try {
    sendLogInfo(`Resetting browser context: ${userDataDir}`)

    // 等待浏览器进程释放文件句柄
    await new Promise(resolve => setTimeout(resolve, 500))

    // 重试机制：最多尝试3次删除
    let lastError: any = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        rmSync(userDataDir, { recursive: true, force: true })
        sendLogInfo('Browser context reset successfully')
        return true
      } catch (err: any) {
        lastError = err
        sendLogDebug(`删除尝试 ${attempt}/3 失败: ${err.message}`)
        if (attempt < 3) {
          // 等待更长时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    throw lastError
  } catch (error: any) {
    sendLogError(`Failed to reset browser context: ${error.message}`)
    return false
  }
}
