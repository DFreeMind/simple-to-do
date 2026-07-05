<template>
  <section class="stats-view">
    <div class="stats-grid">
      <article v-for="item in summaryCards" :key="item.label" class="stat-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.hint }}</small>
      </article>
    </div>

    <section class="stats-panel">
      <div class="section-heading">
        <h2>最近 7 天</h2>
        <span>完成 / 新建</span>
      </div>
      <div class="trend-bars">
        <div v-for="item in store.statsTrend7Days" :key="item.key" class="trend-day">
          <div class="trend-stack">
            <span class="trend-bar trend-bar--created" :style="{ height: `${barHeight(item.created)}%` }"></span>
            <span class="trend-bar trend-bar--done" :style="{ height: `${barHeight(item.completed)}%` }"></span>
          </div>
          <strong>{{ item.completed }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </section>

    <section class="stats-panel">
      <div class="section-heading">
        <h2>清单分布</h2>
        <span>{{ totalOpen }} 个未完成</span>
      </div>
      <div v-if="store.listDistribution.length" class="distribution-list">
        <div v-for="item in store.listDistribution" :key="item.id" class="distribution-row">
          <span class="color-dot" :style="{ backgroundColor: item.color }"></span>
          <span>{{ item.name }}</span>
          <div class="distribution-track">
            <i :style="{ width: `${distributionWidth(item.count)}%`, backgroundColor: item.color }"></i>
          </div>
          <strong>{{ item.count }}</strong>
        </div>
      </div>
      <div v-else class="stats-empty">暂无未完成任务。</div>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()

const summaryCards = computed(() => [
  { label: '未完成', value: store.statsSummary.open, hint: '当前任务库存' },
  { label: '已逾期', value: store.statsSummary.overdue, hint: '需要优先处理' },
  { label: '本周到期', value: store.statsSummary.dueThisWeek, hint: '未来 7 天' },
  { label: '今日完成', value: store.statsSummary.doneToday, hint: '当天推进' },
  { label: '7 天完成', value: store.statsSummary.completedThisWeek, hint: '近期产出' },
  { label: '完成率', value: `${store.statsSummary.completionRate}%`, hint: '全部任务口径' }
])

const maxTrend = computed(() => {
  return Math.max(1, ...store.statsTrend7Days.map(item => Math.max(item.completed, item.created)))
})

const totalOpen = computed(() => store.listDistribution.reduce((sum, item) => sum + item.count, 0))
const maxDistribution = computed(() => Math.max(1, ...store.listDistribution.map(item => item.count)))

function barHeight(value) {
  return Math.max(8, Math.round((value / maxTrend.value) * 100))
}

function distributionWidth(value) {
  return Math.max(6, Math.round((value / maxDistribution.value) * 100))
}
</script>
