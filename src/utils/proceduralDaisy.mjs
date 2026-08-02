export const DAISY_CURVES = Object.freeze({
  main: Object.freeze({
    start: Object.freeze({ x: 256, y: 307 }),
    control1: Object.freeze({ x: 248, y: 260 }),
    control2: Object.freeze({ x: 269, y: 196 }),
    end: Object.freeze({ x: 258, y: 122 })
  }),
  left: Object.freeze({
    start: Object.freeze({ x: 257, y: 224 }),
    control1: Object.freeze({ x: 240, y: 210 }),
    control2: Object.freeze({ x: 213, y: 184 }),
    end: Object.freeze({ x: 196, y: 158 })
  }),
  right: Object.freeze({
    start: Object.freeze({ x: 258, y: 238 }),
    control1: Object.freeze({ x: 277, y: 222 }),
    control2: Object.freeze({ x: 306, y: 200 }),
    end: Object.freeze({ x: 326, y: 178 })
  })
})

export const GERMINATION_CURVE = Object.freeze({
  start: Object.freeze({ x: 256, y: 307 }),
  control1: Object.freeze({ x: 259, y: 287 }),
  control2: Object.freeze({ x: 245, y: 266 }),
  end: Object.freeze({ x: 232, y: 270 })
})

export function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0))
}

export function smoothRange(value, start, end) {
  const progress = clamp01((value - start) / Math.max(0.0001, end - start))
  return progress * progress * (3 - 2 * progress)
}

export function bezierPoint(curve, progress) {
  const t = clamp01(progress)
  const inverse = 1 - t
  return {
    x: inverse ** 3 * curve.start.x
      + 3 * inverse ** 2 * t * curve.control1.x
      + 3 * inverse * t ** 2 * curve.control2.x
      + t ** 3 * curve.end.x,
    y: inverse ** 3 * curve.start.y
      + 3 * inverse ** 2 * t * curve.control1.y
      + 3 * inverse * t ** 2 * curve.control2.y
      + t ** 3 * curve.end.y
  }
}

export function partialBezierPoints(curve, progress, segments = 36) {
  const length = Math.max(1, Math.ceil(segments * clamp01(progress)))
  const visibleProgress = clamp01(progress)
  return Array.from({ length: length + 1 }, (_, index) => {
    const fraction = length ? (index / length) * visibleProgress : 0
    return bezierPoint(curve, fraction)
  })
}

export function daisyGrowthState(stageProgress) {
  const progress = clamp01((Number(stageProgress) || 0) / 5)
  const mainGrowth = smoothRange(progress, 0.06, 0.56)
  const leftGrowth = smoothRange(progress, 0.36, 0.68)
  const rightGrowth = smoothRange(progress, 0.41, 0.71)

  return {
    progress,
    germination: {
      alpha: 1 - smoothRange(progress, 0.07, 0.19),
      coat: 1 - smoothRange(progress, 0.03, 0.13),
      cotyledonOpening: smoothRange(progress, 0.025, 0.14)
    },
    mainGrowth,
    leftGrowth,
    rightGrowth,
    leaves: [
      {
        point: bezierPoint(DAISY_CURVES.main, 0.18),
        growth: smoothRange(progress, 0.1, 0.23),
        direction: -1,
        angle: 30,
        foldedAngle: 76,
        scale: 0.12
      },
      {
        point: bezierPoint(DAISY_CURVES.main, 0.18),
        growth: smoothRange(progress, 0.11, 0.24),
        direction: 1,
        angle: -32,
        foldedAngle: -76,
        scale: 0.11
      },
      {
        point: bezierPoint(DAISY_CURVES.main, 0.36),
        growth: smoothRange(progress, 0.22, 0.41),
        direction: -1,
        angle: 14,
        foldedAngle: 70,
        scale: 0.29
      },
      {
        point: bezierPoint(DAISY_CURVES.main, 0.5),
        growth: smoothRange(progress, 0.26, 0.45),
        direction: 1,
        angle: -17,
        foldedAngle: -70,
        scale: 0.265
      }
    ],
    heads: [
      {
        point: bezierPoint(DAISY_CURVES.main, mainGrowth),
        branchGrowth: mainGrowth,
        tipGrowth: smoothRange(mainGrowth, 0.23, 0.46),
        budGrowth: smoothRange(progress, 0.42, 0.62),
        opening: smoothRange(progress, 0.7, 0.94),
        scale: 1
      },
      {
        point: bezierPoint(DAISY_CURVES.left, leftGrowth),
        branchGrowth: leftGrowth,
        tipGrowth: smoothRange(leftGrowth, 0.015, 0.25),
        budGrowth: smoothRange(progress, 0.48, 0.68),
        opening: smoothRange(progress, 0.74, 0.98),
        scale: 0.78
      },
      {
        point: bezierPoint(DAISY_CURVES.right, rightGrowth),
        branchGrowth: rightGrowth,
        tipGrowth: smoothRange(rightGrowth, 0.015, 0.25),
        budGrowth: smoothRange(progress, 0.52, 0.7),
        opening: smoothRange(progress, 0.78, 1),
        scale: 0.74
      }
    ]
  }
}
