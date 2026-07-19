// 以 Web Audio 合成短提示音，避免 macOS WKWebView 无法播放 OGG/Vorbis 时整套音效失效。
// 所有声音只在用户完成有结果的操作时触发；音高、节奏和音色都承担语义，删除音保持低调。
const SOUNDS = {
  // 完成：明亮上行的确认感。
  complete: { wave: 'sine', filter: 4400, gain: 0.66, notes: [[659, 0, 0.17, 0.105], [784, 0.055, 0.19, 0.09], [1047, 0.11, 0.22, 0.075]] },
  // 新增/恢复：温暖、从低到高的琶音，避免和完成铃混淆。
  restore: { wave: 'triangle', filter: 2300, gain: 0.8, notes: [[523, 0, 0.17, 0.095], [659, 0.06, 0.17, 0.075], [784, 0.12, 0.2, 0.06]] },
  // 标记/日期：清透的五度双音，像轻提示而不是确认铃。
  chime: { wave: 'sine', filter: 3500, gain: 0.98, notes: [[880, 0, 0.16, 0.07], [1319, 0.045, 0.19, 0.05]] },
  // 附件、重命名：短而柔和的轻触。
  tap: { wave: 'sine', filter: 1800, glide: 0.82, gain: 1.2, notes: [[622, 0, 0.11, 0.055]] },
  // 撤销、开关：低一点的上行回弹。
  soft: { wave: 'triangle', filter: 1450, glide: 1.16, gain: 1.3, notes: [[330, 0, 0.12, 0.045]] },
  // 主任务改回未完成：清楚但柔和的上行回弹，和完成音保持同等级的可感知度。
  undo: { wave: 'triangle', filter: 1850, glide: 1.12, gain: 1.45, notes: [[392, 0, 0.13, 0.06], [494, 0.045, 0.15, 0.048]] },
  // 拖动经过目标：非常轻的玻璃感，避免高频操作造成疲劳。
  drag: { wave: 'sine', filter: 5200, glide: 0.94, gain: 1.55, notes: [[1175, 0, 0.09, 0.03]] },
  // 移入垃圾桶：中频、圆润的下行两拍，在笔记本扬声器上仍清楚可闻。
  delete: { wave: 'triangle', filter: 1800, glide: 0.86, gain: 1.1, notes: [[523, 0, 0.14, 0.065], [392, 0.06, 0.18, 0.052]] },
  // 永久清除：比移入垃圾桶略低，但仍保持足够的可听度。
  clear: { wave: 'triangle', filter: 1450, glide: 0.84, gain: 1.08, notes: [[440, 0, 0.15, 0.06], [330, 0.06, 0.18, 0.048]] },
  listDelete: { wave: 'triangle', filter: 1650, glide: 0.86, gain: 1.08, notes: [[494, 0, 0.14, 0.062], [370, 0.06, 0.18, 0.05]] },
  groupDelete: { wave: 'triangle', filter: 1700, glide: 0.86, gain: 1.08, notes: [[587, 0, 0.14, 0.06], [440, 0.06, 0.18, 0.048]] }
}

let soundEnabled = true
let soundCategories = { task: true, list: true, group: true, drag: true }
let audioContext = null
let audioFailureReported = false

function isCategoryEnabled(category) {
  return soundEnabled && soundCategories[category]
}

function getAudioContext() {
  if (audioContext) return audioContext
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextConstructor) return null
  audioContext = new AudioContextConstructor()
  return audioContext
}

function reportAudioFailure(error) {
  if (audioFailureReported) return
  audioFailureReported = true
  console.warn('[Sound] 无法初始化操作音效。', error)
}

function playTone(context, frequency, delay, duration, volume, sound) {
  const startedAt = context.currentTime + delay
  const oscillator = context.createOscillator()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()

  oscillator.type = sound.wave || 'triangle'
  oscillator.frequency.setValueAtTime(frequency, startedAt)
  if (sound.glide && sound.glide !== 1) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, frequency * sound.glide), startedAt + duration)
  }
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(sound.filter || 2800, startedAt)
  filter.Q.setValueAtTime(0.7, startedAt)
  gain.gain.setValueAtTime(0.0001, startedAt)
  gain.gain.exponentialRampToValueAtTime(volume * (sound.gain || 1), startedAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration)

  oscillator.connect(filter)
  filter.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startedAt)
  oscillator.stop(startedAt + duration + 0.02)
}

function play(name, category) {
  if (!isCategoryEnabled(category) || !SOUNDS[name] || typeof window === 'undefined') return
  try {
    const context = getAudioContext()
    if (!context) return
    const sound = SOUNDS[name]
    const start = () => sound.notes.forEach(([frequency, delay, duration, volume]) => {
      playTone(context, frequency, delay, duration, volume, sound)
    })

    if (context.state === 'suspended') {
      context.resume().then(start).catch(reportAudioFailure)
    } else {
      start()
    }
  } catch (error) {
    reportAudioFailure(error)
  }
}

export function playCompleteSound() { play('complete', 'task') }
export function playTaskUndoSound() { play('undo', 'task') }
export function playSubtaskCompleteSound() { play('tap', 'task') }
export function playSubtaskUndoSound() { play('soft', 'task') }
export function playDeleteSound() { play('delete', 'task') }
export function playAddSound() { play('chime', 'task') }
export function playRestoreSound() { play('restore', 'task') }
export function playMoveSound() { play('chime', 'task') }
export function playToggleSound() { play('soft', 'task') }
export function playMarkSound() { play('chime', 'task') }
export function playScheduleSound() { play('chime', 'task') }
export function playAttachSound() { play('tap', 'task') }
export function playClearSound() { play('clear', 'task') }
export function playSaveSound() { play('soft', 'task') }
export function playErrorSound() {}

export function playDragStartSound() { play('soft', 'drag') }
export function playDragOverSound() { play('drag', 'drag') }
export function playDragEndSound() { play('soft', 'drag') }

export function playListAddSound() { play('chime', 'list') }
export function playListDeleteSound() { play('listDelete', 'list') }
export function playListRestoreSound() { play('restore', 'list') }
export function playRenameSound() { play('tap', 'list') }
export function playGroupAddSound() { play('chime', 'group') }
export function playGroupDeleteSound() { play('groupDelete', 'group') }

export function playSoundPreview(name = 'complete') {
  const category = name === 'drag' ? 'drag' : name === 'listDelete' ? 'list' : name === 'groupDelete' ? 'group' : 'task'
  play(name, category)
}

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
