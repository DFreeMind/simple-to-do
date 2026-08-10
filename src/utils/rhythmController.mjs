const STATE_PRIORITY = {
  due: 0,
  running: 1,
  waiting: 2,
  paused: 3,
  'outside-schedule': 4
}

export function sortRhythmControllerItems(items = []) {
  return [...items].sort((a, b) => {
    const byState = (STATE_PRIORITY[a?.state] ?? 9) - (STATE_PRIORITY[b?.state] ?? 9)
    if (byState) return byState
    if (a?.state === 'due') {
      return Number(a.pendingSince || 0) - Number(b.pendingSince || 0)
    }
    const byRemaining = Number(a?.remainingSeconds ?? Number.MAX_SAFE_INTEGER)
      - Number(b?.remainingSeconds ?? Number.MAX_SAFE_INTEGER)
    if (byRemaining) return byRemaining
    return String(a?.title || '').localeCompare(String(b?.title || ''), 'zh-CN')
  })
}

export function getRhythmControllerLiveSeconds(item, now = Date.now(), syncedAt = now) {
  const remaining = Math.max(0, Math.round(Number(item?.remainingSeconds) || 0))
  if (!item?.counting || item?.state !== 'running') return remaining
  const elapsedSinceSync = Math.max(0, Math.floor((Number(now) - Number(syncedAt || now)) / 1000))
  return Math.max(0, remaining - elapsedSinceSync)
}

export function formatRhythmCountdown(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const rest = value % 60
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function formatRhythmControllerTime(seconds) {
  return formatRhythmCountdown(seconds)
}

export function rhythmControllerProgress(item, liveSeconds) {
  const duration = Math.max(1, Number(item?.durationSeconds) || 1)
  if (item?.state === 'due') return 1
  if (item?.triggerType === 'active-duration') {
    return Math.max(0, Math.min(1, 1 - Number(liveSeconds || 0) / duration))
  }
  return Math.max(0, Math.min(1, Number(liveSeconds || 0) / duration))
}
