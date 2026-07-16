import chimeSound from '@/assets/sounds/chime.ogg'
import completeSound from '@/assets/sounds/complete.ogg'
import dragTickSound from '@/assets/sounds/drag-tick.ogg'
import restoreSound from '@/assets/sounds/restore.ogg'
import softClickSound from '@/assets/sounds/soft-click.ogg'
import tapSound from '@/assets/sounds/tap.ogg'

// Robin Lamb UI Sound Effects (CC0 1.0): https://opengameart.org/content/ui-sound-effects-button-clicks-user-feedback-notifications
// 素材使用延迟预加载的模板和 clone 播放：短音效可以叠加，拖动经过目标时不会因重新下载而失声。
const SOUNDS = {
  complete: { src: completeSound, volume: 0.31 },
  restore: { src: restoreSound, volume: 0.22 },
  chime: { src: chimeSound, volume: 0.17 },
  tap: { src: tapSound, volume: 0.16 },
  soft: { src: softClickSound, volume: 0.14 },
  drag: { src: dragTickSound, volume: 0.12 }
}

let soundEnabled = true
let soundCategories = { task: true, list: true, group: true }
let lastDragSoundTime = 0
const DRAG_THROTTLE_MS = 90
const audioTemplates = new Map()

function isCategoryEnabled(category) {
  return soundEnabled && soundCategories[category]
}

function getTemplate(name) {
  if (typeof Audio === 'undefined') return null
  if (!audioTemplates.has(name)) {
    const audio = new Audio(SOUNDS[name].src)
    audio.preload = 'auto'
    audioTemplates.set(name, audio)
  }
  return audioTemplates.get(name)
}

function warmAudioCache() {
  Object.keys(SOUNDS).forEach(getTemplate)
}

function play(name, category) {
  if (!isCategoryEnabled(category) || !SOUNDS[name]) return
  try {
    const template = getTemplate(name)
    if (!template) return
    const audio = template.cloneNode()
    audio.volume = SOUNDS[name].volume
    audio.play().catch(() => {})
  } catch {
    // 音频设备不可用或当前系统禁止播放时，不影响业务操作。
  }
}

// 任务：清亮完成提示 + 低干扰点击，避免使用夸张的游戏式“开关门”音色。
export function playCompleteSound() { play('complete', 'task') }
export function playTaskUndoSound() { play('soft', 'task') }
export function playSubtaskCompleteSound() { play('tap', 'task') }
export function playSubtaskUndoSound() { play('soft', 'task') }
export function playDeleteSound() { play('soft', 'task') }
export function playAddSound() { play('tap', 'task') }
export function playRestoreSound() { play('restore', 'task') }
export function playMoveSound() { play('tap', 'task') }
export function playToggleSound() { play('soft', 'task') }
export function playMarkSound() { play('chime', 'task') }
export function playScheduleSound() { play('chime', 'task') }
export function playAttachSound() { play('tap', 'task') }
export function playClearSound() { play('soft', 'task') }
export function playSaveSound() { play('soft', 'task') }
export function playErrorSound() { play('soft', 'task') }

export function playDragStartSound() { play('tap', 'task') }
export function playDragOverSound() {
  if (!isCategoryEnabled('task')) return
  const now = Date.now()
  if (now - lastDragSoundTime < DRAG_THROTTLE_MS) return
  lastDragSoundTime = now
  play('drag', 'task')
}
export function playDragEndSound() { play('soft', 'task') }

export function playListAddSound() { play('restore', 'list') }
export function playListDeleteSound() { play('soft', 'list') }
export function playListRestoreSound() { play('restore', 'list') }
export function playRenameSound() { play('tap', 'list') }
export function playGroupAddSound() { play('restore', 'group') }
export function playGroupDeleteSound() { play('soft', 'group') }

export function playSoundPreview() { play('complete', 'task') }

export function setSoundEnabled(enabled) {
  soundEnabled = enabled
  if (enabled) warmAudioCache()
}

export function isSoundEnabled() {
  return soundEnabled
}

export function setSoundCategories(categories) {
  soundCategories = { ...soundCategories, ...categories }
  if (soundEnabled) warmAudioCache()
}

export function getSoundCategories() {
  return { ...soundCategories }
}
