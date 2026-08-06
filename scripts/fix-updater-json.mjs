// 发布后修正 latest.json：tauri build 生成的 notes 可能与 Release body 不一致，
// 这里用 GitHub API 从 Release body 重新读取更新说明并以 UTF-8 写回。
// 同时清理 tauri 生成的 UTF-8 BOM（serde_json 不认 BOM，会导致客户端解析失败）。
//
// 用法：
//   $env:GITHUB_REPOSITORY = "DFreeMind/simple-to-do"
//   node scripts/fix-updater-json.mjs --tag v0.4.5
//
// GITHUB_TOKEN 缺省时自动尝试 `gh auth token`（本地发布流程），
// GitHub Actions 中由 GITHUB_TOKEN 注入，两者皆可。

import { env } from 'node:process'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const tag = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : ''
const repo = env.GITHUB_REPOSITORY || 'DFreeMind/simple-to-do'
let token = env.GITHUB_TOKEN
if (!token) {
  try {
    token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim()
  } catch {
    token = ''
  }
}

if (!token) {
  console.error('需要 GITHUB_TOKEN 环境变量或可用的 gh 登录')
  process.exit(1)
}
if (!tag) {
  console.error('缺少 --tag vX.Y.Z 参数')
  process.exit(1)
}

// 用 curl 而非 fetch：本地代理环境下 node fetch 不读 HTTP_PROXY 会直连超时；
// curl 自动读取 HTTP_PROXY/HTTPS_PROXY 环境变量，本地与 CI 行为一致。
function ghCurl(path, options = {}) {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`
  const headers = [
    `Authorization: token ${token}`,
    'User-Agent: simple-to-do-release-fix',
    'Accept: application/vnd.github+json',
    'X-GitHub-Api-Version: 2022-11-28'
  ]
  if (options.headers) headers.push(...options.headers)
  const curlArgs = ['-sS', '--connect-timeout', '20', '--max-time', '120']
  for (const h of headers) curlArgs.push('-H', h)
  if (options.method) curlArgs.push('-X', options.method)
  if (options.body !== undefined) curlArgs.push('--data-binary', options.body)
  curlArgs.push('-w', '\n%{http_code}', url)
  const out = execFileSync('curl', curlArgs, { encoding: 'utf8' })
  const status = parseInt(out.slice(out.lastIndexOf('\n') + 1).trim(), 10)
  const body = out.slice(0, out.lastIndexOf('\n'))
  if (status < 200 || status >= 300) {
    throw new Error(`GitHub API ${status} ${path}: ${body.slice(0, 200)}`)
  }
  return { status, body, json: () => JSON.parse(body) }
}

function looksCorrupted(value) {
  // mojibake 通常包含替换符或大段 Latin-1 扩展区字符
  return /\uFFFD/.test(value) || /[\u00C0-\u00FF]{4,}/.test(value)
}

function download(url) {
  // -L 跟随 GitHub 资产下载的 302 重定向（跳转到 objects.githubusercontent.com），否则拿到空 body。
  // 刚用 gh release upload --clobber 覆盖的 asset 其 blob 复制有延迟，可能短暂 404/空 body，重试几次。
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const buf = execFileSync('curl', ['-sS', '-L', '--fail', '--connect-timeout', '20', '--max-time', '300', url], { encoding: 'buffer' })
      if (buf.length > 0) return buf
      console.log(`下载为空（第 ${attempt} 次），等待重试...`)
    } catch {
      console.log(`下载失败（第 ${attempt} 次），等待重试...`)
    }
    if (attempt < 6) execFileSync('node', ['-e', 'setTimeout(()=>{}, 10000)'])
  }
  throw new Error(`多次重试后仍无法下载: ${url}`)
}

async function run() {
  // 1. Release body 是更新说明的唯一权威来源
  const release = ghCurl(`/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`).json()
  const notes = (release.body || '').trim()
  console.log(`Release ${tag} body 长度: ${notes.length}`)

  // 2. 找到 latest.json asset
  const assets = ghCurl(`/repos/${repo}/releases/${release.id}/assets`).json()
  const asset = assets.find(item => item.name === 'latest.json')
  if (!asset) {
    console.log('未找到 latest.json asset，跳过（可能本次发布未生成更新清单）')
    return
  }

  // 3. 读取现有内容；tauri 在 Windows 上可能写入 UTF-8 BOM，必须一并清理。
  const buf = Buffer.from(download(asset.browser_download_url))
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
  const text = hasBom ? buf.subarray(3).toString('utf8') : buf.toString('utf8')
  let latest
  try {
    latest = JSON.parse(text)
  } catch (error) {
    throw new Error(`latest.json 不是合法 JSON: ${error.message}`)
  }

  // 4. notes 已正确且无 BOM 则跳过
  const currentNotes = String(latest.notes ?? '').trim()
  const needsFix = hasBom || !notes || currentNotes !== notes || looksCorrupted(currentNotes)
  if (!needsFix) {
    console.log('latest.json 的 notes 已与 Release body 一致且无 BOM，无需修复')
    return
  }
  if (hasBom) console.log('检测到 latest.json 带 UTF-8 BOM，将一并清理')

  latest.notes = notes
  const payload = JSON.stringify(latest, null, 2)

  // 5. GitHub 不允许覆盖同名 asset：先删除再上传
  ghCurl(`/repos/${repo}/releases/assets/${asset.id}`, { method: 'DELETE' })
  console.log(`已删除旧 latest.json (asset ${asset.id})`)

  const uploadPath = `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=latest.json`
  const uploaded = ghCurl(uploadPath, {
    method: 'POST',
    headers: ['Content-Type: application/json'],
    body: payload
  }).json()
  console.log(`已重新上传 latest.json (asset ${uploaded.id})，notes 长度 ${notes.length}`)
}

run().catch(error => {
  console.error('修复 latest.json 失败:', error.message)
  process.exit(1)
})
