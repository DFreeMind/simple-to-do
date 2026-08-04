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

// Core workflow: intentionally keep the first shot in the clean three-column
// empty-detail state, then show the detail panel only when a task is selected.
await closeDetail()
await capture('today-view')

// 应用三栏全貌：左侧栏 + 任务列表 + 空详情。
await closeDetail()
await capture('sidebar-overview')

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
  const emojiTrigger = page.locator('button.group-dialog__emoji-trigger').first()
  if (await emojiTrigger.count()) {
    await emojiTrigger.click()
    await waitForUi()
  }
  await capture('group-management')
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
  await page.locator('input[placeholder="清单名称"]').fill('客户跟进')
  await waitForUi()
  await capture('list-management')
  await page.keyboard.press('Escape')
  await waitForUi()
}

await page.getByText('完成季度报告初稿', { exact: true }).click()
await waitForUi()
await capture('task-detail')

// 任务详情顶部属性行：日期/提醒/重复/优先级/清单
{
  const detailTop = page.locator('.task-detail').first()
  if (await detailTop.count()) {
    await detailTop.evaluate((element) => { element.scrollTop = 0 })
    await waitForUi(400)
  }
  await capture('task-detail-meta')
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
  // Capture the date / time / reminder / repeat popover so the new collapsible layout is visible.
  const dateTrigger = page.locator('.detail-meta-action').first()
  if (await dateTrigger.count()) {
    await dateTrigger.click()
    await waitForUi()
    // Open each extras section to expose the time presets, reminder and repeat rows.
    const timeRow = page.locator('button.dp-extra-row:has-text("时间")').first()
    if (await timeRow.count()) {
      await timeRow.click()
      await waitForUi()
    }
    await capture('date-reminder')
    await page.keyboard.press('Escape')
    await waitForUi()
  }

  await detailPanel.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await waitForUi()
  // Open the "more" menu so the new blocks (table, details, code, task reference, alignment, underline) are visible.
  const moreMenu = page.locator('button[aria-label="更多块"]').first()
  if (await moreMenu.count()) {
    await moreMenu.click()
    await waitForUi()
  }
  await capture('rich-editor')
  await page.keyboard.press('Escape')
  await waitForUi()
}

await closeDetail()
await clickText('计划')
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
      await waitForUi(700)
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
  await searchInput.fill('报告')
  await waitForUi()
  await capture('search')
  await searchInput.fill('')
  await waitForUi()
  await clickText('今日')
}

const settingsButton = page.locator('button[title="应用设置"], button[aria-label="打开设置"]').first()
if (await settingsButton.count()) {
  await settingsButton.click()
  await waitForUi()
  await capture('settings-appearance')
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
