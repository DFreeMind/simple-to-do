// 图表统一封装：ECharts 按需引入 + 从 .app 主题变量读取配色。
// ECharts canvas 渲染不支持 color-mix / var() 值，因此只读取解析为普通色值的变量。
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, MarkLineComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, GridComponent, TooltipComponent, MarkLineComponent, LegendComponent, CanvasRenderer])

export { echarts }

// 从应用主题读取图表配色（跟随 data-theme 切换）
export function readChartColors() {
  const app = typeof document === 'undefined' ? null : document.querySelector('.app')
  const cs = app ? getComputedStyle(app) : null
  const get = (name, fallback) => {
    if (!cs) return fallback
    const raw = cs.getPropertyValue(name).trim()
    // 跳过 var() 引用与 color-mix（canvas 无法渲染）
    return raw && !raw.startsWith('var(') && !raw.startsWith('color-mix') ? raw : fallback
  }
  return {
    accent: get('--accent', '#2f8f86'),
    accentStrong: get('--accent-strong', '#1f6f68'),
    accentSoft: get('--accent-soft', '#e5f5f2'),
    surface: get('--surface', '#ffffff'),
    text: get('--text', '#17211f'),
    textMuted: get('--text-muted', '#687674'),
    border: get('--border', '#e2e8e6')
  }
}

// 统一 tooltip 外观（白底圆角投影，跟随主题）
export function chartTooltipStyle(colors) {
  return {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    textStyle: { color: colors.text, fontSize: 11 },
    padding: [8, 12],
    extraCssText: 'border-radius:10px;box-shadow:0 10px 26px rgba(8,24,20,.14);'
  }
}

export function initChart(el) {
  return echarts.init(el, null, { renderer: 'canvas' })
}
