import { watch } from 'vue'

/**
 * 主题色板定义
 * 每个主题包含基础色，派生色由 JS 动态计算并写入 CSS 变量，
 * 以兼容不支持 color-mix() 或 color-mix 内 var() 引用不响应变化的 WebView（如 macOS WKWebView）。
 */
const THEME_PALETTES = {
  mint: {
    accent:      '#2f8f86',
    accentStrong:'#1f6f68',
    accentSoft:  '#e5f5f2',
    accentTint:  '#f3fbf9',
    sidebarBg:   '#edf5f2',
    mainBg:      '#f9fbfa',
    detailBg:    '#f3f8f6',
    detailCardBg:'#c9e6df',
    detailCardTint:'#e2f2ee',
  },
  blue: {
    accent:      '#346fd8',
    accentStrong:'#2455ad',
    accentSoft:  '#e6efff',
    accentTint:  '#f4f8ff',
    sidebarBg:   '#eef3fc',
    mainBg:      '#fafbfe',
    detailBg:    '#f3f6fc',
    detailCardBg:'#cddffc',
    detailCardTint:'#e3edfc',
  },
  violet: {
    accent:      '#6d5bd7',
    accentStrong:'#5442bd',
    accentSoft:  '#eeeaff',
    accentTint:  '#f8f6ff',
    sidebarBg:   '#f3f1fb',
    mainBg:      '#fbfaff',
    detailBg:    '#f6f4fb',
    detailCardBg:'#ddd5f7',
    detailCardTint:'#eeeafa',
  },
  graphite: {
    accent:      '#475569',
    accentStrong:'#334155',
    accentSoft:  '#e9eef5',
    accentTint:  '#f7f9fc',
    sidebarBg:   '#f0f3f6',
    mainBg:      '#fafbfc',
    detailBg:    '#f4f6f8',
    detailCardBg:'#dce5ee',
    detailCardTint:'#eaf0f5',
  },
}

// ─── 颜色工具 ───

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** 混合两个不透明色，weight=1 时完全取 c1 */
function mix(c1, c2, weight) {
  const a = hexToRgb(c1)
  const b = hexToRgb(c2)
  const r = Math.round(a[0] * weight + b[0] * (1 - weight))
  const g = Math.round(a[1] * weight + b[1] * (1 - weight))
  const bl = Math.round(a[2] * weight + b[2] * (1 - weight))
  return `rgb(${r} ${g} ${bl})`
}

/** 与透明混合 → rgba */
function mixAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 与黑色混合 */
function mixBlack(hex, weight) {
  return mix(hex, '#000000', weight)
}

// ─── 静态派生色（不随主题变化） ───

const SURFACE       = '#ffffff'
const SURFACE_MUTED = '#f8faf9'
const BORDER        = '#e2e8e6'
const BORDER_STRONG = '#cdd8d5'
const TEXT          = '#17211f'
const TEXT_MUTED    = '#687674'
const WHITE         = '#ffffff'
const BLACK         = '#000000'
const DANGER        = '#d94d4d'
const WARNING       = '#cc7a22'

/**
 * 计算某个主题下所有 accent 相关的派生 CSS 变量（key → value 映射）。
 * 返回的对象可以直接 apply 到 DOM 上。
 */
function computeAccentVars(palette) {
  const { accent, accentSoft, accentTint, sidebarBg, mainBg, detailBg, detailCardBg, detailCardTint } = palette

  return {
    // ── accent 衍生 ──
    '--accent-70-white-fallback':           mix(accent, WHITE, 0.70),
    '--accent-52-white-fallback':           mix(accent, WHITE, 0.52),
    '--accent-82-accent-tint-fallback':     mix(accent, accentTint, 0.82),
    '--accent-90-fallback':                 mixBlack(accent, 0.90),
    '--accent-16-surface-muted-fallback':   mix(accent, SURFACE_MUTED, 0.16),

    '--accent-8-fallback':    mixAlpha(accent, 0.08),
    '--accent-9-fallback':    mixAlpha(accent, 0.09),
    '--accent-10-fallback':   mixAlpha(accent, 0.10),
    '--accent-12-fallback':   mixAlpha(accent, 0.12),
    '--accent-15-fallback':   mixAlpha(accent, 0.15),
    '--accent-15-black-fallback': mixBlack(accent, 0.15),
    '--accent-18-fallback':   mix(accent, SURFACE, 0.18),
    '--accent-20-fallback':   mixAlpha(accent, 0.20),
    '--accent-20-border-fallback':   mix(accent, BORDER, 0.20),
    '--accent-20-border-fallback2':  mix(accent, BORDER, 0.20),
    '--accent-24-fallback':   mix(accent, BORDER, 0.24),
    '--accent-28-fallback':   mix(accent, BORDER, 0.28),
    '--accent-34-fallback':   mixAlpha(accent, 0.34),
    '--accent-34-text-muted-fallback': mix(accent, TEXT_MUTED, 0.34),
    '--accent-38-fallback':   mix(accent, BORDER, 0.38),
    '--accent-40-fallback':   mixAlpha(accent, 0.40),
    '--accent-42-fallback':   mixAlpha(accent, 0.42),
    '--accent-58-fallback':   mixAlpha(accent, 0.58),
    '--accent-58-transparent-fallback': mixAlpha(accent, 0.58),

    // ── accent-soft 衍生 ──
    '--accent-soft-70-fallback':            mixAlpha(accentSoft, 0.70),
    '--accent-soft-50-fallback':            mixAlpha(accentSoft, 0.50),
    '--accent-soft-58-surface-fallback':    mix(accentSoft, SURFACE, 0.58),
    '--accent-soft-58-surface-fallback2':   mix(accentSoft, SURFACE, 0.58),
    '--accent-soft-70-surface-fallback':    mix(accentSoft, SURFACE, 0.70),
    '--accent-soft-72-surface-fallback':    mix(accentSoft, SURFACE, 0.72),
    '--accent-soft-86-fallback':            mixAlpha(accentSoft, 0.86),

    // ── accent-tint 衍生 ──
    '--accent-tint-76-surface-fallback':    mix(accentTint, SURFACE, 0.76),
    '--accent-tint-86-white-fallback':      mix(accentTint, WHITE, 0.86),

    // ── surface + accent-tint 混合 ──
    '--surface-80-accent-tint-fallback':    mix(SURFACE, accentTint, 0.80),
    '--surface-82-accent-tint-fallback':    mix(SURFACE, accentTint, 0.82),

    // ── 分栏主题背景 ──
    // 白色内容卡片不参与着色，仅为三栏画布生成低饱和层次。
    '--theme-sidebar-bg': sidebarBg,
    '--theme-main-bg':    mainBg,
    '--theme-detail-bg':  detailBg,
    '--theme-detail-card-bg': detailCardBg,
    '--theme-detail-card-tint': detailCardTint,
  }
}

/**
 * 不随主题变化的静态派生变量（color-mix 兼容层）。
 * 仅在 @supports 不生效的浏览器中需要；现代浏览器会自行用 CSS 的 @supports 覆盖。
 * 为简洁，这里只覆盖最常用的。
 */
function computeStaticVars() {
  return {
    '--divider-soft':     mixAlpha(BORDER, 0.48),
    '--divider-soft-fallback': mixAlpha(BORDER, 0.48),
    '--border-70-fallback':    mixAlpha(BORDER, 0.70),
    '--border-86-fallback':    mixAlpha(BORDER, 0.86),
    '--border-86-transparent-fallback': mixAlpha(BORDER, 0.86),
    '--border-strong-78-border-fallback': mix(BORDER_STRONG, BORDER, 0.78),
    '--surface-muted-fallback':            SURFACE_MUTED,
    '--surface-muted-68-surface-fallback': mix(SURFACE_MUTED, SURFACE, 0.68),
    '--surface-muted-74-surface-fallback': mix(SURFACE_MUTED, SURFACE, 0.74),
    '--surface-muted-86-surface-fallback': mix(SURFACE_MUTED, SURFACE, 0.86),
    '--surface-muted-86-border-fallback':  mix(SURFACE_MUTED, BORDER, 0.86),
    '--surface-90-fallback':          mixAlpha(SURFACE, 0.90),
    '--surface-90-surface-muted-fallback': mix(SURFACE, SURFACE_MUTED, 0.90),
    '--surface-92-fallback':          mixAlpha(SURFACE, 0.92),
    '--surface-92-surface-muted-fallback': mix(SURFACE, SURFACE_MUTED, 0.92),
    '--surface-92-transparent-fallback':   mixAlpha(SURFACE, 0.92),
    '--white-24-fallback': mixAlpha(WHITE, 0.24),
    '--white-28-fallback': mixAlpha(WHITE, 0.28),
    '--white-62-fallback': mixAlpha(WHITE, 0.62),
    '--white-64-fallback': mixAlpha(WHITE, 0.64),
    '--text-3-fallback':  mixAlpha(TEXT, 0.03),
    '--text-4-fallback':  mixAlpha(TEXT, 0.04),
    '--text-5-fallback':  mixAlpha(TEXT, 0.05),
    '--text-6-fallback':  mixAlpha(TEXT, 0.06),
    '--text-7-fallback':  mixAlpha(TEXT, 0.07),
    '--text-8-fallback':  mixAlpha(TEXT, 0.08),
    '--text-muted-26-fallback': mixAlpha(TEXT_MUTED, 0.26),
    '--text-muted-34-fallback': mixAlpha(TEXT_MUTED, 0.34),
    '--danger-10-fallback':  mixAlpha(DANGER, 0.10),
    '--danger-12-fallback':  mixAlpha(DANGER, 0.12),
    '--warning-13-fallback': mix(WARNING, SURFACE, 0.13),
  }
}

// ─── 公开 API ───

let applied = false

/**
 * 在 Vue 组件中调用：监听主题变化并实时写入 CSS 变量。
 * @param {import('vue').Ref|ComputedRef} themeRef - 响应式主题名
 */
export function useTheme(themeRef) {
  function apply(themeName) {
    const el = document.querySelector('.app')
    if (!el) return

    const palette = THEME_PALETTES[themeName] || THEME_PALETTES.mint
    const vars = { ...computeStaticVars(), ...computeAccentVars(palette) }

    for (const [prop, val] of Object.entries(vars)) {
      el.style.setProperty(prop, val)
    }
    applied = true
  }

  // 首次立即应用 + 监听变化
  apply(themeRef.value)
  watch(themeRef, apply)
}

/** 供外部判断是否已由 JS 接管（可选） */
export function isThemeApplied() {
  return applied
}
