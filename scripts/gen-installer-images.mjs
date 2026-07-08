/**
 * 生成 NSIS 安装器的头部和侧边栏图片（24 位 BMP）
 *
 * 运行方式：node scripts/gen-installer-images.mjs
 * 无需任何第三方依赖，直接写入 BMP 二进制数据。
 */
import { writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'src-tauri', 'nsis')
const { version } = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

// ─── 颜色（RGB） ───────────────────────────────────
const MINT        = [95, 184, 173]
const DARK_MINT   = [55, 138, 128]
const DEEP_MINT   = [40, 110, 100]
const LIGHT_MINT  = [225, 245, 242]
const VERY_LIGHT  = [245, 252, 250]
const WHITE       = [255, 255, 255]
const ORANGE      = [224, 165, 79]
const GRAY        = [160, 165, 170]
const DARK_GRAY   = [80, 85, 90]

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))) }
function lerp(a, b, t) { return clamp(a + (b - a) * t) }
function lerpColor(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

// ─── BMP 写入 ───────────────────────────────────────
function makeBmp(w, h, pixelFn) {
  const rowBytes = w * 3
  const rowPad = (4 - (rowBytes % 4)) % 4
  const imgSize = (rowBytes + rowPad) * h
  const fileSize = 54 + imgSize
  const buf = Buffer.alloc(fileSize)

  buf.write('BM', 0)
  buf.writeUInt32LE(fileSize, 2)
  buf.writeUInt32LE(54, 10)
  buf.writeUInt32LE(40, 14)
  buf.writeInt32LE(w, 18)
  buf.writeInt32LE(h, 22) // 正值 = bottom-up，NSIS 要求
  buf.writeUInt16LE(1, 26)
  buf.writeUInt16LE(24, 28)
  buf.writeUInt32LE(0, 30)
  buf.writeUInt32LE(imgSize, 34)

  // bottom-up: 从最后一行开始写
  let off = 54
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixelFn(x, y)
      buf[off++] = b; buf[off++] = g; buf[off++] = r
    }
    off += rowPad
  }
  return buf
}

// ─── 抗锯齿圆角矩形 ────────────────────────────────
function roundedRectAA(x0, y0, x1, y1, r, w, h) {
  const pixels = new Map()
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || x >= w || y < 0 || y >= h) continue
      let dist = 0
      // 计算到圆角矩形边缘的距离
      const cx = Math.max(x0 + r, Math.min(x1 - r, x))
      const cy = Math.max(y0 + r, Math.min(y1 - r, y))
      const dx = x - cx, dy = y - cy
      dist = Math.sqrt(dx * dx + dy * dy) - r
      if (dist <= 0) {
        pixels.set(`${x},${y}`, 1.0)
      } else if (dist < 1.5) {
        pixels.set(`${x},${y}`, Math.max(0, 1.0 - dist))
      }
    }
  }
  return pixels
}

// ─── 抗锯齿画线 ─────────────────────────────────────
function drawLineAA(points, width, w, h) {
  const pixels = new Map()
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const len = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2)
    const steps = Math.ceil(len * 3)
    for (let t = 0; t <= steps; t++) {
      const r = t / steps
      const cx = x0 + (x1 - x0) * r
      const cy = y0 + (y1 - y0) * r
      const rad = width / 2
      const xMin = Math.floor(cx - rad - 1)
      const xMax = Math.ceil(cx + rad + 1)
      const yMin = Math.floor(cy - rad - 1)
      const yMax = Math.ceil(cy + rad + 1)
      for (let py = yMin; py <= yMax; py++) {
        for (let px = xMin; px <= xMax; px++) {
          if (px < 0 || px >= w || py < 0 || py >= h) continue
          const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
          if (d <= rad) {
            const alpha = d <= rad - 0.5 ? 1.0 : Math.max(0, rad - d + 0.5)
            const key = `${px},${py}`
            pixels.set(key, Math.max(pixels.get(key) || 0, alpha))
          }
        }
      }
    }
  }
  return pixels
}

// ─── 填充区域（带抗锯齿混合） ─────────────────────
function fillPixels(pixelMap, color, bgMap) {
  return (x, y) => {
    const key = `${x},${y}`
    const alpha = pixelMap.get(key) || 0
    if (alpha <= 0) return bgMap(x, y)
    if (alpha >= 1) return color
    const bg = bgMap(x, y)
    return [
      clamp(bg[0] + (color[0] - bg[0]) * alpha),
      clamp(bg[1] + (color[1] - bg[1]) * alpha),
      clamp(bg[2] + (color[2] - bg[2]) * alpha)
    ]
  }
}

// ─── 5x7 点阵字体 ──────────────────────────────────
const FONT = {
  ' ': [0,0,0,0,0],
  'A': [0x7E,0x09,0x09,0x09,0x7E], 'B': [0x7F,0x49,0x49,0x49,0x36],
  'C': [0x3E,0x41,0x41,0x41,0x22], 'D': [0x7F,0x41,0x41,0x41,0x3E],
  'E': [0x7F,0x49,0x49,0x49,0x41], 'F': [0x7F,0x09,0x09,0x09,0x01],
  'G': [0x3E,0x41,0x41,0x49,0x3A], 'H': [0x7F,0x08,0x08,0x08,0x7F],
  'I': [0x00,0x41,0x7F,0x41,0x00], 'J': [0x20,0x40,0x41,0x3F,0x01],
  'K': [0x7F,0x08,0x14,0x22,0x41], 'L': [0x7F,0x40,0x40,0x40,0x40],
  'M': [0x7F,0x02,0x04,0x02,0x7F], 'N': [0x7F,0x02,0x04,0x08,0x7F],
  'O': [0x3E,0x41,0x41,0x41,0x3E], 'P': [0x7F,0x09,0x09,0x09,0x06],
  'Q': [0x3E,0x41,0x51,0x21,0x5E], 'R': [0x7F,0x09,0x19,0x29,0x46],
  'S': [0x46,0x49,0x49,0x49,0x31], 'T': [0x01,0x01,0x7F,0x01,0x01],
  'U': [0x3F,0x40,0x40,0x40,0x3F], 'V': [0x1F,0x20,0x40,0x20,0x1F],
  'W': [0x3F,0x40,0x30,0x40,0x3F], 'X': [0x63,0x14,0x08,0x14,0x63],
  'Y': [0x07,0x08,0x70,0x08,0x07], 'Z': [0x61,0x51,0x49,0x45,0x43],
  '0': [0x3E,0x51,0x49,0x45,0x3E], '1': [0x00,0x42,0x7F,0x40,0x00],
  '2': [0x42,0x61,0x51,0x49,0x46], '3': [0x21,0x41,0x45,0x4B,0x31],
  '4': [0x18,0x14,0x12,0x7F,0x10], '5': [0x27,0x45,0x45,0x45,0x39],
  '6': [0x3C,0x4A,0x49,0x49,0x30], '7': [0x01,0x71,0x09,0x05,0x03],
  '8': [0x36,0x49,0x49,0x49,0x36], '9': [0x06,0x49,0x49,0x29,0x1E],
  '.': [0x00,0x00,0x00,0x00,0x20], ',': [0x00,0x80,0x60,0x00,0x00],
  ':': [0x00,0x00,0x28,0x00,0x00], '-': [0x08,0x08,0x08,0x08,0x08],
  '+': [0x08,0x08,0x3E,0x08,0x08], '/': [0x20,0x10,0x08,0x04,0x02],
  '(': [0x00,0x1C,0x22,0x41,0x00], ')': [0x00,0x41,0x22,0x1C,0x00],
  '!': [0x00,0x00,0x5F,0x00,0x00], '?': [0x02,0x01,0x51,0x09,0x06],
  "'": [0x00,0x00,0x01,0x00,0x00], '"': [0x00,0x01,0x00,0x01,0x00],
}

function textWidth(text, scale) {
  return text.length * 6 * scale - scale
}

function drawText(text, startX, startY, color, scale = 1) {
  const pixels = new Map()
  let cx = startX
  for (const ch of text) {
    const g = FONT[ch] || FONT[' ']
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 7; row++) {
        if (g[col] & (1 << row)) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              pixels.set(`${cx + col * scale + sx},${startY + row * scale + sy}`, 1.0)
            }
          }
        }
      }
    }
    cx += 6 * scale
  }
  return pixels
}

// ─── Header 图片 (493 × 312) ───────────────────────
function genHeader() {
  const W = 493, H = 312
  // 先定义背景函数
  const bg = (x, y) => {
    // 从左上角薄荷色到右下角白色的径向渐变
    const cx = 0, cy = 0
    const maxDist = Math.sqrt(W * W + H * H)
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    const t = Math.min(1, dist / maxDist * 1.5)
    return lerpColor(VERY_LIGHT, WHITE, t)
  }

  let fn = bg

  // 顶部薄荷色条 (4px)
  const topBar = new Map()
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < W; x++) topBar.set(`${x},${y}`, 1.0)
  fn = fillPixels(topBar, MINT, fn)

  // 底部薄荷色条 (2px)
  const botBar = new Map()
  for (let y = H - 2; y < H; y++)
    for (let x = 0; x < W; x++) botBar.set(`${x},${y}`, 1.0)
  fn = fillPixels(botBar, MINT, fn)

  // 左侧装饰竖条
  const sideBar = new Map()
  for (let y = 40; y < H - 40; y++)
    for (let x = 0; x < 3; x++) sideBar.set(`${x},${y}`, 0.6)
  fn = fillPixels(sideBar, MINT, fn)

  // 大圆角矩形图标背景 (居中偏右)
  const iconR = roundedRectAA(340, 50, 450, 160, 20, W, H)
  fn = fillPixels(iconR, MINT, fn)

  // 内部白色小圆角矩形
  const innerR = roundedRectAA(352, 62, 438, 148, 14, W, H)
  fn = fillPixels(innerR, WHITE, fn)

  // 勾号 (抗锯齿)
  const check = drawLineAA([[368, 120], [386, 142], [428, 88]], 8, W, H)
  fn = fillPixels(check, MINT, fn)

  // 橙色小横条装饰
  const orangeBar = new Map()
  for (let y = 108; y <= 114; y++)
    for (let x = 355; x <= 380; x++) orangeBar.set(`${x},${y}`, 1.0)
  fn = fillPixels(orangeBar, ORANGE, fn)

  // 大标题 "Easy Todo"
  const title = drawText('Easy Todo', 30, 65, DARK_GRAY, 3)
  fn = fillPixels(title, DARK_GRAY, fn)

  // 副标题
  const sub = drawText('Simple Local Task Manager', 32, 105, GRAY, 1)
  fn = fillPixels(sub, GRAY, fn)

  // 版本号
  const ver = drawText(`v${version}`, 32, 125, [180, 185, 190], 1)
  fn = fillPixels(ver, [180, 185, 190], fn)

  // 底部提示文字
  const hint = drawText('Click Next to install', 32, H - 40, [170, 175, 180], 1)
  fn = fillPixels(hint, [170, 175, 180], fn)

  return makeBmp(W, H, fn)
}

// ─── Sidebar 图片 (164 × 314) ──────────────────────
function genSidebar() {
  const W = 164, H = 314
  const bg = (x, y) => {
    const t = y / H
    return lerpColor(MINT, DEEP_MINT, t * t) // 二次曲线渐变更自然
  }

  let fn = bg

  // 大圆角矩形
  const bigR = roundedRectAA(22, 60, 142, 185, 22, W, H)
  fn = fillPixels(bigR, WHITE, fn)

  // 内部薄荷色圆角矩形
  const innerR = roundedRectAA(34, 72, 130, 173, 16, W, H)
  fn = fillPixels(innerR, LIGHT_MINT, fn)

  // 勾号
  const check = drawLineAA([[55, 132], [74, 155], [112, 95]], 10, W, H)
  fn = fillPixels(check, MINT, fn)

  // 橙色圆点装饰
  const dot = roundedRectAA(36, 100, 52, 116, 5, W, H)
  fn = fillPixels(dot, ORANGE, fn)

  // 应用名
  const name = drawText('Easy Todo', 38, 210, WHITE, 1)
  fn = fillPixels(name, WHITE, fn)

  // 底部版本号
  const ver = drawText(`v${version}`, 60, 228, [200, 230, 227], 1)
  fn = fillPixels(ver, [200, 230, 227], fn)

  // 底部装饰横线
  const decoLine = new Map()
  for (let x = 30; x < W - 30; x++) decoLine.set(`${x},${H - 30}`, 0.4)
  fn = fillPixels(decoLine, WHITE, fn)

  return makeBmp(W, H, fn)
}

// ─── 生成 ──────────────────────────────────────────
const headerBuf = genHeader()
const sidebarBuf = genSidebar()

writeFileSync(join(outDir, 'header.bmp'), headerBuf)
writeFileSync(join(outDir, 'sidebar.bmp'), sidebarBuf)

console.log(`✓ header.bmp  (${headerBuf.length} bytes, 493×312)`)
console.log(`✓ sidebar.bmp (${sidebarBuf.length} bytes, 164×314)`)
console.log(`输出目录: ${outDir}`)
