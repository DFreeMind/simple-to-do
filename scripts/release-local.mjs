// 本地 Windows 应急发布脚本：构建 → 发布 GitHub Release → 修复 latest.json → 同步自建服务器 → 验证。
// 正式三平台发布优先使用 GitHub Actions 的“发布桌面应用”工作流；本脚本仅用于工作流不可用时的兜底。
//
// 用法（Windows PowerShell，仓库根目录）：
//   node scripts/release-local.mjs --version 0.4.5 --notes-file tmp/release-0.4.5-notes.md
//
// 参数:
//   --version       应用版本号（必须与 package.json / tauri.conf.json 一致）
//   --notes-file    Release Notes 文件路径（必填，中文）
//   --skip-build    跳过本地构建（用于重跑发布，默认 false）
//   --macos         追加 macOS dmg 资产路径（可选，Windows 本地无法构建 dmg）
//
// 环境变量:
//   GITHUB_REPOSITORY  默认 DFreeMind/simple-to-do
//
// 签名：构建时由 scripts/build-windows.ps1 从 ~/.tauri/ 读取私钥与密码注入，
// 不写入本脚本或命令行。

import { execFileSync } from 'node:child_process'
import { env } from 'node:process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const repo = env.GITHUB_REPOSITORY || 'DFreeMind/simple-to-do'

const args = process.argv.slice(2)
const readArg = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : ''
}
const version = readArg('--version')
const notesFile = readArg('--notes-file')
const skipBuild = args.includes('--skip-build')
const macosDmg = readArg('--macos')

if (!version || !notesFile) {
  console.error('用法: node scripts/release-local.mjs --version <v> --notes-file <path> [--skip-build] [--macos <dmg>]')
  process.exit(1)
}
if (!fs.existsSync(notesFile)) {
  console.error(`Release Notes 文件不存在: ${notesFile}`)
  process.exit(1)
}

function run(cmd, argsList, options = {}) {
  const isNpm = cmd === 'npm' || cmd === 'npm.cmd'
  const resolved = isNpm && process.platform === 'win32' ? 'npm.cmd' : cmd
  console.log(`\n$ ${resolved} ${argsList.join(' ')}`)
  // Windows 下 npm.cmd 是批处理脚本，execFileSync 需 shell: true 才能执行
  execFileSync(resolved, argsList, { stdio: 'inherit', cwd: root, ...options, shell: isNpm && process.platform === 'win32' })
}

function runCapture(cmd, argsList) {
  const isNpm = cmd === 'npm' || cmd === 'npm.cmd'
  const resolved = isNpm && process.platform === 'win32' ? 'npm.cmd' : cmd
  return execFileSync(resolved, argsList, {
    encoding: 'utf8',
    cwd: root,
    shell: isNpm && process.platform === 'win32'
  }).trim()
}

const tag = `v${version}`
const assetBase = `simple-to-do_${version}_x64-setup`
const staging = path.join(root, 'tmp', `release-${version}`)

function findBundleFile(pattern) {
  // Windows 产物目录：bundle/nsis（tauri 2），旧版本目录结构相同
  for (const dir of ['bundle/nsis', 'bundle']) {
    const full = path.join(root, 'src-tauri', 'target', 'release', dir)
    if (!fs.existsSync(full)) continue
    const found = fs.readdirSync(full).filter(name => name.includes(pattern))
    if (found.length) return path.join(full, found[0])
  }
  return ''
}

function verifyKeyId(sigPath, expected = '403511B997506DCC') {
  const outer = fs.readFileSync(sigPath, 'utf8').trim()
  const inner = Buffer.from(outer, 'base64').toString('utf8')
  const sigLine = inner.split(/\r?\n/).find(line => line && !line.startsWith('untrusted comment') && !line.startsWith('trusted comment'))
  const sigBuf = Buffer.from(sigLine, 'base64')
  const keyid = sigBuf.subarray(2, 10).toString('hex').toUpperCase()
  if (keyid !== expected) throw new Error(`签名 keyid 不匹配: 实际 ${keyid}，期望 ${expected}`)
  return keyid
}

function hasBom(buf) {
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
}

async function main() {
  console.log(`===== 本地发布 v${version} =====`)

  // 1. 前置检查
  console.log('\n--- 1/7 前置检查 ---')
  run('node', ['scripts/release-preflight.mjs', version])

  // 2. 构建
  if (skipBuild) {
    console.log('\n--- 2/7 跳过构建（--skip-build）---')
  } else {
    console.log('\n--- 2/7 本地构建（签名由 build-windows.ps1 注入）---')
    run('npm', ['run', 'build:windows'])
  }

  // 3. 收集产物并暂存（统一英文文件名）
  console.log('\n--- 3/7 收集产物 ---')
  fs.mkdirSync(staging, { recursive: true })
  const exeSource = findBundleFile(`_${version}_x64-setup.exe`) && !findBundleFile(`simple-to-do_${version}_x64-setup.exe`)
    ? findBundleFile(`_${version}_x64-setup.exe`)
    : findBundleFile(`simple-to-do_${version}_x64-setup.exe`) || findBundleFile(`_${version}_x64-setup.exe`)
  if (!exeSource) throw new Error(`未找到 v${version} 的 NSIS 安装包（bundle/nsis 下）`)
  const sigSource = `${exeSource}.sig`
  if (!fs.existsSync(sigSource)) throw new Error(`未找到签名文件: ${sigSource}`)

  const exeStaged = path.join(staging, `${assetBase}.exe`)
  const sigStaged = path.join(staging, `${assetBase}.exe.sig`)
  fs.copyFileSync(exeSource, exeStaged)
  fs.copyFileSync(sigSource, sigStaged)
  console.log(`安装包: ${exeSource}`)
  console.log(`签名:   ${sigSource}`)
  verifyKeyId(sigStaged)
  console.log(`签名校验通过: keyid=403511B997506DCC`)

  const notes = fs.readFileSync(notesFile, 'utf8').trim()

  // 4. 创建/更新 GitHub Release 并上传 Windows 资产
  console.log('\n--- 4/7 GitHub Release ---')
  // gh release view 对不存在的 release 会以 exit 1 报错，不能直接抛；try/catch 判断存在性
  let releaseExists = false
  try {
    const out = runCapture('gh', ['release', 'view', tag, '--json', 'id'])
    releaseExists = !!(out && !out.startsWith('gh:'))
  } catch {
    releaseExists = false
  }
  if (releaseExists) {
    console.log(`Release ${tag} 已存在，更新 notes 与资产`)
    run('gh', ['release', 'edit', tag, '--notes-file', notesFile])
    run('gh', ['release', 'upload', tag, exeStaged, sigStaged, '--clobber'])
  } else {
    console.log(`创建 Release ${tag}`)
    run('gh', ['release', 'create', tag, exeStaged, sigStaged, '--title', version, '--notes-file', notesFile])
  }

  // 5. 从同一 Release 的资产重新生成 latest.json；未来 CI 追加 macOS 后会自动并入。
  console.log('\n--- 5/7 生成统一 latest.json ---')
  run('node', ['scripts/publish-updater-manifest.mjs', '--tag', tag, '--require', 'windows-x86_64'])

  // 6. 同步自建服务器
  console.log('\n--- 6/7 同步自建服务器 ---')
  run('node', ['scripts/sync-update-source.mjs', '--version', version, '--base-url', 'https://simpletodo.duqimeng.cn/releases'])

  // 7. 验证
  console.log('\n--- 7/7 线上验证 ---')
  const verifyDir = path.join(staging, 'verify')
  fs.mkdirSync(verifyDir, { recursive: true })
  const dl = (url, dest) => run('curl', ['-L', '-sS', '--connect-timeout', '20', '--max-time', '300', '-o', dest, url])
  dl(`https://github.com/${repo}/releases/download/${tag}/${assetBase}.exe.sig`, path.join(verifyDir, 'sig'))
  dl(`https://github.com/${repo}/releases/download/${tag}/latest.json`, path.join(verifyDir, 'latest.json'))
  const keyid = verifyKeyId(path.join(verifyDir, 'sig'))
  const latestVerify = JSON.parse(fs.readFileSync(path.join(verifyDir, 'latest.json'), 'utf8'))
  const latestRaw = fs.readFileSync(path.join(verifyDir, 'latest.json'))
  if (hasBom(latestRaw)) throw new Error('线上 latest.json 仍带 BOM！')
  const serverCheck = runCapture('curl', ['-sS', '--connect-timeout', '20', '--max-time', '120', 'https://simpletodo.duqimeng.cn/releases/latest.json'])
  const serverLatest = JSON.parse(serverCheck)
  const winEntry = Object.values(serverLatest.platforms || {}).find(e => e && typeof e.url === 'string' && e.url.includes('x64-setup'))
  console.log(`GitHub latest.json: version=${latestVerify.version}`)
  console.log(`服务器 latest.json: version=${serverLatest.version}`)
  console.log(`服务器下载地址: ${winEntry ? winEntry.url : '(未找到)'}`)
  if (serverLatest.version !== version) throw new Error(`服务器 latest.json 版本不匹配: ${serverLatest.version} != ${version}`)
  if (!winEntry || !winEntry.url.startsWith('https://simpletodo.duqimeng.cn/releases/')) {
    throw new Error('服务器下载地址未指向新路径 /releases/')
  }

  console.log('\n===== 发布完成，全部验证通过 =====')
  console.log(`Release: https://github.com/${repo}/releases/tag/${tag}`)
  console.log(`更新源:  https://simpletodo.duqimeng.cn/releases/latest.json`)
  if (macosDmg) {
    console.log(`\n追加 macOS 资产: ${macosDmg}`)
    run('gh', ['release', 'upload', tag, macosDmg, '--clobber'])
    run('node', ['scripts/fix-updater-json.mjs', '--tag', tag])
  }
}

main().catch(error => {
  console.error(`\n发布失败: ${error.message}`)
  process.exit(1)
})
