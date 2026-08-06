// 同步发布产物到自建更新服务器（simpletodo.duqimeng.cn）。
// 本地与 GitHub Actions 通用：从 GitHub Release 下载 exe/sig/latest.json，
// 改写 latest.json 下载地址指向自建服务器，再用 scp 上传。
//
// 用法:
//   node scripts/sync-update-source.mjs --version 0.4.5 --base-url https://simpletodo.duqimeng.cn
//
// 参数:
//   --version   应用版本号（必须与发布版本一致）
//   --base-url  自建更新源根地址（不含路径）
//   --tag       Release tag，默认 v<version>
//   --workdir   临时目录（默认系统临时目录）
//
// 环境变量:
//   GITHUB_TOKEN / GITHUB_REPOSITORY   下载 GitHub Release 产物（公开仓库可不带 token）
//   DEPLOY_SSH_HOST / DEPLOY_SSH_USER  服务器地址与登录用户（默认 47.116.185.192 / root）
//   DEPLOY_SSH_KEY_FILE                私钥文件路径（CI 中由 secret 写入；本地可省略走默认 key）

import { execFileSync } from 'node:child_process'
import { env } from 'node:process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const readArg = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : ''
}

const version = readArg('--version')
const baseUrl = readArg('--base-url')
const tag = readArg('--tag') || `v${version}`
const workdir = readArg('--workdir') || fs.mkdtempSync(path.join(os.tmpdir(), 'upd-src-'))

const repo = env.GITHUB_REPOSITORY || 'DFreeMind/simple-to-do'
const host = env.DEPLOY_SSH_HOST || '47.116.185.192'
const user = env.DEPLOY_SSH_USER || 'root'
const keyFile = env.DEPLOY_SSH_KEY_FILE || ''
const remoteRoot = '/data/simple-to-do/releases'

if (!version || !baseUrl) {
  console.error('用法: node scripts/sync-update-source.mjs --version <version> --base-url <url>')
  process.exit(1)
}

// 用 curl 下载：自动读取 HTTP_PROXY/HTTPS_PROXY 环境变量（本地代理环境必需），
// CI runner 无代理环境变量时直连 GitHub，行为一致。
function download(url, destPath) {
  execFileSync('curl', ['-L', '-sS', '--connect-timeout', '20', '--max-time', '300', '-o', destPath, url], {
    stdio: 'inherit'
  })
  const size = fs.statSync(destPath).size
  if (size === 0) throw new Error(`下载内容为空: ${url}`)
  console.log(`已下载: ${path.basename(destPath)} (${size} bytes)`)
}

// platform key -> 自建服务器上的文件名（与 releaseAssetNamePattern 保持一致）
function serverAssetName(platformKey) {
  const map = {
    'windows-x86_64': `simple-to-do_${version}_x64-setup.exe`,
    'windows-x86_64-nsis': `simple-to-do_${version}_x64-setup.exe`,
    'windows-aarch64': `simple-to-do_${version}_arm64-setup.exe`
  }
  return map[platformKey] || ''
}

function run(cmd, argsList) {
  execFileSync(cmd, argsList, { stdio: 'inherit' })
}

async function main() {
  fs.mkdirSync(workdir, { recursive: true })

  // 1. 下载 GitHub 发布产物
  const exeName = `simple-to-do_${version}_x64-setup.exe`
  const sigName = `${exeName}.sig`
  const exePath = path.join(workdir, exeName)
  const sigPath = path.join(workdir, sigName)
  const latestPath = path.join(workdir, 'latest.json')
  await download(`https://github.com/${repo}/releases/download/${tag}/${exeName}`, exePath)
  await download(`https://github.com/${repo}/releases/download/${tag}/${sigName}`, sigPath)
  await download(`https://github.com/${repo}/releases/download/${tag}/latest.json`, latestPath)

  // 2. 改写 latest.json 下载地址指向自建服务器（签名/版本不变，仅换下载源）
  const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'))
  let changed = 0
  for (const [platformKey, entry] of Object.entries(latest.platforms || {})) {
    const name = serverAssetName(platformKey)
    if (entry && typeof entry.url === 'string' && name) {
      entry.url = `${baseUrl}/${version}/${name}`
      changed++
      console.log(`${platformKey} -> ${entry.url}`)
    }
  }
  fs.writeFileSync(latestPath, JSON.stringify(latest, null, 2) + '\n')
  console.log(`latest.json 已改写 ${changed} 条下载地址，version=${latest.version}`)

  // 3. 上传到服务器（按版本目录 + 固定 latest.json）
  if (keyFile && process.platform !== 'win32') fs.chmodSync(keyFile, 0o600)
  const sshOpts = ['-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=15']
  if (keyFile) sshOpts.push('-i', keyFile)
  const destination = `${user}@${host}`

  run('ssh', [...sshOpts, destination, `mkdir -p ${remoteRoot}/${version}`])
  run('scp', [...sshOpts, exePath, sigPath, `${destination}:${remoteRoot}/${version}/`])
  run('scp', [...sshOpts, latestPath, `${destination}:${remoteRoot}/latest.json`])

  // 4. 验证线上可访问
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null'
  const checkUrl = `${baseUrl}/latest.json`
  const verify = execFileSync('curl', ['-sS', '-o', nullDevice, '-w', '%{http_code}', '--connect-timeout', '15', checkUrl], { encoding: 'utf8' })
  console.log(`验证 ${checkUrl} -> HTTP ${verify.trim()}`)
  if (verify.trim() !== '200') throw new Error(`自建更新源验证失败: HTTP ${verify.trim()}`)

  console.log(`同步完成: ${version} 已上传到 ${destination}:${remoteRoot}`)
}

main().catch((error) => {
  console.error('同步更新源失败:', error.message)
  process.exit(1)
})
