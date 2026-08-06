export function getFocusRemainingRatio(durationSeconds, remainingSeconds) {
  const duration = Number(durationSeconds)
  const remaining = Number(remainingSeconds)
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(remaining)) return 0
  return Math.max(0, Math.min(1, remaining / duration))
}
