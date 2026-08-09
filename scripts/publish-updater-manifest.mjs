// 基于同一个 GitHub Release 的已签名资产生成统一 latest.json。
// CI 与本地发布都调用它，避免多平台 job 争抢或覆盖更新清单。

import { env } from 'node:process'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const readArg = name => {
  const index = args.indexOf(name)
  return index < 0 ? '' : args[index + 1]
}
const tag = readArg('--tag')
const required = new Set((readArg('--require') || 'windows-x86_64').split(',').filter(Boolean))
const repo = env.GITHUB_REPOSITORY || 'DFreeMind/simple-to-do'
let token = env.GITHUB_TOKEN || ''
if (!token) {
  try { token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim() } catch { /* handled below */ }
}
if (!tag || !token) throw new Error('需要 --tag vX.Y.Z 与 GITHUB_TOKEN（本地可使用 gh 登录）')

function api(url, options = {}) {
  const endpoint = url.startsWith('http') ? url : `https://api.github.com${url}`
  const headers = [
    `Authorization: token ${token}`,
    'User-Agent: simple-to-do-release-manifest',
    'Accept: application/vnd.github+json',
    'X-GitHub-Api-Version: 2022-11-28'
  ]
  for (const header of options.headers || []) headers.push(header)
  const command = ['-sS', '-L', '--fail-with-body', '--connect-timeout', '20', '--max-time', '180']
  for (const header of headers) command.push('-H', header)
  if (options.method) command.push('-X', options.method)
  if (options.body !== undefined) command.push('--data-binary', options.body)
  command.push(endpoint)
  return execFileSync('curl', command, { encoding: options.encoding || 'utf8' })
}

const release = JSON.parse(api(`/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`))
const version = String(release.tag_name || tag).replace(/^v/, '')
const assets = JSON.parse(api(`/repos/${repo}/releases/${release.id}/assets?per_page=100`))
const byName = new Map(assets.map(asset => [asset.name, asset]))
const configurations = [
  { platform: 'windows-x86_64', asset: `simple-to-do_${version}_x64-setup.exe` },
  { platform: 'windows-x86_64-nsis', asset: `simple-to-do_${version}_x64-setup.exe`, aliasOf: 'windows-x86_64' },
  { platform: 'darwin-x86_64', asset: `simple-to-do_${version}_x64.app.tar.gz` },
  { platform: 'darwin-aarch64', asset: `simple-to-do_${version}_aarch64.app.tar.gz` }
]

const platforms = {}
for (const configuration of configurations) {
  const file = byName.get(configuration.asset)
  const signature = byName.get(`${configuration.asset}.sig`)
  if (!file || !signature) {
    if (required.has(configuration.platform) || (configuration.aliasOf && required.has(configuration.aliasOf))) {
      throw new Error(`Release ${tag} 缺少 ${configuration.platform} 资产: ${configuration.asset} 或 .sig`)
    }
    continue
  }
  const signatureText = api(signature.browser_download_url).trim()
  if (!signatureText) throw new Error(`签名内容为空: ${signature.name}`)
  platforms[configuration.platform] = {
    signature: signatureText,
    url: `https://github.com/${repo}/releases/download/${tag}/${configuration.asset}`
  }
}

const missing = [...required].filter(key => !platforms[key] && !(key === 'windows-x86_64' && platforms['windows-x86_64-nsis']))
if (missing.length) throw new Error(`latest.json 缺少要求的平台: ${missing.join(', ')}`)

const payload = JSON.stringify({
  version,
  notes: (release.body || '').trim(),
  pub_date: release.published_at || new Date().toISOString(),
  platforms
}, null, 2)
const old = byName.get('latest.json')
if (old) {
  api(`/repos/${repo}/releases/assets/${old.id}`, { method: 'DELETE' })
  console.log(`已删除旧 latest.json (asset ${old.id})`)
}
const uploaded = JSON.parse(api(
  `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=latest.json`,
  { method: 'POST', headers: ['Content-Type: application/json'], body: payload }
))
console.log(`已发布 latest.json (asset ${uploaded.id})，平台: ${Object.keys(platforms).join(', ')}`)
