/**
 * 音效工具函数
 * 使用 Web Audio API 生成轻量操作音效
 */

let audioContext = null
let masterGain = null
let soundEnabled = true
let soundCategories = {
  task: true,
  list: true,
  group: true
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    masterGain = audioContext.createGain()
    masterGain.gain.value = 0.72
    masterGain.connect(audioContext.destination)
  }
  // 确保 AudioContext 处于运行状态
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

/**
 * 检查指定分类的音效是否启用
 */
function isCategoryEnabled(category) {
  return soundEnabled && soundCategories[category]
}

/**
 * 播放音效的通用函数
 * @param {number} frequency - 频率
 * @param {number} duration - 时长
 * @param {string} type - 波形类型：sine, triangle, square, sawtooth
 * @param {number} volume - 音量
 */
function playTone(frequency, duration, type = 'sine', volume = 0.3) {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    const start = ctx.currentTime
    const attack = Math.min(0.012, duration * 0.22)
    const releaseStart = Math.max(start + attack, start + duration - Math.min(0.08, duration * 0.6))

    oscillator.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(masterGain)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(type === 'square' || type === 'sawtooth' ? 1800 : 3200, start)
    filter.Q.setValueAtTime(0.6, start)

    gainNode.gain.setValueAtTime(0.0001, start)
    gainNode.gain.linearRampToValueAtTime(volume, start + attack)
    gainNode.gain.setValueAtTime(volume * 0.72, releaseStart)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    oscillator.start(start)
    oscillator.stop(start + duration + 0.01)
  } catch (error) {
    // 静默处理错误
  }
}

/**
 * 播放多音调序列
 */
function playSequence(notes) {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    let time = ctx.currentTime

    notes.forEach(({ frequency, duration, type = 'sine', volume = 0.3, detune = 0 }) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      const attack = Math.min(0.01, duration * 0.24)
      const releaseStart = Math.max(time + attack, time + duration - Math.min(0.07, duration * 0.6))

      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(masterGain)

      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, time)
      oscillator.detune.setValueAtTime(detune, time)
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(type === 'square' || type === 'sawtooth' ? 1800 : 3200, time)
      filter.Q.setValueAtTime(0.6, time)

      gainNode.gain.setValueAtTime(0.0001, time)
      gainNode.gain.linearRampToValueAtTime(volume, time + attack)
      gainNode.gain.setValueAtTime(volume * 0.72, releaseStart)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration)

      oscillator.start(time)
      oscillator.stop(time + duration + 0.01)

      time += duration * 0.8 // 重叠一点
    })
  } catch (error) {
    // 静默处理错误
  }
}

/**
 * 播放滑音
 */
function playSlide(startFreq, endFreq, duration, type = 'sine', volume = 0.3) {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    const start = ctx.currentTime
    const attack = Math.min(0.01, duration * 0.22)
    const releaseStart = Math.max(start + attack, start + duration - Math.min(0.07, duration * 0.6))

    oscillator.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(masterGain)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(startFreq, start)
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, start + duration)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2400, start)
    filter.Q.setValueAtTime(0.6, start)

    gainNode.gain.setValueAtTime(0.0001, start)
    gainNode.gain.linearRampToValueAtTime(volume, start + attack)
    gainNode.gain.setValueAtTime(volume * 0.7, releaseStart)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    oscillator.start(start)
    oscillator.stop(start + duration + 0.01)
  } catch (error) {
    // 静默处理错误
  }
}

// ==================== 任务音效（短促、柔和、低打扰）====================

/**
 * 任务完成音效
 * 三音调上行琶音（C→E→G），明亮愉悦的"叮铃"感
 */
export function playCompleteSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 784, duration: 0.07, type: 'sine', volume: 0.18 },
    { frequency: 988, duration: 0.06, type: 'sine', volume: 0.16 },
    { frequency: 1319, duration: 0.14, type: 'sine', volume: 0.17 }
  ])
}

/**
 * 任务取消完成音效
 * 三音调下行琶音（E→C→G），温和的"回退"感
 */
export function playTaskUndoSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 1319, duration: 0.06, type: 'triangle', volume: 0.16 },
    { frequency: 988, duration: 0.06, type: 'triangle', volume: 0.14 },
    { frequency: 784, duration: 0.12, type: 'triangle', volume: 0.13 }
  ])
}

/**
 * 子任务完成音效
 * 轻快双音上行，比主任务完成更短更轻
 */
export function playSubtaskCompleteSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 880, duration: 0.05, type: 'sine', volume: 0.15 },
    { frequency: 1109, duration: 0.09, type: 'sine', volume: 0.14 }
  ])
}

/**
 * 子任务取消完成音效
 * 柔和下行双音，温和的"撤销"感
 */
export function playSubtaskUndoSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 880, duration: 0.06, type: 'triangle', volume: 0.14 },
    { frequency: 698, duration: 0.1, type: 'triangle', volume: 0.12 }
  ])
}

/**
 * 任务删除音效
 * 低沉下行，温和移除感
 */
export function playDeleteSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 440, duration: 0.07, type: 'triangle', volume: 0.16 },
    { frequency: 330, duration: 0.06, type: 'triangle', volume: 0.14 },
    { frequency: 262, duration: 0.12, type: 'triangle', volume: 0.12 }
  ])
}

/**
 * 任务添加音效
 * 明亮双音上行，积极的"新增"感
 */
export function playAddSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 659, duration: 0.06, type: 'sine', volume: 0.16 },
    { frequency: 988, duration: 0.1, type: 'sine', volume: 0.17 }
  ])
}

/**
 * 恢复任务音效
 * 三音阶上行琶音，温暖的"复原"感
 */
export function playRestoreSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 523, duration: 0.06, type: 'triangle', volume: 0.15 },
    { frequency: 659, duration: 0.07, type: 'triangle', volume: 0.15 },
    { frequency: 880, duration: 0.11, type: 'triangle', volume: 0.14 }
  ])
}

/**
 * 移动任务音效
 * 柔和滑音，空间位移感
 */
export function playMoveSound() {
  if (!isCategoryEnabled('task')) return
  playSlide(494, 784, 0.12, 'sine', 0.13)
}

/**
 * 轻量切换音效（加入今日、完成取消完成等通用切换）
 * 短促清脆的"嗒"声
 */
export function playToggleSound() {
  if (!isCategoryEnabled('task')) return
  playTone(830, 0.06, 'sine', 0.12)
}

/**
 * 置顶/重要标记音效
 * 明亮双音上行，闪亮的"星标"感
 */
export function playMarkSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 1047, duration: 0.045, type: 'sine', volume: 0.12 },
    { frequency: 1319, duration: 0.09, type: 'sine', volume: 0.13 }
  ])
}

/**
 * 设置日期、提醒等计划类音效
 * 柔和双音上行，温和的"计划"感
 */
export function playScheduleSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 587, duration: 0.06, type: 'triangle', volume: 0.13 },
    { frequency: 784, duration: 0.09, type: 'triangle', volume: 0.13 }
  ])
}

/**
 * 附件增删音效
 * 单音短促，文件感
 */
export function playAttachSound() {
  if (!isCategoryEnabled('task')) return
  playTone(698, 0.07, 'triangle', 0.12)
}

/**
 * 批量清理音效
 * 三音阶下行，清扫感
 */
export function playClearSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 440, duration: 0.05, type: 'triangle', volume: 0.13 },
    { frequency: 349, duration: 0.06, type: 'triangle', volume: 0.11 },
    { frequency: 262, duration: 0.1, type: 'triangle', volume: 0.09 }
  ])
}

/**
 * 数据保存音效
 * 极轻柔的单音，安心感
 */
export function playSaveSound() {
  if (!isCategoryEnabled('task')) return
  playTone(1047, 0.04, 'sine', 0.06)
}

/**
 * 校验失败/错误音效
 * 低沉双音下行，温和警告
 */
export function playErrorSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 330, duration: 0.08, type: 'triangle', volume: 0.14 },
    { frequency: 262, duration: 0.12, type: 'triangle', volume: 0.12 }
  ])
}

// ==================== 拖动音效（节流控制）====================

let lastDragSoundTime = 0
const DRAG_THROTTLE_MS = 180 // 节流间隔

/**
 * 拖动开始音效
 * 短促低音，表示开始拖动
 */
export function playDragStartSound() {
  if (!isCategoryEnabled('task')) return
  playTone(330, 0.06, 'triangle', 0.11)
}

/**
 * 拖动经过目标音效
 * 短促高音，表示经过目标位置（节流控制）
 */
export function playDragOverSound() {
  if (!isCategoryEnabled('task')) return
  const now = Date.now()
  if (now - lastDragSoundTime < DRAG_THROTTLE_MS) return
  lastDragSoundTime = now
  playTone(660, 0.035, 'sine', 0.08)
}

/**
 * 拖动放下音效
 * 短促上行音，表示放下
 */
export function playDragEndSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 440, duration: 0.05, type: 'triangle', volume: 0.11 },
    { frequency: 659, duration: 0.07, type: 'triangle', volume: 0.11 }
  ])
}

// ==================== 清单音效（三角波 - 柔和温暖）====================

/**
 * 清单添加音效
 * 柔和上行，温暖愉悦
 */
export function playListAddSound() {
  if (!isCategoryEnabled('list')) return
  playSequence([
    { frequency: 523, duration: 0.08, type: 'triangle', volume: 0.18 },
    { frequency: 698, duration: 0.11, type: 'triangle', volume: 0.17 }
  ])
}

/**
 * 清单删除音效
 * 柔和下行，温和移除
 */
export function playListDeleteSound() {
  if (!isCategoryEnabled('list')) return
  playSequence([
    { frequency: 440, duration: 0.08, type: 'triangle', volume: 0.16 },
    { frequency: 330, duration: 0.12, type: 'triangle', volume: 0.14 }
  ])
}

/**
 * 清单恢复音效
 */
export function playListRestoreSound() {
  if (!isCategoryEnabled('list')) return
  playSequence([
    { frequency: 392, duration: 0.07, type: 'triangle', volume: 0.15 },
    { frequency: 523, duration: 0.08, type: 'triangle', volume: 0.15 },
    { frequency: 698, duration: 0.1, type: 'triangle', volume: 0.14 }
  ])
}

/**
 * 清单置顶/取消置顶音效
 * 明亮双音，切换感
 */
export function playListPinSound() {
  if (!isCategoryEnabled('list')) return
  playSequence([
    { frequency: 698, duration: 0.05, type: 'sine', volume: 0.14 },
    { frequency: 880, duration: 0.08, type: 'sine', volume: 0.13 }
  ])
}

/**
 * 清单/分组重命名音效
 * 柔和单音，确认感
 */
export function playRenameSound() {
  if (!isCategoryEnabled('list')) return
  playTone(784, 0.06, 'triangle', 0.11)
}

// ==================== 分组音效（柔和区分，避免方波刺耳）====================

/**
 * 分组添加音效
 * 明亮上行，清脆有力
 */
export function playGroupAddSound() {
  if (!isCategoryEnabled('group')) return
  playSequence([
    { frequency: 587, duration: 0.07, type: 'triangle', volume: 0.16 },
    { frequency: 784, duration: 0.1, type: 'sine', volume: 0.15 }
  ])
}

/**
 * 分组删除音效
 * 明亮下行，清脆结束
 */
export function playGroupDeleteSound() {
  if (!isCategoryEnabled('group')) return
  playSequence([
    { frequency: 494, duration: 0.08, type: 'triangle', volume: 0.15 },
    { frequency: 370, duration: 0.11, type: 'triangle', volume: 0.13 }
  ])
}

// ==================== 设置函数 ====================

/**
 * 设置音效总开关
 */
export function setSoundEnabled(enabled) {
  soundEnabled = enabled
}

/**
 * 获取音效总开关状态
 */
export function isSoundEnabled() {
  return soundEnabled
}

/**
 * 设置音效分类开关
 */
export function setSoundCategories(categories) {
  soundCategories = { ...soundCategories, ...categories }
}

/**
 * 获取音效分类开关状态
 */
export function getSoundCategories() {
  return { ...soundCategories }
}
