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

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
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

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, time)

      gainNode.gain.setValueAtTime(volume, time)
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration)

      oscillator.start(time)
      oscillator.stop(time + duration)

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

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration)

    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
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
    { frequency: 880, duration: 0.1, type: 'sine', volume: 0.3 },
    { frequency: 1320, duration: 0.15, type: 'sine', volume: 0.3 }
  ])
}

/**
 * 子任务完成音效
 * 单音调短促音，轻快
 */
export function playSubtaskCompleteSound() {
  if (!isCategoryEnabled('task')) return
  playTone(1047, 0.12, 'sine', 0.25)
}

/**
 * 任务删除音效
 * 低音衰减，表示移除
 */
export function playDeleteSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 440, duration: 0.15, type: 'sine', volume: 0.3 },
    { frequency: 220, duration: 0.2, type: 'sine', volume: 0.25 }
  ])
}

/**
 * 任务添加音效
 * 短促高音，表示添加
 */
export function playAddSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 1047, duration: 0.08, type: 'sine', volume: 0.25 },
    { frequency: 1319, duration: 0.12, type: 'sine', volume: 0.25 }
  ])
}

/**
 * 恢复任务音效
 * 三音阶上行，表示恢复
 */
export function playRestoreSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 523, duration: 0.1, type: 'sine', volume: 0.3 },
    { frequency: 659, duration: 0.1, type: 'sine', volume: 0.3 },
    { frequency: 784, duration: 0.15, type: 'sine', volume: 0.3 }
  ])
}

/**
 * 移动任务音效
 * 滑音，表示移动
 */
export function playMoveSound() {
  if (!isCategoryEnabled('task')) return
  playSlide(440, 880, 0.15, 'sine', 0.25)
}

// ==================== 拖动音效（节流控制）====================

let lastDragSoundTime = 0
const DRAG_THROTTLE_MS = 100 // 节流间隔

/**
 * 拖动开始音效
 * 短促低音，表示开始拖动
 */
export function playDragStartSound() {
  if (!isCategoryEnabled('task')) return
  playTone(330, 0.08, 'sine', 0.2)
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
  playTone(660, 0.05, 'sine', 0.15)
}

/**
 * 拖动放下音效
 * 短促上行音，表示放下
 */
export function playDragEndSound() {
  if (!isCategoryEnabled('task')) return
  playSequence([
    { frequency: 440, duration: 0.06, type: 'sine', volume: 0.2 },
    { frequency: 660, duration: 0.08, type: 'sine', volume: 0.2 }
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
    { frequency: 659, duration: 0.1, type: 'triangle', volume: 0.3 },
    { frequency: 880, duration: 0.12, type: 'triangle', volume: 0.3 }
  ])
}

/**
 * 清单删除音效
 * 柔和下行，温和移除
 */
export function playListDeleteSound() {
  if (!isCategoryEnabled('list')) return
  playSequence([
    { frequency: 523, duration: 0.12, type: 'triangle', volume: 0.3 },
    { frequency: 392, duration: 0.15, type: 'triangle', volume: 0.25 }
  ])
}

// ==================== 分组音效（方波 - 清脆明亮）====================

/**
 * 分组添加音效
 * 明亮上行，清脆有力
 */
export function playGroupAddSound() {
  if (!isCategoryEnabled('group')) return
  playSequence([
    { frequency: 784, duration: 0.08, type: 'square', volume: 0.2 },
    { frequency: 1047, duration: 0.1, type: 'square', volume: 0.2 }
  ])
}

/**
 * 分组删除音效
 * 明亮下行，清脆结束
 */
export function playGroupDeleteSound() {
  if (!isCategoryEnabled('group')) return
  playSequence([
    { frequency: 659, duration: 0.1, type: 'square', volume: 0.2 },
    { frequency: 494, duration: 0.12, type: 'square', volume: 0.15 }
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
