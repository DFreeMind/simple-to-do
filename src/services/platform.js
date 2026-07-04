import { invoke } from '@tauri-apps/api/core'

const STORAGE_KEY = 'simple-to-do:data'

function isTauri() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)
}

export async function loadData() {
  try {
    if (isTauri()) {
      return await invoke('load_data')
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    throw new Error(formatPlatformError(error, '读取本地数据失败'))
  }
}

export async function saveData(data) {
  try {
    if (isTauri()) {
      return await invoke('save_data', { data })
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    throw new Error(formatPlatformError(error, '保存本地数据失败'))
  }
}

export async function selectImage() {
  if (isTauri()) {
    return invoke('select_image')
  }
  return null
}

export async function readImage(filePath) {
  if (isTauri()) {
    return invoke('read_image', { filePath })
  }
  return null
}

function formatPlatformError(error, fallback) {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error.message) return error.message
  return fallback
}
