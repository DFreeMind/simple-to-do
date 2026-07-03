import { invoke } from '@tauri-apps/api/core'

const STORAGE_KEY = 'simple-to-do:data'

function isTauri() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)
}

export async function loadData() {
  if (isTauri()) {
    return invoke('load_data')
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

export async function saveData(data) {
  if (isTauri()) {
    return invoke('save_data', { data })
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return true
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
