import { reactive } from 'vue'
import { check } from '@tauri-apps/plugin-updater'

const UPDATE_TIMEOUT = 20000

function isTauri() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)
}

function isMacOS() {
  return typeof navigator !== 'undefined' && /Macintosh|Mac OS X/.test(navigator.userAgent)
}

/**
 * 应用更新共享状态。SettingsPanel 与数据保护页共用同一份状态，
 * 避免两处各自维护检查/下载逻辑导致状态不一致。
 */
export const updaterState = reactive({
  // idle | checking | upToDate | available | skipped | downloading | installing | error | unsupported
  status: 'idle',
  update: null,
  error: '',
  progress: { downloaded: 0, total: 0 }
})

function classifyError(error) {
  const message = String(error?.message || '')
  if (message.includes('404') || message.includes('latest.json')) {
    return '当前发布未提供已签名的自动更新清单（latest.json），请到发布页下载安装包手动更新。'
  }
  if (message.includes('decoding response body') || message.includes('expected value')) {
    return '更新服务返回的数据格式异常，请稍后重试；若持续出现请到发布页手动更新。'
  }
  return '更新服务暂时不可用，不影响本机任务数据；请稍后重试。'
}

/** 更新说明：latest.json 的 notes 可能被发布流程写坏（mojibake），此时降级为通用文案。 */
export function updateNotes() {
  const notes = updaterState.update?.body?.trim()
  if (!notes) return '本次更新已准备就绪。'
  if (/\uFFFD/.test(notes) || /[\u0080-\u00FF]{4,}/.test(notes)) return '本次更新已准备就绪。'
  return notes
}

/**
 * 检查更新。
 * @param {object} options
 * @param {string} options.skippedVersion 用户跳过的版本号；命中则进入 skipped 状态
 * @param {boolean} options.force 为 true 时无视跳过记录（数据保护页必须能安装最新版）
 * @param {boolean} options.silent 静默检查：失败时不打印告警，由设置面板呈现状态
 */
export async function checkForUpdates({ skippedVersion = '', force = false, silent = false } = {}) {
  if (!isTauri() || import.meta.env.DEV) {
    updaterState.status = 'idle'
    return false
  }
  updaterState.status = 'checking'
  updaterState.error = ''
  updaterState.update = null
  updaterState.progress = { downloaded: 0, total: 0 }
  try {
    const update = await check({ timeout: UPDATE_TIMEOUT })
    if (!update) {
      // macOS 从未发布签名更新包时 check 返回 null，误显示「已是最新」会误导用户。
      if (isMacOS()) {
        updaterState.status = 'unsupported'
        updaterState.error = '当前平台暂未发布自动更新包，请到下载页手动安装最新版本。'
      } else {
        updaterState.status = 'upToDate'
      }
      return false
    }
    if (!force && skippedVersion && update.version === skippedVersion) {
      updaterState.update = update
      updaterState.status = 'skipped'
      return false
    }
    updaterState.update = update
    updaterState.status = 'available'
    return true
  } catch (error) {
    updaterState.status = 'error'
    updaterState.error = classifyError(error)
    if (!silent) console.warn('[updater] 检查更新失败:', error)
    return false
  }
}

/** 下载并安装当前可用更新；Windows NSIS passive 模式下安装完成后应用会自动重新打开。 */
export async function installUpdate() {
  const update = updaterState.update
  if (!update) return false
  updaterState.status = 'downloading'
  updaterState.error = ''
  updaterState.progress = { downloaded: 0, total: 0 }
  try {
    await update.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        updaterState.progress = { downloaded: 0, total: event.data.contentLength || 0 }
      } else if (event.event === 'Progress') {
        updaterState.progress = {
          ...updaterState.progress,
          downloaded: updaterState.progress.downloaded + event.data.chunkLength
        }
      } else if (event.event === 'Finished') {
        updaterState.status = 'installing'
      }
    })
    updaterState.status = 'installing'
    return true
  } catch (error) {
    updaterState.status = 'error'
    updaterState.error = '更新下载或安装失败，不影响本机任务数据；请稍后重试。'
    console.warn('[updater] 下载或安装失败:', error)
    return false
  }
}

/** 跳过当前可用版本，返回被跳过的版本号，由调用方持久化到 settings。 */
export function skipCurrentUpdate() {
  const version = updaterState.update?.version
  if (!version) return ''
  updaterState.status = 'skipped'
  return version
}
