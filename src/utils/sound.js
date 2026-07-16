import backSound from '@/assets/sounds/back.ogg'
import clickSound from '@/assets/sounds/click.ogg'
import closeSound from '@/assets/sounds/close.ogg'
import confirmSound from '@/assets/sounds/confirm.ogg'
import dropSound from '@/assets/sounds/drop.ogg'
import errorSound from '@/assets/sounds/error.ogg'
import openSound from '@/assets/sounds/open.ogg'
import selectSound from '@/assets/sounds/select.ogg'
import tickSound from '@/assets/sounds/tick.ogg'
import toggleSound from '@/assets/sounds/toggle.ogg'

// Kenney Interface Sounds (CC0 1.0): https://opengameart.org/content/interface-sounds
// 每个音效都使用独立 Audio 实例，避免高频操作中上一次播放被截断。
const SOUNDS = {
  confirm: { src: confirmSound, volume: 0.42 },
  back: { src: backSound, volume: 0.3 },
  click: { src: clickSound, volume: 0.24 },
  close: { src: closeSound, volume: 0.3 },
  open: { src: openSound, volume: 0.34 },
  drop: { src: dropSound, volume: 0.24 },
  toggle: { src: toggleSound, volume: 0.22 },
  select: { src: selectSound, volume: 0.25 },
  error: { src: errorSound, volume: 0.28 },
  tick: { src: tickSound, volume: 0.14 }
}

let soundEnabled = true
let soundCategories = {
  task: true,
  list: true,
  group: true
}
let lastDragSoundTime = 0
const DRAG_THROTTLE_MS = 180

function isCategoryEnabled(category) {
  return soundEnabled && soundCategories[category]
}

function play(name, category) {
  if (!isCategoryEnabled(category) || typeof Audio === 'undefined') return
  const definition = SOUNDS[name]
  if (!definition) return
  try {
    const audio = new Audio(definition.src)
    audio.preload = 'auto'
    audio.volume = definition.volume
    audio.play().catch(() => {})
  } catch {
    // 音频设备不可用或浏览器禁止播放时，不影响业务操作。
  }
}

// 任务：确认、回退、轻点击、收纳和放置形成一致的反馈语言。
export function playCompleteSound() { play('confirm', 'task') }
export function playTaskUndoSound() { play('back', 'task') }
export function playSubtaskCompleteSound() { play('select', 'task') }
export function playSubtaskUndoSound() { play('back', 'task') }
export function playDeleteSound() { play('close', 'task') }
export function playAddSound() { play('click', 'task') }
export function playRestoreSound() { play('open', 'task') }
export function playMoveSound() { play('drop', 'task') }
export function playToggleSound() { play('toggle', 'task') }
export function playMarkSound() { play('select', 'task') }
export function playScheduleSound() { play('select', 'task') }
export function playAttachSound() { play('click', 'task') }
export function playClearSound() { play('close', 'task') }
export function playSaveSound() { play('tick', 'task') }
export function playErrorSound() { play('error', 'task') }

export function playDragStartSound() { play('click', 'task') }
export function playDragOverSound() {
  if (!isCategoryEnabled('task')) return
  const now = Date.now()
  if (now - lastDragSoundTime < DRAG_THROTTLE_MS) return
  lastDragSoundTime = now
  play('tick', 'task')
}
export function playDragEndSound() { play('drop', 'task') }

// 清单和分组沿用同一套音色，但以开合、确认区分语义，避免音效过多。
export function playListAddSound() { play('open', 'list') }
export function playListDeleteSound() { play('close', 'list') }
export function playListRestoreSound() { play('open', 'list') }
export function playRenameSound() { play('select', 'list') }
export function playGroupAddSound() { play('open', 'group') }
export function playGroupDeleteSound() { play('close', 'group') }

export function playSoundPreview() { play('confirm', 'task') }

export function setSoundEnabled(enabled) {
  soundEnabled = enabled
}

export function isSoundEnabled() {
  return soundEnabled
}

export function setSoundCategories(categories) {
  soundCategories = { ...soundCategories, ...categories }
}

export function getSoundCategories() {
  return { ...soundCategories }
}
