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
await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)

async function waitForUi() {
  await page.waitForTimeout(350)
}

async function capture(name) {
  const client = await page.context().newCDPSession(page)
  const result = await client.send('Page.captureScreenshot', {
    format: 'webp',
    quality: 76,
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

// Object management: show the real creation surfaces for groups and lists.
const newGroupButton = page.locator('aside.sidebar button[aria-label="新建分组"]').first()
if (await newGroupButton.count()) {
  await newGroupButton.click()
  await page.locator('input[placeholder="分组名称"]').fill('项目协作')
  await waitForUi()
  await capture('group-management')
  await page.keyboard.press('Escape')
  await waitForUi()
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

const detailPanel = page.locator('.task-detail').first()
if (await detailPanel.count()) {
  await detailPanel.evaluate((element) => { element.scrollTop = Math.max(0, element.scrollHeight * 0.28) })
  await waitForUi()
  await capture('subtasks')
  await detailPanel.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await waitForUi()
  await capture('rich-editor')
}

await closeDetail()
await clickText('计划')
await capture('planned-view')
await clickText('重要')
await capture('important-view')
await clickText('收集箱')
await capture('inbox-view')

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

await clickText('使用指南')
await capture('help-center')

await browser.close()
console.log(`已生成并同步截图: ${publicDir}`)
