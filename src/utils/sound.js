import chimeSound from '@/assets/sounds/chime.ogg'
import completeSound from '@/assets/sounds/complete.ogg'
import dragGlassSound from '@/assets/sounds/drag-glass.ogg'
import restoreSound from '@/assets/sounds/restore.ogg'
import softClickSound from '@/assets/sounds/soft-click.ogg'
import tapSound from '@/assets/sounds/tap.ogg'

// Robin Lamb / Kenney UI Sound Effects (CC0 1.0)，完整来源见 src/assets/sounds/LICENSE.md。
// 素材使用延迟预加载的模板和 clone 播放：短音效可以叠加，拖动经过目标时不会因重新下载而失声。
const SOUNDS = {
  complete: { src: completeSound, volume: 0.31 },
  restore: { src: restoreSound, volume: 0.22 },
  chime: { src: chimeSound, volume: 0.17 },
  tap: { src: tapSound, volume: 0.16 },
  soft: { src: softClickSound, volume: 0.14 },
  drag: { src: dragGlassSound, volume: 0.15 }
}

let soundEnabled = true
let soundCategories = { task: true, list: true, group: true, drag: true }
const audioPools = new Map()
const AUDIO_POOL_SIZE = 4

function isCategoryEnabled(category) {
  return soundEnabled && soundCategories[category]
}

function getAudioPool(name) {
  if (typeof Audio === 'undefined') return null
  if (!audioPools.has(name)) {
    const voices = Array.from({ length: AUDIO_POOL_SIZE }, () => {
      const audio = new Audio(SOUNDS[name].src)
      audio.preload = 'auto'
      audio.load()
      return audio
    })
    audioPools.set(name, { voices, cursor: 0 })
  }
  return audioPools.get(name)
}

function warmAudioCache() {
  Object.keys(SOUNDS).forEach(getAudioPool)
}

function play(name, category) {
  if (!isCategoryEnabled(category) || !SOUNDS[name]) return
  try {
    const pool = getAudioPool(name)
    if (!pool) return
    const audio = pool.voices[pool.cursor]
    pool.cursor = (pool.cursor + 1) % pool.voices.length
    audio.pause()
    audio.currentTime = 0
    audio.volume = SOUNDS[name].volume
    audio.play().catch(() => {})
  } catch {
    // 音频设备不可用或当前系统禁止播放时，不影响业务操作。
  }
}

// 仅为正向、需要确认的操作提供声音；删除和错误保持安静，避免制造紧张感。
export function playCompleteSound() { play('complete', 'task') }
export function playTaskUndoSound() { play('soft', 'task') }
export function playSubtaskCompleteSound() { play('tap', 'task') }
export function playSubtaskUndoSound() { play('soft', 'task') }
export function playDeleteSound() {}
export function playAddSound() { play('chime', 'task') }
export function playRestoreSound() { play('restore', 'task') }
export function playMoveSound() { play('chime', 'task') }
export function playToggleSound() { play('soft', 'task') }
export function playMarkSound() { play('chime', 'task') }
export function playScheduleSound() { play('chime', 'task') }
export function playAttachSound() { play('tap', 'task') }
export function playClearSound() {}
export function playSaveSound() { play('soft', 'task') }
export function playErrorSound() {}

export function playDragStartSound() { play('soft', 'drag') }
export function playDragOverSound() { play('drag', 'drag') }
export function playDragEndSound() { play('soft', 'drag') }

export function playListAddSound() { play('chime', 'list') }
export function playListDeleteSound() {}
export function playListRestoreSound() { play('restore', 'list') }
export function playRenameSound() { play('tap', 'list') }
export function playGroupAddSound() { play('chime', 'group') }
export function playGroupDeleteSound() {}

export function playSoundPreview(name = 'complete') { play(name, name === 'drag' ? 'drag' : 'task') }

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
