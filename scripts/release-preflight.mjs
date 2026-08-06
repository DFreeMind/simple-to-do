// 本地发布前置检查：发布前校验版本一致性、签名密钥、Git 状态与发布脚本就绪。
// 发布流程已固定为本地执行（scripts/release-local.mjs），不再依赖 GitHub Actions。
//
// 用法：
//   node scripts/release-preflight.mjs 0.4.5
//   # 或 npm run release:check -- 0.4.5

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const expectedVersion = process.argv[2] || process.env.RELEASE_VERSION || ''
const root = new URL('../', import.meta.url)
const readText = (p) => readFile(new URL(p, root), 'utf8')
const packageJson = JSON.parse(await readText('package.json'))
const tauriConfig = JSON.parse(await readText('src-tauri/tauri.conf.json'))
const errors = []

// 1. 版本一致性：package.json 与 tauri.conf.json 必须相同，且与请求发布版本一致
if (packageJson.version !== tauriConfig.version) {
  errors.push(`版本不一致：package.json=${packageJson.version}，tauri.conf.json=${tauriConfig.version}`)
}
if (expectedVersion && expectedVersion !== packageJson.version) {
  errors.push(`请求发布 ${expectedVersion}，但当前应用版本是 ${packageJson.version}`)
}

// 2. 签名密钥：Tauri updater 强制要求发布端签名，客户端用内置 pubkey 验签
const keyFile = path.join(homedir(), '.tauri', 'simple-to-do-updater-v3.key')
const passwordFile = path.join(homedir(), '.tauri', 'simple-to-do-updater-v3.password')
if (!existsSync(keyFile)) errors.push(`缺少 Tauri 签名私钥：${keyFile}`)
if (!existsSync(passwordFile)) errors.push(`缺少 Tauri 签名密码文件：${passwordFile}`)

// 3. 本地发布脚本就绪
for (const script of ['scripts/release-local.mjs', 'scripts/fix-updater-json.mjs', 'scripts/sync-update-source.mjs']) {
  if (!existsSync(new URL(script, root))) errors.push(`缺少发布脚本：${script}`)
}

// 4. Git 状态：工作区应干净（本地发布以当前 checkout 为准，未提交改动会污染发布内容）
try {
  const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
    .split('\n').map(line => line.trim()).filter(Boolean)
  if (dirty.length) errors.push(`工作区有未提交改动（${dirty.length} 项），发布前请先提交：\n${dirty.map(line => `  ${line}`).join('\n')}`)
} catch {
  errors.push('无法读取 Git 状态，确认在仓库根目录执行')
}

// 5. gh CLI 已登录（本地发布通过 gh 创建 Release 并上传资产）
try {
  const who = execFileSync('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8' }).trim()
  console.log(`gh 已登录：${who}`)
} catch {
  errors.push('gh CLI 未登录或不可用，本地发布需要 gh（gh auth login）')
}

if (errors.length) {
  console.error('发布前检查未通过：')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`发布前检查通过：v${packageJson.version}（本地发布流程就绪）`)
