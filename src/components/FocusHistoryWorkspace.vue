<template>
  <main class="clock-workspace focus-review-workspace">
    <div class="focus-review-shell">
      <header class="focus-review-header">
        <div>
          <p class="eyebrow">专注回顾</p>
          <h1 id="history-title">把投入变成看得见的节奏</h1>
          <p>回看真实发生的专注，找到更适合自己的推进方式。</p>
        </div>
        <div class="focus-review-header__actions">
          <div class="focus-review-range" role="group" aria-label="回顾时间范围">
            <button v-for="option in ranges" :key="option.id" type="button" :class="{ active: range === option.id }" @click="range = option.id">{{ option.label }}</button>
          </div>
          <button v-if="store.focusHistory.length" class="focus-review-clear" type="button" @click="clearToday"><Trash2 :size="15" />清除今日</button>
        </div>
      </header>

      <section v-if="!focusEntries.length" class="focus-review-empty" aria-labelledby="history-title">
        <div class="focus-review-empty__icon"><Timer :size="25" /></div>
        <strong>还没有专注记录</strong>
        <p>完成第一段专注后，这里会呈现你的投入趋势、任务分布和每次专注的细节。</p>
        <button type="button" @click="store.setClockView('focus')"><Play :size="15" fill="currentColor" />开始专注</button>
      </section>

      <template v-else>
        <section class="focus-review-overview" aria-label="本周期专注概览">
          <article class="focus-review-hero-card">
            <div class="focus-review-hero-card__top"><span>本周期专注</span><span class="focus-review-delta" :class="comparison.direction"><component :is="comparison.direction === 'up' ? ArrowUpRight : ArrowDownRight" :size="14" />{{ comparison.label }}</span></div>
            <strong>{{ formatDuration(totalSeconds) }}</strong>
            <p>{{ focusEntries.length }} 段专注 · {{ activeDays }} 天有投入</p>
          </article>
          <article class="focus-review-metric"><span>完成率</span><strong>{{ completionRate }}%</strong><small>{{ completedEntries.length }} 段自然完成</small></article>
          <article class="focus-review-metric"><span>日均专注</span><strong>{{ formatCompactDuration(averageDailySeconds) }}</strong><small>按有记录的日期计算</small></article>
          <article class="focus-review-metric"><span>最长一次</span><strong>{{ formatCompactDuration(longestEntry?.elapsedSeconds || 0) }}</strong><small>{{ longestEntry ? formatShortDate(longestEntry.finishedAt) : '暂无记录' }}</small></article>
        </section>

        <section class="focus-review-grid">
          <article class="focus-review-card focus-review-trend-card">
            <header><div><span class="focus-review-card__eyebrow">投入趋势</span><h2>{{ trendTitle }}</h2></div><span class="focus-review-card__value">{{ formatCompactDuration(totalSeconds) }}</span></header>
            <div class="focus-review-chart" :style="{ gridTemplateColumns: `repeat(${trendDays.length}, minmax(0, 1fr))` }" role="img" :aria-label="`${trendTitle}，共${formatDuration(totalSeconds)}`">
              <div v-for="day in trendDays" :key="day.key" class="focus-review-chart__column" :class="{ today: day.isToday }" :title="`${day.label}：${formatDuration(day.seconds)}`">
                <span class="focus-review-chart__value">{{ day.seconds ? formatCompactDuration(day.seconds) : '' }}</span>
                <i><b :style="{ height: `${Math.max(day.seconds ? 8 : 2, day.seconds / trendMax * 100)}%` }"></b></i>
                <small>{{ day.shortLabel }}</small>
              </div>
            </div>
            <footer><span><i class="focus-review-legend-dot"></i>专注时长</span><span>{{ trendFooter }}</span></footer>
          </article>

          <article class="focus-review-card focus-review-insight-card">
            <header><div><span class="focus-review-card__eyebrow">本周期发现</span><h2>{{ insight.title }}</h2></div><Sparkles :size="19" /></header>
            <p>{{ insight.description }}</p>
            <div class="focus-review-insight-card__detail"><Target :size="16" /><span>{{ insight.tip }}</span></div>
          </article>
        </section>

        <section class="focus-review-grid focus-review-grid--details">
          <article class="focus-review-card focus-review-breakdown-card">
            <header><div><span class="focus-review-card__eyebrow">任务投入</span><h2>时间花在了哪里</h2></div><ListTodo :size="18" /></header>
            <p v-if="!taskBreakdown.length" class="focus-review-card__empty">本周期的专注还没有关联任务。</p>
            <ol v-else class="focus-review-breakdown">
              <li v-for="item in taskBreakdown" :key="item.id"><div><span>{{ item.title }}</span><small>{{ item.count }} 段 · {{ formatCompactDuration(item.seconds) }}</small></div><strong>{{ item.percent }}%</strong><i><b :style="{ width: `${item.percent}%` }"></b></i></li>
            </ol>
          </article>

          <article class="focus-review-card focus-review-breakdown-card">
            <header><div><span class="focus-review-card__eyebrow">专注方式</span><h2>哪种节奏更常用</h2></div><Clock3 :size="18" /></header>
            <p v-if="!profileBreakdown.length" class="focus-review-card__empty">暂时没有可分析的专注方式。</p>
            <ol v-else class="focus-review-breakdown focus-review-breakdown--profiles">
              <li v-for="item in profileBreakdown" :key="item.id"><div><span>{{ item.name }}</span><small>{{ item.count }} 段 · {{ formatCompactDuration(item.seconds) }}</small></div><strong>{{ item.percent }}%</strong><i><b :style="{ width: `${item.percent}%` }"></b></i></li>
            </ol>
          </article>
        </section>

        <section class="focus-review-records" aria-labelledby="focus-records-title">
          <header class="focus-review-records__header"><div><span class="focus-review-card__eyebrow">专注明细</span><h2 id="focus-records-title">每一段投入都有来处</h2></div><span>{{ filteredRecords.length }} 条记录</span></header>
          <div class="focus-review-filters">
            <label class="focus-review-search"><Search :size="16" /><span class="sr-only">搜索专注记录</span><input v-model.trim="searchQuery" type="search" placeholder="搜索任务或备注" /></label>
            <label><span>结果</span><select v-model="resultFilter"><option value="all">全部结果</option><option value="completed">已完成</option><option value="unfinished">未完成 / 中断</option></select></label>
            <label><span>类型</span><select v-model="phaseFilter"><option value="focus">专注</option><option value="all">专注和休息</option><option value="break">仅休息</option></select></label>
          </div>
          <p v-if="!filteredRecords.length" class="focus-review-records__empty">没有符合当前筛选条件的记录。</p>
          <ul v-else class="focus-review-record-list">
            <li v-for="item in visibleRecords" :key="item.id">
              <div class="focus-review-record-list__reward"><FocusRewardBadge v-if="item.reward" :reward="item.reward" size="md" /><Coffee v-else-if="item.phase !== 'focus'" :size="18" /><Timer v-else :size="18" /></div>
              <div class="focus-review-record-list__main"><strong>{{ taskTitle(item) || phaseLabel(item.phase) }}</strong><span>{{ formatFinishedAt(item.finishedAt) }} · {{ profileName(item.profileId) }}<template v-if="item.phase !== 'focus'"> · {{ phaseLabel(item.phase) }}</template></span><small v-if="item.note">{{ item.note }}</small></div>
              <div class="focus-review-record-list__meta"><strong>{{ formatCompactDuration(item.elapsedSeconds) }}</strong><span :class="`is-${item.result}`">{{ resultLabel(item.result) }}</span></div>
              <button type="button" :aria-label="`删除${phaseLabel(item.phase)}记录`" title="删除记录" @click="deleteRecord(item.id)"><Trash2 :size="15" /></button>
            </li>
          </ul>
          <button v-if="visibleRecords.length < filteredRecords.length" class="focus-review-more" type="button" @click="visibleCount += 20">显示更多记录</button>
        </section>
      </template>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowDownRight, ArrowUpRight, Clock3, Coffee, ListTodo, Play, Search, Sparkles, Target, Timer, Trash2 } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import FocusRewardBadge from './FocusRewardBadge.vue'

const store = useTaskStore()
const range = ref('7d')
const resultFilter = ref('all')
const phaseFilter = ref('focus')
const searchQuery = ref('')
const visibleCount = ref(20)
const ranges = [{ id: '7d', label: '近 7 天', days: 7 }, { id: '30d', label: '近 30 天', days: 30 }, { id: '90d', label: '近 90 天', days: 90 }, { id: 'all', label: '全部', days: null }]

const selectedRange = computed(() => ranges.find(item => item.id === range.value) || ranges[0])
const now = computed(() => new Date())
const rangeStart = computed(() => {
  if (!selectedRange.value.days) return null
  const date = new Date(now.value); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - selectedRange.value.days + 1)
  return date
})
const inRangeHistory = computed(() => store.focusHistory.filter(item => !rangeStart.value || new Date(item.finishedAt) >= rangeStart.value))
const focusEntries = computed(() => inRangeHistory.value.filter(item => item.phase === 'focus'))
const completedEntries = computed(() => focusEntries.value.filter(item => item.result === 'completed'))
const totalSeconds = computed(() => focusEntries.value.reduce((total, item) => total + item.elapsedSeconds, 0))
const activeDays = computed(() => new Set(focusEntries.value.map(item => dateKey(item.finishedAt))).size)
const completionRate = computed(() => focusEntries.value.length ? Math.round(completedEntries.value.length / focusEntries.value.length * 100) : 0)
const averageDailySeconds = computed(() => activeDays.value ? Math.round(totalSeconds.value / activeDays.value) : 0)
const longestEntry = computed(() => [...focusEntries.value].sort((a, b) => b.elapsedSeconds - a.elapsedSeconds)[0])
const trendDays = computed(() => {
  const days = selectedRange.value.days || Math.min(30, Math.max(7, activeDays.value ? 30 : 7))
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now.value); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - days + index + 1)
    const key = dateKey(date)
    const seconds = focusEntries.value.filter(item => dateKey(item.finishedAt) === key).reduce((total, item) => total + item.elapsedSeconds, 0)
    return { key, seconds, label: new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date), shortLabel: days <= 7 ? `周${'日一二三四五六'[date.getDay()]}` : `${date.getMonth() + 1}/${date.getDate()}`, isToday: key === dateKey(now.value) }
  })
})
const trendMax = computed(() => Math.max(...trendDays.value.map(item => item.seconds), 1))
const trendTitle = computed(() => selectedRange.value.id === '7d' ? '这一周的专注节奏' : selectedRange.value.id === '30d' ? '近 30 天的投入变化' : selectedRange.value.id === '90d' ? '近 90 天的投入变化' : '最近 30 天的投入变化')
const trendFooter = computed(() => activeDays.value ? `平均每个投入日 ${formatCompactDuration(averageDailySeconds.value)}` : '开始专注后会显示趋势')
const comparison = computed(() => {
  const days = selectedRange.value.days
  if (!days) return { direction: 'flat', label: '累计记录' }
  const previousEnd = new Date(rangeStart.value); previousEnd.setMilliseconds(-1)
  const previousStart = new Date(rangeStart.value); previousStart.setDate(previousStart.getDate() - days)
  const previous = store.focusHistory.filter(item => item.phase === 'focus' && new Date(item.finishedAt) >= previousStart && new Date(item.finishedAt) <= previousEnd).reduce((total, item) => total + item.elapsedSeconds, 0)
  if (!previous) return { direction: 'up', label: '新的投入周期' }
  const percent = Math.round(Math.abs(totalSeconds.value - previous) / previous * 100)
  return { direction: totalSeconds.value >= previous ? 'up' : 'down', label: `${totalSeconds.value >= previous ? '较前期 +' : '较前期 -'}${percent}%` }
})
const taskBreakdown = computed(() => breakdown(focusEntries.value, item => item.taskId || 'unlinked', item => taskTitle(item) || '未关联任务').slice(0, 4))
const profileBreakdown = computed(() => breakdown(focusEntries.value, item => item.profileId, item => profileName(item.profileId)).slice(0, 4))
const insight = computed(() => {
  if (!focusEntries.value.length) return { title: '从一段专注开始', description: '完成后会在这里形成你的专注画像。', tip: '不用追求连续，记录真实投入即可。' }
  const topTask = taskBreakdown.value[0]
  if (completionRate.value < 60) return { title: '给每段专注留出缓冲', description: `本周期完成率为 ${completionRate.value}%，比起延长时长，更适合先把目标切得具体一些。`, tip: '下一次先选择 25 分钟，并写下一个可完成的小结果。' }
  if (topTask?.id !== 'unlinked') return { title: `重心在「${topTask.title}」`, description: `它占用了本周期 ${topTask.percent}% 的专注时间，共 ${formatCompactDuration(topTask.seconds)}。`, tip: completionRate.value >= 80 ? '当前节奏很稳定，可以保留这个专注方式。' : '为这项任务预留固定时段，能更容易形成连续进展。' }
  return { title: '节奏正在形成', description: `你已完成 ${completedEntries.value.length} 段专注，平均每个投入日 ${formatCompactDuration(averageDailySeconds.value)}。`, tip: '试着关联一个任务，之后能更清楚看见时间投入。' }
})
const filteredRecords = computed(() => [...inRangeHistory.value].sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt)).filter(item => {
  if (phaseFilter.value === 'focus' && item.phase !== 'focus') return false
  if (phaseFilter.value === 'break' && item.phase === 'focus') return false
  if (resultFilter.value === 'completed' && item.result !== 'completed') return false
  if (resultFilter.value === 'unfinished' && item.result === 'completed') return false
  const query = searchQuery.value.toLocaleLowerCase('zh-CN')
  return !query || [taskTitle(item), item.note, profileName(item.profileId), phaseLabel(item.phase)].some(value => value.toLocaleLowerCase('zh-CN').includes(query))
}))
const visibleRecords = computed(() => filteredRecords.value.slice(0, visibleCount.value))

watch([range, resultFilter, phaseFilter, searchQuery], () => { visibleCount.value = 20 })

function breakdown(items, idOf, labelOf) {
  const grouped = new Map()
  items.forEach(item => { const id = idOf(item); const current = grouped.get(id) || { id, seconds: 0, count: 0, title: labelOf(item), name: labelOf(item) }; current.seconds += item.elapsedSeconds; current.count += 1; grouped.set(id, current) })
  return [...grouped.values()].sort((a, b) => b.seconds - a.seconds).map(item => ({ ...item, percent: totalSeconds.value ? Math.max(1, Math.round(item.seconds / totalSeconds.value * 100)) : 0 }))
}
function dateKey(value) { const date = value instanceof Date ? value : new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function taskTitle(item) { return store.activeTasks.find(task => task.id === item.taskId)?.title || '' }
function profileName(profileId) { return store.focusProfiles.find(item => item.id === profileId)?.name || '专注' }
function phaseLabel(phase) { return phase === 'long-break' ? '长休息' : phase === 'short-break' ? '短休息' : '专注' }
function resultLabel(result) { return result === 'completed' ? '已完成' : result === 'abandoned' ? '已放弃' : '被中断' }
function formatDuration(seconds) { const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分` : ''}` : `${minutes} 分钟` }
function formatCompactDuration(seconds) { const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分` : ''}` : `${minutes}分` }
function formatShortDate(value) { return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(value)) }
function formatFinishedAt(value) { return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function deleteRecord(id) { if (window.confirm('删除这条专注记录吗？此操作无法撤销。')) store.deleteFocusHistory(id) }
function clearToday() { if (window.confirm('确定清除今天的全部专注和休息记录吗？此操作不会影响任务。')) store.clearFocusHistoryForDay() }
</script>
