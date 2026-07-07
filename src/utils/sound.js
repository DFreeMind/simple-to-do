/**
 * 音效工具函数
 * 使用 Web Audio API 生成丰富的音效
 * 每个类别使用不同的波形，增强区分度
 */

let audioContext = null
let soundEnabled = true
let soundCategories = {
  task: true,
  list: true,
  group: true
}

const MASTER_VOLUME = 0.42
const MIN_GAIN = 0.0008

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
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

    oscillator.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3600, ctx.currentTime)
    filter.Q.setValueAtTime(0.5, ctx.currentTime)

    const start = ctx.currentTime
    const peak = Math.max(MIN_GAIN, volume * MASTER_VOLUME)
    const attack = Math.min(0.012, duration * 0.22)
    gainNode.gain.setValueAtTime(MIN_GAIN, start)
    gainNode.gain.linearRampToValueAtTime(peak, start + attack)
    gainNode.gain.exponentialRampToValueAtTime(MIN_GAIN, start + duration)

    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
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

    notes.forEach(({ frequency, duration, type = 'sine', volume = 0.3 }) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, time)
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(3600, time)
      filter.Q.setValueAtTime(0.5, time)

      const peak = Math.max(MIN_GAIN, volume * MASTER_VOLUME)
      const attack = Math.min(0.012, duration * 0.22)
      gainNode.gain.setValueAtTime(MIN_GAIN, time)
      gainNode.gain.linearRampToValueAtTime(peak, time + attack)
      gainNode.gain.exponentialRampToValueAtTime(MIN_GAIN, time + duration)

      oscillator.start(time)
      oscillator.stop(time + duration + 0.02)

      time += duration * 0.72 // 轻微重叠，保持反馈紧凑
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

    oscillator.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3200, ctx.currentTime)
    filter.Q.setValueAtTime(0.5, ctx.currentTime)

    const peak = Math.max(MIN_GAIN, volume * MASTER_VOLUME)
    const start = ctx.currentTime
    gainNode.gain.setValueAtTime(MIN_GAIN, start)
    gainNode.gain.linearRampToValueAtTime(peak, start + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(MIN_GAIN, start + duration)

    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  } catch (error) {
    // 静默处理错误
  }
}

// ==================== 任务音效（正弦波 - 清脆悦耳）====================

/**
 * 任务完成音效
 * 双音调上行，清脆愉悦
 */
export function playCompleteSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 659, duration: 0.08, type: 'sine', volume: 0.22 },
    { frequency: 880, duration: 0.13, type: 'sine', volume: 0.2 }
  ])
}

/**
 * 子任务完成音效
 * 单音调短促音，轻快
 */
export function playSubtaskCompleteSound() {
  if (!isCategoryEnabled('task')) return
  playTone(784, 0.09, 'sine', 0.16)
}

/**
 * 任务删除音效
 * 低音衰减，表示移除
 */
export function playDeleteSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 392, duration: 0.09, type: 'triangle', volume: 0.18 },
    { frequency: 247, duration: 0.14, type: 'triangle', volume: 0.15 }
  ])
}

/**
 * 任务添加音效
 * 短促高音，表示添加
 */
export function playAddSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 587, duration: 0.06, type: 'sine', volume: 0.16 },
    { frequency: 740, duration: 0.09, type: 'sine', volume: 0.15 }
  ])
}

/**
 * 恢复任务音效
 * 三音阶上行，表示恢复
 */
export function playRestoreSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 440, duration: 0.08, type: 'sine', volume: 0.18 },
    { frequency: 554, duration: 0.08, type: 'sine', volume: 0.17 },
    { frequency: 659, duration: 0.12, type: 'sine', volume: 0.16 }
  ])
}

/**
 * 移动任务音效
 * 滑音，表示移动
 */
export function playMoveSound() {
  if (!isCategoryEnabled('task')) return
  playSlide(392, 587, 0.11, 'sine', 0.14)
}

// ==================== 拖动音效（节流控制）====================

let lastDragSoundTime = 0
const DRAG_THROTTLE_MS = 180 // 节流间隔，避免拖拽时过密

/**
 * 拖动开始音效
 * 短促低音，表示开始拖动
 */
export function playDragStartSound() {
  if (!isCategoryEnabled('task')) return
  playTone(294, 0.06, 'sine', 0.11)
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
  playTone(523, 0.035, 'sine', 0.07)
}

/**
 * 拖动放下音效
 * 短促上行音，表示放下
 */
export function playDragEndSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 392, duration: 0.05, type: 'sine', volume: 0.12 },
    { frequency: 523, duration: 0.07, type: 'sine', volume: 0.11 }
  ])
}

export function playFlagSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 523, duration: 0.06, type: 'triangle', volume: 0.13 },
    { frequency: 784, duration: 0.08, type: 'triangle', volume: 0.12 }
  ])
}

export function playScheduleSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 440, duration: 0.05, type: 'sine', volume: 0.11 },
    { frequency: 587, duration: 0.06, type: 'sine', volume: 0.1 },
    { frequency: 740, duration: 0.08, type: 'sine', volume: 0.09 }
  ])
}

export function playAttachSound() {
  if (!isCategoryEnabled('task')) return
  playTone(698, 0.08, 'triangle', 0.11)
}

export function playCopySound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 587, duration: 0.055, type: 'sine', volume: 0.11 },
    { frequency: 587, duration: 0.075, type: 'sine', volume: 0.1 }
  ])
}

export function playHardDeleteSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 294, duration: 0.08, type: 'triangle', volume: 0.15 },
    { frequency: 196, duration: 0.13, type: 'triangle', volume: 0.13 }
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
    { frequency: 523, duration: 0.08, type: 'triangle', volume: 0.17 },
    { frequency: 659, duration: 0.1, type: 'triangle', volume: 0.16 }
  ])
}

/**
 * 清单删除音效
 * 柔和下行，温和移除
 */
export function playListDeleteSound() {
  if (!isCategoryEnabled('list')) return
  playSequence([
    { frequency: 440, duration: 0.09, type: 'triangle', volume: 0.16 },
    { frequency: 330, duration: 0.12, type: 'triangle', volume: 0.14 }
  ])
}

// ==================== 分组音效（三角波 - 有区分但不刺耳）====================

/**
 * 分组添加音效
 * 明亮上行，清脆有力
 */
export function playGroupAddSound() {
  if (!isCategoryEnabled('group')) return
  playSequence([
    { frequency: 587, duration: 0.07, type: 'triangle', volume: 0.15 },
    { frequency: 740, duration: 0.09, type: 'triangle', volume: 0.14 }
  ])
}

/**
 * 分组删除音效
 * 明亮下行，清脆结束
 */
export function playGroupDeleteSound() {
  if (!isCategoryEnabled('group')) return
  playSequence([
    { frequency: 494, duration: 0.08, type: 'triangle', volume: 0.14 },
    { frequency: 370, duration: 0.11, type: 'triangle', volume: 0.12 }
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
