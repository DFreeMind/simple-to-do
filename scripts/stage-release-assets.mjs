// 将 Tauri 原始构建产物整理为固定、可辨识的 Release 资产名。
// macOS 同时保留用户下载的 DMG 与供 updater 使用的 .app.tar.gz。

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const value = name => {
  const index = args.indexOf(name)
  return index < 0 ? '' : args[index + 1]
}

const platform = value('--platform')
const outDir = value('--out-dir')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'))
const version = config.version

if (!['windows-x64', 'macos-x64', 'macos-aarch64'].includes(platform) || !outDir) {
  throw new Error('用法: node scripts/stage-release-assets.mjs --platform <windows-x64|macos-x64|macos-aarch64> --out-dir <目录>')
}

function findSingle(dir, predicate, description) {
  const target = path.join(root, 'src-tauri', 'target', 'release', 'bundle', dir)
  if (!fs.existsSync(target)) throw new Error(`未找到构建目录: ${target}`)
  const found = fs.readdirSync(target).filter(name => predicate(name))
  if (found.length !== 1) throw new Error(`${description} 应恰好 1 个，实际 ${found.length}: ${found.join(', ')}`)
  return path.join(target, found[0])
}

function copy(source, name) {
  const destination = path.join(outDir, name)
  fs.copyFileSync(source, destination)
  console.log(`${path.basename(source)} -> ${name}`)
}

fs.mkdirSync(outDir, { recursive: true })

if (platform === 'windows-x64') {
  const exe = findSingle('nsis', name => name.endsWith('.exe') && name.includes(version), 'Windows NSIS 安装包')
  const sig = `${exe}.sig`
  if (!fs.existsSync(sig)) throw new Error(`缺少 Windows 更新签名: ${sig}`)
  copy(exe, `simple-to-do_${version}_x64-setup.exe`)
  copy(sig, `simple-to-do_${version}_x64-setup.exe.sig`)
} else {
  const arch = platform === 'macos-x64' ? 'x64' : 'aarch64'
  const dmg = findSingle('dmg', name => name.endsWith('.dmg') && name.includes(version), 'macOS DMG')
  const updater = findSingle('macos', name => name.endsWith('.app.tar.gz'), 'macOS updater 包')
  const sig = `${updater}.sig`
  if (!fs.existsSync(sig)) throw new Error(`缺少 macOS 更新签名: ${sig}`)
  copy(dmg, `simple-to-do_${version}_${arch}.dmg`)
  copy(updater, `simple-to-do_${version}_${arch}.app.tar.gz`)
  copy(sig, `simple-to-do_${version}_${arch}.app.tar.gz.sig`)
}
