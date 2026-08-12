import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const rustSource = readFileSync(new URL('../src-tauri/src/main.rs', import.meta.url), 'utf8')
const updaterSource = readFileSync(new URL('../src/services/updater.js', import.meta.url), 'utf8')

test('安装 command 先返回成功，不在同一 IPC 中执行永不返回的重启', () => {
  const installCommand = rustSource.match(/async fn install_pending_update[\s\S]*?\n}\n\n\/\/\/ 在安装 command/)
  assert.ok(installCommand, '应能定位安装 command')
  assert.match(installCommand[0], /\.install\(bytes\)[\s\S]*?Ok\(true\)/)
  const executableSource = installCommand[0].replace(/\/\/.*$/gm, '')
  assert.doesNotMatch(executableSource, /app\.restart\(|app\.request_restart\(/)
})

test('重启由独立 command 请求，并在前端提供超时后的已安装状态', () => {
  assert.match(rustSource, /fn restart_application[\s\S]*?app\.request_restart\(\)/)
  assert.match(updaterSource, /await invoke\('install_pending_update'\)[\s\S]*?status = 'installed'/)
  assert.match(updaterSource, /invoke\('restart_application'\)/)
  assert.match(updaterSource, /RESTART_TIMEOUT_MS = 8000/)
  assert.match(updaterSource, /status = 'restarting'[\s\S]*?status = 'installed'/)
})
