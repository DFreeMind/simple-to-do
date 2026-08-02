import {
  GERMINATION_CURVE,
  bezierPoint,
  clamp01,
  smoothRange
} from './proceduralDaisy.mjs'

const ROOT = Object.freeze({ x: 256, y: 307 })

function mainCurve(endX, endY, bend = 0) {
  return {
    start: ROOT,
    control1: { x: 256 + bend * 0.25, y: 257 },
    control2: { x: endX - bend * 0.45, y: endY + 62 },
    end: { x: endX, y: endY }
  }
}

function branchCurve(main, t, endX, endY) {
  const start = bezierPoint(main, t)
  return {
    start,
    control1: {
      x: start.x + (endX - start.x) * 0.34,
      y: start.y + (endY - start.y) * 0.18
    },
    control2: {
      x: start.x + (endX - start.x) * 0.78,
      y: start.y + (endY - start.y) * 0.72
    },
    end: { x: endX, y: endY }
  }
}

function stem(curve, start, end, width, scale = 1, options = {}) {
  return {
    curve,
    start,
    end,
    width,
    headScale: scale,
    tipStart: options.tipStart ?? 0.08,
    tipEnd: options.tipEnd ?? 0.34,
    budStart: options.budStart ?? 0.5,
    budEnd: options.budEnd ?? 0.7,
    openStart: options.openStart ?? 0.72,
    openEnd: options.openEnd ?? 0.98
  }
}

function leaf(curveIndex, t, start, end, direction, angle, scale, options = {}) {
  return {
    curveIndex,
    t,
    start,
    end,
    direction,
    angle,
    foldedAngle: direction < 0 ? 76 : -76,
    scale,
    scaleX: options.scaleX ?? 1,
    scaleY: options.scaleY ?? 1,
    tint: options.tint,
    artPart: options.artPart ?? 'leaf',
    artAngle: options.artAngle,
    artScale: options.artScale ?? 0.78,
    mirrorArt: options.mirrorArt ?? true,
    layer: options.layer ?? 'front',
    petioleLength: options.petioleLength ?? 0,
    petioleWidth: options.petioleWidth ?? 3
  }
}

function rig(spec) {
  return Object.freeze({
    stem: {
      dark: 0x347a4b,
      base: 0x58a968,
      light: 0x92d78b,
      ...spec.stem
    },
    seed: {
      coat: 0xc99b57,
      highlight: 0xf2d293,
      leaf: spec.leafTint ?? 0xffffff,
      mirror: false,
      ...spec.seed
    },
    leafTint: spec.leafTint ?? 0xffffff,
    flower: spec.flower,
    pot: spec.pot,
    curves: spec.curves,
    leaves: spec.leaves,
    pollen: spec.pollen ?? [spec.flower.color, spec.flower.center, 0xcfe8b0]
  })
}

const daisyMain = mainCurve(258, 122, 10)
const tulipMain = mainCurve(258, 126, -4)
const cosmosMain = mainCurve(260, 128, 14)
const sunflowerMain = mainCurve(258, 105, -5)
const poppyMain = mainCurve(257, 124, 15)
const lavenderMain = mainCurve(256, 114, 3)
const irisMain = mainCurve(254, 125, -8)
const lilyMain = mainCurve(257, 120, 6)
const hydrangeaMain = mainCurve(257, 145, 2)
const camelliaMain = mainCurve(257, 138, -5)
const peonyMain = mainCurve(258, 133, 8)
const moonMain = mainCurve(258, 119, 14)

export const PROCEDURAL_PLANT_RIGS = Object.freeze({
  daisy: rig({
    leafTint: 0xffffff,
    flower: { type: 'radial', color: 0xfff7dc, center: 0xf2b817, petalCount: 12, petalScale: 1, centerScale: 1 },
    pot: { style: 'ceramic-bowl', top: 0xf3f3e9, bottom: 0xcfd6cb, rim: 0xffffff, soil: 0x9d6f3f, width: 148, height: 105, detail: 0xe7c6df },
    curves: [
      stem(daisyMain, 0.06, 0.56, 8.5, 1, { tipStart: 0.23, tipEnd: 0.46, budStart: 0.42, budEnd: 0.62, openStart: 0.7, openEnd: 0.94 }),
      stem(branchCurve(daisyMain, 0.46, 196, 158), 0.36, 0.68, 6, 0.78, { budStart: 0.48, budEnd: 0.68, openStart: 0.74 }),
      stem(branchCurve(daisyMain, 0.39, 326, 178), 0.41, 0.71, 5.7, 0.74, { budStart: 0.52, budEnd: 0.7, openStart: 0.78, openEnd: 1 })
    ],
    leaves: [
      leaf(0, 0.18, 0.1, 0.23, -1, 30, 0.12),
      leaf(0, 0.18, 0.11, 0.24, 1, -32, 0.11),
      leaf(0, 0.36, 0.22, 0.41, -1, 14, 0.29),
      leaf(0, 0.5, 0.26, 0.45, 1, -17, 0.265)
    ]
  }),
  tulip: rig({
    stem: { dark: 0x2f764a, base: 0x4f9d5f, light: 0x8fd18a },
    leafTint: 0xe2f2c1,
    flower: { type: 'cup', color: 0xf18b91, center: 0xf6c75b, petalCount: 6, petalScale: 1.28, centerScale: 0.65 },
    pot: { style: 'tapered', top: 0xf2d7d2, bottom: 0xc9939b, rim: 0xffeee8, soil: 0x8d603f, width: 132, height: 116, detail: 0xf4b9b0 },
    curves: [stem(tulipMain, 0.07, 0.61, 8, 1.18, { tipStart: 0.2, tipEnd: 0.42, budStart: 0.4, budEnd: 0.62, openStart: 0.68, openEnd: 0.95 })],
    leaves: [
      leaf(0, 0.1, 0.12, 0.34, -1, 108, 0.42),
      leaf(0, 0.16, 0.16, 0.38, 1, -108, 0.38)
    ],
    pollen: [0xf18b91, 0xf6c75b, 0xffd6cf]
  }),
  cosmos: rig({
    stem: { dark: 0x36785a, base: 0x62a973, light: 0xa4d69d },
    leafTint: 0xd9efc8,
    flower: { type: 'radial', color: 0xf3a7c3, center: 0xf1bd39, petalCount: 8, petalScale: 1.08, centerScale: 0.78 },
    pot: { style: 'scalloped', top: 0xf1d9e7, bottom: 0xc99fbc, rim: 0xffedf6, soil: 0x88603f, width: 142, height: 96, detail: 0xe7aeca },
    curves: [
      stem(cosmosMain, 0.08, 0.61, 5.6, 0.94, { budStart: 0.48, openStart: 0.7 }),
      stem(branchCurve(cosmosMain, 0.44, 198, 156), 0.34, 0.68, 4.2, 0.72, { budStart: 0.53, openStart: 0.76 }),
      stem(branchCurve(cosmosMain, 0.37, 322, 171), 0.39, 0.71, 4.2, 0.7, { budStart: 0.56, openStart: 0.8 })
    ],
    leaves: [
      leaf(0, 0.2, 0.14, 0.3, -1, 18, 0.22, { scaleY: 0.35 }),
      leaf(0, 0.25, 0.17, 0.34, 1, -22, 0.21, { scaleY: 0.34 }),
      leaf(0, 0.38, 0.23, 0.41, -1, 9, 0.25, { scaleY: 0.31 }),
      leaf(0, 0.48, 0.28, 0.46, 1, -12, 0.23, { scaleY: 0.3 }),
      leaf(1, 0.28, 0.4, 0.56, -1, 16, 0.16, { scaleY: 0.3 })
    ]
  }),
  sunflower: rig({
    stem: { dark: 0x416d36, base: 0x65964b, light: 0xa3c86f },
    leafTint: 0xc7df82,
    flower: { type: 'sunflower', color: 0xf2bf36, center: 0x79512f, petalCount: 20, petalScale: 1.12, centerScale: 1.8 },
    pot: { style: 'terracotta', top: 0xdf9a61, bottom: 0xa85836, rim: 0xf0b078, soil: 0x765035, width: 154, height: 112, detail: 0xc9774d },
    curves: [stem(sunflowerMain, 0.06, 0.64, 11, 1.28, { tipStart: 0.18, tipEnd: 0.4, budStart: 0.42, budEnd: 0.65, openStart: 0.68, openEnd: 0.96 })],
    leaves: [
      leaf(0, 0.22, 0.11, 0.3, -1, 18, 0.36, {
        artPart: 'leaf-mature-left', artAngle: -63, artScale: 0.5, mirrorArt: false,
        layer: 'back', petioleLength: 15, petioleWidth: 4
      }),
      leaf(0, 0.38, 0.15, 0.34, 1, -18, 0.33, {
        artPart: 'leaf-mature-right', artAngle: 58, artScale: 0.52, mirrorArt: false,
        petioleLength: 14, petioleWidth: 4
      }),
      leaf(0, 0.53, 0.22, 0.42, -1, 12, 0.28, {
        artPart: 'leaf-mature-left', artAngle: -50, artScale: 0.48, mirrorArt: false,
        petioleLength: 12, petioleWidth: 3.5
      }),
      leaf(0, 0.67, 0.28, 0.47, 1, -15, 0.21, {
        artPart: 'leaf-young-right', artAngle: 38, artScale: 0.6, mirrorArt: false,
        layer: 'back', petioleLength: 9, petioleWidth: 3
      }),
      leaf(0, 0.79, 0.34, 0.52, -1, 10, 0.18, {
        artPart: 'leaf-young-left', artAngle: -34, artScale: 0.58, mirrorArt: false,
        petioleLength: 7, petioleWidth: 2.5
      })
    ],
    pollen: [0xf2bf36, 0x8b5a2b, 0xf8df78]
  }),
  poppy: rig({
    stem: { dark: 0x4a7a55, base: 0x70a670, light: 0xb0d596 },
    leafTint: 0xd2e6b6,
    flower: { type: 'poppy', color: 0xed796e, center: 0x413c38, petalCount: 5, petalScale: 1.38, centerScale: 0.8 },
    pot: { style: 'rustic', top: 0xd8c2a2, bottom: 0x9d7d5c, rim: 0xead7b8, soil: 0x73523c, width: 144, height: 102, detail: 0xb69a76 },
    curves: [
      stem(poppyMain, 0.08, 0.61, 5.8, 1.02, { budStart: 0.46, openStart: 0.7 }),
      stem(branchCurve(poppyMain, 0.4, 204, 163), 0.38, 0.69, 4.2, 0.72, { budStart: 0.54, openStart: 0.78 }),
      stem(branchCurve(poppyMain, 0.34, 318, 183), 0.42, 0.72, 4, 0.68, { budStart: 0.58, openStart: 0.82 })
    ],
    leaves: [
      leaf(0, 0.18, 0.12, 0.3, -1, 22, 0.24, { scaleY: 0.55 }),
      leaf(0, 0.25, 0.16, 0.35, 1, -27, 0.23, { scaleY: 0.5 }),
      leaf(0, 0.4, 0.25, 0.44, -1, 13, 0.27, { scaleY: 0.48 })
    ],
    pollen: [0xed796e, 0x413c38, 0xf4b09e]
  }),
  lavender: rig({
    stem: { dark: 0x446f55, base: 0x6b9c6d, light: 0xa8cd8f },
    leafTint: 0xc8ddba,
    flower: { type: 'spike', color: 0x8c79bd, center: 0xc1a9e0, petalCount: 18, petalScale: 0.58, centerScale: 0.4 },
    pot: { style: 'cylinder', top: 0xd9d0eb, bottom: 0x9b8ab9, rim: 0xeee9f6, soil: 0x71543e, width: 136, height: 108, detail: 0xb8a8d1 },
    curves: [
      stem(lavenderMain, 0.08, 0.61, 5.2, 0.9, { budStart: 0.4, openStart: 0.64 }),
      stem(branchCurve(lavenderMain, 0.24, 211, 142), 0.3, 0.66, 4.1, 0.7, { budStart: 0.48, openStart: 0.7 }),
      stem(branchCurve(lavenderMain, 0.22, 304, 153), 0.33, 0.68, 4, 0.66, { budStart: 0.52, openStart: 0.74 })
    ],
    leaves: [
      leaf(0, 0.15, 0.1, 0.27, -1, 16, 0.19, { scaleY: 0.35 }),
      leaf(0, 0.2, 0.12, 0.29, 1, -18, 0.18, { scaleY: 0.34 }),
      leaf(0, 0.31, 0.18, 0.35, -1, 11, 0.2, { scaleY: 0.32 }),
      leaf(0, 0.38, 0.21, 0.39, 1, -13, 0.19, { scaleY: 0.31 }),
      leaf(1, 0.22, 0.35, 0.5, -1, 12, 0.14, { scaleY: 0.3 }),
      leaf(2, 0.2, 0.37, 0.52, 1, -12, 0.14, { scaleY: 0.3 })
    ]
  }),
  iris: rig({
    stem: { dark: 0x3d7050, base: 0x609969, light: 0x9ec789 },
    leafTint: 0xbdd69e,
    flower: { type: 'iris', color: 0x837fc8, center: 0xf1c969, petalCount: 6, petalScale: 1.25, centerScale: 0.62 },
    pot: { style: 'footed', top: 0xc6d8e8, bottom: 0x829eb7, rim: 0xe8f2f8, soil: 0x71523c, width: 142, height: 110, detail: 0x9cb8cf },
    curves: [
      stem(irisMain, 0.08, 0.62, 7.2, 1.08, { budStart: 0.43, openStart: 0.69 }),
      stem(branchCurve(irisMain, 0.43, 204, 161), 0.4, 0.7, 4.8, 0.72, { budStart: 0.56, openStart: 0.8 })
    ],
    leaves: [
      leaf(0, 0.1, 0.1, 0.32, -1, 72, 0.45, { scaleX: 1.35, scaleY: 0.34 }),
      leaf(0, 0.13, 0.12, 0.34, 1, -70, 0.42, { scaleX: 1.3, scaleY: 0.33 }),
      leaf(0, 0.2, 0.16, 0.38, -1, 62, 0.37, { scaleX: 1.2, scaleY: 0.32 })
    ]
  }),
  lily: rig({
    stem: { dark: 0x3e7448, base: 0x5d9d5c, light: 0xa5d087 },
    leafTint: 0xc8e0a7,
    flower: { type: 'lily', color: 0xf3b9a5, center: 0xe6a44b, petalCount: 6, petalScale: 1.32, centerScale: 0.55 },
    pot: { style: 'fluted', top: 0xf0d9ca, bottom: 0xbf947e, rim: 0xffeee3, soil: 0x76523b, width: 140, height: 112, detail: 0xd9b39e },
    curves: [
      stem(lilyMain, 0.07, 0.61, 6.8, 1.06, { budStart: 0.44, openStart: 0.7 }),
      stem(branchCurve(lilyMain, 0.44, 204, 155), 0.38, 0.69, 4.7, 0.76, { budStart: 0.54, openStart: 0.78 }),
      stem(branchCurve(lilyMain, 0.38, 316, 170), 0.42, 0.71, 4.5, 0.72, { budStart: 0.57, openStart: 0.81 })
    ],
    leaves: [
      leaf(0, 0.16, 0.1, 0.28, -1, 40, 0.27, { scaleX: 1.18, scaleY: 0.4 }),
      leaf(0, 0.22, 0.14, 0.32, 1, -42, 0.26, { scaleX: 1.15, scaleY: 0.38 }),
      leaf(0, 0.34, 0.19, 0.37, -1, 31, 0.29, { scaleX: 1.16, scaleY: 0.4 }),
      leaf(0, 0.42, 0.23, 0.41, 1, -33, 0.27, { scaleX: 1.12, scaleY: 0.38 })
    ]
  }),
  hydrangea: rig({
    stem: { dark: 0x366c4c, base: 0x589163, light: 0x93c281 },
    leafTint: 0xaed08e,
    flower: { type: 'cluster', color: 0x86acd3, center: 0xe5d6a3, petalCount: 26, petalScale: 0.92, centerScale: 0.34 },
    pot: { style: 'square', top: 0xc6ddec, bottom: 0x7fa4bd, rim: 0xe9f4fa, soil: 0x6f503a, width: 152, height: 104, detail: 0xa6c6da },
    curves: [
      stem(hydrangeaMain, 0.08, 0.6, 7.2, 1.24, { budStart: 0.4, openStart: 0.66 }),
      stem(branchCurve(hydrangeaMain, 0.38, 202, 171), 0.34, 0.66, 5, 0.94, { budStart: 0.5, openStart: 0.74 }),
      stem(branchCurve(hydrangeaMain, 0.34, 312, 181), 0.38, 0.68, 4.8, 0.9, { budStart: 0.54, openStart: 0.78 })
    ],
    leaves: [
      leaf(0, 0.18, 0.11, 0.3, -1, 20, 0.34, { scaleY: 1.12 }),
      leaf(0, 0.24, 0.14, 0.34, 1, -24, 0.32, { scaleY: 1.08 }),
      leaf(0, 0.4, 0.22, 0.42, -1, 10, 0.36, { scaleY: 1.15 }),
      leaf(0, 0.48, 0.25, 0.45, 1, -14, 0.34, { scaleY: 1.12 })
    ]
  }),
  camellia: rig({
    stem: { dark: 0x285c3d, base: 0x477f50, light: 0x7ca866 },
    leafTint: 0x8fb77a,
    flower: { type: 'rosette', color: 0xd86f81, center: 0xe4a34f, petalCount: 22, petalScale: 0.92, centerScale: 0.5 },
    pot: { style: 'glazed', top: 0xd7b7ae, bottom: 0x8f6967, rim: 0xf0d9d1, soil: 0x624637, width: 150, height: 108, detail: 0xb98d85 },
    curves: [
      stem(camelliaMain, 0.07, 0.58, 8, 1.08, { budStart: 0.42, openStart: 0.68 }),
      stem(branchCurve(camelliaMain, 0.38, 202, 174), 0.35, 0.66, 5.5, 0.78, { budStart: 0.52, openStart: 0.76 }),
      stem(branchCurve(camelliaMain, 0.32, 316, 186), 0.39, 0.69, 5.2, 0.74, { budStart: 0.56, openStart: 0.8 })
    ],
    leaves: [
      leaf(0, 0.17, 0.1, 0.29, -1, 17, 0.29, { scaleY: 1.12 }),
      leaf(0, 0.23, 0.13, 0.32, 1, -20, 0.28, { scaleY: 1.1 }),
      leaf(0, 0.38, 0.2, 0.4, -1, 8, 0.32, { scaleY: 1.15 }),
      leaf(0, 0.47, 0.24, 0.44, 1, -12, 0.31, { scaleY: 1.13 })
    ]
  }),
  peony: rig({
    stem: { dark: 0x356742, base: 0x558c55, light: 0x91bb70 },
    leafTint: 0xa9c985,
    flower: { type: 'peony', color: 0xdc83a7, center: 0xf0bd6b, petalCount: 28, petalScale: 1.02, centerScale: 0.42 },
    pot: { style: 'urn', top: 0xe4c9d7, bottom: 0xa67e98, rim: 0xf8e5ed, soil: 0x6d4d39, width: 158, height: 116, detail: 0xc49cb2 },
    curves: [
      stem(peonyMain, 0.07, 0.6, 8.6, 1.42, { budStart: 0.4, openStart: 0.67 }),
      stem(branchCurve(peonyMain, 0.36, 205, 177), 0.34, 0.66, 5.8, 0.7, { budStart: 0.5, openStart: 0.74 }),
      stem(branchCurve(peonyMain, 0.32, 313, 185), 0.38, 0.68, 5.5, 0.67, { budStart: 0.54, openStart: 0.77 })
    ],
    leaves: [
      leaf(0, 0.15, 0.1, 0.29, -1, 22, 0.3, { scaleY: 0.85 }),
      leaf(0, 0.2, 0.12, 0.31, 1, -25, 0.29, { scaleY: 0.82 }),
      leaf(0, 0.35, 0.19, 0.39, -1, 12, 0.34, { scaleY: 0.9 }),
      leaf(0, 0.44, 0.23, 0.43, 1, -16, 0.33, { scaleY: 0.88 }),
      leaf(1, 0.24, 0.4, 0.55, -1, 16, 0.18, { scaleY: 0.78 })
    ]
  }),
  moonflower: rig({
    stem: { dark: 0x335b52, base: 0x527f6c, light: 0x8cb79a },
    seed: { mirror: true, coat: 0xa99872, highlight: 0xd8caa5 },
    leafTint: 0x9fbf92,
    flower: { type: 'trumpet', color: 0xd9dcff, center: 0xb7b9ef, petalCount: 8, petalScale: 1.25, centerScale: 0.48 },
    pot: { style: 'moon', top: 0xbfc2dd, bottom: 0x686f9b, rim: 0xe3e5f4, soil: 0x58483e, width: 148, height: 112, detail: 0x9298bf },
    curves: [
      stem(moonMain, 0.07, 0.61, 7, 1.12, { budStart: 0.42, openStart: 0.67 }),
      stem(branchCurve(moonMain, 0.4, 199, 158), 0.36, 0.68, 4.8, 0.78, { budStart: 0.52, openStart: 0.75 }),
      stem(branchCurve(moonMain, 0.34, 319, 174), 0.4, 0.7, 4.6, 0.74, { budStart: 0.56, openStart: 0.79 })
    ],
    leaves: [
      leaf(0, 0.17, 0.11, 0.3, -1, 18, 0.32, { scaleY: 1.18 }),
      leaf(0, 0.24, 0.14, 0.34, 1, -22, 0.31, { scaleY: 1.16 }),
      leaf(0, 0.42, 0.22, 0.43, -1, 9, 0.36, { scaleY: 1.2 }),
      leaf(0, 0.5, 0.26, 0.46, 1, -13, 0.34, { scaleY: 1.18 })
    ],
    pollen: [0xd9dcff, 0xb7b9ef, 0xffffff]
  })
})

export const PROCEDURAL_PLANT_IDS = Object.freeze(Object.keys(PROCEDURAL_PLANT_RIGS))

export function getProceduralPlantRig(speciesId) {
  return PROCEDURAL_PLANT_RIGS[speciesId] || PROCEDURAL_PLANT_RIGS.daisy
}

export function proceduralPlantState(speciesId, stageProgress) {
  const rig = getProceduralPlantRig(speciesId)
  const progress = clamp01((Number(stageProgress) || 0) / 5)
  const curves = rig.curves.map(item => ({
    ...item,
    growth: smoothRange(progress, item.start, item.end)
  }))
  const leaves = rig.leaves.map(item => ({
    ...item,
    point: bezierPoint(curves[item.curveIndex].curve, item.t),
    growth: smoothRange(progress, item.start, item.end)
  }))
  const heads = curves.map(item => ({
    point: bezierPoint(item.curve, item.growth),
    branchGrowth: item.growth,
    tipGrowth: smoothRange(item.growth, item.tipStart, item.tipEnd),
    budGrowth: smoothRange(progress, item.budStart, item.budEnd),
    opening: smoothRange(progress, item.openStart, item.openEnd),
    scale: item.headScale
  }))
  return {
    progress,
    germination: {
      alpha: 1 - smoothRange(progress, 0.07, 0.19),
      coat: 1 - smoothRange(progress, 0.03, 0.13),
      cotyledonOpening: smoothRange(progress, 0.025, 0.14),
      curve: rig.seed.mirror
        ? {
            start: GERMINATION_CURVE.start,
            control1: { x: 512 - GERMINATION_CURVE.control1.x, y: GERMINATION_CURVE.control1.y },
            control2: { x: 512 - GERMINATION_CURVE.control2.x, y: GERMINATION_CURVE.control2.y },
            end: { x: 512 - GERMINATION_CURVE.end.x, y: GERMINATION_CURVE.end.y }
          }
        : GERMINATION_CURVE
    },
    curves,
    leaves,
    heads
  }
}
