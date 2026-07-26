<template>
  <main ref="workspaceRef" class="clock-workspace review-workspace">
    <div class="review-shell">
      <header class="review-header">
        <div>
          <p class="eyebrow">专注与节律回顾</p>
          <h1>看见投入，也看见恢复</h1>
          <p>专注记录推进，节律记录你如何停下来。点击任意记录可查看完整详情。</p>
        </div>
        <div class="review-range" role="group" aria-label="回顾时间范围">
          <button v-for="option in ranges" :key="option.id" type="button" :class="{ active: range === option.id }" @click="range = option.id">
            {{ option.label }}
          </button>
        </div>
      </header>

      <nav class="review-tabs" aria-label="回顾内容">
        <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" :aria-current="activeTab === tab.id ? 'page' : undefined" @click="selectTab(tab.id)">
          <component :is="tab.icon" :size="17" />
          {{ tab.label }}
          <span>{{ tab.count }}</span>
        </button>
      </nav>

      <section v-if="!focusHistory.length && !rhythmHistory.length" class="review-empty">
        <span><History :size="25" /></span>
        <strong>还没有可回顾的记录</strong>
        <p>完成一段专注或处理一次节律提醒后，这里会保存真实发生的过程。</p>
        <button type="button" @click="store.setClockView('focus')"><Play :size="15" fill="currentColor" />开始专注</button>
      </section>

      <template v-else-if="activeTab === 'overview'">
        <section class="review-card review-summary" aria-label="本周期概览">
          <header><div><span>数据摘要</span><h2>{{ selectedRange.label }}的专注与节律</h2><p>下面的趋势和最近记录使用同一时间范围</p></div><small>{{ focusEntries.length + rhythmEntries.length }} 条记录</small></header>
          <div class="review-metrics">
            <article class="review-metric review-metric--primary">
              <span>有效专注</span>
              <strong>{{ formatDuration(totalFocusSeconds) }}</strong>
              <small>{{ focusEntries.length }} 段 · {{ focusActiveDays }} 天有投入</small>
            </article>
            <article class="review-metric">
              <span>专注完成率</span>
              <strong>{{ focusCompletionRate }}%</strong>
              <small>{{ completedFocusEntries.length }} 段自然完成</small>
            </article>
            <article class="review-metric">
              <span>暂停</span>
              <strong>{{ totalPauseCount }} 次</strong>
              <small>累计 {{ formatDuration(totalPausedSeconds) }}</small>
            </article>
            <article class="review-metric review-metric--rhythm">
              <span>节律响应</span>
              <strong>{{ rhythmEntries.length }} 次</strong>
              <small>{{ rhythmCompletionRate }}% 完成或自然离席</small>
            </article>
          </div>
        </section>

        <section class="review-overview-grid">
          <article class="review-card">
            <header>
              <div><span>专注趋势</span><h2>{{ trendTitle }}</h2></div>
              <strong>{{ formatCompactDuration(totalFocusSeconds) }}</strong>
            </header>
            <div class="review-chart" :style="{ gridTemplateColumns: `repeat(${trendDays.length}, minmax(0, 1fr))` }" role="img" :aria-label="`${trendTitle}，共 ${formatDuration(totalFocusSeconds)}`">
              <div v-for="day in trendDays" :key="day.key" :title="`${day.label}：${formatDuration(day.seconds)}`">
                <span>{{ day.seconds ? formatCompactDuration(day.seconds) : '' }}</span>
                <i><b :style="{ height: `${Math.max(day.seconds ? 8 : 2, day.seconds / trendMax * 100)}%` }"></b></i>
                <small>{{ day.shortLabel }}</small>
              </div>
            </div>
          </article>

          <article class="review-card review-rhythm-card">
            <header><div><span>节律执行</span><h2>提醒之后发生了什么</h2></div><BellRing :size="19" /></header>
            <div v-if="rhythmEntries.length" class="review-rhythm-actions">
              <div v-for="item in rhythmActionSummary" :key="item.action">
                <span><i :class="`is-${item.action}`"></i>{{ item.label }}</span>
                <strong>{{ item.count }}</strong>
                <b><i :style="{ width: `${item.percent}%` }"></i></b>
              </div>
            </div>
            <p v-else class="review-card__empty">本周期还没有节律处理记录。新处理的完成、延后和跳过会显示在这里。</p>
          </article>
        </section>

        <section class="review-card review-recent">
          <header class="review-recent__header">
            <div><span>最近发生</span><h2>专注与节律时间线</h2><p>{{ selectedRange.label }}的数据，与上方统计使用相同时间范围</p></div>
            <div class="review-recent-switch" role="group" aria-label="筛选最近记录类型">
              <button v-for="option in recentKindOptions" :key="option.id" type="button" :class="{ active: recentKind === option.id }" @click="recentKind = option.id">{{ option.label }}</button>
            </div>
          </header>
          <div v-if="recentRecords.length" class="review-recent-list">
            <article v-for="record in recentRecords" :key="`${record.kind}-${record.item.id}`" class="review-recent-row">
              <button class="review-record-open" type="button" @click="openDetail(record.kind, record.item)">
                <span class="review-record-icon" :class="`is-${record.kind}`"><Timer v-if="record.kind === 'focus'" :size="17" /><BellRing v-else :size="17" /></span>
                <span class="review-record-main"><strong>{{ recordTitle(record) }}</strong><small>{{ record.kind === 'focus' ? profileName(record.item.profileId) : triggerTypeLabel(record.item.triggerType) }}</small></span>
              </button>
              <span class="review-record-time">
                <strong>{{ formatShortDate(record.at) }}</strong>
                <small>{{ record.kind === 'focus' ? formatTimeRange(record.item.startedAt, record.item.finishedAt) : `${formatClock(record.item.triggeredAt)} → ${formatClock(record.item.resolvedAt)}` }}</small>
              </span>
              <span class="review-record-meta"><strong>{{ record.kind === 'focus' ? formatCompactDuration(record.item.elapsedSeconds) : rhythmActionLabel(record.item.action) }}</strong><small>{{ record.kind === 'focus' ? resultLabel(record.item.result) : `${formatResponseTime(record.item.responseSeconds)}响应` }}</small></span>
              <span class="review-record-actions">
                <button type="button" :aria-label="`查看${record.kind === 'focus' ? '专注' : '节律'}详情`" title="查看详情" @click="openDetail(record.kind, record.item)"><Eye :size="16" /></button>
                <button class="is-danger" type="button" :aria-label="`删除${record.kind === 'focus' ? '专注' : '节律'}记录`" title="删除记录" @click="deleteRecord(record)"><Trash2 :size="16" /></button>
              </span>
            </article>
          </div>
          <p v-else class="review-card__empty">当前范围没有记录。</p>
          <footer class="review-recent__footer">
            <span>显示最近 {{ recentRecords.length }} 条，完整历史支持筛选和分页管理</span>
            <div>
              <button type="button" @click="selectTab('focus')">管理专注记录 <ChevronRight :size="14" /></button>
              <button type="button" @click="selectTab('rhythm')">管理节律记录 <ChevronRight :size="14" /></button>
            </div>
          </footer>
        </section>
      </template>

      <section v-else-if="activeTab === 'focus'" class="review-card review-records">
        <header class="review-management-header">
          <div class="review-management-title">
            <button type="button" @click="selectTab('overview')"><ArrowLeft :size="16" />返回回顾</button>
            <div><span>专注记录管理</span><h2>查找和管理每一段投入</h2><p>筛选、统计和列表使用同一数据口径。</p></div>
          </div>
          <small>{{ formatCount(filteredFocusRecords.length) }} 条</small>
        </header>
        <div class="review-filter-panel">
          <header><span><SlidersHorizontal :size="15" />筛选与排序</span><small>{{ focusFilterCount ? `已启用 ${focusFilterCount} 项条件` : '当前显示全部专注记录' }}</small></header>
          <div class="review-filters">
            <label><Search :size="16" /><span class="sr-only">搜索专注记录</span><input v-model.trim="focusSearch" type="search" placeholder="搜索任务、方式或备注" /></label>
            <select v-model="focusResult" aria-label="筛选专注结果"><option value="all">全部结果</option><option value="completed">已完成</option><option value="unfinished">中断或放弃</option></select>
            <select v-model="focusPhase" aria-label="筛选专注类型"><option value="all">专注与休息</option><option value="focus">仅专注</option><option value="break">仅休息</option></select>
            <select v-model="focusPause" aria-label="筛选暂停情况"><option value="all">全部暂停情况</option><option value="paused">有暂停</option><option value="unpaused">无暂停</option></select>
            <select v-model="focusSort" aria-label="专注记录排序"><option value="newest">最新在前</option><option value="oldest">最早在前</option><option value="longest">时长从长到短</option></select>
            <button v-if="focusFilterCount" class="review-filter-reset" type="button" @click="resetFocusFilters"><RotateCcw :size="14" />重置</button>
          </div>
        </div>
        <div class="review-filter-summary" aria-label="当前筛选的专注统计">
          <div><span>匹配记录</span><strong>{{ formatCount(filteredFocusRecords.length) }} 条</strong></div>
          <div><span>有效时长</span><strong>{{ formatDuration(filteredFocusSeconds) }}</strong></div>
          <div><span>完成率</span><strong>{{ filteredFocusCompletionRate }}%</strong></div>
          <div><span>暂停情况</span><strong>{{ filteredFocusPauseCount }} 次 · {{ formatDuration(filteredFocusPausedSeconds) }}</strong></div>
        </div>
        <div v-if="pagedFocusRecords.length" class="review-record-table">
          <div class="review-record-table__head" aria-hidden="true"><span>记录</span><span>起止时间</span><span>结果</span><span>操作</span></div>
          <article v-for="item in pagedFocusRecords" :key="item.id" class="review-record-row">
            <button class="review-record-open" type="button" @click="openDetail('focus', item)">
              <span class="review-record-icon is-focus"><FocusRewardBadge v-if="item.reward" :reward="item.reward" size="sm" /><Coffee v-else-if="item.phase !== 'focus'" :size="17" /><Timer v-else :size="17" /></span>
              <span class="review-record-main"><strong>{{ focusTitle(item) }}</strong><small>{{ profileName(item.profileId) }} · {{ focusPauseCount(item) ? `暂停 ${focusPauseCount(item)} 次` : '未暂停' }}</small></span>
            </button>
            <span class="review-record-time"><strong>{{ formatShortDate(item.finishedAt) }}</strong><small>{{ formatTimeRange(item.startedAt, item.finishedAt) }}</small></span>
            <span class="review-record-meta"><strong>{{ formatCompactDuration(item.elapsedSeconds) }}</strong><small>{{ resultLabel(item.result) }}</small></span>
            <span class="review-record-actions">
              <button type="button" aria-label="查看专注详情" title="查看详情" @click="openDetail('focus', item)"><Eye :size="16" /></button>
              <button class="is-danger" type="button" aria-label="删除专注记录" title="删除记录" @click="deleteFocusRecord(item)"><Trash2 :size="16" /></button>
            </span>
          </article>
        </div>
        <p v-else class="review-card__empty">没有符合当前筛选条件的专注记录。</p>
        <footer v-if="filteredFocusRecords.length" class="review-pagination">
          <span>第 {{ focusPageStart }}–{{ focusPageEnd }} 条，共 {{ formatCount(filteredFocusRecords.length) }} 条</span>
          <label>每页 <select v-model.number="focusPageSize" aria-label="每页专注记录数"><option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option></select> 条</label>
          <div>
            <button type="button" aria-label="上一页" :disabled="focusPage === 1" @click="focusPage--"><ChevronLeft :size="16" /></button>
            <strong>{{ focusPage }} / {{ focusPageCount }}</strong>
            <button type="button" aria-label="下一页" :disabled="focusPage === focusPageCount" @click="focusPage++"><ChevronRight :size="16" /></button>
          </div>
        </footer>
      </section>

      <section v-else class="review-card review-records">
        <header class="review-management-header">
          <div class="review-management-title">
            <button type="button" @click="selectTab('overview')"><ArrowLeft :size="16" />返回回顾</button>
            <div><span>节律记录管理</span><h2>查找和管理每一次提醒响应</h2><p>筛选、统计和列表使用同一数据口径。</p></div>
          </div>
          <small>{{ formatCount(filteredRhythmRecords.length) }} 条</small>
        </header>
        <div class="review-filter-panel">
          <header><span><SlidersHorizontal :size="15" />筛选与排序</span><small>{{ rhythmFilterCount ? `已启用 ${rhythmFilterCount} 项条件` : '当前显示全部节律记录' }}</small></header>
          <div class="review-filters">
            <label><Search :size="16" /><span class="sr-only">搜索节律记录</span><input v-model.trim="rhythmSearch" type="search" placeholder="搜索提醒名称" /></label>
            <select v-model="rhythmAction" aria-label="筛选节律处理结果"><option value="all">全部结果</option><option value="completed">已完成</option><option value="snoozed">已延后</option><option value="skipped">跳过或关闭</option></select>
            <select v-model="rhythmTrigger" aria-label="筛选节律触发方式"><option value="all">全部触发方式</option><option value="interval">间隔提醒</option><option value="fixed-time">固定时刻</option><option value="active-duration">连续活跃</option></select>
            <select v-model="rhythmSort" aria-label="节律记录排序"><option value="newest">最新在前</option><option value="oldest">最早在前</option><option value="slowest">响应最慢在前</option></select>
            <button v-if="rhythmFilterCount" class="review-filter-reset" type="button" @click="resetRhythmFilters"><RotateCcw :size="14" />重置</button>
          </div>
        </div>
        <div class="review-filter-summary" aria-label="当前筛选的节律统计">
          <div><span>匹配记录</span><strong>{{ formatCount(filteredRhythmRecords.length) }} 条</strong></div>
          <div><span>完成或离席</span><strong>{{ filteredRhythmCompletionRate }}%</strong></div>
          <div><span>平均响应</span><strong>{{ formatResponseTime(filteredRhythmResponseAverage) }}</strong></div>
          <div><span>延后次数</span><strong>{{ filteredRhythmSnoozeCount }} 次</strong></div>
        </div>
        <div v-if="pagedRhythmRecords.length" class="review-record-table">
          <div class="review-record-table__head" aria-hidden="true"><span>提醒</span><span>提醒与处理</span><span>结果</span><span>操作</span></div>
          <article v-for="item in pagedRhythmRecords" :key="item.id" class="review-record-row">
            <button class="review-record-open" type="button" @click="openDetail('rhythm', item)">
              <span class="review-record-icon is-rhythm"><BellRing :size="17" /></span>
              <span class="review-record-main"><strong>{{ item.reminderTitle }}</strong><small>{{ triggerTypeLabel(item.triggerType) }} · {{ item.triggerLabel || '未记录规则' }}</small></span>
            </button>
            <span class="review-record-time"><strong>{{ formatShortDate(item.triggeredAt) }}</strong><small>{{ formatClock(item.triggeredAt) }} → {{ formatClock(item.resolvedAt) }}</small></span>
            <span class="review-record-meta"><strong>{{ rhythmActionLabel(item.action) }}</strong><small>{{ formatResponseTime(item.responseSeconds) }}响应</small></span>
            <span class="review-record-actions">
              <button type="button" aria-label="查看节律详情" title="查看详情" @click="openDetail('rhythm', item)"><Eye :size="16" /></button>
              <button class="is-danger" type="button" aria-label="删除节律记录" title="删除记录" @click="deleteRhythmRecord(item)"><Trash2 :size="16" /></button>
            </span>
          </article>
        </div>
        <p v-else class="review-card__empty">还没有节律历史。现有提醒配置会保留，新处理结果将从现在开始记录。</p>
        <footer v-if="filteredRhythmRecords.length" class="review-pagination">
          <span>第 {{ rhythmPageStart }}–{{ rhythmPageEnd }} 条，共 {{ formatCount(filteredRhythmRecords.length) }} 条</span>
          <label>每页 <select v-model.number="rhythmPageSize" aria-label="每页节律记录数"><option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option></select> 条</label>
          <div>
            <button type="button" aria-label="上一页" :disabled="rhythmPage === 1" @click="rhythmPage--"><ChevronLeft :size="16" /></button>
            <strong>{{ rhythmPage }} / {{ rhythmPageCount }}</strong>
            <button type="button" aria-label="下一页" :disabled="rhythmPage === rhythmPageCount" @click="rhythmPage++"><ChevronRight :size="16" /></button>
          </div>
        </footer>
      </section>
    </div>

    <Teleport to=".app">
      <div v-if="detail" class="review-detail-backdrop" @click.self="closeDetail">
        <aside class="review-detail" role="dialog" aria-modal="true" :aria-labelledby="detail.kind === 'focus' ? 'focus-detail-title' : 'rhythm-detail-title'">
          <header class="review-detail-header">
            <div class="review-detail-heading">
              <span class="review-detail-heading__icon" :class="`is-${detail.kind}`"><Timer v-if="detail.kind === 'focus'" :size="19" /><BellRing v-else :size="19" /></span>
              <div>
                <span>{{ detail.kind === 'focus' ? '专注记录详情' : '节律记录详情' }}</span>
                <h2 :id="detail.kind === 'focus' ? 'focus-detail-title' : 'rhythm-detail-title'">{{ detail.kind === 'focus' ? focusTitle(detail.item) : detail.item.reminderTitle }}</h2>
                <p>{{ detail.kind === 'focus' ? `${formatShortDate(detail.item.finishedAt)} · ${formatTimeRange(detail.item.startedAt, detail.item.finishedAt)}` : `${formatShortDate(detail.item.triggeredAt)} · ${formatClock(detail.item.triggeredAt)} → ${formatClock(detail.item.resolvedAt)}` }}</p>
              </div>
            </div>
            <button type="button" aria-label="关闭详情" title="关闭" @click="closeDetail"><X :size="19" /></button>
          </header>

          <template v-if="detail.kind === 'focus'">
            <section class="review-detail-hero is-focus">
              <div class="review-detail-hero__value"><span>本次有效时长</span><strong>{{ formatDuration(detail.item.elapsedSeconds) }}</strong><small>{{ resultLabel(detail.item.result) }} · {{ profileName(detail.item.profileId) }}</small></div>
              <div class="review-detail-hero__window">
                <div><span>开始</span><strong>{{ formatClock(detail.item.startedAt) }}</strong><small>{{ formatShortDate(detail.item.startedAt) }}</small></div>
                <ArrowRight :size="19" />
                <div><span>结束</span><strong>{{ formatClock(detail.item.finishedAt) }}</strong><small>{{ formatShortDate(detail.item.finishedAt) }}</small></div>
              </div>
            </section>
            <div class="review-detail-summary">
              <div><span>暂停次数</span><strong>{{ focusPauseCount(detail.item) }} 次</strong></div>
              <div><span>暂停总时长</span><strong>{{ formatDuration(focusPausedSeconds(detail.item)) }}</strong></div>
              <div><span>实际时间跨度</span><strong>{{ formatDuration(focusWallSeconds(detail.item)) }}</strong></div>
            </div>
            <section class="review-detail-section">
              <header><Activity :size="16" /><h3>记录信息</h3></header>
              <dl class="review-detail-fields">
                <div><dt>专注方式</dt><dd>{{ profileName(detail.item.profileId) }}</dd></div>
                <div><dt>阶段</dt><dd>{{ detail.item.phase === 'focus' ? '专注' : phaseLabel(detail.item.phase) }}</dd></div>
                <div><dt>结束结果</dt><dd>{{ resultLabel(detail.item.result) }}</dd></div>
                <div><dt>关联任务</dt><dd>{{ detail.item.taskTitle || '未关联任务' }}</dd></div>
              </dl>
            </section>
            <section class="review-detail-section">
              <header><Clock3 :size="16" /><h3>过程时间线</h3><span class="review-detail-section__count">{{ detail.item.timeline?.length || 0 }} 个节点</span></header>
              <ol v-if="detail.item.timeline?.length" class="review-timeline">
                <li v-for="(event, index) in detail.item.timeline" :key="`${event.type}-${event.at}-${index}`">
                  <i :class="`is-${event.type}`"></i>
                  <div><strong>{{ focusEventLabel(event) }}</strong><span>{{ formatFullDateTime(event.at) }}</span><small v-if="focusEventDescription(event)">{{ focusEventDescription(event) }}</small></div>
                </li>
              </ol>
              <div v-else class="review-detail-legacy"><History :size="18" /><p><strong>这是早期记录</strong><span>当时尚未采集暂停时间线，因此只能展示开始、结束和有效时长，无法准确反推暂停过程。</span></p></div>
            </section>
            <section v-if="detail.item.note" class="review-detail-section">
              <header><FileText :size="16" /><h3>结束备注</h3></header>
              <p class="review-detail-note">{{ detail.item.note }}</p>
            </section>
          </template>

          <template v-else>
            <section class="review-detail-hero is-rhythm">
              <div class="review-detail-hero__value"><span>本次处理结果</span><strong>{{ rhythmActionLabel(detail.item.action) }}</strong><small>{{ formatResponseTime(detail.item.responseSeconds) }}后响应</small></div>
              <div class="review-detail-hero__window">
                <div><span>提醒</span><strong>{{ formatClock(detail.item.triggeredAt) }}</strong><small>{{ formatShortDate(detail.item.triggeredAt) }}</small></div>
                <ArrowRight :size="19" />
                <div><span>处理</span><strong>{{ formatClock(detail.item.resolvedAt) }}</strong><small>{{ formatShortDate(detail.item.resolvedAt) }}</small></div>
              </div>
            </section>
            <div class="review-detail-summary">
              <div><span>响应耗时</span><strong>{{ formatResponseTime(detail.item.responseSeconds) }}</strong></div>
              <div><span>触发方式</span><strong>{{ triggerTypeLabel(detail.item.triggerType) }}</strong></div>
              <div><span>延后时长</span><strong>{{ detail.item.snoozeMinutes ? `${detail.item.snoozeMinutes} 分钟` : '未延后' }}</strong></div>
            </div>
            <section class="review-detail-section">
              <header><BellRing :size="16" /><h3>提醒信息</h3></header>
              <dl class="review-detail-fields">
                <div><dt>触发方式</dt><dd>{{ triggerTypeLabel(detail.item.triggerType) }}</dd></div>
                <div><dt>触发规则</dt><dd>{{ detail.item.triggerLabel || '未记录' }}</dd></div>
                <div v-if="detail.item.snoozeMinutes"><dt>延后时长</dt><dd>{{ detail.item.snoozeMinutes }} 分钟</dd></div>
              </dl>
            </section>
            <section class="review-detail-section">
              <header><Activity :size="16" /><h3>响应过程</h3></header>
              <ol class="review-timeline">
                <li><i class="is-started"></i><div><strong>提醒到期</strong><span>{{ formatFullDateTime(detail.item.triggeredAt) }}</span></div></li>
                <li><i class="is-finished"></i><div><strong>{{ rhythmActionLabel(detail.item.action) }}</strong><span>{{ formatFullDateTime(detail.item.resolvedAt) }}</span><small>{{ formatResponseTime(detail.item.responseSeconds) }}后处理</small></div></li>
              </ol>
            </section>
          </template>

          <footer>
            <button type="button" class="review-detail-delete" @click="deleteDetail"><Trash2 :size="15" />删除这条记录</button>
            <button type="button" class="review-detail-close" @click="closeDetail">完成</button>
          </footer>
        </aside>
      </div>
    </Teleport>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Activity, ArrowLeft, ArrowRight, BellRing, ChevronLeft, ChevronRight, Clock3, Coffee, Eye, FileText, History, Play, RotateCcw, Search, SlidersHorizontal, Timer, Trash2, X } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import FocusRewardBadge from './FocusRewardBadge.vue'

const store = useTaskStore()
const workspaceRef = ref(null)
const range = ref('7d')
const activeTab = ref('overview')
const recentKind = ref('all')
const focusSearch = ref('')
const focusResult = ref('all')
const focusPhase = ref('all')
const focusPause = ref('all')
const focusSort = ref('newest')
const rhythmSearch = ref('')
const rhythmAction = ref('all')
const rhythmTrigger = ref('all')
const rhythmSort = ref('newest')
const focusPage = ref(1)
const rhythmPage = ref(1)
const focusPageSize = ref(25)
const rhythmPageSize = ref(25)
const detail = ref(null)
const pageSizes = [25, 50, 100]
const ranges = [{ id: '7d', label: '近 7 天', days: 7 }, { id: '30d', label: '近 30 天', days: 30 }, { id: '90d', label: '近 90 天', days: 90 }, { id: 'all', label: '全部', days: null }]
const recentKindOptions = [{ id: 'all', label: '全部' }, { id: 'focus', label: '仅专注' }, { id: 'rhythm', label: '仅节律' }]

const selectedRange = computed(() => ranges.find(item => item.id === range.value) || ranges[0])
const rangeStart = computed(() => {
  if (!selectedRange.value.days) return null
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - selectedRange.value.days + 1)
  return date
})
const focusHistory = computed(() => store.focusHistory.filter(item => !rangeStart.value || new Date(item.finishedAt) >= rangeStart.value))
const rhythmHistory = computed(() => store.rhythmHistory.filter(item => !rangeStart.value || new Date(item.resolvedAt) >= rangeStart.value))
const focusEntries = computed(() => focusHistory.value.filter(item => item.phase === 'focus'))
const rhythmEntries = computed(() => rhythmHistory.value)
const completedFocusEntries = computed(() => focusEntries.value.filter(item => item.result === 'completed'))
const totalFocusSeconds = computed(() => focusEntries.value.reduce((total, item) => total + item.elapsedSeconds, 0))
const focusActiveDays = computed(() => new Set(focusEntries.value.map(item => dateKey(item.finishedAt))).size)
const focusCompletionRate = computed(() => focusEntries.value.length ? Math.round(completedFocusEntries.value.length / focusEntries.value.length * 100) : 0)
const totalPauseCount = computed(() => focusEntries.value.reduce((total, item) => total + focusPauseCount(item), 0))
const totalPausedSeconds = computed(() => focusEntries.value.reduce((total, item) => total + focusPausedSeconds(item), 0))
const completedRhythmEntries = computed(() => rhythmEntries.value.filter(item => ['completed', 'natural-break'].includes(item.action)))
const rhythmCompletionRate = computed(() => rhythmEntries.value.length ? Math.round(completedRhythmEntries.value.length / rhythmEntries.value.length * 100) : 0)
const tabs = computed(() => [
  { id: 'overview', label: '综合概览', icon: Activity, count: focusEntries.value.length + rhythmEntries.value.length },
  { id: 'focus', label: '专注记录', icon: Timer, count: focusHistory.value.length },
  { id: 'rhythm', label: '节律记录', icon: BellRing, count: rhythmEntries.value.length }
])
const trendDays = computed(() => {
  const days = selectedRange.value.days || 30
  return Array.from({ length: days }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - days + index + 1)
    const key = dateKey(date)
    const seconds = focusEntries.value.filter(item => dateKey(item.finishedAt) === key).reduce((total, item) => total + item.elapsedSeconds, 0)
    return { key, seconds, label: new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date), shortLabel: days <= 7 ? `周${'日一二三四五六'[date.getDay()]}` : `${date.getMonth() + 1}/${date.getDate()}` }
  })
})
const trendMax = computed(() => Math.max(...trendDays.value.map(item => item.seconds), 1))
const trendTitle = computed(() => selectedRange.value.id === '7d' ? '这一周的投入节奏' : selectedRange.value.id === 'all' ? '最近 30 天的投入节奏' : `${selectedRange.value.label}投入变化`)
const rhythmActionSummary = computed(() => {
  const definitions = [
    { action: 'completed', label: '完成 / 自然离席', matches: item => ['completed', 'natural-break'].includes(item.action) },
    { action: 'snoozed', label: '延后', matches: item => item.action === 'snoozed' },
    { action: 'skipped', label: '跳过 / 关闭', matches: item => ['skipped-today', 'dismissed'].includes(item.action) }
  ]
  return definitions.map(item => {
    const count = rhythmEntries.value.filter(item.matches).length
    return { ...item, count, percent: rhythmEntries.value.length ? Math.round(count / rhythmEntries.value.length * 100) : 0 }
  })
})
const recentRecords = computed(() => [
  ...focusHistory.value.map(item => ({ kind: 'focus', item, at: item.finishedAt })),
  ...rhythmHistory.value.map(item => ({ kind: 'rhythm', item, at: item.resolvedAt }))
].filter(record => recentKind.value === 'all' || record.kind === recentKind.value).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8))
const filteredFocusRecords = computed(() => focusHistory.value.filter(item => {
  if (focusResult.value === 'completed' && item.result !== 'completed') return false
  if (focusResult.value === 'unfinished' && item.result === 'completed') return false
  if (focusPhase.value === 'focus' && item.phase !== 'focus') return false
  if (focusPhase.value === 'break' && item.phase === 'focus') return false
  if (focusPause.value === 'paused' && !focusPauseCount(item)) return false
  if (focusPause.value === 'unpaused' && focusPauseCount(item)) return false
  const query = focusSearch.value.toLocaleLowerCase('zh-CN')
  return !query || [focusTitle(item), profileName(item.profileId), item.note || ''].some(value => value.toLocaleLowerCase('zh-CN').includes(query))
}).sort((a, b) => {
  if (focusSort.value === 'oldest') return new Date(a.finishedAt) - new Date(b.finishedAt)
  if (focusSort.value === 'longest') return b.elapsedSeconds - a.elapsedSeconds
  return new Date(b.finishedAt) - new Date(a.finishedAt)
}))
const filteredRhythmRecords = computed(() => rhythmHistory.value.filter(item => {
  if (rhythmAction.value === 'completed' && !['completed', 'natural-break'].includes(item.action)) return false
  if (rhythmAction.value === 'snoozed' && item.action !== 'snoozed') return false
  if (rhythmAction.value === 'skipped' && !['skipped-today', 'dismissed'].includes(item.action)) return false
  if (rhythmTrigger.value !== 'all' && item.triggerType !== rhythmTrigger.value) return false
  return !rhythmSearch.value || item.reminderTitle.toLocaleLowerCase('zh-CN').includes(rhythmSearch.value.toLocaleLowerCase('zh-CN'))
}).sort((a, b) => {
  if (rhythmSort.value === 'oldest') return new Date(a.resolvedAt) - new Date(b.resolvedAt)
  if (rhythmSort.value === 'slowest') return b.responseSeconds - a.responseSeconds
  return new Date(b.resolvedAt) - new Date(a.resolvedAt)
}))
const filteredFocusSeconds = computed(() => filteredFocusRecords.value.reduce((total, item) => total + item.elapsedSeconds, 0))
const filteredFocusCompletionRate = computed(() => filteredFocusRecords.value.length ? Math.round(filteredFocusRecords.value.filter(item => item.result === 'completed').length / filteredFocusRecords.value.length * 100) : 0)
const filteredFocusPauseCount = computed(() => filteredFocusRecords.value.reduce((total, item) => total + focusPauseCount(item), 0))
const filteredFocusPausedSeconds = computed(() => filteredFocusRecords.value.reduce((total, item) => total + focusPausedSeconds(item), 0))
const filteredRhythmCompletionRate = computed(() => filteredRhythmRecords.value.length ? Math.round(filteredRhythmRecords.value.filter(item => ['completed', 'natural-break'].includes(item.action)).length / filteredRhythmRecords.value.length * 100) : 0)
const filteredRhythmResponseAverage = computed(() => filteredRhythmRecords.value.length ? filteredRhythmRecords.value.reduce((total, item) => total + item.responseSeconds, 0) / filteredRhythmRecords.value.length : 0)
const filteredRhythmSnoozeCount = computed(() => filteredRhythmRecords.value.filter(item => item.action === 'snoozed').length)
const focusFilterCount = computed(() => [focusSearch.value, focusResult.value !== 'all', focusPhase.value !== 'all', focusPause.value !== 'all', focusSort.value !== 'newest'].filter(Boolean).length)
const rhythmFilterCount = computed(() => [rhythmSearch.value, rhythmAction.value !== 'all', rhythmTrigger.value !== 'all', rhythmSort.value !== 'newest'].filter(Boolean).length)
const focusPageCount = computed(() => Math.max(1, Math.ceil(filteredFocusRecords.value.length / focusPageSize.value)))
const rhythmPageCount = computed(() => Math.max(1, Math.ceil(filteredRhythmRecords.value.length / rhythmPageSize.value)))
const focusPageStart = computed(() => (focusPage.value - 1) * focusPageSize.value + 1)
const rhythmPageStart = computed(() => (rhythmPage.value - 1) * rhythmPageSize.value + 1)
const focusPageEnd = computed(() => Math.min(focusPage.value * focusPageSize.value, filteredFocusRecords.value.length))
const rhythmPageEnd = computed(() => Math.min(rhythmPage.value * rhythmPageSize.value, filteredRhythmRecords.value.length))
const pagedFocusRecords = computed(() => filteredFocusRecords.value.slice(focusPageStart.value - 1, focusPageEnd.value))
const pagedRhythmRecords = computed(() => filteredRhythmRecords.value.slice(rhythmPageStart.value - 1, rhythmPageEnd.value))

watch([range, focusSearch, focusResult, focusPhase, focusPause, focusSort, focusPageSize], () => { focusPage.value = 1 })
watch([range, rhythmSearch, rhythmAction, rhythmTrigger, rhythmSort, rhythmPageSize], () => { rhythmPage.value = 1 })
watch(focusPageCount, count => { focusPage.value = Math.min(focusPage.value, count) })
watch(rhythmPageCount, count => { rhythmPage.value = Math.min(rhythmPage.value, count) })

function dateKey(value) { const date = value instanceof Date ? value : new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function focusTitle(item) { return item.taskTitle || store.activeTasks.find(task => task.id === item.taskId)?.title || phaseLabel(item.phase) }
function profileName(profileId) { return store.focusProfiles.find(item => item.id === profileId)?.name || '专注' }
function phaseLabel(phase) { return phase === 'long-break' ? '长休息' : phase === 'short-break' ? '短休息' : '未关联任务的专注' }
function resultLabel(result) { return result === 'completed' ? '已完成' : result === 'abandoned' ? '已放弃' : '被中断' }
function rhythmActionLabel(action) { return ({ completed: '已完成', snoozed: '已延后', 'skipped-today': '今天跳过', dismissed: '稍后处理', 'natural-break': '自然离席' }[action] || '已处理') }
function triggerTypeLabel(type) { return ({ interval: '间隔提醒', 'fixed-time': '固定时刻', 'active-duration': '连续活跃' }[type] || '节律提醒') }
function formatDuration(seconds) { const value = Math.max(0, Math.round(Number(seconds) || 0)); const minutes = Math.round(value / 60); if (value > 0 && value < 60) return `${value} 秒`; return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ''}` : `${minutes} 分钟` }
function formatCompactDuration(seconds) { const minutes = Math.round((Number(seconds) || 0) / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分` : ''}` : `${minutes}分` }
function formatShortDate(value) { return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(value)) }
function formatFullDateTime(value) { return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value)) }
function formatClock(value) { return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function formatTimeRange(start, end) { return `${formatClock(start)}–${formatClock(end)}` }
function formatResponseTime(seconds) { const value = Math.max(0, Number(seconds) || 0); return value < 60 ? `${Math.round(value)} 秒` : `${Math.round(value / 60)} 分钟` }
function formatCount(value) { return new Intl.NumberFormat('zh-CN').format(Number(value) || 0) }
function focusPauseCount(item) { return (item.timeline || []).filter(event => event.type === 'paused').length }
function focusPausedSeconds(item) { return (item.timeline || []).reduce((total, event) => total + (['resumed', 'finished'].includes(event.type) ? Number(event.pausedSeconds) || 0 : 0), 0) }
function focusWallSeconds(item) { return Math.max(0, Math.round((new Date(item.finishedAt).getTime() - new Date(item.startedAt).getTime()) / 1000)) }
function focusEventLabel(event) { return ({ started: '开始计时', paused: '暂停', resumed: '继续计时', 'duration-adjusted': '调整时长', 'task-changed': '更换关联任务', finished: '结束并记录' }[event.type] || '状态变化') }
function focusEventDescription(event) {
  if (event.type === 'resumed' && event.pausedSeconds) return `本次暂停 ${formatDuration(event.pausedSeconds)}`
  if (event.type === 'duration-adjusted') return `${event.deltaSeconds >= 0 ? '增加' : '减少'} ${formatDuration(Math.abs(event.deltaSeconds))}，目标调整为 ${formatDuration(event.durationSeconds)}`
  if (event.type === 'task-changed') return event.taskId ? '已切换关联任务' : '已解除任务关联'
  if (event.type === 'finished') return `${resultLabel(event.result)}${event.pausedSeconds ? ` · 结束前暂停 ${formatDuration(event.pausedSeconds)}` : ''}`
  return ''
}
function recordTitle(record) { return record.kind === 'focus' ? focusTitle(record.item) : record.item.reminderTitle }
async function selectTab(tabId) {
  workspaceRef.value?.scrollTo({ top: 0, behavior: 'auto' })
  activeTab.value = tabId
  await nextTick()
  workspaceRef.value?.scrollTo({ top: 0, behavior: 'auto' })
}
function openDetail(kind, item) { detail.value = { kind, item } }
function closeDetail() { detail.value = null }
function resetFocusFilters() { focusSearch.value = ''; focusResult.value = 'all'; focusPhase.value = 'all'; focusPause.value = 'all'; focusSort.value = 'newest' }
function resetRhythmFilters() { rhythmSearch.value = ''; rhythmAction.value = 'all'; rhythmTrigger.value = 'all'; rhythmSort.value = 'newest' }
function deleteFocusRecord(item) {
  if (!window.confirm(`删除“${focusTitle(item)}”这条专注记录吗？此操作无法撤销。`)) return
  store.deleteFocusHistory(item.id)
  if (detail.value?.kind === 'focus' && detail.value.item.id === item.id) closeDetail()
}
function deleteRhythmRecord(item) {
  if (!window.confirm(`删除“${item.reminderTitle}”这条节律记录吗？此操作无法撤销。`)) return
  store.deleteRhythmHistory(item.id)
  if (detail.value?.kind === 'rhythm' && detail.value.item.id === item.id) closeDetail()
}
function deleteRecord(record) {
  if (record.kind === 'focus') deleteFocusRecord(record.item)
  else deleteRhythmRecord(record.item)
}
function deleteDetail() {
  if (!detail.value || !window.confirm('删除这条记录吗？此操作无法撤销。')) return
  if (detail.value.kind === 'focus') store.deleteFocusHistory(detail.value.item.id)
  else store.deleteRhythmHistory(detail.value.item.id)
  closeDetail()
}
function handleKeydown(event) { if (event.key === 'Escape' && detail.value) closeDetail() }

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.review-workspace { align-content: start; justify-items: stretch; overflow: auto; padding: clamp(18px, 2.6vw, 34px); background: radial-gradient(circle at 80% 0, var(--accent-soft), transparent 32%), var(--surface-muted); }
.review-shell { width: min(100%, 1120px); margin: 0 auto; }
.review-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 4px 2px 18px; }
.review-header .eyebrow { margin: 0 0 5px; color: var(--accent-strong); font-size: 11px; font-weight: 750; letter-spacing: .08em; }
.review-header h1 { margin: 0; color: var(--text); font-size: clamp(26px, 3vw, 34px); letter-spacing: -.045em; line-height: 1.18; }
.review-header > div > p:last-child { margin: 8px 0 0; color: var(--text-muted); font-size: 13px; }
.review-range { display: inline-flex; flex: 0 0 auto; gap: 2px; padding: 3px; border: 1px solid var(--divider-soft); border-radius: 11px; background: var(--surface-muted); }
.review-range button { min-height: 34px; padding: 0 11px; border-radius: 8px; color: var(--text-muted); font-size: 12px; font-weight: 650; }
.review-range button:hover { color: var(--text); }
.review-range button.active { background: var(--surface); box-shadow: 0 2px 7px var(--text-7-fallback); color: var(--accent-strong); }
.review-tabs { display: flex; gap: 5px; margin-bottom: 13px; padding: 5px; border: 1px solid var(--divider-soft); border-radius: 14px; background-color: var(--surface); }
.review-tabs button { display: inline-flex; min-height: 42px; align-items: center; gap: 7px; padding: 0 13px; border-radius: 10px; color: var(--text-muted); font-size: 12px; font-weight: 680; }
.review-tabs button:hover { color: var(--text); background: var(--surface-muted); }
.review-tabs button.active { color: var(--accent-strong); background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent-20-border-fallback); }
.review-tabs button span { min-width: 18px; padding: 2px 5px; border-radius: 999px; background: var(--surface); color: var(--text-muted); font-size: 9px; text-align: center; }
.review-tabs button:focus-visible, .review-range button:focus-visible, .review-record-list button:focus-visible, .review-detail button:focus-visible { outline: 3px solid var(--accent-20-border-fallback); outline-offset: 2px; }
.review-summary > header p { margin: 0; color: var(--text-muted); font-size: 10px; }
.review-metrics { display: grid; grid-template-columns: 1.25fr repeat(3, minmax(150px, .75fr)); gap: 1px; margin-top: 14px; overflow: hidden; border: 1px solid var(--divider-soft); border-radius: 13px; background: var(--divider-soft); }
.review-metric, .review-card { border: 1px solid var(--divider-soft); border-radius: 18px; background: var(--surface); box-shadow: 0 10px 26px var(--text-4-fallback); }
.review-metric { display: grid; min-height: 92px; align-content: center; gap: 4px; padding: 14px 16px; border: 0; border-radius: 0; box-shadow: none; }
.review-metric > span, .review-metric small { color: var(--text-muted); font-size: 11px; }
.review-metric > strong { color: var(--text); font-size: 25px; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
.review-metric small { line-height: 1.45; }
.review-metric--primary { background: linear-gradient(145deg, var(--accent-tint), var(--surface)); }
.review-metric--primary > strong { font-size: clamp(25px, 2.5vw, 32px); }
.review-metric--rhythm { background: linear-gradient(145deg, var(--surface), color-mix(in srgb, var(--surface) 90%, #e8f1fb)); }
.review-overview-grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(300px, .75fr); gap: 12px; margin-top: 12px; }
.review-card { min-width: 0; padding: 18px; }
.review-card > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.review-card > header > div { display: grid; gap: 4px; }
.review-card > header span { color: var(--accent-strong); font-size: 10px; font-weight: 730; letter-spacing: .06em; }
.review-card > header h2 { margin: 0; color: var(--text); font-size: 16px; letter-spacing: -.02em; }
.review-card > header > strong { color: var(--text); font-size: 14px; font-variant-numeric: tabular-nums; }
.review-card > header > small { color: var(--text-muted); font-size: 11px; }
.review-chart { display: grid; height: 180px; align-items: end; gap: 5px; margin-top: 14px; padding-top: 10px; border-bottom: 1px solid var(--divider-soft); }
.review-chart > div { display: grid; min-width: 0; height: 100%; grid-template-rows: 18px 1fr 20px; align-items: end; gap: 4px; }
.review-chart span, .review-chart small { overflow: hidden; color: var(--text-muted); font-size: 9px; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.review-chart > div > i { display: flex; height: 100%; align-items: end; overflow: hidden; border-radius: 5px 5px 2px 2px; background: color-mix(in srgb, var(--accent-soft) 58%, var(--surface-muted)); }
.review-chart b { display: block; width: 100%; min-height: 2px; border-radius: inherit; background: linear-gradient(180deg, var(--accent), var(--accent-strong)); transition: height .25s ease; }
.review-rhythm-card > header svg { color: #5d89b0; }
.review-rhythm-actions { display: grid; gap: 18px; margin-top: 23px; }
.review-rhythm-actions > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 10px; }
.review-rhythm-actions span { display: flex; align-items: center; gap: 7px; color: var(--text); font-size: 12px; letter-spacing: 0; }
.review-rhythm-actions span > i { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.review-rhythm-actions span > i.is-snoozed { background: #d69c42; }
.review-rhythm-actions span > i.is-skipped { background: #89918f; }
.review-rhythm-actions strong { color: var(--text); font-size: 12px; }
.review-rhythm-actions b { grid-column: 1 / -1; height: 6px; overflow: hidden; border-radius: 999px; background: var(--surface-muted); }
.review-rhythm-actions b i { display: block; height: 100%; border-radius: inherit; background: #6a9bc3; }
.review-recent { margin-top: 12px; }
.review-recent__header { align-items: center !important; }
.review-recent__header > div:first-child { gap: 3px; }
.review-recent__header p { margin: 0; color: var(--text-muted); font-size: 10px; }
.review-recent-switch { display: flex !important; gap: 3px !important; padding: 3px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface-muted); }
.review-recent-switch button { min-height: 32px; padding: 0 10px; border-radius: 7px; color: var(--text-muted); font-size: 10px; font-weight: 680; }
.review-recent-switch button:hover { color: var(--text); }
.review-recent-switch button.active { background: var(--surface); color: var(--accent-strong); box-shadow: 0 2px 6px var(--text-7-fallback); }
.review-recent-list { overflow: hidden; margin-top: 14px; border: 1px solid var(--divider-soft); border-radius: 13px; }
.review-recent-row { display: grid; min-height: 66px; grid-template-columns: minmax(250px, 1fr) 148px 105px 80px; align-items: center; padding: 0 10px; border-bottom: 1px solid var(--divider-soft); transition: background var(--transition-fast); }
.review-recent-row:last-child { border-bottom: 0; }
.review-recent-row:hover { background: var(--surface-muted); }
.review-recent__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 12px; color: var(--text-muted); font-size: 10px; }
.review-recent__footer > div { display: flex; gap: 5px; }
.review-recent__footer button { display: inline-flex; min-height: 36px; align-items: center; gap: 4px; padding: 0 10px; border-radius: 8px; color: var(--accent-strong); font-size: 10px; font-weight: 680; }
.review-recent__footer button:hover { background: var(--accent-soft); }
.review-card__empty { margin: 0; padding: 34px 16px; color: var(--text-muted); font-size: 12px; line-height: 1.6; text-align: center; }
.review-records > header { align-items: end; }
.review-records > header p { margin: 1px 0 0; color: var(--text-muted); font-size: 11px; }
.review-card > header > .review-management-title { display: flex; min-width: 0; align-items: center; gap: 14px; }
.review-management-title > button { display: inline-flex; min-height: 40px; flex: 0 0 auto; align-items: center; gap: 6px; padding: 0 12px; border-right: 1px solid var(--divider-soft); color: var(--accent-strong); font-size: 11px; font-weight: 700; }
.review-management-title > button:hover { border-radius: 9px; background: var(--accent-soft); }
.review-management-title > div { display: grid; min-width: 0; gap: 3px; }
.review-filter-panel { margin: 16px 0 12px; padding: 10px; border: 1px solid var(--divider-soft); border-radius: 13px; background: var(--surface-muted); }
.review-filter-panel > header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 2px 8px; }
.review-filter-panel > header > span { display: inline-flex; align-items: center; gap: 6px; color: var(--text); font-size: 11px; font-weight: 700; }
.review-filter-panel > header > span svg { color: var(--accent-strong); }
.review-filter-panel > header > small { color: var(--text-muted); font-size: 10px; }
.review-filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; }
.review-filters label { display: flex; min-width: 180px; flex: 1; height: 36px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--divider-soft); border-radius: 8px; background: var(--surface); color: var(--text-muted); }
.review-filters input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); font: inherit; font-size: 12px; }
.review-filters select { min-width: 125px; height: 36px; padding: 0 8px; border: 1px solid var(--divider-soft); border-radius: 8px; outline: none; background: var(--surface); color: var(--text); font: inherit; font-size: 11px; }
.review-filters label:focus-within, .review-filters select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.review-filter-reset { display: inline-flex; min-height: 36px; align-items: center; gap: 5px; padding: 0 10px; border-radius: 8px; color: var(--accent-strong); font-size: 11px; font-weight: 680; }
.review-filter-reset:hover { background: var(--accent-soft); }
.review-filter-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
.review-filter-summary > div { display: grid; gap: 4px; padding: 11px 12px; border: 1px solid var(--divider-soft); border-radius: 11px; background: var(--surface); }
.review-filter-summary span { color: var(--text-muted); font-size: 10px; }
.review-filter-summary strong { overflow: hidden; color: var(--text); font-size: 13px; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
.review-record-list { display: grid; gap: 5px; margin-top: 12px; }
.review-record-list button { display: grid; width: 100%; min-height: 58px; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 11px; padding: 8px 10px; border: 1px solid transparent; border-radius: 11px; color: var(--text-muted); text-align: left; transition: border-color var(--transition-fast), background var(--transition-fast); }
.review-record-list button:hover { border-color: var(--divider-soft); background: var(--surface-muted); }
.review-record-table { overflow: hidden; border: 1px solid var(--divider-soft); border-radius: 13px; }
.review-record-table__head, .review-record-row { display: grid; grid-template-columns: minmax(250px, 1fr) 148px 105px 80px; align-items: center; }
.review-record-table__head { min-height: 34px; padding: 0 10px; border-bottom: 1px solid var(--divider-soft); background: var(--surface-muted); color: var(--text-muted); font-size: 10px; font-weight: 680; }
.review-record-table__head span:nth-child(n + 2) { text-align: right; }
.review-record-row { min-height: 66px; padding: 0 10px; border-bottom: 1px solid var(--divider-soft); transition: background var(--transition-fast); }
.review-record-row:last-child { border-bottom: 0; }
.review-record-row:hover { background: var(--surface-muted); }
.review-record-open { display: grid; min-width: 0; min-height: 64px; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 10px; padding-right: 10px; text-align: left; }
.review-record-icon { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; }
.review-record-icon.is-focus { background: var(--accent-soft); color: var(--accent-strong); }
.review-record-icon.is-rhythm { background: #eaf2f8; color: #4f7fa6; }
.review-record-icon .focus-reward-badge img { width: 28px; height: 28px; }
.review-record-main { display: grid; min-width: 0; gap: 3px; }
.review-record-main strong { overflow: hidden; color: var(--text); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.review-record-main small { overflow: hidden; color: var(--text-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.review-record-time, .review-record-meta { display: grid; min-width: 0; justify-items: end; gap: 3px; font-variant-numeric: tabular-nums; }
.review-record-time strong { color: var(--text); font-size: 11px; }
.review-record-time small { color: var(--text-muted); font-size: 10px; }
.review-record-meta strong { color: var(--text); font-size: 12px; }
.review-record-meta small { color: var(--text-muted); font-size: 10px; }
.review-record-actions { display: flex; justify-content: flex-end; gap: 3px; }
.review-record-actions button { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 8px; color: var(--text-muted); }
.review-record-actions button:hover { background: var(--surface); color: var(--accent-strong); box-shadow: inset 0 0 0 1px var(--divider-soft); }
.review-record-actions button.is-danger:hover { color: var(--danger); }
.review-pagination { display: flex; min-height: 48px; align-items: center; justify-content: flex-end; gap: 14px; margin-top: 10px; color: var(--text-muted); font-size: 10px; }
.review-pagination label { display: inline-flex; align-items: center; gap: 5px; }
.review-pagination select { height: 30px; border: 1px solid var(--divider-soft); border-radius: 7px; background: var(--surface); color: var(--text); font: inherit; }
.review-pagination > div { display: flex; align-items: center; gap: 6px; }
.review-pagination button { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid var(--divider-soft); border-radius: 8px; color: var(--text); }
.review-pagination button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent-strong); }
.review-pagination button:disabled { cursor: default; opacity: .38; }
.review-pagination strong { min-width: 52px; color: var(--text); font-size: 11px; text-align: center; font-variant-numeric: tabular-nums; }
.review-empty { display: grid; width: min(100%, 520px); justify-items: center; margin: 66px auto; padding: 42px 28px; border: 1px dashed var(--accent-34-fallback); border-radius: 20px; background: color-mix(in srgb, var(--surface) 85%, var(--accent-soft)); text-align: center; }
.review-empty > span { display: grid; width: 52px; height: 52px; place-items: center; border-radius: 16px; background: var(--surface); color: var(--accent); box-shadow: 0 8px 20px var(--text-7-fallback); }
.review-empty strong { margin-top: 15px; color: var(--text); font-size: 17px; }
.review-empty p { max-width: 350px; margin: 8px 0 18px; color: var(--text-muted); font-size: 13px; line-height: 1.65; }
.review-empty button { display: inline-flex; min-height: 40px; align-items: center; gap: 6px; padding: 0 14px; border-radius: 10px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 680; }
.review-detail-backdrop { position: fixed; z-index: var(--z-sheet); inset: 0; display: flex; justify-content: flex-end; background: rgba(9, 18, 16, .48); }
.review-detail { display: flex; width: min(520px, calc(100vw - 24px)); height: 100%; flex-direction: column; overflow: auto; border-left: 1px solid var(--border); background-color: var(--surface, #fff); box-shadow: -24px 0 64px rgba(8, 24, 20, .28); isolation: isolate; opacity: 1; }
.review-detail > header { position: sticky; z-index: 2; top: 0; display: flex; min-height: 92px; align-items: center; justify-content: space-between; gap: 16px; padding: 17px 20px; border-bottom: 1px solid var(--divider-soft); background: var(--surface); }
.review-detail-heading { display: flex; min-width: 0; align-items: center; gap: 12px; }
.review-detail-heading__icon { display: grid; width: 44px; height: 44px; flex: 0 0 auto; place-items: center; border-radius: 13px; }
.review-detail-heading__icon.is-focus { background: var(--accent-soft); color: var(--accent-strong); }
.review-detail-heading__icon.is-rhythm { background: #eaf2f8; color: #4f7fa6; }
.review-detail-heading > div { display: grid; min-width: 0; gap: 2px; }
.review-detail-heading > div > span { color: var(--accent-strong); font-size: 10px; font-weight: 730; }
.review-detail > header h2 { margin: 0; color: var(--text); font-size: 19px; letter-spacing: -.025em; }
.review-detail-heading p { margin: 0; color: var(--text-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.review-detail > header button { display: grid; width: 44px; height: 44px; flex: 0 0 auto; place-items: center; border-radius: 11px; color: var(--text-muted); }
.review-detail > header button:hover { background: var(--surface-muted); color: var(--text); }
.review-detail-hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 18px; margin: 18px 20px 10px; padding: 18px; border: 1px solid var(--divider-soft); border-radius: 16px; }
.review-detail-hero.is-focus { background: linear-gradient(145deg, var(--accent-tint), var(--surface)); }
.review-detail-hero.is-rhythm { background: linear-gradient(145deg, #f2f7fb, var(--surface)); }
.review-detail-hero__value { display: grid; min-width: 0; gap: 3px; }
.review-detail-hero__value > span { color: var(--text-muted); font-size: 10px; }
.review-detail-hero__value > strong { overflow: hidden; color: var(--text); font-size: 28px; letter-spacing: -.045em; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.review-detail-hero__value > small { color: var(--accent-strong); font-size: 11px; font-weight: 680; }
.review-detail-hero__window { display: flex; align-items: center; gap: 10px; color: var(--text-muted); }
.review-detail-hero__window > div { display: grid; min-width: 62px; gap: 2px; }
.review-detail-hero__window > div:last-child { justify-items: end; }
.review-detail-hero__window span, .review-detail-hero__window small { color: var(--text-muted); font-size: 9px; }
.review-detail-hero__window strong { color: var(--text); font-size: 15px; font-variant-numeric: tabular-nums; }
.review-detail-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 0 20px 18px; }
.review-detail-summary > div { display: grid; gap: 5px; padding: 12px; border: 1px solid var(--divider-soft); border-radius: 12px; background-color: var(--surface-muted, #f8faf9); }
.review-detail-summary span { color: var(--text-muted); font-size: 10px; }
.review-detail-summary strong { color: var(--text); font-size: 12px; line-height: 1.45; font-variant-numeric: tabular-nums; }
.review-detail-section { padding: 4px 20px 20px; }
.review-detail-section > header { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; color: var(--accent-strong); }
.review-detail-section h3 { margin: 0; color: var(--text); font-size: 13px; }
.review-detail-section__count { margin-left: auto; padding: 3px 7px; border-radius: 999px; background: var(--surface-muted); color: var(--text-muted); font-size: 9px; font-weight: 680; }
.review-timeline { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.review-timeline li { position: relative; display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 10px; min-height: 64px; padding-bottom: 12px; }
.review-timeline li:not(:last-child)::before { position: absolute; top: 13px; bottom: -2px; left: 5px; width: 1px; background: var(--divider-soft); content: ''; }
.review-timeline li > i { position: relative; z-index: 1; width: 11px; height: 11px; margin-top: 4px; border: 2px solid var(--surface); border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.review-timeline li > i.is-paused { background: #d69c42; box-shadow: 0 0 0 1px #d69c42; }
.review-timeline li > i.is-duration-adjusted, .review-timeline li > i.is-task-changed { background: #6b91b4; box-shadow: 0 0 0 1px #6b91b4; }
.review-timeline li > i.is-finished { background: #677b75; box-shadow: 0 0 0 1px #677b75; }
.review-timeline li > div { display: grid; gap: 2px; }
.review-timeline strong { color: var(--text); font-size: 12px; }
.review-timeline span, .review-timeline small { color: var(--text-muted); font-size: 10px; line-height: 1.45; }
.review-detail-legacy { display: flex; align-items: flex-start; gap: 10px; padding: 13px; border: 1px solid #e7d9bd; border-radius: 12px; background: #fff9ee; color: #8a6a31; }
.review-detail-legacy svg { flex: 0 0 auto; }
.review-detail-legacy p { display: grid; gap: 3px; margin: 0; }
.review-detail-legacy strong { font-size: 12px; }
.review-detail-legacy span { font-size: 11px; line-height: 1.55; }
.review-detail-note { margin: 0; padding: 13px; border-radius: 11px; background: var(--surface-muted); color: var(--text); font-size: 12px; line-height: 1.65; }
.review-detail-fields { display: grid; margin: 0; }
.review-detail-fields > div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--divider-soft); }
.review-detail-fields dt { color: var(--text-muted); font-size: 11px; }
.review-detail-fields dd { margin: 0; color: var(--text); font-size: 11px; text-align: right; }
.review-detail > footer { position: sticky; z-index: 2; bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding: 14px 20px; border-top: 1px solid var(--divider-soft); background-color: var(--surface, #fff); box-shadow: 0 -8px 20px var(--text-4-fallback); }
.review-detail > footer button { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 6px; padding: 0 13px; border-radius: 10px; font-size: 12px; font-weight: 680; }
.review-detail-delete { color: #ad5555; }
.review-detail-delete:hover { background: #fff0ef; }
.review-detail-close { min-width: 86px; background: var(--accent); color: #fff; }
.review-detail-close:hover { background: var(--accent-strong); }
@media (max-width: 900px) { .review-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }.review-overview-grid { grid-template-columns: 1fr; }.review-record-table, .review-recent-list { overflow-x: auto; }.review-record-table__head, .review-record-row, .review-recent-row { min-width: 720px; } }
@media (max-width: 680px) { .review-workspace { padding: 14px; }.review-header { display: grid; gap: 14px; }.review-range, .review-tabs { overflow-x: auto; }.review-tabs button { white-space: nowrap; }.review-metrics { grid-template-columns: 1fr 1fr; }.review-metric { min-height: 88px; padding: 12px; }.review-recent__header { display: grid !important; }.review-recent-switch { width: 100%; }.review-recent-switch button { flex: 1; }.review-recent__footer { display: grid; }.review-recent__footer > div { display: grid; grid-template-columns: 1fr 1fr; }.review-card > header > .review-management-title { display: grid; }.review-management-title > button { width: max-content; border-right: 0; }.review-filter-panel > header { align-items: flex-start; }.review-filters { display: grid; grid-template-columns: 1fr; }.review-filters select { width: 100%; }.review-filter-summary { grid-template-columns: 1fr 1fr; }.review-pagination { flex-wrap: wrap; justify-content: space-between; }.review-detail-hero { grid-template-columns: 1fr; }.review-detail-hero__window { justify-content: space-between; }.review-detail-summary { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .review-chart b { transition: none; } }
</style>
