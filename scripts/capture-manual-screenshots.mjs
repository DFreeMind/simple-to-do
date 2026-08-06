#!/usr/bin/env node

/**
 * Capture the in-app guide screenshots from a stable, rich demo dataset.
 * The browser viewport stays at 1280x800 so every image has the same desktop
 * composition. CDP is used for WebP output because Playwright's high-level
 * screenshot API only exposes PNG/JPEG.
 */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const data = JSON.parse(await fs.readFile(path.join(root, 'demo-data.json'), 'utf8'))
const outputDir = path.join(root, 'tmp', 'manual-captures')
const publicDir = path.join(root, 'public', 'screenshots')
await fs.rm(outputDir, { recursive: true, force: true })
await fs.mkdir(outputDir, { recursive: true })

const browserCache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
const browserVersions = await fs.readdir(browserCache).catch(() => [])
const cachedChromium = browserVersions
  .filter((name) => /^chromium-\d+$/.test(name))
  .sort()
  .reverse()
  .map((name) => path.join(browserCache, name, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'))
const executableCandidates = [
  process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  ...cachedChromium,
  chromium.executablePath(),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean)
let executablePath = executableCandidates[executableCandidates.length - 1]
for (const candidate of executableCandidates) {
  if (await fs.access(candidate).then(() => true).catch(() => false)) {
    executablePath = candidate
    break
  }
}

const browser = await chromium.launch({ headless: true, executablePath })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })

await page.addInitScript((payload) => {
  localStorage.setItem('simple-to-do:data', JSON.stringify(payload))
}, data)

const baseUrl = process.env.SIMPLE_TODO_SCREENSHOT_URL || 'http://127.0.0.1:5173/'
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)

async function waitForUi() {
  await page.waitForTimeout(350)
}

async function capture(name) {
  const client = await page.context().newCDPSession(page)
  const result = await client.send('Page.captureScreenshot', {
    format: 'webp',
    quality: 60,
    captureBeyondViewport: false
  })
  const buffer = Buffer.from(result.data, 'base64')
  await fs.writeFile(path.join(outputDir, `${name}.webp`), buffer)
  await fs.writeFile(path.join(publicDir, `${name}.webp`), buffer)
  await client.detach()
}

async function clickText(text) {
  await page.getByText(text, { exact: true }).first().click()
  await waitForUi()
}

async function closeDetail() {
  const close = page.locator('button[aria-label="关闭详情"]').first()
  if (await close.count()) {
    await close.click()
    await waitForUi()
  }
}

async function closeSettings() {
  const close = page.locator('aside.settings-panel header button[aria-label="关闭设置"]').first()
  if (await close.count()) {
    await close.click()
    await waitForUi()
  }
}

// Core workflow: 今日视图保持空详情状态（不点选任何任务），让"选中一项任务"提示语可见。
await closeDetail()
await capture('today-view')

// 应用三栏全貌：选择一个清单（如"工作任务"）并选中一条任务，让中间列表有内容、右侧详情完整。
{
  const workListButton = page.locator('aside.sidebar').getByText('工作任务', { exact: true }).first()
  if (await workListButton.count()) {
    await workListButton.click()
    await waitForUi()
  }
  const firstTask = page.locator('.task-list__item .task-item__title, .task-list__item .task-item__checkbox').first()
  if (await firstTask.count()) {
    await firstTask.click()
    await waitForUi(500)
  }
  await capture('sidebar-overview')
  // 拍完后关闭详情，回到无选中状态。
  await closeDetail()
}

// Object management: switch to a list, enable group view, then open the "新建分组"
// dialog so the new emoji picker and color picker are visible.
const workListButton = page.locator('aside.sidebar').getByText('工作任务', { exact: true }).first()
if (await workListButton.count()) {
  await workListButton.click()
  await waitForUi()
  const groupViewButton = page.locator('button[title="分组模式"]').first()
  if (await groupViewButton.count()) {
    await groupViewButton.click()
    await page.waitForTimeout(800)
  }
  // The inline "新建分组" button is hidden by the responsive container query on narrow
  // task-list widths. Force it visible so we can capture the dialog with the emoji picker.
  await page.evaluate(() => {
    document.querySelectorAll('.header-actions__secondary').forEach((el) => {
      el.style.display = 'flex'
    })
  })
  const newGroupInList = page.locator('.header-actions button[aria-label="新建分组"]').first()
  try {
    await newGroupInList.waitFor({ state: 'visible', timeout: 6000 })
    await newGroupInList.click()
    await waitForUi()
  } catch (error) {
    console.error('新建分组按钮未出现:', error.message)
  }
  // 输入名称、点开 emoji 选择器选中一个图标、点选预设强调色，让对话框在截图时是"已填好"的状态。
  const nameInput = page.locator('.group-dialog input[type="text"], .group-dialog input[placeholder*="分组"]').first()
  if (await nameInput.count()) {
    await nameInput.fill('阅读')
    await waitForUi(300)
  }
  const emojiTrigger = page.locator('button.group-dialog__emoji-trigger').first()
  if (await emojiTrigger.count()) {
    await emojiTrigger.click()
    await waitForUi(800)
    // 在 emoji 选择器打开的状态下截图，让浮层面板可见；选完第一个图标后再关闭。
    await capture('group-management')
    const firstEmoji = page.locator('button.emoji-item').first()
    if (await firstEmoji.count()) {
      await firstEmoji.click({ force: true })
      await waitForUi(400)
    }
  } else {
    await capture('group-management')
  }
  // 点选一个预设强调色（第一个非"自动配色"的色块），让色板出现在截图里。
  const colorSwatch = page.locator('.group-dialog__color-grid button:not(.is-active), .group-dialog button[aria-label*="颜色"]').first()
  if (await colorSwatch.count()) {
    await colorSwatch.click()
    await waitForUi(300)
  }
  await page.keyboard.press('Escape')
  await waitForUi()
  const dialogClose = page.locator('button.group-dialog__close').first()
  if (await dialogClose.count()) await dialogClose.click()
  await waitForUi()
  // Switch back to list view for the rest of the captures.
  const listViewButton = page.locator('button[title="列表模式"]').first()
  if (await listViewButton.count()) {
    await listViewButton.click()
    await waitForUi()
  }
}

const newListButton = page.locator('aside.sidebar button[aria-label="新建清单"]').first()
if (await newListButton.count()) {
  await newListButton.click()
  await waitForUi(400)
  const listInput = page.locator('input[placeholder="清单名称"]').first()
  if (await listInput.count()) {
    // 用真实键盘输入字符（不会触发 Playwright fill 后的 blur），input 保持焦点。
    await listInput.focus()
    await page.keyboard.type('客户跟进', { delay: 30 })
    await waitForUi(300)
  }
  await capture('list-management')
  // 截图后显式按 Enter 完成创建（input 仍保留焦点），再切回"工作任务"清单继续后续截图。
  await page.keyboard.press('Enter')
  await waitForUi(400)
  const workListButton = page.locator('aside.sidebar').getByText('工作任务', { exact: true }).first()
  if (await workListButton.count()) {
    await workListButton.click()
    await waitForUi()
  }
}

await page.getByText('完成季度报告初稿', { exact: true }).click()
await waitForUi()
await capture('task-detail')

// 任务详情顶部属性行：日期/提醒/重复/优先级/清单
// 滚到详情顶部，并把日期浮层展开，让"顶部属性行"截图能展示日期/提醒/重复按钮与摘要。
{
  const detailTop = page.locator('.task-detail').first()
  if (await detailTop.count()) {
    await detailTop.evaluate((element) => { element.scrollTop = 0 })
    await waitForUi(400)
  }
  const dateMetaButton = page.locator('.task-detail .detail-meta-action').first()
  if (await dateMetaButton.count()) {
    await dateMetaButton.click()
    await waitForUi(500)
  }
  await capture('task-detail-meta')
  await page.keyboard.press('Escape')
  await waitForUi(400)
}

// 任务详情子任务区域：滚到子任务进度 + 列表
{
  const detailMid = page.locator('.task-detail').first()
  if (await detailMid.count()) {
    await detailMid.evaluate((element) => {
      const subtasks = element.querySelector('.detail-section--subtasks')
      if (subtasks) subtasks.scrollIntoView({ block: 'start' })
      else element.scrollTop = element.scrollHeight / 2
    })
    await waitForUi(400)
  }
  await capture('subtask-panel')
}

const detailPanel = page.locator('.task-detail').first()
if (await detailPanel.count()) {
  // 关闭 task-detail-meta 留下的浮层（如有），再展开 date 浮层。
  await page.keyboard.press('Escape')
  await waitForUi(400)
  const dateTrigger = page.locator('.detail-meta-action').first()
  if (await dateTrigger.count()) {
    await dateTrigger.click()
    await waitForUi(500)
    // 只展开"提醒"组：DatePicker 同时只能展开一个 extra，最后保留提醒的丰富选项，
    // 让截图和 task-detail-meta 区分开（后者是默认折叠的浮层全貌）。
    for (const label of ['提醒']) {
      const row = page.locator(`button.dp-extra-row:has-text("${label}")`).first()
      if (await row.count()) {
        const expanded = await row.getAttribute('aria-expanded').catch(() => null)
        if (expanded !== 'true') {
          await row.click()
          await waitForUi(400)
        }
      }
    }
    await capture('date-reminder')
    await page.keyboard.press('Escape')
    await waitForUi(400)
  }

  // 富文本编辑器：把"更多块"按钮滚到 .task-detail 视口中部，让向下展开的菜单能完整显示。
  // 弹层在 .task-detail 内部 absolute 定位，受 overflow:auto 裁切；先留出约 320px 视口空间。
  await detailPanel.evaluate((element) => {
    const wrap = element.querySelector('.rich-editor__more-wrap')
    if (wrap) wrap.scrollIntoView({ block: 'center' })
    else element.scrollTop = element.scrollHeight
  })
  await waitForUi(500)
  const moreMenu = page.locator('button[aria-label="更多块"]').first()
  if (await moreMenu.count()) {
    await moreMenu.click()
    await waitForUi(600)
  }
  await capture('rich-editor')
  await page.keyboard.press('Escape')
  await waitForUi(400)
}

await closeDetail()
await clickText('计划')
// 让"已逾期 / 今天 / 明天"三个分组都能进入画面。
{
  const taskList = page.locator('.task-list, .planned-list, .plan-list, main').first()
  if (await taskList.count()) {
    await taskList.evaluate((el) => { el.scrollTop = 240 })
    await waitForUi(400)
  }
}
await capture('planned-view')
await clickText('重要')
await capture('important-view')
await clickText('收集箱')
await capture('inbox-view')

// 附件大图预览：收集箱里的 test-3 任务（demo 自带两张图）
{
  const inboxTask = page.getByText('带附件的任务', { exact: false }).first()
  if (await inboxTask.count()) {
    await inboxTask.click()
    await waitForUi(800)
    const detail = page.locator('.task-detail').first()
    if (await detail.count()) {
      await detail.evaluate((element) => { element.scrollTop = element.scrollHeight })
      await waitForUi(400)
    }
    const img = page.locator('.task-detail img[src^="data:image"]').first()
    if (await img.count()) {
      await img.click()
      await waitForUi(900)
      // 等灯箱完全打开并完成图片淡入。
      await page.waitForTimeout(300)
      await capture('image-preview')
      await page.keyboard.press('Escape')
      await waitForUi(400)
    } else {
      console.error('找不到附件图片，跳过 image-preview')
    }
  } else {
    console.error('找不到带附件的任务，跳过 image-preview')
  }
  await clickText('今日')
}

// Search is captured as an active, useful state rather than an empty overlay.
const searchInput = page.locator('input[placeholder="搜索任务、标签、备注"]').first()
if (await searchInput.count()) {
  await searchInput.fill('项目')
  await waitForUi()
  await capture('search')
  await searchInput.fill('')
  await waitForUi()
  await clickText('今日')
}

const settingsButton = page.locator('button[title="设置"], button[aria-label="设置"]').first()
if (await settingsButton.count()) {
  await settingsButton.click()
  await waitForUi()
  await capture('settings-appearance')
  await clickText('专注与休息')
  await capture('settings-focus')
  await clickText('通知与反馈')
  await capture('settings-notifications')
  await clickText('应用行为')
  await capture('settings-behavior')
  await closeSettings()
}

const profileButton = page.locator('button[aria-label*="打开个人资料"]').first()
if (await profileButton.count()) {
  await profileButton.click()
  await waitForUi()
  await capture('profile-space')
  const avatarButton = page.locator('button[aria-label="更换头像"]').first()
  if (await avatarButton.count()) {
    await avatarButton.click()
    await waitForUi()
    await capture('avatar-picker')
    await avatarButton.click()
    await waitForUi()
  }
  await clickText('空间管理')
  // 触发扫描，让"应用总占用"和各分类明细都展示出来，而不是停在初始"开始查看"状态。
  const scanButton = page.locator('button:has-text("开始扫描"), button:has-text("重新扫描"), button:has-text("开始查看本机空间")').first()
  if (await scanButton.count()) {
    await scanButton.click()
    await page.waitForTimeout(1500)
  }
  await capture('space-management')
  await clickText('数据与安全')
  await capture('profile-security')
  const profileClose = page.locator('button.profile-panel__close, button[aria-label="关闭个人空间"]').first()
  if (await profileClose.count()) await profileClose.click()
}

// Switch to the clock module and capture each of the four clock tabs.
const clockTab = page.locator('button[aria-label="时钟"]').first()
if (await clockTab.count()) {
  await clockTab.click()
  await waitForUi()
  const focusTab = page.getByRole('button', { name: '专注工作台' }).first()
  if (await focusTab.count()) {
    await focusTab.click()
    await waitForUi()
  }
  await capture('focus-workspace')

  const rhythmTab = page.getByRole('button', { name: '节律提醒' }).first()
  if (await rhythmTab.count()) {
    await rhythmTab.click()
    await waitForUi()
  }
  await capture('rhythm-workspace')

  const historyTab = page.getByRole('button', { name: '专注回顾' }).first()
  if (await historyTab.count()) {
    await historyTab.click()
    await waitForUi()
  }
  await capture('focus-history')

  const achievementTab = page.getByRole('button', { name: '专注成就' }).first()
  if (await achievementTab.count()) {
    await achievementTab.click()
    await waitForUi()
  }
  await capture('focus-achievement')
}

const helpButton = page.locator('button[aria-label="使用指南"]').first()
if (await helpButton.count()) {
  // HelpCenter 不再自引用截图（避免 self-reference），这里只触发打开验证不报错。
  await helpButton.click()
  await waitForUi()
}

await browser.close()
console.log(`已生成并同步截图: ${publicDir}`)
