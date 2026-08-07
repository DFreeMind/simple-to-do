<template>
  <main ref="workspaceRef" class="clock-workspace review-workspace">
    <div class="review-shell">
      <header v-if="activeTab === 'overview'" class="review-header">
        <div>
          <p class="eyebrow">专注与节律回顾</p>
          <h1>看见投入，也看见恢复</h1>
          <p>专注记录推进，节律记录你如何停下来。点击任意记录可查看完整详情。</p>
        </div>
        <div class="review-range-block">
          <ReviewRangeControl
            :range="range"
            :custom-start="customStart"
            :custom-end="customEnd"
            @update:range="range = $event"
            @update:custom-start="customStart = $event"
            @update:custom-end="customEnd = $event"
          />
        </div>
      </header>

      <nav class="review-tabs" aria-label="回顾内容">
        <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" :aria-current="activeTab === tab.id ? 'page' : undefined" @click="selectTab(tab.id)">
          <component :is="tab.icon" :size="17" />
          {{ tab.label }}
          <span>{{ tab.count }}</span>
        </button>
      </nav>

      <section v-if="!store.focusHistory.length && !store.rhythmHistory.length" class="review-empty review-empty--zero">
        <span><History :size="25" /></span>
        <strong>还没有可回顾的记录</strong>
        <p>完成一段专注或处理一次节律提醒后，这里会保存真实发生的过程。</p>
        <button type="button" @click="store.setClockView('focus')"><Play :size="15" fill="currentColor" />开始专注</button>
      </section>

      <section v-else-if="activeTab === 'overview' && !focusEntries.length && !rhythmEntries.length" class="review-empty review-empty--empty-range">
        <span><Calendar :size="25" /></span>
        <strong>{{ selectedRangeLabel }} 还没有记录</strong>
        <p>试试切换到"全部"或更宽的时间范围，或者开始一段新的专注。</p>
        <div class="review-empty__actions">
          <button type="button" @click="range = 'all'">查看全部历史</button>
          <button type="button" class="review-empty__primary" @click="store.setClockView('focus')"><Play :size="14" fill="currentColor" />开始专注</button>
        </div>
      </section>

      <template v-else-if="activeTab === 'overview'">
        <section v-if="insights.length" class="review-insights" aria-label="本周期亮点">
          <header>
            <Lightbulb :size="15" />
            <span>本期亮点</span>
            <small>基于当前{{ selectedRangeLabel }}的数据自动生成</small>
          </header>
          <div class="review-insights__list">
            <div v-for="(item, idx) in insights" :key="idx" :class="['review-insight', `is-${item.type}`]">
              <span class="review-insight__icon"><component :is="item.icon" :size="16" /></span>
              <div>
                <strong>{{ item.text }}</strong>
                <small v-if="item.detail">{{ item.detail }}</small>
              </div>
            </div>
          </div>
        </section>

        <section class="review-card review-summary" aria-label="本周期概览">
          <header><div><span>数据摘要</span><h2>{{ selectedRangeLabel }}的专注与节律</h2><p>下面的趋势和最近记录使用同一时间范围</p></div><div class="review-summary-actions"><small>{{ focusEntries.length + rhythmEntries.length }} 条记录</small><button type="button" class="review-export-btn" title="导出当前范围为 Markdown 报告" @click="exportFocusReport"><Download :size="14" />导出报告</button></div></header>
          <div class="review-metrics">
            <article class="review-metric review-metric--primary">
              <span class="review-metric__label"><Timer :size="13" />有效专注</span>
              <strong :aria-label="`${selectedRangeLabel}累计有效专注 ${formatDuration(totalFocusSeconds)}`">{{ formatDuration(totalFocusSeconds) }}</strong>
              <small>{{ focusEntries.length }} 段 · {{ focusActiveDays }} 天有投入</small>
              <span v-if="previousRangeStart && focusSecondsDelta" :class="['review-metric__delta', focusSecondsDelta > 0 ? 'is-up' : 'is-down']" :title="`与上一周期对比（${previousRangeStart.days} 天）`">
                {{ focusSecondsDelta > 0 ? '↑' : focusSecondsDelta < 0 ? '↓' : '持平' }}{{ Math.abs(focusSecondsDelta) }}%
              </span>
            </article>
            <article class="review-metric">
              <span class="review-metric__label"><BarChart3 :size="13" />专注完成率</span>
              <strong>{{ focusCompletionRate }}%</strong>
              <small>{{ completedFocusEntries.length }} 段自然完成</small>
              <span v-if="previousRangeStart && completionRateDelta" :class="['review-metric__delta', completionRateDelta > 0 ? 'is-up' : 'is-down']" :title="`与上一周期对比`">
                {{ completionRateDelta > 0 ? '↑' : completionRateDelta < 0 ? '↓' : '持平' }}{{ Math.abs(completionRateDelta) }}pp
              </span>
            </article>
            <article class="review-metric">
              <span class="review-metric__label"><Activity :size="13" />暂停</span>
              <strong>{{ totalPauseCount }} 次</strong>
              <small>累计 {{ formatDuration(totalPausedSeconds) }}</small>
            </article>
            <article class="review-metric review-metric--rhythm">
              <span class="review-metric__label"><BellRing :size="13" />节律响应</span>
              <strong>{{ rhythmEntries.length }} 次</strong>
              <small>{{ rhythmCompletionRate }}% 完成或自然离席</small>
            </article>
          </div>
        </section>

        <section class="review-overview-grid">
          <article class="review-card">
            <header>
              <div><span>专注趋势</span><h2>{{ trendTitle }}</h2></div>
              <div class="review-chart-meta">
                <strong>{{ formatCompactDuration(totalFocusSeconds) }}</strong>
                <small v-if="trendAverage" :title="`只统计有投入的天数（共 ${trendDays.filter(d => d.seconds > 0).length} 天）`">日均 {{ formatCompactDuration(trendAverage) }}</small>
              </div>
            </header>
            <p v-if="trendTruncated" class="review-chart-note">记录超过 {{ TREND_HARD_CAP }} 天，仅显示最近 {{ trendDaysCount }} 天。试试缩短时间范围看完整曲线。</p>
            <div class="review-chart" :style="{ gridTemplateColumns: `repeat(${trendDays.length}, minmax(0, 1fr))` }">
              <div v-for="day in trendDays" :key="day.key" :class="{ 'is-today': day.isToday, 'is-empty': !day.seconds }" :title="`${day.label}：${formatDuration(day.seconds)}${day.isToday ? '（今日）' : ''}`">
                <span>{{ day.seconds ? formatCompactDuration(day.seconds) : '' }}</span>
                <i>
                  <b v-if="day.seconds" :style="{ height: `${Math.max(8, day.seconds / trendMax * 100)}%` }"></b>
                  <b v-else class="review-chart__placeholder"></b>
                </i>
                <small>{{ day.shortLabel }}</small>
              </div>
            </div>
            <table class="sr-only" aria-label="每日专注时长明细">
              <caption>每日专注时长（最近 {{ trendDays.length }} 天）</caption>
              <thead><tr><th scope="col">日期</th><th scope="col">投入</th></tr></thead>
              <tbody>
                <tr v-for="day in trendDays" :key="day.key">
                  <th scope="row">{{ day.label }}{{ day.isToday ? '（今日）' : '' }}</th>
                  <td>{{ day.seconds ? formatDuration(day.seconds) : '无投入' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="trendAverage" class="review-chart-axis" aria-hidden="true">
              <span>0</span>
              <i :style="{ '--line': `${Math.min(100, trendAverage / trendMax * 100)}%` }">
                <b :title="`平均线 ${formatCompactDuration(trendAverage)}`">日均</b>
              </i>
              <span>{{ formatCompactDuration(trendMax) }}</span>
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
            <div v-if="rhythmEntries.length" class="review-rhythm-buckets">
              <div class="review-rhythm-bucket">
                <h4>响应速度</h4>
                <ul>
                  <li v-for="b in rhythmResponseBuckets" :key="b.id" :class="{ 'is-active': b.count > 0 }">
                    <span>{{ b.label }}</span>
                    <strong>{{ b.count }}</strong>
                    <i :style="{ width: `${b.percent}%` }" :title="`${b.percent}%`"></i>
                  </li>
                </ul>
              </div>
              <div class="review-rhythm-bucket">
                <h4>提醒时段</h4>
                <ul>
                  <li v-for="b in rhythmHourBuckets" :key="b.id" :class="{ 'is-active': b.count > 0 }">
                    <span>{{ b.label }}</span>
                    <strong>{{ b.count }}</strong>
                    <i :style="{ width: `${b.percent}%` }" :title="`${b.percent}%`"></i>
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </section>

        <section class="review-card review-recent">
          <header class="review-recent__header">
            <div><span>最近发生</span><h2>专注与节律时间线</h2><p>{{ selectedRangeLabel }}的数据，与上方统计使用相同时间范围</p></div>
            <div class="review-recent-switch" role="group" aria-label="筛选最近记录类型">
              <button v-for="option in recentKindOptions" :key="option.id" type="button" :class="{ active: recentKind === option.id }" @click="setRecentKind(option.id)">{{ option.label }}</button>
            </div>
          </header>
          <div v-if="recentVisibleRecords.length" class="review-recent-list">
            <article v-for="record in recentVisibleRecords" :key="`${record.kind}-${record.item.id}`" class="review-recent-row" :class="{ 'is-selected': isRecentSelected(record) }">
              <label class="review-record-check" @click.stop>
                <input type="checkbox" :checked="isRecentSelected(record)" :aria-label="`选择${recordTitle(record)}`" @change="toggleRecentSelect(record)" />
              </label>
              <button class="review-record-open" type="button" @click="openDetail(record.kind, record.item)">
                <span class="review-record-icon" :class="`is-${record.kind}`"><Timer v-if="record.kind === 'focus'" :size="17" /><BellRing v-else :size="17" /></span>
                <span class="review-record-main"><strong>{{ recordTitle(record) }}</strong><small>
                  <span v-if="record.kind === 'focus'" class="review-record-chip">{{ profileName(record.item.profileId, record.item) }}</span>
                  <span v-else class="review-record-chip">{{ triggerTypeLabel(record.item.triggerType) }}</span>
                  <span v-if="record.kind === 'focus' && record.item.timeline?.some(e => e.type === 'paused')" class="review-record-chip review-record-chip--quiet">含暂停</span>
                </small></span>
              </button>
              <span class="review-record-time">
                <strong>{{ formatShortDate(record.at) }}</strong>
                <small>{{ record.kind === 'focus' ? formatTimeRange(record.item.startedAt, record.item.finishedAt) : `${formatClock(record.item.triggeredAt)} → ${formatClock(record.item.resolvedAt)}` }}</small>
              </span>
              <span class="review-record-meta"><strong>{{ record.kind === 'focus' ? formatCompactDuration(record.item.elapsedSeconds) : rhythmActionLabel(record.item.action) }}</strong><small>{{ record.kind === 'focus' ? resultLabel(record.item.result) : `${formatResponseTime(record.item.responseSeconds)}响应` }}</small></span>
              <span class="review-record-actions">
                <button type="button" :aria-label="`查看${record.kind === 'focus' ? '专注' : '节律'}详情`" title="查看详情" @click="openDetail(record.kind, record.item)"><Eye :size="16" /><span class="sr-only">查看</span></button>
                <button class="is-danger" type="button" :aria-label="`删除${record.kind === 'focus' ? '专注' : '节律'}记录`" title="删除记录" @click="deleteRecord(record)"><Trash2 :size="16" /><span class="sr-only">删除</span></button>
              </span>
            </article>
          </div>
          <p v-else class="review-card__empty">当前范围没有{{ recentKind === 'focus' ? '专注' : recentKind === 'rhythm' ? '节律' : '' }}记录。试试切换"全部/仅专注/仅节律"。</p>
          <footer class="review-recent__footer">
            <div v-if="recentShownCount < recentRecords.length" class="review-recent__more">
              <button type="button" class="review-cta" @click="loadMoreRecent"><ChevronDown :size="14" /><span>显示更多（还有 {{ recentRecords.length - recentShownCount }} 条）</span></button>
            </div>
            <span v-else>共 {{ recentRecords.length }} 条</span>
            <div v-if="recentSelectionCount" class="review-recent__batch">
              <span>已选 {{ recentSelectionCount }} 条</span>
              <button type="button" @click="clearRecentSelection">取消选择</button>
              <button type="button" class="is-danger" @click="batchDeleteRecent"><Trash2 :size="14" />批量删除</button>
            </div>
            <div class="review-recent__actions">
              <button type="button" class="review-cta" @click="selectTab('focus')"><span>管理专注记录</span><ChevronRight :size="14" /></button>
              <button type="button" class="review-cta" @click="selectTab('rhythm')"><span>管理节律记录</span><ChevronRight :size="14" /></button>
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
          <div class="review-management-actions">
            <button type="button" class="review-export-btn" title="导出当前筛选结果为 CSV" @click="exportFocusCsv"><Download :size="14" />导出 CSV</button>
            <small>{{ formatCount(filteredFocusRecords.length) }} 条</small>
          </div>
        </header>
        <div class="review-filter-panel">
          <header>
            <span><SlidersHorizontal :size="15" />筛选与排序</span>
            <div class="review-filter-meta">
              <small>{{ focusFilterCount ? `已启用 ${focusFilterCount} 项条件` : '当前显示全部专注记录' }}</small>
            </div>
          </header>
          <div class="review-range-wrap">
            <ReviewRangeControl
              :range="range"
              :custom-start="customStart"
              :custom-end="customEnd"
              @update:range="range = $event"
              @update:custom-start="customStart = $event"
              @update:custom-end="customEnd = $event"
            />
          </div>
          <div class="review-filters">
            <label><Search :size="16" /><span class="sr-only">搜索专注记录</span><input v-model.trim="focusSearch" type="search" placeholder="搜索任务、方式或备注" /></label>
            <select v-model="focusResult" aria-label="筛选专注结果"><option value="all">全部结果</option><option value="completed">已完成</option><option value="unfinished">中断或放弃</option></select>
            <select v-model="focusPhase" aria-label="筛选专注类型"><option value="all">专注与休息</option><option value="focus">仅专注</option><option value="break">仅休息</option></select>
            <select v-model="focusPause" aria-label="筛选暂停情况"><option value="all">全部暂停情况</option><option value="paused">有暂停</option><option value="unpaused">无暂停</option></select>
            <select v-model="focusSort" aria-label="专注记录排序"><option value="newest">最新在前</option><option value="oldest">最早在前</option><option value="longest">时长从长到短</option></select>
            <button v-if="focusFilterCount" class="review-filter-reset" type="button" @click="resetFocusFilters"><RotateCcw :size="14" />重置筛选</button>
          </div>
        </div>
        <div v-if="!focusHistory.length" class="review-empty review-empty--inline">
          <span><Timer :size="22" /></span>
          <strong>{{ selectedRangeLabel }} 还没有专注记录</strong>
          <p>试试切换到"全部"或更宽的时间范围。</p>
          <button type="button" @click="range = 'all'">查看全部历史</button>
        </div>
        <div v-else-if="focusFilterCount && !filteredFocusRecords.length" class="review-empty review-empty--inline">
          <span><Search :size="22" /></span>
          <strong>没有匹配的专注记录</strong>
          <p>当前筛选条件下没有结果。可以重置筛选试试。</p>
          <button type="button" @click="resetFocusFilters"><RotateCcw :size="13" />重置筛选</button>
        </div>
        <div class="review-filter-summary" aria-label="当前筛选的专注统计">
          <div><span>匹配记录</span><strong>{{ formatCount(filteredFocusRecords.length) }} 条</strong></div>
          <div><span>有效时长</span><strong>{{ formatDuration(filteredFocusSeconds) }}</strong></div>
          <div><span>完成率</span><strong>{{ filteredFocusCompletionRate }}%</strong></div>
          <div><span>暂停情况</span><strong>{{ filteredFocusPauseCount }} 次 · {{ formatDuration(filteredFocusPausedSeconds) }}</strong></div>
        </div>
        <div v-if="focusSelectionCount" class="review-batch-bar" role="toolbar" aria-label="批量操作">
          <span>已选 <strong>{{ focusSelectionCount }}</strong> 条专注记录</span>
          <div>
            <button type="button" @click="clearFocusSelection">取消选择</button>
            <button type="button" class="is-danger" @click="batchDeleteFocus"><Trash2 :size="14" />批量删除</button>
          </div>
        </div>
        <div v-if="pagedFocusRecords.length" class="review-record-table">
          <div class="review-record-table__head" aria-hidden="true">
            <label class="review-record-check"><input type="checkbox" :checked="allFocusSelected" :indeterminate.prop="someFocusSelected" aria-label="全选当前筛选的专注记录" @change="toggleSelectAllFocus" /></label>
            <span>记录</span><span>起止时间</span><span>结果</span><span>操作</span>
          </div>
          <article v-for="item in pagedFocusRecords" :key="item.id" class="review-record-row" :class="{ 'is-selected': selectedFocusIds.has(item.id) }">
            <label class="review-record-check"><input type="checkbox" :checked="selectedFocusIds.has(item.id)" :aria-label="`选择${focusTitle(item)}`" @change="toggleFocusSelect(item.id)" /></label>
            <button class="review-record-open" type="button" @click="openDetail('focus', item)">
              <span class="review-record-icon is-focus"><FocusRewardBadge v-if="item.reward" :reward="item.reward" size="sm" /><Coffee v-else-if="item.phase !== 'focus'" :size="17" /><Timer v-else :size="17" /></span>
              <span class="review-record-main"><strong>{{ focusTitle(item) }}</strong><small>{{ profileName(item.profileId, item) }} · {{ focusPauseCount(item) ? `暂停 ${focusPauseCount(item)} 次` : '未暂停' }}</small></span>
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
          <div class="review-management-actions">
            <button type="button" class="review-export-btn" title="导出当前筛选结果为 CSV" @click="exportRhythmCsv"><Download :size="14" />导出 CSV</button>
            <small>{{ formatCount(filteredRhythmRecords.length) }} 条</small>
          </div>
        </header>
        <div class="review-filter-panel">
          <header>
            <span><SlidersHorizontal :size="15" />筛选与排序</span>
            <div class="review-filter-meta">
              <small>{{ rhythmFilterCount ? `已启用 ${rhythmFilterCount} 项条件` : '当前显示全部节律记录' }}</small>
            </div>
          </header>
          <div class="review-range-wrap">
            <ReviewRangeControl
              :range="range"
              :custom-start="customStart"
              :custom-end="customEnd"
              @update:range="range = $event"
              @update:custom-start="customStart = $event"
              @update:custom-end="customEnd = $event"
            />
          </div>
          <div class="review-filters">
            <label><Search :size="16" /><span class="sr-only">搜索节律记录</span><input v-model.trim="rhythmSearch" type="search" placeholder="搜索提醒名称" /></label>
            <select v-model="rhythmAction" aria-label="筛选节律处理结果"><option value="all">全部结果</option><option value="completed">已完成</option><option value="snoozed">已延后</option><option value="skipped">跳过或关闭</option></select>
            <select v-model="rhythmTrigger" aria-label="筛选节律触发方式"><option value="all">全部触发方式</option><option value="interval">间隔提醒</option><option value="fixed-time">固定时刻</option><option value="active-duration">连续活跃</option></select>
            <select v-model="rhythmSort" aria-label="节律记录排序"><option value="newest">最新在前</option><option value="oldest">最早在前</option><option value="slowest">响应最慢在前</option></select>
            <button v-if="rhythmFilterCount" class="review-filter-reset" type="button" @click="resetRhythmFilters"><RotateCcw :size="14" />重置</button>
          </div>
        </div>
        <div v-if="!rhythmHistory.length" class="review-empty review-empty--inline">
          <span><BellRing :size="22" /></span>
          <strong>{{ selectedRangeLabel }} 还没有节律记录</strong>
          <p>试试切换到"全部"或更宽的时间范围。新处理的完成、延后和跳过会显示在这里。</p>
          <button type="button" @click="range = 'all'">查看全部历史</button>
        </div>
        <div v-else-if="rhythmFilterCount && !filteredRhythmRecords.length" class="review-empty review-empty--inline">
          <span><Search :size="22" /></span>
          <strong>没有匹配的节律记录</strong>
          <p>当前筛选条件下没有结果。可以重置筛选试试。</p>
          <button type="button" @click="resetRhythmFilters"><RotateCcw :size="13" />重置筛选</button>
        </div>
        <div class="review-filter-summary" aria-label="当前筛选的节律统计">
          <div><span>匹配记录</span><strong>{{ formatCount(filteredRhythmRecords.length) }} 条</strong></div>
          <div><span>完成或离席</span><strong>{{ filteredRhythmCompletionRate }}%</strong></div>
          <div><span>平均响应</span><strong>{{ formatResponseTime(filteredRhythmResponseAverage) }}</strong></div>
          <div><span>延后次数</span><strong>{{ filteredRhythmSnoozeCount }} 次</strong></div>
        </div>
        <div v-if="rhythmSelectionCount" class="review-batch-bar" role="toolbar" aria-label="批量操作">
          <span>已选 <strong>{{ rhythmSelectionCount }}</strong> 条节律记录</span>
          <div>
            <button type="button" @click="clearRhythmSelection">取消选择</button>
            <button type="button" class="is-danger" @click="batchDeleteRhythm"><Trash2 :size="14" />批量删除</button>
          </div>
        </div>
        <div v-if="pagedRhythmRecords.length" class="review-record-table">
          <div class="review-record-table__head" aria-hidden="true">
            <label class="review-record-check"><input type="checkbox" :checked="allRhythmSelected" :indeterminate.prop="someRhythmSelected" aria-label="全选当前筛选的节律记录" @change="toggleSelectAllRhythm" /></label>
            <span>提醒</span><span>提醒与处理</span><span>结果</span><span>操作</span>
          </div>
          <article v-for="item in pagedRhythmRecords" :key="item.id" class="review-record-row" :class="{ 'is-selected': selectedRhythmIds.has(item.id) }">
            <label class="review-record-check"><input type="checkbox" :checked="selectedRhythmIds.has(item.id)" :aria-label="`选择${item.reminderTitle}`" @change="toggleRhythmSelect(item.id)" /></label>
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
      <Transition name="review-detail-fade">
      <div v-if="detail" class="review-detail-backdrop" @click.self="closeDetail">
        <aside ref="detailRef" class="review-detail" role="dialog" aria-modal="true" :aria-labelledby="detail.kind === 'focus' ? 'focus-detail-title' : 'rhythm-detail-title'">
          <header class="review-detail-header">
            <div class="review-detail-heading">
              <span class="review-detail-heading__icon" :class="`is-${detail.kind}`"><Timer v-if="detail.kind === 'focus'" :size="19" /><BellRing v-else :size="19" /></span>
              <div>
                <span>{{ detail.kind === 'focus' ? '专注记录详情' : '节律记录详情' }}</span>
                <h2 :id="detail.kind === 'focus' ? 'focus-detail-title' : 'rhythm-detail-title'">{{ detail.kind === 'focus' ? focusTitle(detail.item) : detail.item.reminderTitle }}</h2>
                <p>{{ detail.kind === 'focus' ? `${formatShortDate(detail.item.finishedAt)} · ${formatTimeRange(detail.item.startedAt, detail.item.finishedAt)}` : `${formatShortDate(detail.item.triggeredAt)} · ${formatClock(detail.item.triggeredAt)} → ${formatClock(detail.item.resolvedAt)}` }}</p>
              </div>
            </div>
            <div class="review-detail-header__actions">
              <button v-if="hasPrevDetail || hasNextDetail" type="button" class="review-detail-nav" :disabled="!hasPrevDetail" aria-label="上一条" title="上一条（↑）" @click="goPrevDetail"><ChevronUp :size="16" /></button>
              <button v-if="hasPrevDetail || hasNextDetail" type="button" class="review-detail-nav" :disabled="!hasNextDetail" aria-label="下一条" title="下一条（↓）" @click="goNextDetail"><ChevronDown :size="16" /></button>
              <button type="button" aria-label="关闭详情" title="关闭（Esc）" @click="closeDetail"><X :size="19" /></button>
            </div>
          </header>

          <template v-if="detail.kind === 'focus'">
            <section class="review-detail-hero is-focus">
              <div class="review-detail-hero__value"><span>本次有效时长</span><strong>{{ formatDuration(detail.item.elapsedSeconds) }}</strong><small>{{ resultLabel(detail.item.result) }} · {{ profileName(detail.item.profileId, detail.item) }}</small></div>
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
                <div><dt>专注方式</dt><dd>{{ profileName(detail.item.profileId, detail.item) }}</dd></div>
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
            <section class="review-detail-section">
              <header>
                <FileText :size="16" />
                <h3>结束备注</h3>
                <button v-if="!editingNote" type="button" class="review-detail-edit" @click="startEditNote"><Pencil :size="13" />{{ detail.item.note ? '编辑' : '添加' }}</button>
                <button v-else type="button" class="review-detail-edit" @click="cancelEditNote"><X :size="13" />取消</button>
              </header>
              <div v-if="!editingNote">
                <p v-if="detail.item.note" class="review-detail-note">{{ detail.item.note }}</p>
                <p v-else class="review-detail-note review-detail-note--empty">还没有备注。点击右上角"添加"可以补充当时的想法或上下文。</p>
              </div>
              <div v-else class="review-detail-note-edit">
                <textarea
                  ref="noteTextareaRef"
                  v-model="noteDraft"
                  rows="4"
                  maxlength="2000"
                  :placeholder="'记录这次专注的背景、心得或待改进...'"
                  @keydown.meta.enter="saveEditNote"
                  @keydown.ctrl.enter="saveEditNote"
                  @keydown.esc="cancelEditNote"
                ></textarea>
                <div class="review-detail-note-edit__actions">
                  <small>{{ noteDraft.length }} / 2000</small>
                  <div>
                    <button type="button" @click="cancelEditNote">取消</button>
                    <button type="button" class="review-detail-note-save" :disabled="!noteDraft.trim()" @click="saveEditNote">保存</button>
                  </div>
                </div>
              </div>
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
              <header><Activity :size="16" /><h3>响应过程</h3><span class="review-detail-section__count">{{ rhythmTimeline(detail.item).length }} 个节点</span></header>
              <ol class="review-timeline">
                <li v-for="(event, index) in rhythmTimeline(detail.item)" :key="`${event.type}-${event.at}-${index}`">
                  <i :class="`is-${event.type}`"></i>
                  <div>
                    <strong>{{ rhythmEventLabel(event) }}</strong>
                    <span>{{ formatFullDateTime(event.at) }}</span>
                    <small v-if="rhythmEventDescription(event)">{{ rhythmEventDescription(event) }}</small>
                  </div>
                </li>
              </ol>
            </section>
          </template>

          <footer>
            <button type="button" class="review-detail-delete" @click="deleteDetail"><Trash2 :size="15" />删除这条记录</button>
            <button type="button" class="review-detail-close" @click="closeDetail">完成</button>
          </footer>
        </aside>
      </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :details="confirmDialog.details"
      :type="confirmDialog.type"
      :confirm-text="confirmDialog.confirmText"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.visible = false"
    />
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Activity, ArrowLeft, ArrowRight, BarChart3, BellRing, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, Coffee, Download, Eye, FileText, History, Lightbulb, Pencil, Play, RotateCcw, Search, SlidersHorizontal, Sparkles, Timer, Trash2, TrendingDown, TrendingUp, X } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { saveTextFile } from '@/services/platform'
import FocusRewardBadge from './FocusRewardBadge.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import ReviewRangeControl from './ReviewRangeControl.vue'
import {
  formatDuration,
  formatCompactDuration,
  formatShortDate,
  formatFullDateTime,
  formatClock,
  formatTimeRange,
  formatResponseTime,
  formatCount
} from '@/utils/reviewFormatters'

const store = useTaskStore()
const workspaceRef = ref(null)
const detailRef = ref(null)

// 筛选状态：尝试从 localStorage 恢复上次选择。仅持久化稳定的偏好类状态（不含临时分页）
const REVIEW_PREFS_KEY = 'simple-todo.review-prefs.v1'
const DEFAULT_REVIEW_PREFS = {
  range: '7d',
  activeTab: 'overview',
  recentKind: 'all',
  focusResult: 'all',
  focusPhase: 'all',
  focusPause: 'all',
  focusSort: 'newest',
  rhythmAction: 'all',
  rhythmTrigger: 'all',
  rhythmSort: 'newest',
  focusPageSize: 25,
  rhythmPageSize: 25,
  customStart: '',
  customEnd: ''
}
function loadReviewPrefs() {
  if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_REVIEW_PREFS }
  try {
    const raw = window.localStorage.getItem(REVIEW_PREFS_KEY)
    if (!raw) return { ...DEFAULT_REVIEW_PREFS }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_REVIEW_PREFS }
    // 严格只读取白名单字段，避免意外恢复已下线字段
    const next = { ...DEFAULT_REVIEW_PREFS }
    for (const k of Object.keys(DEFAULT_REVIEW_PREFS)) {
      if (k in parsed) next[k] = parsed[k]
    }
    return next
  } catch (error) {
    console.warn('[FocusHistoryWorkspace] 读取 review 偏好失败:', error)
    return { ...DEFAULT_REVIEW_PREFS }
  }
}
const reviewPrefs = loadReviewPrefs()

const range = ref(reviewPrefs.range)
const activeTab = ref(reviewPrefs.activeTab)
const recentKind = ref(reviewPrefs.recentKind)
const focusSearch = ref('')
const focusResult = ref(reviewPrefs.focusResult)
const focusPhase = ref(reviewPrefs.focusPhase)
const focusPause = ref(reviewPrefs.focusPause)
const focusSort = ref(reviewPrefs.focusSort)
const rhythmSearch = ref('')
const rhythmAction = ref(reviewPrefs.rhythmAction)
const rhythmTrigger = ref(reviewPrefs.rhythmTrigger)
const rhythmSort = ref(reviewPrefs.rhythmSort)
const focusPage = ref(1)
const rhythmPage = ref(1)
const focusPageSize = ref(reviewPrefs.focusPageSize)
const rhythmPageSize = ref(reviewPrefs.rhythmPageSize)
// 自定义日期范围（YYYY-MM-DD），默认近 7 天到今日
function isoToday() { return dateKey(new Date()) }
const customStart = ref(reviewPrefs.customStart || (() => { const d = new Date(); d.setDate(d.getDate() - 6); return dateKey(d) })())
const customEnd = ref(reviewPrefs.customEnd || isoToday())
const detail = ref(null)
const detailIndex = ref(-1) // 详情面板当前记录在筛选后列表中的位置，用于上下条导航
const noteDraft = ref('')
const editingNote = ref(false)
// 批量操作：基于筛选结果的多选状态（Set 便于增删与判断）
const selectedFocusIds = ref(new Set())
const selectedRhythmIds = ref(new Set())

// 持久化：仅当用户主动改变时才写，避免初始化时把默认覆盖
watch([range, activeTab, recentKind, focusResult, focusPhase, focusPause, focusSort, rhythmAction, rhythmTrigger, rhythmSort, focusPageSize, rhythmPageSize, customStart, customEnd], () => {
  if (typeof window === 'undefined' || !window.localStorage) return
  const next = {
    range: range.value,
    activeTab: activeTab.value,
    recentKind: recentKind.value,
    focusResult: focusResult.value,
    focusPhase: focusPhase.value,
    focusPause: focusPause.value,
    focusSort: focusSort.value,
    rhythmAction: rhythmAction.value,
    rhythmTrigger: rhythmTrigger.value,
    rhythmSort: rhythmSort.value,
    focusPageSize: focusPageSize.value,
    rhythmPageSize: rhythmPageSize.value,
    customStart: customStart.value,
    customEnd: customEnd.value
  }
  try {
    window.localStorage.setItem(REVIEW_PREFS_KEY, JSON.stringify(next))
  } catch (error) {
    // 配额超限等不影响功能
    console.warn('[FocusHistoryWorkspace] 持久化 review 偏好失败:', error)
  }
})
const noteTextareaRef = ref(null)
const pageSizes = [25, 50, 100]
// 范围选项：label 仍保留在 store/计算属性中用于展示，
// 但 UI 渲染已统一交给 ReviewRangeControl 组件。
// 仅保留 selectedRange 所需的 id/days/custom 字段。
const ranges = [
  { id: 'today', label: '今日', days: 1 },
  { id: 'yesterday', label: '昨日', days: 2 },
  { id: 'thisWeek', label: '本周', days: 7 },
  { id: 'thisMonth', label: '本月', days: 30 },
  { id: '7d', label: '近 7 天', days: 7 },
  { id: '30d', label: '近 30 天', days: 30 },
  { id: '90d', label: '近 90 天', days: 90 },
  { id: 'all', label: '全部', days: null },
  { id: 'custom', label: '自定义', days: null }
]
const recentKindOptions = [{ id: 'all', label: '全部' }, { id: 'focus', label: '仅专注' }, { id: 'rhythm', label: '仅节律' }]

// 替换 window.confirm 的弹窗状态
const confirmDialog = reactive({
  visible: false,
  title: '',
  message: '',
  details: [],
  type: 'danger',
  confirmText: '删除',
  onConfirm: () => {}
})

const selectedRange = computed(() => ranges.find(item => item.id === range.value) || ranges[0])
const selectedRangeLabel = computed(() => {
  if (selectedRange.value.id !== 'custom') return selectedRange.value.label
  if (!customStart.value && !customEnd.value) return '自定义'
  if (!customStart.value) return `${customEnd.value} 之前`
  if (!customEnd.value) return `${customStart.value} 之后`
  return `${customStart.value} 至 ${customEnd.value}`
})
const rangeStart = computed(() => {
  // 自定义范围：以用户选择的开始日期零点为起点
  if (selectedRange.value.id === 'custom') {
    return customStart.value ? new Date(`${customStart.value}T00:00:00`) : null
  }
  if (!selectedRange.value.days) return null
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  // today/yesterday/thisWeek/thisMonth 各按语义起点计算，与"近 N 天"的滚动窗口不同
  const id = selectedRange.value.id
  if (id === 'today') return date
  if (id === 'yesterday') {
    const start = new Date(date)
    start.setDate(start.getDate() - 1)
    return start
  }
  if (id === 'thisWeek') {
    // 周日为一周开始；与国内日历习惯一致（i18n 后续可加设置项）
    const day = date.getDay()
    const start = new Date(date)
    start.setDate(start.getDate() - day)
    return start
  }
  if (id === 'thisMonth') {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }
  date.setDate(date.getDate() - selectedRange.value.days + 1)
  return date
})
// 自定义范围的上界（结束日期 24 点）；其他模式无上界
const rangeEnd = computed(() => {
  if (selectedRange.value.id !== 'custom' || !customEnd.value) return null
  return new Date(`${customEnd.value}T23:59:59.999`)
})
const focusHistory = computed(() => store.focusHistory.filter(item => {
  const t = new Date(item.finishedAt)
  if (rangeStart.value && t < rangeStart.value) return false
  if (rangeEnd.value && t > rangeEnd.value) return false
  return true
}))
const rhythmHistory = computed(() => store.rhythmHistory.filter(item => {
  const t = new Date(item.resolvedAt)
  if (rangeStart.value && t < rangeStart.value) return false
  if (rangeEnd.value && t > rangeEnd.value) return false
  return true
}))
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
// 趋势图：天数根据 range 决定。'all' 与自定义超长范围封顶 60 天，避免画布塞爆；超过封顶会显示提示
const TREND_HARD_CAP = 60
const trendDaysCount = computed(() => {
  if (selectedRange.value.id === 'custom') {
    if (!customStart.value || !customEnd.value) return 0
    const diff = Math.round((new Date(`${customEnd.value}T00:00:00`) - new Date(`${customStart.value}T00:00:00`)) / 86400000) + 1
    return Math.max(1, Math.min(TREND_HARD_CAP, diff))
  }
  if (selectedRange.value.days) return Math.min(TREND_HARD_CAP, selectedRange.value.days)
  return TREND_HARD_CAP
})
const trendDays = computed(() => {
  const days = trendDaysCount.value
  if (!days) return []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let start
  if (selectedRange.value.id === 'custom' && customStart.value) {
    start = new Date(`${customStart.value}T00:00:00`)
  } else {
    start = new Date(today)
    start.setDate(start.getDate() - days + 1)
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = dateKey(date)
    const seconds = focusEntries.value.filter(item => dateKey(item.finishedAt) === key).reduce((total, item) => total + item.elapsedSeconds, 0)
    return {
      key,
      seconds,
      date,
      isToday: key === dateKey(today),
      label: new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date),
      shortLabel: days <= 7 ? `周${'日一二三四五六'[date.getDay()]}` : `${date.getMonth() + 1}/${date.getDate()}`
    }
  })
})
const trendMax = computed(() => Math.max(...trendDays.value.map(item => item.seconds), 1))
const trendAverage = computed(() => {
  const activeDays = trendDays.value.filter(item => item.seconds > 0)
  if (!activeDays.length) return 0
  return Math.round(activeDays.reduce((t, i) => t + i.seconds, 0) / activeDays.length)
})
const trendTitle = computed(() => {
  const id = selectedRange.value.id
  if (id === 'custom') return `${selectedRangeLabel.value}的投入变化`
  if (id === 'all') return `最近 ${trendDaysCount.value} 天的投入节奏（更早数据未在图中显示）`
  if (id === '7d' || id === 'thisWeek') return '这一周的投入节奏'
  if (id === 'today') return '今天的投入分布'
  if (id === 'yesterday') return '昨日的投入分布'
  if (id === 'thisMonth') return '本月的投入节奏'
  return `${selectedRange.value.label}的投入变化`
})
// "全部"模式或自定义超长范围被截断时，给用户一个明确提示而不是默默显示最近 60 天
const trendTruncated = computed(() => {
  if (selectedRange.value.id === 'custom') {
    return customStart.value && customEnd.value
      ? (Math.round((new Date(`${customEnd.value}T00:00:00`) - new Date(`${customStart.value}T00:00:00`)) / 86400000) + 1) > TREND_HARD_CAP
      : false
  }
  return selectedRange.value.days === null && (store.focusHistory.length || 0) > TREND_HARD_CAP * 2
})
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

// 响应时间分桶：< 30s / 30s-2min / 2-5min / 5min+
const rhythmResponseBuckets = computed(() => {
  const buckets = [
    { id: 'fast', label: '30 秒内', min: 0, max: 30, count: 0 },
    { id: 'normal', label: '30 秒 – 2 分钟', min: 30, max: 120, count: 0 },
    { id: 'slow', label: '2 – 5 分钟', min: 120, max: 300, count: 0 },
    { id: 'verySlow', label: '5 分钟以上', min: 300, max: Infinity, count: 0 }
  ]
  rhythmEntries.value.forEach(item => {
    const s = Math.max(0, item.responseSeconds || 0)
    const target = buckets.find(b => s >= b.min && s < b.max) || buckets[buckets.length - 1]
    target.count += 1
  })
  const total = rhythmEntries.value.length
  return buckets.map(b => ({ ...b, percent: total ? Math.round(b.count / total * 100) : 0 }))
})

// 按时段分布（4 个时段：晨 6-12、午 12-18、晚 18-24、夜 0-6）
const rhythmHourBuckets = computed(() => {
  const buckets = [
    { id: 'morning', label: '晨间 6–12', range: [6, 12], count: 0 },
    { id: 'afternoon', label: '午后 12–18', range: [12, 18], count: 0 },
    { id: 'evening', label: '傍晚 18–24', range: [18, 24], count: 0 },
    { id: 'night', label: '深夜 0–6', range: [0, 6], count: 0 }
  ]
  rhythmEntries.value.forEach(item => {
    const hour = new Date(item.triggeredAt).getHours()
    const target = buckets.find(b => {
      const [from, to] = b.range
      if (from < to) return hour >= from && hour < to
      return hour >= from || hour < to
    })
    if (target) target.count += 1
  })
  const total = rhythmEntries.value.length
  return buckets.map(b => ({ ...b, percent: total ? Math.round(b.count / total * 100) : 0 }))
})

// 上一周期对比：用于"vs 上周期"指标
const previousRangeStart = computed(() => {
  if (!rangeStart.value) return null
  // 自定义范围：上一周期为"同样的天数往前推一段"
  if (selectedRange.value.id === 'custom' && customStart.value && customEnd.value) {
    const end = new Date(`${customEnd.value}T23:59:59.999`)
    const start = new Date(`${customStart.value}T00:00:00`)
    const days = Math.max(1, Math.round((end - start) / 86400000) + 1)
    const prevEnd = new Date(start)
    prevEnd.setDate(prevEnd.getDate() - 1)
    prevEnd.setHours(23, 59, 59, 999)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - days + 1)
    prevStart.setHours(0, 0, 0, 0)
    return { start: prevStart, end: prevEnd, days }
  }
  const start = rangeStart.value
  const end = new Date()
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1)
  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  prevEnd.setHours(23, 59, 59, 999)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - days + 1)
  prevStart.setHours(0, 0, 0, 0)
  return { start: prevStart, end: prevEnd, days }
})
const previousFocusEntries = computed(() => {
  if (!previousRangeStart.value) return []
  const { start, end } = previousRangeStart.value
  return store.focusHistory.filter(item => {
    if (item.phase !== 'focus') return false
    const t = new Date(item.finishedAt).getTime()
    return t >= start.getTime() && t <= end.getTime()
  })
})
const previousFocusSeconds = computed(() => previousFocusEntries.value.reduce((t, i) => t + i.elapsedSeconds, 0))
const focusSecondsDelta = computed(() => {
  if (!previousRangeStart.value) return 0
  if (previousFocusSeconds.value === 0) return totalFocusSeconds.value > 0 ? 100 : 0
  return Math.round((totalFocusSeconds.value - previousFocusSeconds.value) / previousFocusSeconds.value * 100)
})
const previousActiveDays = computed(() => new Set(previousFocusEntries.value.map(i => dateKey(i.finishedAt))).size)
const focusActiveDaysDelta = computed(() => {
  if (!previousRangeStart.value) return 0
  return focusActiveDays.value - previousActiveDays.value
})
const completionRateDelta = computed(() => {
  if (!previousRangeStart.value) return 0
  const prevRate = previousFocusEntries.value.length
    ? Math.round(previousFocusEntries.value.filter(i => i.result === 'completed').length / previousFocusEntries.value.length * 100)
    : 0
  return focusCompletionRate.value - prevRate
})

// 详情面板的"上下条"导航
const detailList = computed(() => {
  if (activeTab.value === 'focus') return filteredFocusRecords.value
  if (activeTab.value === 'rhythm') return filteredRhythmRecords.value
  return []
})
const hasPrevDetail = computed(() => detailList.value.length > 0 && detailIndex.value > 0)
const hasNextDetail = computed(() => detailList.value.length > 0 && detailIndex.value < detailList.value.length - 1)

// 洞察卡片：自动从数据中生成 1-3 条高亮信息
const insights = computed(() => {
  const result = []
  if (!focusEntries.value.length && !rhythmEntries.value.length) return result

  // 亮点 1：相比上周期的时间变化
  if (previousRangeStart.value && previousFocusSeconds.value > 0) {
    if (focusSecondsDelta.value >= 20) {
      result.push({
        type: 'positive',
        icon: TrendingUp,
        text: `比上周期多专注了 ${Math.abs(focusSecondsDelta.value)}%`,
        detail: `新增 ${formatCompactDuration(totalFocusSeconds.value - previousFocusSeconds.value)}`
      })
    } else if (focusSecondsDelta.value <= -20) {
      result.push({
        type: 'caution',
        icon: TrendingDown,
        text: `比上周期少了 ${Math.abs(focusSecondsDelta.value)}%`,
        detail: `少了 ${formatCompactDuration(previousFocusSeconds.value - totalFocusSeconds.value)}`
      })
    }
  }

  // 亮点 2：单次最长专注
  if (focusEntries.value.length) {
    const longest = focusEntries.value.reduce((max, item) => item.elapsedSeconds > max.elapsedSeconds ? item : max, focusEntries.value[0])
    if (longest.elapsedSeconds >= 25 * 60) {
      result.push({
        type: 'positive',
        icon: Sparkles,
        text: `最长一次专注 ${formatCompactDuration(longest.elapsedSeconds)}`,
        detail: focusTitle(longest)
      })
    }
  }

  // 亮点 3：完成率
  if (focusEntries.value.length >= 5) {
    if (focusCompletionRate.value >= 80) {
      result.push({
        type: 'positive',
        icon: Activity,
        text: `完成率 ${focusCompletionRate.value}%`,
        detail: '高于 80% 表示很稳定的投入节奏'
      })
    } else if (focusCompletionRate.value < 40) {
      result.push({
        type: 'caution',
        icon: Activity,
        text: `完成率仅 ${focusCompletionRate.value}%`,
        detail: '可考虑把专注目标设小一点'
      })
    }
  }

  // 亮点 4：节律响应
  if (rhythmEntries.value.length >= 3) {
    if (rhythmCompletionRate.value >= 80) {
      result.push({
        type: 'positive',
        icon: BellRing,
        text: `节律响应率 ${rhythmCompletionRate.value}%`,
        detail: `平均 ${formatResponseTime(rhythmEntries.value.reduce((t, i) => t + i.responseSeconds, 0) / rhythmEntries.value.length)} 处理`
      })
    }
  }

  return result.slice(0, 3)
})
const recentRecords = computed(() => [
  ...focusHistory.value.map(item => ({ kind: 'focus', item, at: item.finishedAt })),
  ...rhythmHistory.value.map(item => ({ kind: 'rhythm', item, at: item.resolvedAt }))
].filter(record => recentKind.value === 'all' || record.kind === recentKind.value).sort((a, b) => new Date(b.at) - new Date(a.at)))
// 概览默认显示前 8 条，提供"显示更多"展开剩余
const RECENT_PAGE_SIZE = 8
const recentShownCount = ref(RECENT_PAGE_SIZE)
const recentVisibleRecords = computed(() => recentRecords.value.slice(0, recentShownCount.value))
const recentSelectionCount = computed(() => {
  let n = 0
  selectedFocusIds.value.forEach(() => { n += 1 })
  selectedRhythmIds.value.forEach(() => { n += 1 })
  // 概览只显示当前可见的前 N 条，选中只在 visible 子集里计
  return recentVisibleRecords.value.reduce((total, record) => {
    const set = record.kind === 'focus' ? selectedFocusIds.value : selectedRhythmIds.value
    return total + (set.has(record.item.id) ? 1 : 0)
  }, 0)
})
function isRecentSelected(record) {
  const set = record.kind === 'focus' ? selectedFocusIds.value : selectedRhythmIds.value
  return set.has(record.item.id)
}
function toggleRecentSelect(record) {
  if (record.kind === 'focus') toggleFocusSelect(record.item.id)
  else toggleRhythmSelect(record.item.id)
}
function clearRecentSelection() {
  // 只清掉当前可见的选中，不影响管理 tab 里其他页的选中
  const visibleFocusIds = new Set(recentVisibleRecords.value.filter(r => r.kind === 'focus').map(r => r.item.id))
  const visibleRhythmIds = new Set(recentVisibleRecords.value.filter(r => r.kind === 'rhythm').map(r => r.item.id))
  const nextFocus = new Set(selectedFocusIds.value)
  visibleFocusIds.forEach(id => nextFocus.delete(id))
  selectedFocusIds.value = nextFocus
  const nextRhythm = new Set(selectedRhythmIds.value)
  visibleRhythmIds.forEach(id => nextRhythm.delete(id))
  selectedRhythmIds.value = nextRhythm
}
function loadMoreRecent() {
  recentShownCount.value = Math.min(recentRecords.value.length, recentShownCount.value + RECENT_PAGE_SIZE)
}
function setRecentKind(id) {
  recentKind.value = id
  // 切换类型时重置"显示更多"展开位置
  recentShownCount.value = RECENT_PAGE_SIZE
}
const filteredFocusRecords = computed(() => focusHistory.value.filter(item => {
  if (focusResult.value === 'completed' && item.result !== 'completed') return false
  if (focusResult.value === 'unfinished' && item.result === 'completed') return false
  if (focusPhase.value === 'focus' && item.phase !== 'focus') return false
  if (focusPhase.value === 'break' && item.phase === 'focus') return false
  if (focusPause.value === 'paused' && !focusPauseCount(item)) return false
  if (focusPause.value === 'unpaused' && focusPauseCount(item)) return false
  const query = focusSearch.value.toLocaleLowerCase('zh-CN')
  return !query || [focusTitle(item), profileName(item.profileId, item), item.note || ''].some(value => value.toLocaleLowerCase('zh-CN').includes(query))
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

// 批量选择：computed 状态（全选 / 部分选 / 数量）
const focusSelectionCount = computed(() => selectedFocusIds.value.size)
const rhythmSelectionCount = computed(() => selectedRhythmIds.value.size)
const allFocusSelected = computed(() => filteredFocusRecords.value.length > 0 && filteredFocusRecords.value.every(item => selectedFocusIds.value.has(item.id)))
const allRhythmSelected = computed(() => filteredRhythmRecords.value.length > 0 && filteredRhythmRecords.value.every(item => selectedRhythmIds.value.has(item.id)))
const someFocusSelected = computed(() => focusSelectionCount.value > 0 && !allFocusSelected.value)
const someRhythmSelected = computed(() => rhythmSelectionCount.value > 0 && !allRhythmSelected.value)

function toggleFocusSelect(id) {
  const next = new Set(selectedFocusIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedFocusIds.value = next
}
function toggleRhythmSelect(id) {
  const next = new Set(selectedRhythmIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedRhythmIds.value = next
}
function toggleSelectAllFocus() {
  selectedFocusIds.value = allFocusSelected.value ? new Set() : new Set(filteredFocusRecords.value.map(item => item.id))
}
function toggleSelectAllRhythm() {
  selectedRhythmIds.value = allRhythmSelected.value ? new Set() : new Set(filteredRhythmRecords.value.map(item => item.id))
}
function clearFocusSelection() { selectedFocusIds.value = new Set() }
function clearRhythmSelection() { selectedRhythmIds.value = new Set() }
// 筛选条件变化时清空选中（避免选中已不在筛选结果里的项）
watch([focusSearch, focusResult, focusPhase, focusPause, focusSort, range], clearFocusSelection)
watch([rhythmSearch, rhythmAction, rhythmTrigger, rhythmSort, range], clearRhythmSelection)
function batchDeleteFocus() {
  const ids = [...selectedFocusIds.value]
  if (!ids.length) return
  openConfirm({
    title: `删除 ${ids.length} 条专注记录`,
    message: `确认删除选中的 ${ids.length} 条专注记录吗？删除后可在 7 秒内撤销。`,
    details: [
      { label: '影响范围', value: `专注记录 × ${ids.length}` },
      { label: '花田统计', value: '会同步更新今日花成长与累计统计' }
    ],
    type: 'danger',
    confirmText: '批量删除',
    onConfirm: () => {
      store.batchDeleteFocusHistory(ids)
      clearFocusSelection()
    }
  })
}
function batchDeleteRhythm() {
  const ids = [...selectedRhythmIds.value]
  if (!ids.length) return
  openConfirm({
    title: `删除 ${ids.length} 条节律记录`,
    message: `确认删除选中的 ${ids.length} 条节律响应记录吗？删除后可在 7 秒内撤销。`,
    details: [{ label: '影响范围', value: `节律记录 × ${ids.length}` }],
    type: 'danger',
    confirmText: '批量删除',
    onConfirm: () => {
      store.batchDeleteRhythmHistory(ids)
      clearRhythmSelection()
    }
  })
}
// 概览"最近发生"的批量删除：只针对当前可见的选中条目
function batchDeleteRecent() {
  const focusIds = []
  const rhythmIds = []
  recentVisibleRecords.value.forEach(record => {
    const set = record.kind === 'focus' ? selectedFocusIds.value : selectedRhythmIds.value
    if (set.has(record.item.id)) {
      if (record.kind === 'focus') focusIds.push(record.item.id)
      else rhythmIds.push(record.item.id)
    }
  })
  if (!focusIds.length && !rhythmIds.length) return
  const total = focusIds.length + rhythmIds.length
  openConfirm({
    title: `删除 ${total} 条记录`,
    message: `确认删除"最近发生"中选中的 ${total} 条记录吗？删除后可在 7 秒内撤销。`,
    details: [
      { label: '影响范围', value: focusIds.length && rhythmIds.length ? `专注 ${focusIds.length} 条 + 节律 ${rhythmIds.length} 条` : `记录 × ${total}` }
    ],
    type: 'danger',
    confirmText: '批量删除',
    onConfirm: () => {
      if (focusIds.length) store.batchDeleteFocusHistory(focusIds)
      if (rhythmIds.length) store.batchDeleteRhythmHistory(rhythmIds)
      clearRecentSelection()
    }
  })
}

// 数据导出：把当前筛选结果导出为 CSV（带 BOM，Excel/WPS 打开中文不乱码）
function csvEscape(value) {
  return `"${String(value == null ? '' : value).replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`
}
async function exportFocusCsv() {
  const records = filteredFocusRecords.value
  if (!records.length) { store.showNotice('当前筛选条件下没有可导出的专注记录', 'info'); return }
  const header = ['结束时间', '任务', '专注方式', '阶段', '结果', '有效时长(秒)', '暂停次数', '备注']
  const lines = records.map(item => [
    item.finishedAt,
    focusTitle(item),
    profileName(item.profileId, item),
    item.phase === 'focus' ? '专注' : phaseLabel(item.phase),
    resultLabel(item.result),
    item.elapsedSeconds,
    focusPauseCount(item),
    item.note || ''
  ])
  const csv = '\ufeff' + [header, ...lines].map(row => row.map(csvEscape).join(',')).join('\r\n')
  try {
    await saveTextFile(`专注记录-${dateKey(new Date())}.csv`, csv, 'csv')
    store.showNotice(`已导出 ${records.length} 条专注记录`, 'success')
  } catch (error) {
    if (error !== '已取消保存') store.showNotice(`导出失败：${error}`, 'error')
  }
}
async function exportRhythmCsv() {
  const records = filteredRhythmRecords.value
  if (!records.length) { store.showNotice('当前筛选条件下没有可导出的节律记录', 'info'); return }
  const header = ['处理时间', '提醒', '触发方式', '触发规则', '处理动作', '响应时长(秒)', '延后(分钟)']
  const lines = records.map(item => [
    item.resolvedAt,
    item.reminderTitle,
    triggerTypeLabel(item.triggerType),
    item.triggerLabel || '',
    rhythmActionLabel(item.action),
    item.responseSeconds,
    item.snoozeMinutes || ''
  ])
  const csv = '\ufeff' + [header, ...lines].map(row => row.map(csvEscape).join(',')).join('\r\n')
  try {
    await saveTextFile(`节律记录-${dateKey(new Date())}.csv`, csv, 'csv')
    store.showNotice(`已导出 ${records.length} 条节律记录`, 'success')
  } catch (error) {
    if (error !== '已取消保存') store.showNotice(`导出失败：${error}`, 'error')
  }
}
// Markdown 周报：当前范围的数据摘要 + 洞察 + 最近记录，方便汇报 / 记录到笔记工具
async function exportFocusReport() {
  const lines = []
  lines.push(`# 专注回顾报告（${selectedRangeLabel}）`)
  lines.push('')
  lines.push(`> 生成时间：${formatFullDateTime(new Date())}`)
  lines.push('')
  lines.push('## 概览')
  lines.push('')
  lines.push(`- **有效专注**：${formatDuration(totalFocusSeconds)}（${focusEntries.length} 段 · ${focusActiveDays} 天有投入）`)
  lines.push(`- **完成率**：${focusCompletionRate}%（${completedFocusEntries.length} 段自然完成）`)
  lines.push(`- **暂停**：${totalPauseCount} 次，累计 ${formatDuration(totalPausedSeconds)}`)
  lines.push(`- **节律响应**：${rhythmEntries.length} 次，完成或自然离席 ${rhythmCompletionRate}%`)
  if (previousRangeStart.value && previousFocusSeconds.value > 0) {
    lines.push(`- **对比上周期**：${focusSecondsDelta.value >= 0 ? '↑' : '↓'}${Math.abs(focusSecondsDelta.value)}%`)
  }
  lines.push('')
  if (insights.value.length) {
    lines.push('## 本期亮点')
    lines.push('')
    insights.value.forEach(item => lines.push(`- **${item.text}**${item.detail ? `：${item.detail}` : ''}`))
    lines.push('')
  }
  if (recentRecords.value.length) {
    lines.push('## 最近记录')
    lines.push('')
    lines.push('| 时间 | 类型 | 内容 | 结果 |')
    lines.push('| --- | --- | --- | --- |')
    recentRecords.value.slice(0, 12).forEach(record => {
      const type = record.kind === 'focus' ? '专注' : '节律'
      const content = recordTitle(record)
      const result = record.kind === 'focus'
        ? `${formatCompactDuration(record.item.elapsedSeconds)} · ${resultLabel(record.item.result)}`
        : `${rhythmActionLabel(record.item.action)} · ${formatResponseTime(record.item.responseSeconds)}`
      lines.push(`| ${formatShortDate(record.at)} | ${type} | ${content.replace(/\|/g, '\\|')} | ${result} |`)
    })
    lines.push('')
  }
  lines.push('---')
  lines.push('由易简清单自动生成')
  const markdown = lines.join('\n')
  try {
    await saveTextFile(`专注回顾报告-${dateKey(new Date())}.md`, markdown, 'markdown')
    store.showNotice('报告已导出为 Markdown', 'success')
  } catch (error) {
    if (error !== '已取消保存') store.showNotice(`导出失败：${error}`, 'error')
  }
}

watch([range], () => { focusPage.value = 1; rhythmPage.value = 1; recentShownCount.value = RECENT_PAGE_SIZE })
watch([focusSearch, focusResult, focusPhase, focusPause, focusSort, focusPageSize], () => { focusPage.value = 1 })
watch([rhythmSearch, rhythmAction, rhythmTrigger, rhythmSort, rhythmPageSize], () => { rhythmPage.value = 1 })
watch(focusPageCount, count => { focusPage.value = Math.min(focusPage.value, count) })
watch(rhythmPageCount, count => { rhythmPage.value = Math.min(rhythmPage.value, count) })
// tab 切换由 selectTab 统一处理：scrollTo top + 关闭详情面板。
// 跨 tab 切到不同记录类型时，上下条导航列表会变化，索性关掉比"重新定位"更安全。

function dateKey(value) { const date = value instanceof Date ? value : new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function focusTitle(item) { return item.taskTitle || store.activeTasks.find(task => task.id === item.taskId)?.title || phaseLabel(item.phase) }
function profileName(profileId, item) {
  // 优先用历史记录里的快照名（专注方式被删后依然可读），再回退到当前配置
  if (item?.profileName) return item.profileName
  return store.focusProfiles.find(item => item.id === profileId)?.name || '专注'
}
function phaseLabel(phase) { return phase === 'long-break' ? '长休息' : phase === 'short-break' ? '短休息' : '未关联任务的专注' }
function resultLabel(result) { return result === 'completed' ? '已完成' : result === 'abandoned' ? '已放弃' : '被中断' }
function rhythmActionLabel(action) { return ({ completed: '已完成', snoozed: '已延后', 'skipped-today': '今天跳过', dismissed: '稍后处理', 'natural-break': '自然离席' }[action] || '已处理') }
function triggerTypeLabel(type) { return ({ interval: '间隔提醒', 'fixed-time': '固定时刻', 'active-duration': '连续活跃' }[type] || '节律提醒') }
function rhythmTimeline(item) {
  // 新记录有完整 timeline；老数据兜底为触发 + 处理两个节点
  if (Array.isArray(item.timeline) && item.timeline.length) return item.timeline
  return [
    { type: 'triggered', at: item.triggeredAt, snoozeMinutes: null, responseSeconds: 0 },
    { type: item.action === 'skipped-today' ? 'skipped' : item.action, at: item.resolvedAt, snoozeMinutes: null, responseSeconds: 0 }
  ]
}
function rhythmEventLabel(event) {
  return ({ triggered: '提醒到期', snoozed: '延后提醒', completed: '处理完成', skipped: '跳过提醒', dismissed: '稍后处理', 'natural-break': '自然离席' }[event.type] || '状态变化')
}
function rhythmEventDescription(event) {
  if (event.type === 'snoozed' && event.snoozeMinutes) return `延后 ${event.snoozeMinutes} 分钟`
  if (event.type === 'completed' && event.responseSeconds) return `${formatResponseTime(event.responseSeconds)} 后处理`
  return ''
}
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
function syncDetailIndex() {
  if (!detail.value) { detailIndex.value = -1; return }
  const list = detailList.value
  const idx = list.findIndex(i => i.id === detail.value.item.id)
  detailIndex.value = idx
}

async function selectTab(tabId) {
  if (activeTab.value === tabId) return
  activeTab.value = tabId
  // 单一入口的滚动复位，避免双重 scrollTo 造成视觉抖动
  await nextTick()
  workspaceRef.value?.scrollTo({ top: 0, behavior: 'auto' })
  detail.value = null
}
function openDetail(kind, item) {
  // 从概览页点开时，自动切到对应的管理 tab，让 prev/next 导航能在完整筛选列表里走
  if (activeTab.value === 'overview') activeTab.value = kind
  detail.value = { kind, item }
  editingNote.value = false
  noteDraft.value = ''
  syncDetailIndex()
  nextTick(() => focusFirstInDetail())
}
function closeDetail() { detail.value = null; detailIndex.value = -1 }
function goPrevDetail() {
  if (!hasPrevDetail.value) return
  detailIndex.value -= 1
  const prev = detailList.value[detailIndex.value]
  detail.value = { kind: activeTab.value, item: prev }
  nextTick(() => focusFirstInDetail())
}
function goNextDetail() {
  if (!hasNextDetail.value) return
  detailIndex.value += 1
  const next = detailList.value[detailIndex.value]
  detail.value = { kind: activeTab.value, item: next }
  nextTick(() => focusFirstInDetail())
}
function focusFirstInDetail() {
  // 简单 focus trap：把焦点移到详情面板的第一个可聚焦元素
  const root = detailRef.value
  if (!root) return
  const target = root.querySelector('button, [href], [tabindex]:not([tabindex="-1"])')
  if (target && typeof target.focus === 'function') target.focus()
}
function startEditNote() {
  noteDraft.value = detail.value?.item?.note || ''
  editingNote.value = true
  nextTick(() => noteTextareaRef.value?.focus())
}
function cancelEditNote() {
  editingNote.value = false
  noteDraft.value = ''
}
function saveEditNote() {
  if (!detail.value || detail.value.kind !== 'focus') return
  if (!noteDraft.value.trim()) return
  store.updateFocusNote(detail.value.item.id, noteDraft.value.trim())
  // detail.value.item 是 store 内的同一引用，应该会响应式更新
  editingNote.value = false
}
function resetFocusFilters() { focusSearch.value = ''; focusResult.value = 'all'; focusPhase.value = 'all'; focusPause.value = 'all'; focusSort.value = 'newest' }
function resetRhythmFilters() { rhythmSearch.value = ''; rhythmAction.value = 'all'; rhythmTrigger.value = 'all'; rhythmSort.value = 'newest' }

function openConfirm({ title, message, details, type, confirmText, onConfirm }) {
  confirmDialog.title = title
  confirmDialog.message = message
  confirmDialog.details = details || []
  confirmDialog.type = type || 'danger'
  confirmDialog.confirmText = confirmText || '删除'
  confirmDialog.onConfirm = () => {
    confirmDialog.visible = false
    onConfirm()
  }
  confirmDialog.visible = true
}

function deleteFocusRecord(item) {
  openConfirm({
    title: '删除专注记录',
    message: `确认删除"${focusTitle(item)}"这段专注记录吗？删除后可在 7 秒内撤销。`,
    details: [
      { label: '日期', value: formatShortDate(item.finishedAt) },
      { label: '时长', value: formatDuration(item.elapsedSeconds) },
      { label: '结果', value: resultLabel(item.result) }
    ],
    type: 'danger',
    confirmText: '删除',
    onConfirm: () => {
      store.deleteFocusHistory(item.id)
      if (detail.value?.kind === 'focus' && detail.value.item.id === item.id) closeDetail()
    }
  })
}
function deleteRhythmRecord(item) {
  openConfirm({
    title: '删除节律记录',
    message: `确认删除"${item.reminderTitle}"这条节律响应记录吗？删除后可在 7 秒内撤销。`,
    details: [
      { label: '提醒', value: formatShortDate(item.triggeredAt) },
      { label: '响应', value: formatResponseTime(item.responseSeconds) },
      { label: '处理', value: rhythmActionLabel(item.action) }
    ],
    type: 'danger',
    confirmText: '删除',
    onConfirm: () => {
      store.deleteRhythmHistory(item.id)
      if (detail.value?.kind === 'rhythm' && detail.value.item.id === item.id) closeDetail()
    }
  })
}
function deleteRecord(record) {
  if (record.kind === 'focus') deleteFocusRecord(record.item)
  else deleteRhythmRecord(record.item)
}
function deleteDetail() {
  if (!detail.value) return
  if (detail.value.kind === 'focus') deleteFocusRecord(detail.value.item)
  else deleteRhythmRecord(detail.value.item)
}

// 键盘快捷键：Alt+1/2/3 切 tab；详情面板 ↑/↓ 切上一条/下一条；Esc 关闭
function handleKeydown(event) {
  const tag = (event.target?.tagName || '').toLowerCase()
  const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'
  if (event.key === 'Escape' && detail.value) { closeDetail(); return }
  if (event.key === 'Escape' && confirmDialog.visible) { confirmDialog.visible = false; return }
  if (isInput) return
  if (event.altKey && !event.ctrlKey && !event.metaKey) {
    if (event.key === '1') { event.preventDefault(); selectTab('overview'); return }
    if (event.key === '2') { event.preventDefault(); selectTab('focus'); return }
    if (event.key === '3') { event.preventDefault(); selectTab('rhythm'); return }
  }
  if (detail.value) {
    if (event.key === 'ArrowUp' && hasPrevDetail.value) { event.preventDefault(); goPrevDetail(); return }
    if (event.key === 'ArrowDown' && hasNextDetail.value) { event.preventDefault(); goNextDetail(); return }
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.review-workspace {
  align-content: start;
  justify-items: stretch;
  overflow: auto;
  padding: clamp(18px, 2.6vw, 34px);
  background: radial-gradient(circle at 80% 0, var(--accent-soft), transparent 32%), var(--surface-muted);
  scrollbar-width: thin;
  scrollbar-color: var(--text-muted-26-fallback, rgba(104, 118, 116, 0.26)) transparent;
  scrollbar-gutter: stable;
}
.review-workspace::-webkit-scrollbar { width: 6px; height: 6px; }
.review-workspace::-webkit-scrollbar-track { background: transparent; }
.review-workspace::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: var(--text-muted-26-fallback, rgba(104, 118, 116, 0.26));
  background-clip: padding-box;
}
.review-workspace:hover::-webkit-scrollbar-thumb {
  background: var(--text-muted, #687674);
  background-clip: padding-box;
}
.review-shell { width: min(100%, 1120px); margin: 0 auto; }
.review-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 4px 2px 18px; }
.review-header .eyebrow { margin: 0 0 5px; color: var(--accent-strong); font-size: 11px; font-weight: 750; letter-spacing: .08em; }
.review-header h1 { margin: 0; color: var(--text); font-size: clamp(26px, 3vw, 34px); letter-spacing: -.045em; line-height: 1.18; }
.review-header > div > p:last-child { margin: 8px 0 0; color: var(--text-muted); font-size: 13px; }
.review-range-block { display: flex; justify-content: flex-end; }
.review-tabs { display: flex; gap: 5px; margin-bottom: 13px; padding: 5px; border: 1px solid var(--divider-soft); border-radius: 14px; background-color: var(--surface); }
.review-tabs button { display: inline-flex; min-height: 42px; align-items: center; gap: 7px; padding: 0 13px; border-radius: 10px; color: var(--text-muted); font-size: 12px; font-weight: 680; }
.review-tabs button:hover { color: var(--text); background: var(--surface-muted); }
.review-tabs button.active { color: var(--accent-strong); background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent-20-border-fallback); }
.review-tabs button span { min-width: 18px; padding: 2px 5px; border-radius: 999px; background: var(--surface); color: var(--text-muted); font-size: 9px; text-align: center; }
.review-tabs button:focus-visible, .review-record-list button:focus-visible, .review-detail button:focus-visible { outline: 3px solid var(--accent-20-border-fallback); outline-offset: 2px; }
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
.review-recent-row { display: grid; min-height: 66px; grid-template-columns: 24px minmax(250px, 1fr) 148px 105px 80px; align-items: center; padding: 0 10px; border-bottom: 1px solid var(--divider-soft); transition: background var(--transition-fast), box-shadow var(--transition-fast); position: relative; }
.review-recent-row:last-child { border-bottom: 0; }
.review-recent-row:hover { background: var(--surface-muted); }
.review-recent-row:hover .review-record-actions { opacity: 1; }
.review-recent-row.is-selected { background: color-mix(in srgb, var(--accent-soft) 55%, var(--surface)); box-shadow: inset 3px 0 0 var(--accent); }
.review-record-chip { display: inline-flex; align-items: center; margin-right: 4px; padding: 1px 6px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); font-size: 10px; font-weight: 600; }
.review-record-chip--quiet { background: var(--surface-muted); color: var(--text-muted); }
.review-record-actions { display: flex; justify-content: flex-end; gap: 3px; opacity: .55; transition: opacity var(--transition-fast); }
.review-recent__footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; padding-top: 12px; color: var(--text-muted); font-size: 10px; }
.review-recent__more { display: flex; }
.review-recent__more button { display: inline-flex; min-height: 32px; align-items: center; gap: 4px; padding: 0 12px; border-radius: 8px; color: var(--text-muted); font-size: 11px; font-weight: 650; }
.review-recent__more button:hover { background: var(--surface-muted); color: var(--accent-strong); }
.review-recent__batch { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid var(--accent-20-border-fallback); border-radius: 9px; background: color-mix(in srgb, var(--accent-soft) 60%, var(--surface)); color: var(--text); font-size: 11px; }
.review-recent__batch > span strong { color: var(--accent-strong); font-variant-numeric: tabular-nums; }
.review-recent__batch button { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 10px; border: 0; border-radius: 7px; background: var(--surface); color: var(--text-muted); font: inherit; font-size: 11px; font-weight: 650; cursor: pointer; }
.review-recent__batch button:hover { background: var(--surface-muted); color: var(--text); }
.review-recent__batch button.is-danger { background: #fff0ef; color: var(--danger); }
.review-recent__batch button.is-danger:hover { background: #ffe3e0; }
.review-recent__actions { display: flex; gap: 5px; margin-left: auto; }
.review-recent__actions button { display: inline-flex; min-height: 36px; align-items: center; gap: 4px; padding: 0 10px; border-radius: 8px; color: var(--accent-strong); font-size: 10px; font-weight: 680; }
.review-recent__actions button:hover { background: var(--accent-soft); }
.review-card__empty { margin: 0; padding: 34px 16px; color: var(--text-muted); font-size: 12px; line-height: 1.6; text-align: center; }
.review-records > header { align-items: end; }
.review-records > header p { margin: 1px 0 0; color: var(--text-muted); font-size: 11px; }
.review-card > header > .review-management-title { display: flex; min-width: 0; align-items: center; gap: 14px; }
.review-management-title > button { display: inline-flex; min-height: 40px; flex: 0 0 auto; align-items: center; gap: 6px; padding: 0 12px; border-right: 1px solid var(--divider-soft); color: var(--accent-strong); font-size: 11px; font-weight: 700; }
.review-management-title > button:hover { border-radius: 9px; background: var(--accent-soft); }
.review-management-title > div { display: grid; min-width: 0; gap: 3px; }
.review-management-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 10px; }
.review-management-actions small { color: var(--text-muted); font-size: 11px; white-space: nowrap; }
.review-summary-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 12px; }
.review-export-btn { display: inline-flex; min-height: 34px; align-items: center; gap: 5px; padding: 0 12px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface); color: var(--accent-strong); font: inherit; font-size: 11.5px; font-weight: 650; cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast); }
.review-export-btn:hover { border-color: var(--accent); background: var(--accent-soft); }
.review-filter-panel { margin: 14px 0 10px; padding: 10px; border: 1px solid var(--divider-soft); border-radius: 13px; background: var(--surface-muted); }
.review-filter-panel > header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 2px 8px; }
.review-filter-panel > header > span { display: inline-flex; align-items: center; gap: 6px; color: var(--text); font-size: 11px; font-weight: 700; }
.review-filter-panel > header > span svg { color: var(--accent-strong); }
.review-filter-panel > header > small { color: var(--text-muted); font-size: 10px; }
.review-filter-meta { display: flex; align-items: center; gap: 10px; }
.review-range-wrap { margin: 0 0 10px; }
.review-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0; padding: 0; }
.review-filters label { display: flex; width: 100%; max-width: 300px; height: 34px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--divider-soft); border-radius: 8px; background: var(--surface); color: var(--text-muted); }
.review-filters input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); font: inherit; font-size: 12px; }
.review-filters select { min-width: 112px; height: 34px; padding: 0 6px; border: 1px solid var(--divider-soft); border-radius: 8px; outline: none; background: var(--surface); color: var(--text); font: inherit; font-size: 11px; }
.review-filters label:focus-within, .review-filters select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.review-filter-reset { display: inline-flex; min-height: 34px; align-items: center; gap: 5px; padding: 0 10px; border-radius: 8px; color: var(--accent-strong); font-size: 11px; font-weight: 680; }
.review-filter-reset:hover { background: var(--accent-soft); }
.review-filter-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
.review-filter-summary > div { display: grid; gap: 4px; padding: 10px 12px; border: 1px solid var(--divider-soft); border-radius: 11px; background: var(--surface); }
.review-filter-summary span { color: var(--text-muted); font-size: 10px; }
.review-filter-summary strong { overflow: hidden; color: var(--text); font-size: 13px; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
.review-record-list { display: grid; gap: 5px; margin-top: 12px; }
.review-record-list button { display: grid; width: 100%; min-height: 58px; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 11px; padding: 8px 10px; border: 1px solid transparent; border-radius: 11px; color: var(--text-muted); text-align: left; transition: border-color var(--transition-fast), background var(--transition-fast); }
.review-record-list button:hover { border-color: var(--divider-soft); background: var(--surface-muted); }
.review-record-table { overflow: hidden; border: 1px solid var(--divider-soft); border-radius: 13px; }
.review-record-table__head, .review-record-row { display: grid; grid-template-columns: 28px minmax(200px, 1fr) 118px 96px 78px; align-items: center; }
.review-record-table__head { min-height: 34px; padding: 0 8px; border-bottom: 1px solid var(--divider-soft); background: var(--surface-muted); color: var(--text-muted); font-size: 10px; font-weight: 680; }
.review-record-table__head span:nth-child(n + 3) { text-align: right; }
.review-record-check { display: grid; place-items: center; }
.review-record-check input { width: 14px; height: 14px; accent-color: var(--accent); cursor: pointer; }
.review-record-row { min-height: 66px; padding: 0 8px; border-bottom: 1px solid var(--divider-soft); transition: background var(--transition-fast); }
.review-record-row:last-child { border-bottom: 0; }
.review-record-row:hover { background: var(--surface-muted); }
.review-record-row.is-selected { background: color-mix(in srgb, var(--accent-soft) 55%, var(--surface)); box-shadow: inset 3px 0 0 var(--accent); }
.review-batch-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; padding: 9px 14px; border: 1px solid var(--accent-20-border-fallback); border-radius: 11px; background: color-mix(in srgb, var(--accent-soft) 60%, var(--surface)); }
.review-batch-bar > span { color: var(--text); font-size: 12px; }
.review-batch-bar > span strong { color: var(--accent-strong); font-variant-numeric: tabular-nums; }
.review-batch-bar > div { display: flex; gap: 8px; }
.review-batch-bar button { display: inline-flex; align-items: center; gap: 5px; min-height: 30px; padding: 0 12px; border: 0; border-radius: 8px; background: var(--surface); color: var(--text-muted); font: inherit; font-size: 11.5px; font-weight: 650; cursor: pointer; transition: background var(--transition-fast), color var(--transition-fast); }
.review-batch-bar button:hover { background: var(--surface-muted); color: var(--text); }
.review-batch-bar button.is-danger { background: #fff0ef; color: var(--danger); }
.review-batch-bar button.is-danger:hover { background: #ffe3e0; }
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
.review-detail {
  display: flex;
  width: min(520px, calc(100vw - 24px));
  height: 100%;
  flex-direction: column;
  overflow: auto;
  border-left: 1px solid var(--border);
  background-color: var(--surface, #fff);
  box-shadow: -24px 0 64px rgba(8, 24, 20, .28);
  isolation: isolate;
  opacity: 1;
  scrollbar-width: thin;
  scrollbar-color: var(--text-muted-26-fallback, rgba(104, 118, 116, 0.26)) transparent;
  scrollbar-gutter: stable;
}
.review-detail::-webkit-scrollbar { width: 6px; height: 6px; }
.review-detail::-webkit-scrollbar-track { background: transparent; }
.review-detail::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: var(--text-muted-26-fallback, rgba(104, 118, 116, 0.26));
  background-clip: padding-box;
}
.review-detail:hover::-webkit-scrollbar-thumb {
  background: var(--text-muted, #687674);
  background-clip: padding-box;
}
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
.review-timeline li > i.is-snoozed { background: #d69c42; box-shadow: 0 0 0 1px #d69c42; }
.review-timeline li > i.is-skipped { background: #89918f; box-shadow: 0 0 0 1px #89918f; }
.review-timeline li > i.is-dismissed { background: #89918f; box-shadow: 0 0 0 1px #89918f; }
.review-timeline li > i.is-natural-break { background: #6a9bc3; box-shadow: 0 0 0 1px #6a9bc3; }
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
.review-detail-note { margin: 0; padding: 13px; border-radius: 11px; background: var(--surface-muted); color: var(--text); font-size: 12px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
.review-detail-note--empty { color: var(--text-muted); font-style: italic; }
.review-detail-edit { display: inline-flex; align-items: center; gap: 3px; margin-left: auto; padding: 4px 8px; border: 0; border-radius: 7px; background: transparent; color: var(--text-muted); font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; transition: background var(--transition-fast), color var(--transition-fast); }
.review-detail-edit:hover { background: var(--surface-muted); color: var(--accent-strong); }
.review-detail-note-edit { display: grid; gap: 8px; }
.review-detail-note-edit textarea { width: 100%; min-height: 90px; padding: 10px 12px; border: 1px solid var(--divider-soft); border-radius: 10px; background: var(--surface); color: var(--text); font: inherit; font-size: 12px; line-height: 1.55; resize: vertical; }
.review-detail-note-edit textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.review-detail-note-edit__actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.review-detail-note-edit__actions small { color: var(--text-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.review-detail-note-edit__actions > div { display: flex; gap: 6px; }
.review-detail-note-edit__actions button { display: inline-flex; align-items: center; min-height: 30px; padding: 0 12px; border: 0; border-radius: 8px; background: var(--surface-muted); color: var(--text); font: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; }
.review-detail-note-save { background: var(--accent); color: #fff; }
.review-detail-note-save:hover:not(:disabled) { background: var(--accent-strong); }
.review-detail-note-save:disabled { opacity: .5; cursor: not-allowed; }
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
/* 新增：本期亮点洞察 */
.review-insights { display: grid; gap: 10px; margin-bottom: 12px; padding: 14px 16px; border: 1px solid var(--accent-34-fallback); border-radius: 16px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent-soft) 70%, var(--surface)) 0%, var(--surface) 100%); }
.review-insights > header { display: flex; align-items: center; gap: 7px; color: var(--accent-strong); }
.review-insights > header > span { font-size: 12px; font-weight: 750; letter-spacing: .04em; }
.review-insights > header > small { margin-left: auto; color: var(--text-muted); font-size: 11px; font-weight: 500; }
.review-insights__list { display: grid; gap: 8px; }
.review-insight { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--surface); }
.review-insight__icon { display: grid; width: 32px; height: 32px; flex: 0 0 auto; place-items: center; border-radius: 10px; }
.review-insight.is-positive .review-insight__icon { background: var(--accent-soft); color: var(--accent-strong); }
.review-insight.is-caution .review-insight__icon { background: #fff0e1; color: #b6741a; }
.review-insight strong { color: var(--text); font-size: 13px; line-height: 1.4; }
.review-insight small { display: block; margin-top: 2px; color: var(--text-muted); font-size: 11px; line-height: 1.45; }

/* 范围控件已抽到 ReviewRangeControl 组件，原有的双层按钮与自定义面板样式不再使用 */

/* 新增：分层空状态 */
.review-empty--empty-range { background: var(--surface-muted); border-color: var(--divider-soft); }
.review-empty--empty-range > span { color: var(--accent-strong); }
.review-empty__actions { display: flex; gap: 10px; }
.review-empty__actions button { display: inline-flex; min-height: 40px; align-items: center; gap: 6px; padding: 0 14px; border-radius: 10px; font-size: 12px; font-weight: 680; }
.review-empty__actions button:not(.review-empty__primary) { background: var(--surface); border: 1px solid var(--divider-soft); color: var(--text); }
.review-empty--inline { width: 100%; max-width: 100%; margin: 16px 0; padding: 32px 18px; }
.review-empty--inline > span { width: 44px; height: 44px; }
.review-empty--inline button { display: inline-flex; min-height: 36px; align-items: center; gap: 6px; padding: 0 14px; border-radius: 10px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 680; }

/* 新增：指标卡 - 图标 + vs 上周期对比标 */
.review-metric__label { display: inline-flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 11px; }
.review-metric__delta { display: inline-flex; align-items: center; gap: 3px; margin-top: 4px; padding: 2px 7px; border-radius: 999px; font-size: 10px; font-weight: 680; font-variant-numeric: tabular-nums; width: fit-content; }
.review-metric__delta.is-up { background: var(--accent-soft); color: var(--accent-strong); }
.review-metric__delta.is-down { background: #fff0e1; color: #b6741a; }

/* 新增：趋势图 - 今日高亮 + 平均线 + y 轴刻度 */
.review-chart-meta { display: grid; gap: 2px; text-align: right; }
.review-chart-meta strong { color: var(--text); font-size: 16px; font-variant-numeric: tabular-nums; }
.review-chart-meta small { color: var(--text-muted); font-size: 10px; }
.review-chart-note { margin: 0 0 10px; padding: 6px 10px; border-radius: 8px; background: color-mix(in srgb, var(--accent-soft) 50%, transparent); color: var(--accent-strong); font-size: 11px; }
.review-chart > div.is-today > i > b { background: linear-gradient(180deg, var(--accent), var(--accent-strong)); box-shadow: 0 0 0 2px var(--accent-soft); }
.review-chart > div.is-today small { color: var(--accent-strong); font-weight: 700; }
.review-chart > div.is-empty > i { background: transparent; }
.review-chart__placeholder { display: block; width: 1px; height: 1px; background: var(--divider-soft); }
.review-chart-axis { position: relative; display: flex; align-items: center; justify-content: space-between; margin-top: 4px; height: 18px; color: var(--text-muted); font-size: 9px; }
.review-chart-axis > i { position: absolute; left: 0; right: 0; top: 50%; height: 0; border-top: 1px dashed var(--accent); pointer-events: none; }
.review-chart-axis > i > b { position: absolute; right: 0; top: -16px; padding: 1px 5px; border-radius: 4px; background: var(--surface); color: var(--accent-strong); font-size: 9px; font-weight: 600; transform: translateX(calc(50% - var(--line, 50%))); }

/* 新增：节律执行卡 - 响应速度 / 时段分布 */
.review-rhythm-buckets { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
.review-rhythm-bucket h4 { margin: 0 0 8px; color: var(--text-muted); font-size: 10.5px; font-weight: 700; letter-spacing: .04em; }
.review-rhythm-bucket ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.review-rhythm-bucket li { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; opacity: .55; }
.review-rhythm-bucket li.is-active { opacity: 1; }
.review-rhythm-bucket li span { color: var(--text); font-size: 11px; }
.review-rhythm-bucket li strong { color: var(--text); font-size: 11px; font-variant-numeric: tabular-nums; }
.review-rhythm-bucket li i { grid-column: 1 / -1; display: block; height: 4px; border-radius: 999px; background: var(--surface-muted); }
.review-rhythm-bucket li i::after { content: ''; display: block; height: 100%; border-radius: inherit; background: #6a9bc3; }

/* 新增：详情面板 - 上一条/下一条 + 关闭动画 */
.review-detail-header__actions { display: flex; align-items: center; gap: 6px; }
.review-detail-nav { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid var(--divider-soft); border-radius: 9px; background: transparent; color: var(--text-muted); }
.review-detail-nav:hover:not(:disabled) { background: var(--surface-muted); color: var(--text); }
.review-detail-nav:disabled { cursor: default; opacity: .35; }
.review-detail-fade-enter-active, .review-detail-fade-leave-active { transition: opacity .18s ease; }
.review-detail-fade-enter-active .review-detail, .review-detail-fade-leave-active .review-detail { transition: transform .22s cubic-bezier(.16, 1, .3, 1); }
.review-detail-fade-enter-from, .review-detail-fade-leave-to { opacity: 0; }
.review-detail-fade-enter-from .review-detail, .review-detail-fade-leave-to .review-detail { transform: translateX(24px); }

/* 新增：最近记录跳管理按钮 - 强化引导 */
.review-cta { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 8px; background: var(--accent-soft); color: var(--accent-strong); font-size: 12px; font-weight: 650; }
.review-cta:hover { background: color-mix(in srgb, var(--accent-soft) 50%, var(--accent)); }
.review-cta > span { line-height: 1; }

@media (max-width: 900px) {
  .review-rhythm-buckets { grid-template-columns: 1fr; gap: 12px; }
}

@media (prefers-reduced-motion: reduce) { .review-chart b, .review-detail-fade-enter-active, .review-detail-fade-leave-active { transition: none; } }
</style>
