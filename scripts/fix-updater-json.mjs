// 发布后修正 latest.json：tauri-action 生成的 notes 可能被错误编码（mojibake），
// 这里用 GitHub API 从 Release body 重新读取更新说明并以 UTF-8 写回。
//
// 用法：
//   $env:GITHUB_REPOSITORY = "owner/repo"
//   $env:GITHUB_TOKEN = "..."
//   node scripts/fix-updater-json.mjs --tag v0.4.3
//
// 在 GitHub Actions 中 GITHUB_REPOSITORY / GITHUB_TOKEN 已注入，
// tag 由 workflow 传入：node scripts/fix-updater-json.mjs --tag v${{ inputs.version }}

import { env } from 'node:process'

const args = process.argv.slice(2)
const tag = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : ''
const repo = env.GITHUB_REPOSITORY
const token = env.GITHUB_TOKEN

if (!repo || !token) {
  console.error('需要 GITHUB_REPOSITORY 与 GITHUB_TOKEN 环境变量')
  process.exit(1)
}
if (!tag) {
  console.error('缺少 --tag vX.Y.Z 参数')
  process.exit(1)
}

const headers = {
  Authorization: `token ${token}`,
  'User-Agent': 'simple-to-do-release-fix',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
}

async function gh(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub API ${response.status} ${path}: ${body.slice(0, 200)}`)
  }
  return response
}

function looksCorrupted(value) {
  // mojibake 通常包含替换符或大段 Latin-1 扩展区字符
  return /\uFFFD/.test(value) || /[\u00C0-\u00FF]{4,}/.test(value)
}

async function run() {
  // 1. Release body 是更新说明的唯一权威来源
  const release = await (await gh(`/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`)).json()
  const notes = (release.body || '').trim()
  console.log(`Release ${tag} body 长度: ${notes.length}`)

  // 2. 找到 latest.json asset
  const assets = await (await gh(`/repos/${repo}/releases/${release.id}/assets`)).json()
  const asset = assets.find(item => item.name === 'latest.json')
  if (!asset) {
    console.log('未找到 latest.json asset，跳过（可能本次发布未生成更新清单）')
    return
  }

  // 3. 读取现有内容
  const raw = await (await fetch(asset.browser_download_url, { headers: { 'User-Agent': 'simple-to-do-release-fix' } })).text()
  let latest
  try {
    latest = JSON.parse(raw)
  } catch (error) {
    throw new Error(`latest.json 不是合法 JSON: ${error.message}`)
  }

  // 4. notes 已正确则跳过；tauri-action 的乱码或缺失时写回 Release body
  const currentNotes = String(latest.notes ?? '').trim()
  const needsFix = !notes || currentNotes !== notes || looksCorrupted(currentNotes)
  if (!needsFix) {
    console.log('latest.json 的 notes 已与 Release body 一致，无需修复')
    return
  }

  latest.notes = notes
  const payload = JSON.stringify(latest, null, 2)

  // 5. GitHub 不允许覆盖同名 asset：先删除再上传
  await gh(`/repos/${repo}/releases/assets/${asset.id}`, { method: 'DELETE' })
  console.log(`已删除旧 latest.json (asset ${asset.id})`)

  const uploadPath = `/repos/${repo}/releases/${release.id}/assets?name=latest.json`
  const uploadResponse = await gh(uploadPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  })
  const uploaded = await uploadResponse.json()
  console.log(`已重新上传 latest.json (asset ${uploaded.id})，notes 长度 ${notes.length}`)
}

run().catch(error => {
  console.error('修复 latest.json 失败:', error.message)
  process.exit(1)
})
