// 同步发布产物到自建更新服务器（simpletodo.duqimeng.cn）。
// 本地与 GitHub Actions 通用：从 GitHub Release 下载安装包、updater 包和 latest.json，
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
//   DEPLOY_SSH_KEY_FILE                私钥文件路径（本地可选）
//   DEPLOY_SSH_KEY                     私钥内容（GitHub Actions Secret）

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
let keyFile = env.DEPLOY_SSH_KEY_FILE || ''
let temporaryKeyFile = ''
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

function run(cmd, argsList) {
  execFileSync(cmd, argsList, { stdio: 'inherit' })
}

async function main() {
  fs.mkdirSync(workdir, { recursive: true })

  // 1. 下载 GitHub 发布产物
  const latestPath = path.join(workdir, 'latest.json')
  await download(`https://github.com/${repo}/releases/download/${tag}/latest.json`, latestPath)

  // 2. 下载每个 updater 资产与用户可直接下载的安装包。
  const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'))
  const files = new Map()
  const addAsset = (url) => {
    const name = path.basename(new URL(url).pathname)
    const dest = path.join(workdir, name)
    if (!files.has(name)) {
      download(url, dest)
      files.set(name, dest)
    }
    return name
  }
  const manualDmg = {
    'darwin-x86_64': `simple-to-do_${version}_x64.dmg`,
    'darwin-aarch64': `simple-to-do_${version}_aarch64.dmg`
  }
  const releaseBase = `https://github.com/${repo}/releases/download/${tag}`
  for (const [platformKey, entry] of Object.entries(latest.platforms || {})) {
    if (entry && typeof entry.url === 'string') {
      const name = addAsset(entry.url)
      addAsset(`${entry.url}.sig`)
      entry.url = `${baseUrl}/${version}/${name}`
      if (manualDmg[platformKey]) addAsset(`${releaseBase}/${manualDmg[platformKey]}`)
      console.log(`${platformKey} -> ${entry.url}`)
    }
  }
  if (!files.size) throw new Error('latest.json 没有可同步的平台资产')
  fs.writeFileSync(latestPath, JSON.stringify(latest, null, 2) + '\n')
  console.log(`latest.json 已改写 ${Object.keys(latest.platforms || {}).length} 条下载地址，version=${latest.version}`)

  // 3. 上传到服务器（按版本目录 + 固定 latest.json）
  if (!keyFile && env.DEPLOY_SSH_KEY) {
    temporaryKeyFile = path.join(workdir, 'deploy_key')
    // GitHub Secret 可能以 CRLF 保存，也可能由管理界面粘贴成字面量 \\n；
    // OpenSSH/OpenSSL 在两种情况下都会报 "error in libcrypto"。
    const normalizedKey = env.DEPLOY_SSH_KEY
      .replace(/\r/g, '')
      .replace(/\\n/g, '\n')
    fs.writeFileSync(temporaryKeyFile, normalizedKey.endsWith('\n') ? normalizedKey : `${normalizedKey}\n`, { mode: 0o600 })
    keyFile = temporaryKeyFile
  }
  if (keyFile && process.platform !== 'win32') fs.chmodSync(keyFile, 0o600)
  const sshOpts = ['-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=15']
  if (keyFile) sshOpts.push('-i', keyFile)
  const destination = `${user}@${host}`

  run('ssh', [...sshOpts, destination, `mkdir -p ${remoteRoot}/${version}`])
  run('scp', [...sshOpts, ...files.values(), `${destination}:${remoteRoot}/${version}/`])
  run('scp', [...sshOpts, latestPath, `${destination}:${remoteRoot}/latest.json`])

  // 4. 验证线上可访问
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null'
  const checkUrl = `${baseUrl}/latest.json`
  const verify = execFileSync('curl', ['-sS', '-o', nullDevice, '-w', '%{http_code}', '--connect-timeout', '15', checkUrl], { encoding: 'utf8' })
  console.log(`验证 ${checkUrl} -> HTTP ${verify.trim()}`)
  if (verify.trim() !== '200') throw new Error(`自建更新源验证失败: HTTP ${verify.trim()}`)
  for (const name of files.keys()) {
    const code = execFileSync('curl', ['-sS', '-o', nullDevice, '-w', '%{http_code}', '--connect-timeout', '15', `${baseUrl}/${version}/${name}`], { encoding: 'utf8' }).trim()
    if (code !== '200') throw new Error(`自建下载资产验证失败: ${name} -> HTTP ${code}`)
  }

  console.log(`同步完成: ${version} 已上传 ${files.size} 个资产到 ${destination}:${remoteRoot}`)
}

main().catch((error) => {
  console.error('同步更新源失败:', error.message)
  process.exit(1)
})

process.on('exit', () => {
  if (temporaryKeyFile && fs.existsSync(temporaryKeyFile)) fs.unlinkSync(temporaryKeyFile)
})
