#!/usr/bin/env node

/**
 * 重新拍摄 3 张过期的使用指南截图：
 *   - focus-history.webp     专注回顾（ECharts + 概览/管理 + 导出 + 批量 + 周期对比）
 *   - focus-achievement.webp 专注成就（温室化年/月格 + 累计成长 + 近期足迹）
 *   - space-management.webp  空间管理（含历史迁移备份新功能）
 *
 * 只针对过期图，不动其他 23 张未变更的截图。这样可以让 git diff 干净，
 * 也避免重新生成 byte-identical 的 23 张图污染提交。
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
  console.log(`  → ${name}.webp 已更新（${(buffer.length / 1024).toFixed(1)} KB）`)
}

async function clickText(text) {
  await page.getByText(text, { exact: true }).first().click()
  await waitForUi()
}

console.log('1/3 重拍 focus-history（专注回顾）')
const clockTab = page.locator('button[aria-label="时钟"]').first()
if (await clockTab.count()) {
  await clockTab.click()
  await waitForUi()
  const historyTab = page.getByRole('button', { name: '专注回顾' }).first()
  if (await historyTab.count()) {
    await historyTab.click()
    await page.waitForTimeout(800) // 等 ECharts 渲染完成
  }
  await capture('focus-history')
}

console.log('2/3 重拍 focus-achievement（专注成就）')
const achievementTab = page.getByRole('button', { name: '专注成就' }).first()
if (await achievementTab.count()) {
  await achievementTab.click()
  await page.waitForTimeout(800)
  // 把"近期足迹"段滚到视口里再拍，让 1280×800 的截图能看到 4 项核心结构和 近期足迹
  await page.locator('.achievement-trail').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await capture('focus-achievement')
}

console.log('3/3 重拍 space-management（空间管理）')
// 切回任务模块打开个人空间 → 空间管理
const taskTab = page.locator('button[aria-label="任务"]').first()
if (await taskTab.count()) {
  await taskTab.click()
  await waitForUi()
}
const profileButton = page.locator('button[aria-label*="打开个人资料"]').first()
if (await profileButton.count()) {
  await profileButton.click()
  await waitForUi()
  await clickText('空间管理')
  const scanButton = page.locator('button:has-text("开始扫描"), button:has-text("重新扫描"), button:has-text("开始查看本机空间")').first()
  if (await scanButton.count()) {
    await scanButton.click()
    await page.waitForTimeout(1500)
  }
  await capture('space-management')
  const profileClose = page.locator('button.profile-panel__close, button[aria-label="关闭个人空间"]').first()
  if (await profileClose.count()) await profileClose.click()
}

await browser.close()
console.log(`\n已生成并同步 ${publicDir} 中的 3 张过期截图`)
