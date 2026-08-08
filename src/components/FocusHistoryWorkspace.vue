<template>
  <main ref="workspaceRef" class="clock-workspace review-workspace">
    <div class="review-shell">
      <header v-if="activeTab === 'overview'" class="review-header">
        <div>
          <p class="eyebrow">专注与节律回顾</p>
          <h1>看见投入，也看见恢复</h1>
          <p>按本机时区统计。专注记录推进，节律记录你如何停下来。点击任意记录可查看完整详情，下方数据全部按所选范围聚合。</p>
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
            <div v-for="(item, idx) in insights" :key="idx" :class="['review-insight', `is-${item.type}`, { 'is-clickable': !!item.item }]">
              <button v-if="item.item" type="button" class="review-insight__click" :aria-label="`查看详情：${item.text}`" @click="openDetail(item.kind, item.item)">
                <span class="review-insight__icon"><component :is="item.icon" :size="16" /></span>
                <div class="review-insight__body">
                  <strong>{{ item.text }}</strong>
                  <small v-if="item.detail">{{ item.detail }}</small>
                  <small v-if="item.when" class="review-insight__when">{{ item.when }} · 点击查看详情</small>
                </div>
              </button>
              <div v-else class="review-insight__click">
                <span class="review-insight__icon"><component :is="item.icon" :size="16" /></span>
                <div class="review-insight__body">
                  <strong>{{ item.text }}</strong>
                  <small v-if="item.detail">{{ item.detail }}</small>
                  <div v-if="item.bar" class="review-insight__bar" :title="`当前 vs 上 ${previousRangeStart?.days || ''} 天`">
                    <i class="is-prev" :style="{ width: `${item.bar.prev}%` }"></i>
                    <i class="is-current" :style="{ width: `${item.bar.current}%` }"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="review-card review-summary" aria-label="本周期概览">
          <header><div><span>数据摘要</span><h2>{{ selectedRangeLabel }}的专注与节律</h2><p>下面的趋势和最近记录使用同一时间范围</p></div><div class="review-summary-actions"><small>{{ focusEntries.length + rhythmEntries.length }} 条记录</small>
            <div class="review-export-menu">
              <button type="button" class="review-export-btn" :class="{ active: exportMenuOpen.overview }" :aria-expanded="exportMenuOpen.overview" aria-haspopup="menu" @click.stop="toggleExportMenu('overview')">
                <Download :size="14" />导出
                <ChevronDown :size="12" />
              </button>
              <div v-if="exportMenuOpen.overview" class="review-export-menu__panel" role="menu">
                <button type="button" role="menuitem" @click="exportFocusHtmlReport(); closeAllExportMenus()">HTML 报告（含图表，可打印为 PDF）</button>
                <button type="button" role="menuitem" @click="exportFocusReport(); closeAllExportMenus()">Markdown 报告</button>
                <button type="button" role="menuitem" @click="exportFocusJson(); closeAllExportMenus()">JSON（开发者用）</button>
              </div>
            </div>
          </div></header>
          <div class="review-metrics">
            <article class="review-metric review-metric--primary">
              <span class="review-metric__label" :title="`专注段（不含休息）`"><Timer :size="13" />有效专注</span>
              <strong :aria-label="`${selectedRangeLabel}累计有效专注 ${formatDuration(totalFocusSeconds)}`">{{ formatDuration(totalFocusSeconds) }}</strong>
              <small>{{ focusEntries.length }} 段 · {{ focusActiveDays }} 天有投入</small>
              <span v-if="previousRangeStart && focusSecondsDelta" :class="['review-metric__delta', focusSecondsDelta > 0 ? 'is-up' : 'is-down']" :title="`与上一周期对比（${previousRangeStart.days} 天）`">
                {{ focusSecondsDelta > 0 ? '↑' : focusSecondsDelta < 0 ? '↓' : '持平' }} {{ Math.abs(focusSecondsDelta) }}%
                <small>· 对比上 {{ previousRangeStart.days }} 天</small>
              </span>
            </article>
            <article class="review-metric">
              <span class="review-metric__label" :title="`完成率 = 自然完成的专注段数 / 全部专注段数（不含休息）`"><BarChart3 :size="13" />专注完成率</span>
              <strong>{{ focusCompletionRate }}%</strong>
              <small>{{ completedFocusEntries.length }} 段自然完成 / {{ focusEntries.length }} 段</small>
              <span v-if="previousRangeStart && completionRateDelta" :class="['review-metric__delta', completionRateDelta > 0 ? 'is-up' : 'is-down']" :title="`与上一周期对比`">
                {{ completionRateDelta > 0 ? '↑' : completionRateDelta < 0 ? '↓' : '持平' }} {{ Math.abs(completionRateDelta) }}pp
                <small>· 对比上 {{ previousRangeStart.days }} 天</small>
              </span>
            </article>
            <article class="review-metric">
              <span class="review-metric__label"><Activity :size="13" />暂停</span>
              <strong>{{ totalPauseCount }} 次</strong>
              <small>累计 {{ formatDuration(totalPausedSeconds) }}</small>
              <span v-if="previousRangeStart && pauseCountDelta" :class="['review-metric__delta', pauseCountDelta < 0 ? 'is-up' : 'is-down']" :title="`与上一周期对比（${previousRangeStart.days} 天）`">
                {{ pauseCountDelta > 0 ? '↑' : '↓' }}{{ Math.abs(pauseCountDelta) }} 次
                <small v-if="pauseSecondsDelta">({{ pauseSecondsDelta > 0 ? '多' : '少' }} {{ Math.abs(pauseSecondsDelta) }}%)</small>
              </span>
            </article>
            <article class="review-metric review-metric--rhythm">
              <span class="review-metric__label"><BellRing :size="13" />节律响应</span>
              <strong>{{ rhythmEntries.length }} 次</strong>
              <small>{{ rhythmCompletionRate }}% 完成或自然离席</small>
              <span v-if="previousRangeStart && rhythmCountDelta" :class="['review-metric__delta', rhythmCountDelta > 0 ? 'is-up' : 'is-down']" :title="`与上一周期对比`">
                {{ rhythmCountDelta > 0 ? '↑' : '↓' }} {{ Math.abs(rhythmCountDelta) }} 次
                <small v-if="rhythmRateDelta">· 完成率 {{ rhythmRateDelta > 0 ? '+' : '' }}{{ rhythmRateDelta }}pp</small>
              </span>
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
            <p v-if="trendTruncated" class="review-chart-note">
              记录超过 {{ TREND_HARD_CAP }} 天，仅显示最近 {{ trendDaysCount }} 天（下方日均按此窗口计算）。
              <button type="button" class="review-chart-note__btn" @click="range = '90d'">查看近 90 天</button>
              <button type="button" class="review-chart-note__btn" @click="range = 'custom'">自定义</button>
            </p>
            <div class="review-chart-legend" aria-hidden="true">
              <span><i class="is-weekday"></i>工作日</span>
              <span><i class="is-weekend"></i>周末</span>
              <span v-if="trendAverage"><i class="is-average"></i>日均</span>
            </div>
            <div ref="trendChartRef" class="review-chart" :style="{ gridTemplateColumns: `repeat(${trendDays.length}, minmax(0, 1fr))` }">
              <div v-for="(day, idx) in trendDays" :key="day.key" tabindex="0" :class="{ 'is-today': day.isToday, 'is-weekend': day.isWeekend, 'is-empty': !day.seconds }" :aria-label="trendDayAria(day)" @mouseenter="hoverTrendDay(idx, $event)" @mousemove="moveTrendTooltip($event)" @mouseleave="hoverTrendDay(-1)" @focus="hoverTrendDay(idx)" @blur="hoverTrendDay(-1)">
                <span>{{ trendDays.length <= 14 && day.seconds ? formatCompactDuration(day.seconds) : '' }}</span>
                <i>
                  <b v-if="day.seconds" :style="{ height: `${Math.max(8, day.seconds / trendMax * 100)}%` }"></b>
                  <b v-else class="review-chart__placeholder"></b>
                </i>
                <small>{{ day.showLabel ? day.shortLabel : '' }}</small>
              </div>
              <div v-if="trendAverage" class="review-chart-average" :class="{ 'is-high': trendAverage / trendMax > 0.5 }" :style="{ '--line': `${Math.min(94, trendAverage / trendMax * 100)}%` }" aria-hidden="true">
                <b>日均 {{ formatCompactDuration(trendAverage) }}</b>
              </div>
              <div v-if="hoveredTrendDay" ref="trendTooltipEl" class="review-chart-tooltip" :style="trendTooltipStyle" role="tooltip">
                <strong>{{ hoveredTrendDay.label }}{{ hoveredTrendDay.isToday ? '（今日）' : '' }}</strong>
                <p v-if="hoveredTrendDay.seconds"><b>{{ formatDuration(hoveredTrendDay.seconds) }}</b> · {{ hoveredTrendDay.records.length }} 段专注</p>
                <p v-else class="is-empty">无投入</p>
                <ul v-if="hoveredTrendDay.records.length">
                  <li v-for="(record, idx) in hoveredTrendDay.records.slice(0, 3)" :key="idx">{{ focusTitle(record) }}</li>
                  <li v-if="hoveredTrendDay.records.length > 3" class="is-more">还有 {{ hoveredTrendDay.records.length - 3 }} 段…</li>
                </ul>
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
            <p v-if="!trendAverage" class="review-chart-empty">这段时间没有专注记录。试试切换到「全部」或更短的范围。</p>
          </article>

          <article class="review-card review-rhythm-card" :class="{ 'is-collapsed': !rhythmEntries.length }">
            <header>
              <div>
                <span>节律执行</span>
                <h2 v-if="rhythmEntries.length">提醒之后发生了什么</h2>
                <p v-else class="review-rhythm-card__empty-line">{{ selectedRangeLabel }} 还没有节律处理记录</p>
              </div>
              <BellRing :size="19" />
            </header>
            <template v-if="rhythmEntries.length">
              <div class="review-rhythm-actions">
                <div v-for="item in rhythmActionSummary" :key="item.action">
                  <span><i :class="`is-${item.action}`"></i>{{ item.label }}</span>
                  <strong>{{ item.count }}</strong>
                  <b><i :class="`is-${item.action}`" :style="{ width: `${item.percent}%` }"></i></b>
                </div>
              </div>
              <div class="review-rhythm-buckets">
                <div class="review-rhythm-bucket">
                  <header>
                    <h4>响应速度</h4>
                    <button ref="bucketTriggerRef" type="button" class="review-rhythm-bucket__adjust" :aria-expanded="customBucketsOpen" :aria-haspopup="true" @click="toggleBucketPopover">
                      <SlidersHorizontal :size="12" />自定义分桶
                    </button>
                  </header>
                  <ul>
                    <li v-for="b in rhythmResponseBuckets" :key="b.id" :class="{ 'is-active': b.count > 0 }">
                      <span>{{ b.label }}</span>
                      <strong>{{ b.count }}</strong>
                      <i :style="{ width: `${b.percent}%` }" :title="`${b.percent}%`"></i>
                    </li>
                  </ul>
                  <table class="sr-only" aria-label="节律响应速度明细">
                    <caption>{{ selectedRangeLabel }} 节律响应速度分布</caption>
                    <thead><tr><th scope="col">分段</th><th scope="col">次数</th><th scope="col">占比</th></tr></thead>
                    <tbody>
                      <tr v-for="b in rhythmResponseBuckets" :key="b.id">
                        <th scope="row">{{ b.label }}</th>
                        <td>{{ b.count }}</td>
                        <td>{{ b.percent }}%</td>
                      </tr>
                    </tbody>
                  </table>
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
                  <table class="sr-only" aria-label="节律提醒时段明细">
                    <caption>{{ selectedRangeLabel }} 节律提醒时段分布</caption>
                    <thead><tr><th scope="col">时段</th><th scope="col">次数</th><th scope="col">占比</th></tr></thead>
                    <tbody>
                      <tr v-for="b in rhythmHourBuckets" :key="b.id">
                        <th scope="row">{{ b.label }}</th>
                        <td>{{ b.count }}</td>
                        <td>{{ b.percent }}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="review-rhythm-weekday">
                <h4>工作日 vs 周末</h4>
                <div class="review-rhythm-weekday__bar" :title="`工作日 ${rhythmWeekdaySummary.weekday.count} 次（${rhythmWeekdaySummary.weekday.percent}%），周末 ${rhythmWeekdaySummary.weekend.count} 次（${rhythmWeekdaySummary.weekend.percent}%）`">
                  <i class="is-weekday" :style="{ width: `${rhythmWeekdaySummary.weekday.percent}%` }">
                    <span v-if="rhythmWeekdaySummary.weekday.count">{{ rhythmWeekdaySummary.weekday.count }}</span>
                  </i>
                  <i class="is-weekend" :style="{ width: `${rhythmWeekdaySummary.weekend.percent}%` }">
                    <span v-if="rhythmWeekdaySummary.weekend.count">{{ rhythmWeekdaySummary.weekend.count }}</span>
                  </i>
                </div>
                <p>
                  <span><i class="is-weekday"></i>工作日 {{ rhythmWeekdaySummary.weekday.count }} 次 · 完成 {{ rhythmWeekdaySummary.weekday.completionRate }}%</span>
                  <span><i class="is-weekend"></i>周末 {{ rhythmWeekdaySummary.weekend.count }} 次 · 完成 {{ rhythmWeekdaySummary.weekend.completionRate }}%</span>
                </p>
                <table class="sr-only" aria-label="节律工作日与周末对比">
                  <caption>{{ selectedRangeLabel }} 工作日 vs 周末</caption>
                  <thead><tr><th scope="col">分组</th><th scope="col">次数</th><th scope="col">完成率</th></tr></thead>
                  <tbody>
                    <tr>
                      <th scope="row">工作日</th>
                      <td>{{ rhythmWeekdaySummary.weekday.count }}</td>
                      <td>{{ rhythmWeekdaySummary.weekday.completionRate }}%</td>
                    </tr>
                    <tr>
                      <th scope="row">周末</th>
                      <td>{{ rhythmWeekdaySummary.weekend.count }}</td>
                      <td>{{ rhythmWeekdaySummary.weekend.completionRate }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </article>
        </section>

        <section class="review-card review-recent">
          <header class="review-recent__header">
            <div><span>最近发生</span><h2>专注与节律时间线</h2><p>{{ selectedRangeLabel }}的数据，与上方统计使用相同时间范围</p></div>
            <div class="review-recent__tools">
              <label class="review-recent-search" :class="{ 'has-value': recentSearch }">
                <Search :size="13" />
                <input v-model="recentSearch" type="search" placeholder="搜索记录" aria-label="搜索最近记录" @keydown.esc="recentSearch = ''" />
                <button v-if="recentSearch" type="button" aria-label="清空搜索" @click="recentSearch = ''"><X :size="12" /></button>
              </label>
              <div class="review-recent-switch" role="group" aria-label="筛选最近记录类型">
                <button v-for="option in recentKindOptions" :key="option.id" type="button" :class="{ active: recentKind === option.id }" :title="`${option.label}（${recentKindCounts[option.id] || 0} 条）`" @click="setRecentKind(option.id)">
                  {{ option.label }}
                  <span v-if="recentKindCounts[option.id]" class="review-recent-switch__count">{{ recentKindCounts[option.id] }}</span>
                </button>
              </div>
            </div>
          </header>
          <div v-if="recentVisibleRecords.length" class="review-recent-list">
            <section v-for="group in recentGroups.slice(0, recentShownGroups)" :key="group.key" class="review-recent-group" :aria-label="group.label">
              <header class="review-recent-group__head">
                <strong>{{ group.label }}</strong>
                <small>{{ group.records.length }} 条</small>
              </header>
              <article v-for="record in groupVisibleRecords(group)" :key="`${record.kind}-${record.item.id}`" class="review-recent-row" :class="{ 'is-selected': isRecentSelected(record) }">
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
                  <strong>{{ formatClock(record.at) }}</strong>
                  <small>{{ record.kind === 'focus' ? formatTimeRange(record.item.startedAt, record.item.finishedAt) : `${formatClock(record.item.triggeredAt)} → ${formatClock(record.item.resolvedAt)}` }}</small>
                </span>
                <span class="review-record-meta"><strong>{{ record.kind === 'focus' ? formatCompactDuration(record.item.elapsedSeconds) : rhythmActionLabel(record.item.action) }}</strong><small>{{ record.kind === 'focus' ? resultLabel(record.item.result) : `${formatResponseTime(record.item.responseSeconds)}响应` }}</small></span>
                <span class="review-record-actions">
                  <button type="button" :aria-label="`查看${record.kind === 'focus' ? '专注' : '节律'}详情`" :data-label="`查看${record.kind === 'focus' ? '专注' : '节律'}详情`" title="查看详情" @click="openDetail(record.kind, record.item)"><Eye :size="16" /></button>
                  <button class="is-danger" type="button" :aria-label="`删除${record.kind === 'focus' ? '专注' : '节律'}记录`" :data-label="`删除${record.kind === 'focus' ? '专注' : '节律'}记录`" title="删除记录" @click="deleteRecord(record)"><Trash2 :size="16" /></button>
                </span>
              </article>
              <button v-if="recentDayRemainingCount(group)" type="button" class="review-recent-group__more" @click="toggleDayExpand(group.key)">
                {{ isDayExpanded(group.key) ? '收起当天记录' : `还有 ${recentDayRemainingCount(group)} 条当天记录` }}
              </button>
            </section>
          </div>
          <p v-else class="review-card__empty">{{ recentSearch ? `没有匹配「${recentSearch.trim()}」的记录` : `当前范围没有${recentKind === 'focus' ? '专注' : recentKind === 'rhythm' ? '节律' : ''}记录。试试切换"全部/仅专注/仅节律"。` }}</p>
          <footer class="review-recent__footer">
            <div v-if="recentShownGroups < recentGroups.length" class="review-recent__more">
              <button type="button" class="review-cta" @click="loadMoreRecent"><ChevronDown :size="14" /><span>显示更多（还有 {{ recentRemainingCount }} 条）</span></button>
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

        <Teleport to=".app">
          <Transition name="review-range-pop">
            <div v-if="customBucketsOpen" ref="bucketPopoverRef" class="review-bucket-popover" :style="bucketPopoverStyle" role="dialog" aria-label="自定义响应速度分桶" tabindex="-1" @click.stop>
              <h4><SlidersHorizontal :size="13" />自定义分桶阈值</h4>
              <p class="review-bucket-popover__hint">按响应秒数划分快 / 中 / 慢，修改后实时更新上方分布。</p>
              <label class="review-bucket-popover__field"><span>快</span><input v-model.number="bucketFast" type="number" min="0" max="999" /> 秒内</label>
              <label class="review-bucket-popover__field"><span>中</span><input v-model.number="bucketMedium" type="number" min="1" max="999" /> 秒内</label>
              <label class="review-bucket-popover__field"><span>慢</span><input v-model.number="bucketSlow" type="number" min="2" max="9999" /> 秒内</label>
              <div class="review-bucket-popover__foot">
                <button type="button" @click="resetBuckets"><RotateCcw :size="12" />恢复默认</button>
                <button type="button" class="review-bucket-popover__done" @click="customBucketsOpen = false">完成</button>
              </div>
            </div>
          </Transition>
        </Teleport>
      </template>

      <section v-else-if="activeTab === 'focus'" class="review-card review-records">
        <div class="review-filter-panel">
          <div class="review-filters">
            <label><Search :size="16" /><span class="sr-only">搜索专注记录</span><input v-model.trim="focusSearch" type="search" placeholder="搜索任务、方式或备注" /></label>
            <ReviewRangeControl
              compact
              :range="range"
              :custom-start="customStart"
              :custom-end="customEnd"
              @update:range="range = $event"
              @update:custom-start="customStart = $event"
              @update:custom-end="customEnd = $event"
            />
            <ReviewSelect v-model="focusResult" :options="FOCUS_RESULT_OPTIONS" aria-label="筛选专注结果" />
            <ReviewSelect v-model="focusPhase" :options="FOCUS_PHASE_OPTIONS" aria-label="筛选专注类型" />
            <ReviewSelect v-model="focusPause" :options="FOCUS_PAUSE_OPTIONS" aria-label="筛选暂停情况" />
            <ReviewSelect v-model="focusSort" :options="FOCUS_SORT_OPTIONS" aria-label="专注记录排序" />
            <button v-if="focusFilterCount" class="review-filter-reset" type="button" @click="resetFocusFilters"><RotateCcw :size="14" />重置筛选</button>
          </div>
        </div>
        <div v-if="!focusHistory.length" class="review-empty review-empty--inline">
          <span><Timer :size="22" /></span>
          <strong>{{ selectedRangeLabel }} 还没有专注记录</strong>
          <p>试试切换到"全部"或更宽的时间范围。</p>
          <button type="button" @click="range = 'all'">查看全部历史</button>
        </div>
        <div v-else-if="focusFilterCount && !filteredFocusRecords.length" class="review-empty review-empty--empty-filter">
          <span><Search :size="22" /></span>
          <strong>没有匹配的专注记录</strong>
          <p>当前筛选条件下没有结果。可以重置筛选试试。</p>
          <button type="button" @click="resetFocusFilters"><RotateCcw :size="13" />重置筛选</button>
        </div>
        <div class="review-filter-summary" aria-label="当前筛选的专注统计">
          <div v-if="focusFilterCount"><span>已启用</span><strong>{{ focusFilterCount }} 项条件</strong></div>
          <div><span>匹配记录</span><strong>{{ formatCount(filteredFocusRecords.length) }} 条</strong></div>
          <div><span>有效时长</span><strong>{{ formatDuration(filteredFocusSeconds) }}</strong></div>
          <div><span>完成率</span><strong>{{ filteredFocusCompletionRate }}%</strong></div>
          <div><span>暂停情况</span><strong>{{ filteredFocusPauseCount }} 次 · {{ formatDuration(filteredFocusPausedSeconds) }}</strong></div>
          <div class="review-filter-summary__export">
            <div class="review-export-menu">
              <button type="button" class="review-export-btn" :class="{ active: exportMenuOpen.focus }" :aria-expanded="exportMenuOpen.focus" aria-haspopup="menu" @click.stop="toggleExportMenu('focus')">
                <Download :size="14" />导出
                <ChevronDown :size="12" />
              </button>
              <div v-if="exportMenuOpen.focus" class="review-export-menu__panel" role="menu">
                <button type="button" role="menuitem" @click="exportFocusCsv(); closeAllExportMenus()">CSV（Excel 打开）</button>
                <button type="button" role="menuitem" @click="exportFocusJson(); closeAllExportMenus()">JSON（开发者用）</button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="focusSelectionCount" class="review-batch-bar" role="toolbar" aria-label="批量操作">
          <span>已选 <strong>{{ focusSelectionCount }}</strong> 条专注记录</span>
          <div>
            <button type="button" @click="clearFocusSelection">取消选择</button>
            <button type="button" @click="exportSelectedFocus"><Download :size="14" />导出 CSV</button>
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
              <button type="button" aria-label="查看专注详情" data-label="查看专注详情" title="查看详情" @click="openDetail('focus', item)"><Eye :size="16" /></button>
              <button class="is-danger" type="button" aria-label="删除专注记录" data-label="删除专注记录" title="删除记录" @click="deleteFocusRecord(item)"><Trash2 :size="16" /></button>
            </span>
          </article>
        </div>
        <p v-else class="review-card__empty">没有符合当前筛选条件的专注记录。</p>
        <footer v-if="filteredFocusRecords.length" class="review-pagination">
          <span>第 {{ focusPageStart }}–{{ focusPageEnd }} 条，共 {{ formatCount(filteredFocusRecords.length) }} 条</span>
          <label>每页 <ReviewSelect :model-value="String(focusPageSize)" :options="PAGE_SIZE_OPTIONS" aria-label="每页专注记录数" :menu-width="76" @update:model-value="focusPageSize = Number($event)" /> 条</label>
          <div>
            <button type="button" aria-label="上一页" :disabled="focusPage === 1" @click="focusPage--"><ChevronLeft :size="16" /></button>
            <strong>{{ focusPage }} / {{ focusPageCount }}</strong>
            <button type="button" aria-label="下一页" :disabled="focusPage === focusPageCount" @click="focusPage++"><ChevronRight :size="16" /></button>
          </div>
        </footer>
      </section>

      <section v-else class="review-card review-records">
        <div class="review-filter-panel">
          <div class="review-filters">
            <label><Search :size="16" /><span class="sr-only">搜索节律记录</span><input v-model.trim="rhythmSearch" type="search" placeholder="搜索提醒名称" /></label>
            <ReviewRangeControl
              compact
              :range="range"
              :custom-start="customStart"
              :custom-end="customEnd"
              @update:range="range = $event"
              @update:custom-start="customStart = $event"
              @update:custom-end="customEnd = $event"
            />
            <ReviewSelect v-model="rhythmAction" :options="RHYTHM_ACTION_OPTIONS" aria-label="筛选节律处理结果" />
            <ReviewSelect v-model="rhythmTrigger" :options="RHYTHM_TRIGGER_OPTIONS" aria-label="筛选节律触发方式" />
            <ReviewSelect v-model="rhythmSort" :options="RHYTHM_SORT_OPTIONS" aria-label="节律记录排序" />
            <button v-if="rhythmFilterCount" class="review-filter-reset" type="button" @click="resetRhythmFilters"><RotateCcw :size="14" />重置</button>
          </div>
        </div>
        <div v-if="!rhythmHistory.length" class="review-empty review-empty--inline">
          <span><BellRing :size="22" /></span>
          <strong>{{ selectedRangeLabel }} 还没有节律记录</strong>
          <p>试试切换到"全部"或更宽的时间范围。新处理的完成、延后和跳过会显示在这里。</p>
          <button type="button" @click="range = 'all'">查看全部历史</button>
        </div>
        <div v-else-if="rhythmFilterCount && !filteredRhythmRecords.length" class="review-empty review-empty--empty-filter">
          <span><Search :size="22" /></span>
          <strong>没有匹配的节律记录</strong>
          <p>当前筛选条件下没有结果。可以重置筛选试试。</p>
          <button type="button" @click="resetRhythmFilters"><RotateCcw :size="13" />重置筛选</button>
        </div>
        <div class="review-filter-summary" aria-label="当前筛选的节律统计">
          <div v-if="rhythmFilterCount"><span>已启用</span><strong>{{ rhythmFilterCount }} 项条件</strong></div>
          <div><span>匹配记录</span><strong>{{ formatCount(filteredRhythmRecords.length) }} 条</strong></div>
          <div><span>完成或离席</span><strong>{{ filteredRhythmCompletionRate }}%</strong></div>
          <div><span>平均响应</span><strong>{{ formatResponseTime(filteredRhythmResponseAverage) }}</strong></div>
          <div><span>延后次数</span><strong>{{ filteredRhythmSnoozeCount }} 次</strong></div>
          <div class="review-filter-summary__export">
            <div class="review-export-menu">
              <button type="button" class="review-export-btn" :class="{ active: exportMenuOpen.rhythm }" :aria-expanded="exportMenuOpen.rhythm" aria-haspopup="menu" @click.stop="toggleExportMenu('rhythm')">
                <Download :size="14" />导出
                <ChevronDown :size="12" />
              </button>
              <div v-if="exportMenuOpen.rhythm" class="review-export-menu__panel" role="menu">
                <button type="button" role="menuitem" @click="exportRhythmCsv(); closeAllExportMenus()">CSV（Excel 打开）</button>
                <button type="button" role="menuitem" @click="exportRhythmJson(); closeAllExportMenus()">JSON（开发者用）</button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="rhythmSelectionCount" class="review-batch-bar" role="toolbar" aria-label="批量操作">
          <span>已选 <strong>{{ rhythmSelectionCount }}</strong> 条节律记录</span>
          <div>
            <button type="button" @click="clearRhythmSelection">取消选择</button>
            <button type="button" @click="exportSelectedRhythm"><Download :size="14" />导出 CSV</button>
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
            <span class="review-record-meta"><strong :class="`rhythm-action rhythm-action--${item.action}`">{{ rhythmActionLabel(item.action) }}</strong><small>{{ formatResponseTime(item.responseSeconds) }}响应</small></span>
            <span class="review-record-actions">
              <button type="button" aria-label="查看节律详情" data-label="查看节律详情" title="查看详情" @click="openDetail('rhythm', item)"><Eye :size="16" /></button>
              <button type="button" aria-label="查看提醒规则" data-label="查看提醒规则" title="查看提醒规则" @click="openRhythmRuleFromRow(item)"><ExternalLink :size="16" /></button>
              <button class="is-danger" type="button" aria-label="删除节律记录" data-label="删除节律记录" title="删除记录" @click="deleteRhythmRecord(item)"><Trash2 :size="16" /></button>
            </span>
          </article>
        </div>
        <p v-else class="review-card__empty">还没有节律历史。现有提醒配置会保留，新处理结果将从现在开始记录。</p>
        <footer v-if="filteredRhythmRecords.length" class="review-pagination">
          <span>第 {{ rhythmPageStart }}–{{ rhythmPageEnd }} 条，共 {{ formatCount(filteredRhythmRecords.length) }} 条</span>
          <label>每页 <ReviewSelect :model-value="String(rhythmPageSize)" :options="PAGE_SIZE_OPTIONS" aria-label="每页节律记录数" :menu-width="76" @update:model-value="rhythmPageSize = Number($event)" /> 条</label>
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
              <div class="review-detail-hero__stats">
                <div><span>暂停次数</span><strong>{{ focusPauseCount(detail.item) }} 次</strong></div>
                <div><span>暂停总时长</span><strong>{{ formatDuration(focusPausedSeconds(detail.item)) }}</strong></div>
                <div><span>实际时间跨度</span><strong>{{ formatDuration(focusWallSeconds(detail.item)) }}</strong></div>
              </div>
            </section>
            <section class="review-detail-section">
              <header><Activity :size="16" /><h3>记录信息</h3></header>
              <dl class="review-detail-fields">
                <div><dt>专注方式</dt><dd>{{ profileName(detail.item.profileId, detail.item) }}</dd></div>
                <div><dt>阶段</dt><dd>{{ detail.item.phase === 'focus' ? '专注' : phaseLabel(detail.item.phase) }}</dd></div>
                <div><dt>结束结果</dt><dd>{{ resultLabel(detail.item.result) }}</dd></div>
                <div><dt>关联任务</dt><dd><button v-if="detail.item.taskId" type="button" class="review-detail-task-link" @click="openLinkedTask(detail.item)">{{ detail.item.taskTitle || '打开任务' }}<ExternalLink :size="12" /></button><span v-else>未关联任务</span></dd></div>
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
              <div v-else class="review-detail-legacy">
                <History :size="18" />
                <div>
                  <p><strong>这是早期记录</strong><span>当时尚未采集暂停时间线，因此只能展示开始、结束和有效时长，无法准确反推暂停过程。</span></p>
                  <dl class="review-detail-fields review-detail-fields--legacy">
                    <div><dt>开始</dt><dd>{{ formatClock(detail.item.startedAt) }} · {{ formatShortDate(detail.item.startedAt) }}</dd></div>
                    <div><dt>结束</dt><dd>{{ formatClock(detail.item.finishedAt) }} · {{ formatShortDate(detail.item.finishedAt) }}</dd></div>
                    <div><dt>有效时长</dt><dd>{{ formatDuration(detail.item.elapsedSeconds) }}</dd></div>
                    <div><dt>结果</dt><dd>{{ resultLabel(detail.item.result) }}</dd></div>
                    <div v-if="detail.item.taskTitle"><dt>任务</dt><dd>{{ detail.item.taskTitle }}</dd></div>
                    <div v-if="detail.item.note"><dt>备注</dt><dd>{{ detail.item.note }}</dd></div>
                  </dl>
                </div>
              </div>
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
              <div class="review-detail-hero__stats">
                <div><span>响应耗时</span><strong>{{ formatResponseTime(detail.item.responseSeconds) }}</strong></div>
                <div><span>触发方式</span><strong>{{ triggerTypeLabel(detail.item.triggerType) }}</strong></div>
                <div><span>延后时长</span><strong>{{ detail.item.snoozeMinutes ? `${detail.item.snoozeMinutes} 分钟` : '未延后' }}</strong></div>
              </div>
            </section>
            <section class="review-detail-section">
              <header>
                <BellRing :size="16" />
                <h3>提醒信息</h3>
                <button type="button" class="review-detail-edit" @click="openRhythmRule"><ExternalLink :size="13" />查看规则</button>
              </header>
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
            <section class="review-detail-section">
              <header>
                <FileText :size="16" />
                <h3>备注</h3>
                <button v-if="!editingNote" type="button" class="review-detail-edit" @click="startEditNote"><Pencil :size="13" />{{ detail.item.note ? '编辑' : '添加' }}</button>
                <button v-else type="button" class="review-detail-edit" @click="cancelEditNote"><X :size="13" />取消</button>
              </header>
              <div v-if="!editingNote">
                <p v-if="detail.item.note" class="review-detail-note">{{ detail.item.note }}</p>
                <p v-else class="review-detail-note review-detail-note--empty">还没有备注。点击右上角"添加"可以记录当时的上下文。</p>
              </div>
              <div v-else class="review-detail-note-edit">
                <textarea
                  ref="noteTextareaRef"
                  v-model="noteDraft"
                  rows="4"
                  maxlength="2000"
                  :placeholder="'记录这次提醒响应的背景、当时的处理思路或下次想怎么改...'"
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

    <Teleport to="body">
      <Transition name="review-shortcuts-fade">
        <div v-if="shortcutsPanelOpen" class="review-shortcuts" role="dialog" aria-modal="true" aria-labelledby="review-shortcuts-title" @click.self="shortcutsPanelOpen = false">
          <aside class="review-shortcuts__panel">
            <header>
              <h2 id="review-shortcuts-title"><Keyboard :size="16" />键盘快捷键</h2>
              <button type="button" class="review-shortcuts__close" aria-label="关闭快捷键面板" @click="shortcutsPanelOpen = false"><X :size="18" /></button>
            </header>
            <ul>
              <li><kbd>Alt</kbd>+<kbd>1</kbd><span>切换到综合概览</span></li>
              <li><kbd>Alt</kbd>+<kbd>2</kbd><span>切换到专注记录</span></li>
              <li><kbd>Alt</kbd>+<kbd>3</kbd><span>切换到节律记录</span></li>
              <li><kbd>/</kbd><span>聚焦搜索框（管理 tab）</span></li>
              <li><kbd>R</kbd><span>打开自定义日期范围</span></li>
              <li><kbd>↑</kbd><span>详情面板：上一条</span></li>
              <li><kbd>↓</kbd><span>详情面板：下一条</span></li>
              <li><kbd>Esc</kbd><span>关闭详情/对话框/快捷键面板</span></li>
              <li><kbd>?</kbd><span>显示/隐藏本面板</span></li>
            </ul>
            <footer><small>在输入框、文本域和 select 中时，快捷键不会触发，避免误操作。</small></footer>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <button v-if="activeTab === 'overview'" type="button" class="review-shortcuts-trigger" aria-label="显示键盘快捷键" title="显示键盘快捷键（按 ?）" @click="shortcutsPanelOpen = true">
      <Keyboard :size="14" />
    </button>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Activity, ArrowRight, BarChart3, BellRing, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, Coffee, Download, ExternalLink, Eye, FileText, History, Keyboard, Lightbulb, Pencil, Play, RotateCcw, Search, SlidersHorizontal, Sparkles, Timer, Trash2, TrendingDown, TrendingUp, X } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { saveTextFile } from '@/services/platform'
import FocusRewardBadge from './FocusRewardBadge.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import ReviewRangeControl from './ReviewRangeControl.vue'
import ReviewSelect from './ReviewSelect.vue'
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

// 自绘下拉的选项（ReviewSelect 用，替换原生 select 以获得一致外观）
const FOCUS_RESULT_OPTIONS = [
  { value: 'all', label: '全部结果' },
  { value: 'completed', label: '已完成' },
  { value: 'unfinished', label: '中断或放弃' }
]
const FOCUS_PHASE_OPTIONS = [
  { value: 'all', label: '专注与休息' },
  { value: 'focus', label: '仅专注' },
  { value: 'break', label: '仅休息' }
]
const FOCUS_PAUSE_OPTIONS = [
  { value: 'all', label: '全部暂停情况' },
  { value: 'paused', label: '有暂停' },
  { value: 'unpaused', label: '无暂停' }
]
const FOCUS_SORT_OPTIONS = [
  { value: 'newest', label: '最新在前' },
  { value: 'oldest', label: '最早在前' },
  { value: 'longest', label: '时长从长到短' }
]
const RHYTHM_ACTION_OPTIONS = [
  { value: 'all', label: '全部结果' },
  { value: 'completed', label: '已完成' },
  { value: 'snoozed', label: '已延后' },
  { value: 'skipped', label: '跳过或关闭' }
]
const RHYTHM_TRIGGER_OPTIONS = [
  { value: 'all', label: '全部触发方式' },
  { value: 'interval', label: '间隔提醒' },
  { value: 'fixed-time', label: '固定时刻' },
  { value: 'active-duration', label: '连续活跃' }
]
const RHYTHM_SORT_OPTIONS = [
  { value: 'newest', label: '最新在前' },
  { value: 'oldest', label: '最早在前' },
  { value: 'slowest', label: '响应最慢在前' }
]

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
const PAGE_SIZE_OPTIONS = pageSizes.map(size => ({ value: String(size), label: String(size) }))
// 范围选项：label 用于 selectedRangeLabel 计算属性展示，
// 但 UI 渲染已统一交给 ReviewRangeControl 组件。
// 这里只保留 selectedRange 实际读到的 id / days 字段。
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
const recentKindOptions = [
  { id: 'all', label: '全部' },
  { id: 'focus', label: '仅专注' },
  { id: 'rhythm', label: '仅节律' }
]
// 最近发生按分类的可用数量：用于切换按钮徽标和加权提示
const recentKindCounts = computed(() => {
  const focus = focusHistory.value.length
  const rhythm = rhythmHistory.value.length
  return { all: focus + rhythm, focus, rhythm }
})

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
  // 长范围时稀疏化 x 轴刻度：约 10 个标签，避免日期糊成一团
  const labelEvery = days <= 7 ? 1 : Math.max(1, Math.round(days / 10))
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = dateKey(date)
    const records = focusEntries.value.filter(item => dateKey(item.finishedAt) === key)
    const seconds = records.reduce((total, item) => total + item.elapsedSeconds, 0)
    const dayOfWeek = date.getDay()
    return {
      key,
      seconds,
      records,
      date,
      isToday: key === dateKey(today),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      label: new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date),
      shortLabel: days <= 7 ? `周${'日一二三四五六'[dayOfWeek]}` : `${date.getMonth() + 1}/${date.getDate()}`,
      showLabel: days <= 7 || index % labelEvery === 0 || index === days - 1
    }
  })
})
const trendMax = computed(() => Math.max(...trendDays.value.map(item => item.seconds), 1))
const trendAverage = computed(() => {
  const activeDays = trendDays.value.filter(item => item.seconds > 0)
  if (!activeDays.length) return 0
  return Math.round(activeDays.reduce((t, i) => t + i.seconds, 0) / activeDays.length)
})
// 趋势图 hover：信息卡定位在 hover 柱子的正上方（柱顶之上），不遮挡柱体
// 用 index 而非对象引用定位，避免 trendDays 重算后引用失效
const trendChartRef = ref(null)
const trendTooltipEl = ref(null)
const hoveredTrendIndex = ref(-1)
const trendTooltipPos = ref({ x: 0, y: 0 })
const trendTipSize = ref({ w: 0, h: 0 })
const hoveredTrendDay = computed(() => hoveredTrendIndex.value >= 0 ? (trendDays.value[hoveredTrendIndex.value] || null) : null)
function trendDayAria(day) {
  const base = `${day.label}${day.isToday ? '（今日）' : ''}：${day.seconds ? formatDuration(day.seconds) : '无投入'}`
  return day.records.length ? `${base}，${day.records.length} 段专注` : base
}
function hoverTrendDay(index, event) {
  hoveredTrendIndex.value = index
  if (event) moveTrendTooltip(event)
}
function moveTrendTooltip(event) {
  const el = trendChartRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  trendTooltipPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
}
// 渲染后读取 tooltip 实际尺寸，用于柱顶上方定位
watch(hoveredTrendDay, async (day) => {
  if (!day) return
  await nextTick()
  const el = trendTooltipEl.value
  if (el) trendTipSize.value = { w: el.offsetWidth, h: el.offsetHeight }
})
const trendTooltipStyle = computed(() => {
  if (hoveredTrendIndex.value < 0) return { display: 'none' }
  const el = trendChartRef.value
  const width = el?.clientWidth || 500
  const day = hoveredTrendDay.value
  if (!day) return { display: 'none' }
  const idx = hoveredTrendIndex.value
  const colWidth = width / trendDays.value.length
  const tipW = trendTipSize.value.w || 150
  const tipH = trendTipSize.value.h || 120
  // 水平：优先放柱子右侧；右缘放不下时翻转到左侧，避免遮挡 hover 柱
  const rightX = (idx + 1) * colWidth
  const flip = rightX + 12 + tipW > width - 4
  const left = flip
    ? Math.max(4, idx * colWidth - tipW - 12)
    : Math.min(rightX + 12, width - tipW - 4)
  // 垂直：对齐 hover 柱的柱顶上方；柱顶上方空间不足时顶部贴图表上缘
  const barRatio = day.seconds ? Math.max(8, day.seconds / trendMax.value * 100) / 100 : 0
  const barTop = 0.18 * 180 + 0.68 * 180 * (1 - barRatio)
  const top = Math.max(4, barTop - tipH - 8)
  return { left: `${left}px`, top: `${top}px` }
})
// 范围或数据变化后清掉残留的 hover 状态
watch(trendDays, () => { hoveredTrendIndex.value = -1 })
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

// 响应时间分桶：用户可在「自定义分桶」里改阈值，默认 1 / 5 / 15 分钟
const DEFAULT_BUCKET_FAST = 60
const DEFAULT_BUCKET_MEDIUM = 300
const DEFAULT_BUCKET_SLOW = 900
const REVIEW_BUCKET_PREFS_KEY = 'simple-todo.review-bucket-prefs.v1'
function loadBucketPrefs() {
  if (typeof window === 'undefined' || !window.localStorage) return { fast: DEFAULT_BUCKET_FAST, medium: DEFAULT_BUCKET_MEDIUM, slow: DEFAULT_BUCKET_SLOW }
  try {
    const raw = window.localStorage.getItem(REVIEW_BUCKET_PREFS_KEY)
    if (!raw) return { fast: DEFAULT_BUCKET_FAST, medium: DEFAULT_BUCKET_MEDIUM, slow: DEFAULT_BUCKET_SLOW }
    const parsed = JSON.parse(raw)
    return {
      fast: Math.max(1, Number(parsed.fast) || DEFAULT_BUCKET_FAST),
      medium: Math.max(2, Number(parsed.medium) || DEFAULT_BUCKET_MEDIUM),
      slow: Math.max(3, Number(parsed.slow) || DEFAULT_BUCKET_SLOW)
    }
  } catch { return { fast: DEFAULT_BUCKET_FAST, medium: DEFAULT_BUCKET_MEDIUM, slow: DEFAULT_BUCKET_SLOW } }
}
const bucketPrefs = loadBucketPrefs()
const bucketFast = ref(bucketPrefs.fast)
const bucketMedium = ref(bucketPrefs.medium)
const bucketSlow = ref(bucketPrefs.slow)
const customBucketsOpen = ref(false)
const bucketTriggerRef = ref(null)
const bucketPopoverRef = ref(null)
const bucketTriggerRect = ref({ left: 0, top: 0, width: 0, bottom: 0 })
// 分桶弹窗定位：跟随触发按钮（position: fixed 与页面滚动无关，需随滚动更新）
const bucketPopoverStyle = computed(() => {
  if (!bucketTriggerRect.value.width) return { visibility: 'hidden' }
  const margin = 12
  const popoverWidth = 304
  const desiredLeft = bucketTriggerRect.value.left + bucketTriggerRect.value.width - popoverWidth
  const maxLeft = (typeof window !== 'undefined' ? window.innerWidth : 1024) - popoverWidth - margin
  const minLeft = margin
  const left = Math.max(minLeft, Math.min(desiredLeft, maxLeft))
  return { left: `${left}px`, top: `${bucketTriggerRect.value.bottom + 8}px`, width: `${popoverWidth}px` }
})
function toggleBucketPopover() {
  if (customBucketsOpen.value) customBucketsOpen.value = false
  else { updateBucketTriggerRect(); customBucketsOpen.value = true }
}
function updateBucketTriggerRect() {
  const el = bucketTriggerRef.value
  if (!el || typeof window === 'undefined') return
  const rect = el.getBoundingClientRect()
  bucketTriggerRect.value = { left: rect.left, top: rect.top, width: rect.width, bottom: rect.bottom }
}
function onDocClickBucket(event) {
  if (!customBucketsOpen.value) return
  if (bucketTriggerRef.value?.contains(event.target)) return
  if (bucketPopoverRef.value?.contains(event.target)) return
  customBucketsOpen.value = false
}
watch(customBucketsOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    window.addEventListener('scroll', updateBucketTriggerRect, true)
    window.addEventListener('resize', updateBucketTriggerRect)
  } else {
    window.removeEventListener('scroll', updateBucketTriggerRect, true)
    window.removeEventListener('resize', updateBucketTriggerRect)
  }
})
function resetBuckets() {
  bucketFast.value = DEFAULT_BUCKET_FAST
  bucketMedium.value = DEFAULT_BUCKET_MEDIUM
  bucketSlow.value = DEFAULT_BUCKET_SLOW
}
watch([bucketFast, bucketMedium, bucketSlow], ([fast, medium, slow]) => {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(REVIEW_BUCKET_PREFS_KEY, JSON.stringify({ fast, medium, slow }))
  } catch { /* 配额超限不影响功能 */ }
})

const rhythmResponseBuckets = computed(() => {
  const fast = Math.max(1, Number(bucketFast.value) || DEFAULT_BUCKET_FAST)
  const medium = Math.max(fast + 1, Number(bucketMedium.value) || DEFAULT_BUCKET_MEDIUM)
  const slow = Math.max(medium + 1, Number(bucketSlow.value) || DEFAULT_BUCKET_SLOW)
  function fmt(seconds) {
    if (seconds < 60) return `${seconds} 秒内`
    if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟内`
    return `${(seconds / 3600).toFixed(1)} 小时内`
  }
  const buckets = [
    { id: 'fast', label: fmt(fast), min: 0, max: fast, count: 0 },
    { id: 'normal', label: `${fmt(medium - fast).replace('内', '')} – ${fmt(medium)}`, min: fast, max: medium, count: 0 },
    { id: 'slow', label: `${fmt(slow - medium).replace('内', '')} – ${fmt(slow)}`, min: medium, max: slow, count: 0 },
    { id: 'verySlow', label: `${fmt(slow)}以上`, min: slow, max: Infinity, count: 0 }
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

// 工作日 vs 周末对比
function isWeekend(dateValue) {
  const d = new Date(dateValue)
  const day = d.getDay()
  return day === 0 || day === 6
}
const rhythmWeekdaySummary = computed(() => {
  const weekday = { count: 0, completed: 0 }
  const weekend = { count: 0, completed: 0 }
  rhythmEntries.value.forEach(item => {
    const bucket = isWeekend(item.triggeredAt) ? weekend : weekday
    bucket.count += 1
    if (['completed', 'natural-break'].includes(item.action)) bucket.completed += 1
  })
  const total = rhythmEntries.value.length
  return {
    weekday: { ...weekday, percent: total ? Math.round(weekday.count / total * 100) : 0, completionRate: weekday.count ? Math.round(weekday.completed / weekday.count * 100) : 0 },
    weekend: { ...weekend, percent: total ? Math.round(weekend.count / total * 100) : 0, completionRate: weekend.count ? Math.round(weekend.completed / weekend.count * 100) : 0 }
  }
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
const previousRhythmEntries = computed(() => {
  if (!previousRangeStart.value) return []
  const { start, end } = previousRangeStart.value
  return store.rhythmHistory.filter(item => {
    const t = new Date(item.resolvedAt).getTime()
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
// 暂停：次数差与累计暂停时长差
const previousPauseCount = computed(() => previousFocusEntries.value.reduce((total, item) => total + focusPauseCount(item), 0))
const previousPausedSeconds = computed(() => previousFocusEntries.value.reduce((total, item) => total + focusPausedSeconds(item), 0))
const pauseCountDelta = computed(() => {
  if (!previousRangeStart.value) return 0
  return totalPauseCount.value - previousPauseCount.value
})
const pauseSecondsDelta = computed(() => {
  if (!previousRangeStart.value) return 0
  if (previousPausedSeconds.value === 0) return totalPausedSeconds.value > 0 ? 100 : 0
  return Math.round((totalPausedSeconds.value - previousPausedSeconds.value) / previousPausedSeconds.value * 100)
})
// 节律：响应数差与完成率差
const previousRhythmCompletionRate = computed(() => {
  if (!previousRhythmEntries.value.length) return 0
  const done = previousRhythmEntries.value.filter(item => ['completed', 'natural-break'].includes(item.action)).length
  return Math.round(done / previousRhythmEntries.value.length * 100)
})
const rhythmCountDelta = computed(() => {
  if (!previousRangeStart.value) return 0
  return rhythmEntries.value.length - previousRhythmEntries.value.length
})
const rhythmRateDelta = computed(() => {
  if (!previousRangeStart.value) return 0
  return rhythmCompletionRate.value - previousRhythmCompletionRate.value
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

  // 洞察阈值随数据量动态调：数据越多阈值越严，数据越少阈值越松，
  // 避免小样本用户长期看不到任何亮点。
  const totalFocus = focusEntries.value.length
  const totalRhythm = rhythmEntries.value.length
  const deltaThreshold = totalFocus < 5 ? 10 : totalFocus < 15 ? 15 : 20
  const rateUpper = totalFocus < 5 ? 70 : totalFocus < 15 ? 75 : 80
  const rateLower = totalFocus < 5 ? 60 : totalFocus < 15 ? 50 : 40
  const longestThreshold = totalFocus < 5 ? 10 * 60 : totalFocus < 15 ? 18 * 60 : 25 * 60

  // 亮点 1：相比上周期的时间变化
  if (previousRangeStart.value && previousFocusSeconds.value > 0) {
    if (focusSecondsDelta.value >= deltaThreshold) {
      const max = Math.max(totalFocusSeconds.value, previousFocusSeconds.value) || 1
      result.push({
        type: 'positive',
        icon: TrendingUp,
        text: `比上周期多专注了 ${Math.abs(focusSecondsDelta.value)}%`,
        detail: `新增 ${formatCompactDuration(totalFocusSeconds.value - previousFocusSeconds.value)}`,
        bar: { prev: Math.round(previousFocusSeconds.value / max * 100), current: Math.round(totalFocusSeconds.value / max * 100) }
      })
    } else if (focusSecondsDelta.value <= -deltaThreshold) {
      const max = Math.max(totalFocusSeconds.value, previousFocusSeconds.value) || 1
      result.push({
        type: 'caution',
        icon: TrendingDown,
        text: `比上周期少了 ${Math.abs(focusSecondsDelta.value)}%`,
        detail: `少了 ${formatCompactDuration(previousFocusSeconds.value - totalFocusSeconds.value)}`,
        bar: { prev: Math.round(previousFocusSeconds.value / max * 100), current: Math.round(totalFocusSeconds.value / max * 100) }
      })
    }
  }

  // 亮点 2：单次最长专注（可点击查看详情，带日期上下文）
  if (focusEntries.value.length) {
    const longest = focusEntries.value.reduce((max, item) => item.elapsedSeconds > max.elapsedSeconds ? item : max, focusEntries.value[0])
    if (longest.elapsedSeconds >= longestThreshold) {
      result.push({
        type: 'positive',
        icon: Sparkles,
        text: `最长一次专注 ${formatCompactDuration(longest.elapsedSeconds)}`,
        detail: focusTitle(longest),
        when: formatShortDate(longest.finishedAt),
        kind: 'focus',
        item: longest
      })
    }
  }

  // 亮点 3：完成率
  if (totalFocus >= 3) {
    if (focusCompletionRate.value >= rateUpper) {
      result.push({
        type: 'positive',
        icon: Activity,
        text: `完成率 ${focusCompletionRate.value}%`,
        detail: `高于 ${rateUpper}% 表示${totalFocus < 15 ? '已经有不错的' : '很稳定的'}投入节奏`
      })
    } else if (focusCompletionRate.value < rateLower) {
      result.push({
        type: 'caution',
        icon: Activity,
        text: `完成率仅 ${focusCompletionRate.value}%`,
        detail: '可考虑把专注目标设小一点'
      })
    }
  }

  // 亮点 4：节律响应
  if (totalRhythm >= 2) {
    const rhythmUpper = totalRhythm < 5 ? 70 : 80
    if (rhythmCompletionRate.value >= rhythmUpper) {
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
// 概览"最近发生"：类型过滤 + 关键词搜索（任务 / 提醒 / 备注 / 方式）
const recentSearch = ref('')
const recentRecords = computed(() => [
  ...focusHistory.value.map(item => ({ kind: 'focus', item, at: item.finishedAt })),
  ...rhythmHistory.value.map(item => ({ kind: 'rhythm', item, at: item.resolvedAt }))
].filter(record => recentKind.value === 'all' || record.kind === recentKind.value)
  .filter(record => {
    const query = recentSearch.value.trim().toLocaleLowerCase('zh-CN')
    if (!query) return true
    const title = recordTitle(record).toLocaleLowerCase('zh-CN')
    const note = (record.item.note || '').toLocaleLowerCase('zh-CN')
    const detail = record.kind === 'focus' ? profileName(record.item.profileId, record.item) : triggerTypeLabel(record.item.triggerType)
    return title.includes(query) || note.includes(query) || detail.includes(query)
  })
  .sort((a, b) => new Date(b.at) - new Date(a.at)))
// 按天分组：解决长范围下记录堆叠无法定位的问题；组内同样按时间倒序
const recentGroups = computed(() => {
  const groups = []
  const byKey = new Map()
  recentRecords.value.forEach(record => {
    const key = dateKey(record.at)
    let group = byKey.get(key)
    if (!group) {
      group = { key, label: recentDayLabel(record.at), records: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    group.records.push(record)
  })
  return groups
})
function recentDayLabel(at) {
  const date = new Date(at)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((today - dayStart) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return formatShortDate(at)
}
// 展开控制：默认展开前 2 天；单天记录超过上限时默认折叠该天的其余条目
const INITIAL_RECENT_GROUPS = 2
const DAY_PAGE_SIZE = 6
const recentShownGroups = ref(INITIAL_RECENT_GROUPS)
const expandedDayKeys = ref(new Set())
function isDayExpanded(key) { return expandedDayKeys.value.has(key) }
function toggleDayExpand(key) {
  const next = new Set(expandedDayKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedDayKeys.value = next
}
function groupVisibleRecords(group) {
  return isDayExpanded(group.key) ? group.records : group.records.slice(0, DAY_PAGE_SIZE)
}
function recentDayRemainingCount(group) { return Math.max(0, group.records.length - DAY_PAGE_SIZE) }
const recentVisibleRecords = computed(() => recentGroups.value.slice(0, recentShownGroups.value).flatMap(group => groupVisibleRecords(group)))
const recentRemainingCount = computed(() => recentGroups.value.slice(recentShownGroups.value).reduce((total, group) => total + group.records.length, 0))
const recentSelectionCount = computed(() => {
  let n = 0
  selectedFocusIds.value.forEach(() => { n += 1 })
  selectedRhythmIds.value.forEach(() => { n += 1 })
  // 概览只显示当前可见的条目，选中只在 visible 子集里计
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
  recentShownGroups.value = Math.min(recentGroups.value.length, recentShownGroups.value + 2)
}
function setRecentKind(id) {
  recentKind.value = id
  // 切换类型时重置"显示更多"展开位置（保留搜索词，便于在子类型里继续搜）
  recentShownGroups.value = INITIAL_RECENT_GROUPS
  expandedDayKeys.value = new Set()
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
// 批量导出选中：复用 exportFocusCsv/exportRhythmCsv 的实现，把数据源换成选中子集
async function exportSelectedFocus() {
  const ids = selectedFocusIds.value
  if (!ids.size) return
  const records = filteredFocusRecords.value.filter(item => ids.has(item.id))
  if (!records.length) { store.showNotice('当前选中已不在筛选结果中', 'info'); return }
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
    await saveTextFile(`专注记录-选中-${rangeTag()}-${dateKey(new Date())}.csv`, csv, 'csv')
    store.showNotice(`已导出选中 ${records.length} 条专注记录`, 'success')
  } catch (error) {
    if (error !== '已取消保存') store.showNotice(`导出失败：${error}`, 'error')
  }
}
async function exportSelectedRhythm() {
  const ids = selectedRhythmIds.value
  if (!ids.size) return
  const records = filteredRhythmRecords.value.filter(item => ids.has(item.id))
  if (!records.length) { store.showNotice('当前选中已不在筛选结果中', 'info'); return }
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
    await saveTextFile(`节律记录-选中-${rangeTag()}-${dateKey(new Date())}.csv`, csv, 'csv')
    store.showNotice(`已导出选中 ${records.length} 条节律记录`, 'success')
  } catch (error) {
    if (error !== '已取消保存') store.showNotice(`导出失败：${error}`, 'error')
  }
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
// 文件名后缀：把当前范围映射成短标签，避免出现「近-7-天」这种奇怪分隔
function rangeTag() {
  if (range.value === 'custom') return `${customStart.value || '...'}至${customEnd.value || '...'}`
  const option = ranges.find(item => item.id === range.value)
  return option ? option.label.replace(/\s+/g, '') : range.value
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
    await saveTextFile(`专注记录-${rangeTag()}-${dateKey(new Date())}.csv`, csv, 'csv')
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
    await saveTextFile(`节律记录-${rangeTag()}-${dateKey(new Date())}.csv`, csv, 'csv')
    store.showNotice(`已导出 ${records.length} 条节律记录`, 'success')
  } catch (error) {
    if (error !== '已取消保存') store.showNotice(`导出失败：${error}`, 'error')
  }
}
// 导出下拉菜单状态
const exportMenuOpen = ref({ overview: false, focus: false, rhythm: false })
function toggleExportMenu(key) { exportMenuOpen.value[key] = !exportMenuOpen.value[key] }
function closeAllExportMenus() { exportMenuOpen.value = { overview: false, focus: false, rhythm: false } }
function onDocClickExport(event) {
  if (!event.target.closest('.review-export-menu')) closeAllExportMenus()
}
onMounted(() => {
  document.addEventListener('click', onDocClickExport)
  document.addEventListener('click', onDocClickBucket)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClickExport)
  document.removeEventListener('click', onDocClickBucket)
})
async function exportFocusJson() {
  const records = filteredFocusRecords.value
  if (!records.length) { store.showNotice('当前筛选条件下没有可导出的专注记录', 'info'); return }
  const payload = {
    kind: 'focus-records',
    generatedAt: new Date().toISOString(),
    range: range.value,
    customRange: range.value === 'custom' ? { start: customStart.value, end: customEnd.value } : null,
    filters: {
      result: focusResult.value, phase: focusPhase.value, pause: focusPause.value, sort: focusSort.value,
      search: focusSearch.value || null
    },
    stats: {
      totalSeconds: filteredFocusSeconds.value,
      completionRate: filteredFocusCompletionRate.value,
      pauseCount: filteredFocusPauseCount.value,
      pausedSeconds: filteredFocusPausedSeconds.value
    },
    records: records.map(item => ({
      id: item.id,
      startedAt: item.startedAt,
      finishedAt: item.finishedAt,
      elapsedSeconds: item.elapsedSeconds,
      phase: item.phase,
      result: item.result,
      profileId: item.profileId,
      profileName: profileName(item.profileId, item),
      taskId: item.taskId,
      taskTitle: focusTitle(item),
      pauseCount: focusPauseCount(item),
      pausedSeconds: focusPausedSeconds(item),
      note: item.note || null,
      reward: item.reward || null,
      timeline: item.timeline || null
    }))
  }
  const json = JSON.stringify(payload, null, 2)
  try {
    await saveTextFile(`专注记录-${rangeTag()}-${dateKey(new Date())}.json`, json, 'json')
    store.showNotice(`已导出 ${records.length} 条专注记录（JSON）`, 'success')
  } catch (error) {
    if (error !== '已取消保存') store.showNotice(`导出失败：${error}`, 'error')
  }
}
async function exportRhythmJson() {
  const records = filteredRhythmRecords.value
  if (!records.length) { store.showNotice('当前筛选条件下没有可导出的节律记录', 'info'); return }
  const payload = {
    kind: 'rhythm-records',
    generatedAt: new Date().toISOString(),
    range: range.value,
    customRange: range.value === 'custom' ? { start: customStart.value, end: customEnd.value } : null,
    filters: {
      action: rhythmAction.value, trigger: rhythmTrigger.value, sort: rhythmSort.value,
      search: rhythmSearch.value || null
    },
    stats: {
      totalCount: records.length,
      completionRate: filteredRhythmCompletionRate.value,
      averageResponseSeconds: filteredRhythmResponseAverage.value,
      snoozeCount: filteredRhythmSnoozeCount.value
    },
    records: records.map(item => ({
      id: item.id,
      reminderId: item.reminderId,
      reminderTitle: item.reminderTitle,
      triggerType: item.triggerType,
      triggerLabel: item.triggerLabel || null,
      triggeredAt: item.triggeredAt,
      resolvedAt: item.resolvedAt,
      action: item.action,
      responseSeconds: item.responseSeconds,
      snoozeMinutes: item.snoozeMinutes || null,
      note: item.note || null,
      timeline: rhythmTimeline(item)
    }))
  }
  const json = JSON.stringify(payload, null, 2)
  try {
    await saveTextFile(`节律记录-${rangeTag()}-${dateKey(new Date())}.json`, json, 'json')
    store.showNotice(`已导出 ${records.length} 条节律记录（JSON）`, 'success')
  } catch (error) {
    if (error !== '已取消保存') store.showNotice(`导出失败：${error}`, 'error')
  }
}

// Markdown 周报：当前范围的数据摘要 + 洞察 + 节律分布 + 最近记录，方便汇报 / 记录到笔记工具
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
    insights.value.forEach(item => lines.push(`- **${item.text}**${item.detail ? `：${item.detail}` : ''}${item.when ? `（${item.when}）` : ''}`))
    lines.push('')
  }
  if (rhythmEntries.value.length) {
    lines.push('## 节律执行')
    lines.push('')
    lines.push('| 结果 | 次数 | 占比 |')
    lines.push('| --- | --- | --- |')
    rhythmActionSummary.value.forEach(item => lines.push(`| ${item.label} | ${item.count} | ${item.percent}% |`))
    lines.push('')
    lines.push('| 响应速度 | 次数 | 占比 |')
    lines.push('| --- | --- | --- |')
    rhythmResponseBuckets.value.forEach(b => lines.push(`| ${b.label} | ${b.count} | ${b.percent}% |`))
    lines.push('')
    lines.push('| 提醒时段 | 次数 | 占比 |')
    lines.push('| --- | --- | --- |')
    rhythmHourBuckets.value.forEach(b => lines.push(`| ${b.label} | ${b.count} | ${b.percent}% |`))
    lines.push('')
    lines.push(`| 分组 | 次数 | 完成率 |`)
    lines.push('| --- | --- | --- |')
    lines.push(`| 工作日 | ${rhythmWeekdaySummary.value.weekday.count} | ${rhythmWeekdaySummary.value.weekday.completionRate}% |`)
    lines.push(`| 周末 | ${rhythmWeekdaySummary.value.weekend.count} | ${rhythmWeekdaySummary.value.weekend.completionRate}% |`)
    lines.push('')
  }
  if (recentRecords.value.length) {
    lines.push('## 最近记录')
    lines.push('')
    lines.push('| 时间 | 类型 | 内容 | 结果 |')
    lines.push('| --- | --- | --- | --- |')
    recentRecords.value.slice(0, 20).forEach(record => {
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

// HTML 报告：自包含单文件（内联样式 + canvas 手绘图表 base64 内嵌），零依赖，
// 浏览器 / 系统打印即可另存为 PDF。图表颜色与页面主色保持一致。
const REPORT_CHART_COLORS = {
  weekday: '#8a75e3',
  weekend: '#6a9bc3',
  average: '#5d89b0',
  muted: '#9aa5a3',
  grid: '#e8eceb',
  slot: '#f0f2f2',
  text: '#4a5553'
}
function reportCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}
function drawTrendChart() {
  const days = trendDays.value
  if (!days.length) return null
  const canvas = reportCanvas(760, 280)
  const ctx = canvas.getContext('2d')
  const max = trendMax.value || 1
  const average = trendAverage.value
  const pad = { top: 20, right: 16, bottom: 26, left: 56 }
  const innerW = canvas.width - pad.left - pad.right
  const innerH = canvas.height - pad.top - pad.bottom
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'right'
  // y 轴网格与刻度
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + innerH - (innerH * i / 4)
    ctx.strokeStyle = REPORT_CHART_COLORS.grid
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + innerW, y); ctx.stroke()
    ctx.fillStyle = REPORT_CHART_COLORS.muted
    ctx.fillText(formatCompactDuration(max * i / 4), pad.left - 8, y + 4)
  }
  // 柱体
  const slot = innerW / days.length
  const barWidth = Math.max(2, Math.min(14, slot * 0.62))
  days.forEach((day, idx) => {
    if (!day.seconds) return
    const x = pad.left + slot * idx + (slot - barWidth) / 2
    const barH = Math.max(2, day.seconds / max * innerH)
    ctx.fillStyle = day.isWeekend ? REPORT_CHART_COLORS.weekend : REPORT_CHART_COLORS.weekday
    ctx.fillRect(x, pad.top + innerH - barH, barWidth, barH)
  })
  // 日均虚线
  if (average) {
    const y = pad.top + innerH - (average / max * innerH)
    ctx.setLineDash([5, 4])
    ctx.strokeStyle = REPORT_CHART_COLORS.average
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + innerW, y); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = REPORT_CHART_COLORS.average
    ctx.textAlign = 'left'
    ctx.fillText(`日均 ${formatCompactDuration(average)}`, pad.left + 8, y - 5)
  }
  // x 轴标签（稀疏）
  ctx.fillStyle = REPORT_CHART_COLORS.muted
  ctx.textAlign = 'center'
  days.forEach((day, idx) => {
    if (!day.showLabel) return
    ctx.fillText(day.shortLabel, pad.left + slot * idx + slot / 2, canvas.height - 8)
  })
  return canvas.toDataURL('image/png')
}
function drawBarList(items) {
  if (!items.length) return null
  const canvas = reportCanvas(760, Math.max(120, 34 + items.length * 34))
  const ctx = canvas.getContext('2d')
  const pad = { top: 14, right: 56, bottom: 14, left: 150 }
  const innerW = canvas.width - pad.left - pad.right
  const rowH = (canvas.height - pad.top - pad.bottom) / items.length
  ctx.font = '12px sans-serif'
  items.forEach((item, idx) => {
    const y = pad.top + rowH * idx + rowH / 2
    ctx.textAlign = 'right'
    ctx.fillStyle = REPORT_CHART_COLORS.text
    ctx.fillText(item.label, pad.left - 10, y + 4)
    ctx.fillStyle = REPORT_CHART_COLORS.slot
    ctx.fillRect(pad.left, y - 7, innerW, 14)
    const barWidth = Math.max(2, innerW * item.percent / 100)
    ctx.fillStyle = item.color
    ctx.fillRect(pad.left, y - 7, barWidth, 14)
    ctx.textAlign = 'left'
    ctx.fillStyle = REPORT_CHART_COLORS.text
    ctx.fillText(`${item.count} 次 · ${item.percent}%`, pad.left + barWidth + 8, y + 4)
  })
  return canvas.toDataURL('image/png')
}
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function buildHtmlReport() {
  const parts = []
  const css = [
    'body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:840px;margin:28px auto;padding:0 18px;color:#2b3331;line-height:1.55}',
    'h1{font-size:26px;margin:0 0 6px;letter-spacing:-.02em}',
    '.meta{color:#7a8582;font-size:12px;margin:0 0 4px}',
    'section{margin:24px 0}',
    'h2{font-size:15px;margin:0 0 10px;padding-left:9px;border-left:3px solid #8a75e3}',
    'img{width:100%;border:1px solid #e4e8e7;border-radius:10px}',
    'table{width:100%;border-collapse:collapse;font-size:12px}',
    'th,td{padding:7px 10px;border-bottom:1px solid #eef0f0;text-align:left;vertical-align:top}',
    'th{background:#f7f8f8;color:#7a8582;font-weight:600}',
    '.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}',
    '@media(max-width:720px){.metrics{grid-template-columns:repeat(2,1fr)}}',
    '.metric{border:1px solid #e4e8e7;border-radius:10px;padding:12px 14px}',
    '.metric span{font-size:11px;color:#7a8582;display:block}',
    '.metric b{display:block;font-size:20px;margin-top:4px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}',
    'ul.highlights{list-style:none;padding:0;margin:0}',
    'ul.highlights li{padding:9px 12px;background:#f7f5ff;border-radius:8px;margin:6px 0;font-size:13px}',
    'footer{margin-top:30px;color:#9aa5a3;font-size:11px;border-top:1px solid #eef0f0;padding-top:10px}'
  ].join('')
  parts.push(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>专注回顾报告（${escapeHtml(selectedRangeLabel.value)}）</title><style>${css}</style></head><body>`)
  parts.push(`<h1>专注回顾报告</h1>`)
  parts.push(`<p class="meta">范围：${escapeHtml(selectedRangeLabel.value)} · ${focusEntries.length} 段专注 · ${rhythmEntries.length} 次节律 · 生成时间：${escapeHtml(formatFullDateTime(new Date()))}</p>`)
  // 概览指标
  parts.push('<section><h2>数据摘要</h2><div class="metrics">')
  const metrics = [
    { label: '有效专注', value: formatDuration(totalFocusSeconds.value), sub: `${focusEntries.value.length} 段 · ${focusActiveDays.value} 天有投入` },
    { label: '专注完成率', value: `${focusCompletionRate.value}%`, sub: `${completedFocusEntries.value.length} 段自然完成` },
    { label: '暂停', value: `${totalPauseCount.value} 次`, sub: `累计 ${formatDuration(totalPausedSeconds.value)}` },
    { label: '节律响应', value: `${rhythmEntries.value.length} 次`, sub: `${rhythmCompletionRate.value}% 完成或自然离席` }
  ]
  metrics.forEach(metric => parts.push(`<div class="metric"><span>${escapeHtml(metric.label)}</span><b>${escapeHtml(metric.value)}</b><span>${escapeHtml(metric.sub)}</span></div>`))
  parts.push('</div></section>')
  // 本期亮点
  if (insights.value.length) {
    parts.push('<section><h2>本期亮点</h2><ul class="highlights">')
    insights.value.forEach(item => parts.push(`<li><b>${escapeHtml(item.text)}</b>${item.detail ? `：${escapeHtml(item.detail)}` : ''}${item.when ? `（${escapeHtml(item.when)}）` : ''}</li>`))
    parts.push('</ul></section>')
  }
  // 专注趋势图
  const trendImg = drawTrendChart()
  if (trendImg) {
    parts.push('<section><h2>专注趋势</h2><img src="' + trendImg + '" alt="每日专注时长趋势图" /></section>')
  }
  // 节律执行图
  if (rhythmEntries.value.length) {
    parts.push('<section><h2>节律执行</h2>')
    const actionImg = drawBarList(rhythmActionSummary.value.map(item => ({ label: item.label, count: item.count, percent: item.percent, color: item.action === 'completed' ? '#8a75e3' : item.action === 'snoozed' ? '#d69c42' : '#89918f' })))
    if (actionImg) parts.push('<img src="' + actionImg + '" alt="节律处理结果分布" style="margin-bottom:10px" />')
    const responseImg = drawBarList(rhythmResponseBuckets.value.map(b => ({ label: b.label, count: b.count, percent: b.percent, color: '#8a75e3' })))
    if (responseImg) parts.push('<img src="' + responseImg + '" alt="响应速度分布" style="margin-bottom:10px" />')
    const hourImg = drawBarList(rhythmHourBuckets.value.map(b => ({ label: b.label, count: b.count, percent: b.percent, color: '#6a9bc3' })))
    if (hourImg) parts.push('<img src="' + hourImg + '" alt="提醒时段分布" />')
    parts.push('</section>')
  }
  // 最近记录
  if (recentRecords.value.length) {
    parts.push('<section><h2>最近记录</h2><table><thead><tr><th>时间</th><th>类型</th><th>内容</th><th>结果</th></tr></thead><tbody>')
    recentRecords.value.slice(0, 20).forEach(record => {
      const type = record.kind === 'focus' ? '专注' : '节律'
      const content = recordTitle(record)
      const result = record.kind === 'focus'
        ? `${formatCompactDuration(record.item.elapsedSeconds)} · ${resultLabel(record.item.result)}`
        : `${rhythmActionLabel(record.item.action)} · ${formatResponseTime(record.item.responseSeconds)}`
      parts.push(`<tr><td>${escapeHtml(formatShortDate(record.at))}</td><td>${escapeHtml(type)}</td><td>${escapeHtml(content)}</td><td>${escapeHtml(result)}</td></tr>`)
    })
    parts.push('</tbody></table></section>')
  }
  parts.push('<footer>由易简清单自动生成 · 此文件可直接打印为 PDF</footer></body></html>')
  return parts.join('')
}
async function exportFocusHtmlReport() {
  const html = buildHtmlReport()
  try {
    await saveTextFile(`专注回顾报告-${dateKey(new Date())}.html`, html, 'html')
    store.showNotice('报告已导出为 HTML（含图表，可用浏览器打印为 PDF）', 'success')
  } catch (error) {
    if (error !== '已取消保存') store.showNotice(`导出失败：${error}`, 'error')
  }
}

watch([range], () => {
  focusPage.value = 1
  rhythmPage.value = 1
  recentShownGroups.value = INITIAL_RECENT_GROUPS
  expandedDayKeys.value = new Set()
  // 范围切换时滚顶，避免停留在上个范围的中段
  if (typeof window !== 'undefined' && workspaceRef.value) {
    nextTick(() => workspaceRef.value?.scrollTo({ top: 0, behavior: 'smooth' }))
  }
})
watch([focusSearch, focusResult, focusPhase, focusPause, focusSort, focusPageSize], () => {
  focusPage.value = 1
  if (typeof window !== 'undefined' && workspaceRef.value && activeTab.value === 'focus') {
    nextTick(() => workspaceRef.value?.scrollTo({ top: 0, behavior: 'smooth' }))
  }
})
watch([rhythmSearch, rhythmAction, rhythmTrigger, rhythmSort, rhythmPageSize], () => {
  rhythmPage.value = 1
  if (typeof window !== 'undefined' && workspaceRef.value && activeTab.value === 'rhythm') {
    nextTick(() => workspaceRef.value?.scrollTo({ top: 0, behavior: 'smooth' }))
  }
})
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
  if (!detail.value || !noteDraft.value.trim()) return
  if (detail.value.kind === 'focus') store.updateFocusNote(detail.value.item.id, noteDraft.value.trim())
  else store.updateRhythmNote(detail.value.item.id, noteDraft.value.trim())
  // detail.value.item 是 store 内的同一引用，应该会响应式更新
  editingNote.value = false
}
function openRhythmRule() {
  // 切到节律模块，让用户能编辑提醒规则；关闭详情避免数据混合
  closeDetail()
  store.setClockView('rhythm')
}
function openRhythmRuleFromRow(item) {
  // 行内"查看规则"：保留当前管理 tab 状态，跳到节律模块
  store.setClockView('rhythm')
  if (item?.reminderTitle) {
    store.showNotice(`已跳到节律提醒，可在「${item.reminderTitle}」的配置中查看完整规则`, 'info')
  }
}
function openLinkedTask(item) {
  // 从专注详情跳回任务工作台：切到任务模块、打开全部视图并选中关联任务
  const task = store.activeTasks.find(t => t.id === item.taskId)
  closeDetail()
  store.setActiveModule('tasks')
  store.setView('inbox')
  store.selectTask(item.taskId)
  if (task) store.showNotice(`已打开任务「${task.title}」`, 'info')
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

// 键盘快捷键：Alt+1/2/3 切 tab；详情面板 ↑/↓ 切上一条/下一条；Esc 关闭；
// / 聚焦搜索框；? 显示快捷键面板；r 切到自定义范围
const shortcutsPanelOpen = ref(false)
const searchInputRef = ref(null)
function focusSearchInput() {
  if (activeTab.value === 'overview') return
  const selector = activeTab.value === 'focus' ? 'input[placeholder*="任务"]' : 'input[placeholder*="提醒"]'
  const el = workspaceRef.value?.querySelector(selector)
  if (el && typeof el.focus === 'function') {
    el.focus()
    el.select?.()
  }
}
function handleKeydown(event) {
  const tag = (event.target?.tagName || '').toLowerCase()
  const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'
  if (event.key === 'Escape') {
    if (customBucketsOpen.value) { customBucketsOpen.value = false; return }
    if (shortcutsPanelOpen.value) { shortcutsPanelOpen.value = false; return }
    if (detail.value) { closeDetail(); return }
    if (confirmDialog.visible) { confirmDialog.visible = false; return }
  }
  if (isInput) return
  if (event.altKey && !event.ctrlKey && !event.metaKey) {
    if (event.key === '1') { event.preventDefault(); selectTab('overview'); return }
    if (event.key === '2') { event.preventDefault(); selectTab('focus'); return }
    if (event.key === '3') { event.preventDefault(); selectTab('rhythm'); return }
  }
  if (event.key === '/' && activeTab.value !== 'overview') { event.preventDefault(); focusSearchInput(); return }
  if (event.key === '?' || (event.shiftKey && event.key === '/')) { event.preventDefault(); shortcutsPanelOpen.value = !shortcutsPanelOpen.value; return }
  if (event.key.toLowerCase() === 'r' && !event.altKey && !event.ctrlKey && !event.metaKey) { event.preventDefault(); range.value = 'custom'; return }
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
.review-header > div:first-child { min-width: 0; }
.review-header .eyebrow { margin: 0 0 5px; color: var(--accent-strong); font-size: 11px; font-weight: 750; letter-spacing: .08em; }
.review-header h1 { margin: 0; color: var(--text); font-size: clamp(26px, 3vw, 34px); letter-spacing: -.045em; line-height: 1.18; }
.review-header > div > p:last-child { margin: 8px 0 0; color: var(--text-muted); font-size: 13px; }
.review-range-block { display: flex; justify-content: flex-end; flex-shrink: 0; }
.review-tabs { display: flex; gap: 5px; margin-bottom: 13px; padding: 5px; border: 1px solid var(--divider-soft); border-radius: 14px; background-color: var(--surface); }
.review-tabs button { display: inline-flex; min-height: 42px; align-items: center; gap: 7px; padding: 0 13px; border-radius: 10px; color: var(--text-muted); font-size: 12px; font-weight: 680; }
.review-tabs button:hover { color: var(--text); background: var(--surface-muted); }
.review-tabs button.active { color: var(--accent-strong); background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent-20-border-fallback); }
.review-tabs button span { min-width: 18px; padding: 2px 5px; border-radius: 999px; background: var(--surface); color: var(--text-muted); font-size: 9px; text-align: center; }
.review-tabs button:focus-visible, .review-record-list button:focus-visible, .review-detail button:focus-visible { outline: 3px solid var(--accent-20-border-fallback); outline-offset: 2px; }
.review-summary > header p { margin: 0; color: var(--text-muted); font-size: 10px; }
.review-metrics { display: grid; grid-template-columns: 1.25fr repeat(3, minmax(150px, .75fr)); gap: 1px; margin-top: 14px; overflow: hidden; border: 1px solid var(--divider-soft); border-radius: 13px; background: var(--divider-soft); }
.review-metric, .review-card { border: 1px solid var(--divider-soft); border-radius: 18px; background: var(--surface); box-shadow: 0 10px 26px var(--text-4-fallback); }
.review-metric { display: grid; min-height: 116px; align-content: center; gap: 4px; padding: 14px 16px; border: 0; border-radius: 0; box-shadow: none; }
.review-metric > span, .review-metric small { color: var(--text-muted); font-size: 11px; }
.review-metric > strong { color: var(--text); font-size: 25px; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
.review-metric small { line-height: 1.45; }
.review-metric--primary { background: linear-gradient(145deg, var(--accent-tint), var(--surface)); }
.review-metric--primary > strong { font-size: clamp(25px, 2.5vw, 32px); }
.review-metric--rhythm { background: linear-gradient(145deg, var(--surface), color-mix(in srgb, var(--accent-soft) 30%, var(--surface))); }
.review-metric--rhythm .review-metric__delta.is-up { background: var(--accent-soft); color: var(--accent-strong); }
.review-overview-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(330px, 1fr); gap: 12px; margin-top: 12px; }
.review-card { min-width: 0; padding: 18px; }
.review-card > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.review-card > header > div { display: grid; gap: 4px; }
.review-card > header span { color: var(--accent-strong); font-size: 10px; font-weight: 730; letter-spacing: .06em; }
.review-card > header h2 { margin: 0; color: var(--text); font-size: 16px; letter-spacing: -.02em; }
.review-card > header > strong { color: var(--text); font-size: 14px; font-variant-numeric: tabular-nums; }
.review-card > header > small { color: var(--text-muted); font-size: 11px; }
.review-chart { position: relative; display: grid; height: 180px; align-items: end; gap: 5px; margin-top: 14px; padding-top: 10px; border-bottom: 1px solid var(--divider-soft); }
.review-chart > div:not(.review-chart-tooltip):not(.review-chart-average) { display: grid; min-width: 0; height: 100%; grid-template-rows: 18px 1fr 20px; align-items: end; gap: 4px; cursor: default; }
.review-chart > div:not(.review-chart-tooltip):not(.review-chart-average):hover b:not(.review-chart__placeholder) { filter: brightness(1.1); }
.review-chart > div:not(.review-chart-tooltip):not(.review-chart-average):focus-visible { outline: 3px solid var(--accent-20-border-fallback); outline-offset: 2px; border-radius: 6px; }
.review-chart span, .review-chart small { color: var(--text-muted); font-size: 9px; text-align: center; white-space: nowrap; }
.review-chart span { overflow: hidden; text-overflow: ellipsis; }
/* x 轴标签允许溢出列宽：稀疏刻度间距足够，避免 "7/1" 被截成 "7…" */
.review-chart small { overflow: visible; }
.review-chart > div > i { display: flex; height: 100%; align-items: end; overflow: hidden; border-radius: 5px 5px 2px 2px; background: color-mix(in srgb, var(--accent-soft) 58%, var(--surface-muted)); }
.review-chart > div:not(.review-chart-tooltip):not(.review-chart-average) > i > b { display: block; width: 100%; min-height: 2px; border-radius: inherit; background: linear-gradient(180deg, var(--accent), var(--accent-strong)); transition: height .25s ease; }
.review-rhythm-card > header svg { color: #5d89b0; }
.review-rhythm-actions { display: grid; gap: 18px; margin-top: 23px; }
.review-rhythm-actions > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 10px; }
.review-rhythm-actions span { display: flex; align-items: center; gap: 7px; color: var(--text); font-size: 12px; letter-spacing: 0; }
.review-rhythm-actions span > i { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.review-rhythm-actions span > i.is-snoozed { background: #d69c42; }
.review-rhythm-actions span > i.is-skipped { background: #89918f; }
.review-rhythm-actions strong { color: var(--text); font-size: 12px; }
.review-rhythm-actions b { grid-column: 1 / -1; height: 6px; overflow: hidden; border-radius: 999px; background: var(--surface-muted); }
.review-rhythm-actions b i { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
.review-rhythm-actions b i.is-snoozed { background: #d69c42; }
.review-rhythm-actions b i.is-skipped { background: #89918f; }
.review-recent { margin-top: 12px; }
.review-recent__header { align-items: center !important; }
.review-recent__header > div:first-child { gap: 3px; }
.review-recent__header p { margin: 0; color: var(--text-muted); font-size: 10px; }
.review-recent-switch { display: flex !important; gap: 3px !important; padding: 3px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface-muted); }
.review-recent-switch button { min-height: 32px; padding: 0 10px; border-radius: 7px; color: var(--text-muted); font-size: 10px; font-weight: 680; }
.review-recent-switch button:hover { color: var(--text); }
.review-recent-switch button.active { background: var(--surface); color: var(--accent-strong); box-shadow: 0 2px 6px var(--text-7-fallback); }
.review-recent-switch__count { display: inline-flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; margin-left: 4px; padding: 0 4px; border-radius: 999px; background: var(--surface); color: var(--text-muted); font-size: 9px; font-variant-numeric: tabular-nums; }
.review-recent-switch button.active .review-recent-switch__count { background: var(--accent-soft); color: var(--accent-strong); }
.review-recent__tools { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.review-recent-search { display: inline-flex; align-items: center; gap: 5px; min-height: 32px; padding: 0 9px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface-muted); color: var(--text-muted); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.review-recent-search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.review-recent-search input { width: 120px; min-width: 0; border: 0; background: transparent; color: var(--text); font: inherit; font-size: 11px; outline: none; }
.review-recent-search input::placeholder { color: var(--text-muted); }
.review-recent-search button { display: grid; width: 18px; height: 18px; place-items: center; padding: 0; border: 0; border-radius: 5px; background: transparent; color: var(--text-muted); cursor: pointer; }
.review-recent-search button:hover { background: var(--surface); color: var(--text); }
.review-recent-list { overflow: hidden; margin-top: 14px; border: 1px solid var(--divider-soft); border-radius: 13px; }
.review-recent-group + .review-recent-group { margin-top: 10px; border-top: 1px solid var(--divider-soft); }
.review-recent-group__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px 6px; border-bottom: 1px solid var(--divider-soft); background: var(--surface-muted); }
.review-recent-group__head strong { color: var(--text); font-size: 11.5px; font-weight: 700; letter-spacing: .02em; }
.review-recent-group__head small { color: var(--text-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.review-recent-group__more { display: flex; width: 100%; min-height: 34px; align-items: center; justify-content: center; gap: 4px; border: 0; border-top: 1px solid var(--divider-soft); background: var(--surface); color: var(--accent-strong); font: inherit; font-size: 11px; font-weight: 650; cursor: pointer; transition: background var(--transition-fast); }
.review-recent-group__more:hover { background: var(--accent-soft); }
.review-recent-row { display: grid; min-height: 66px; grid-template-columns: 24px minmax(250px, 1fr) 148px 105px 80px; align-items: center; padding: 0 10px; border-bottom: 1px solid var(--divider-soft); transition: background var(--transition-fast), box-shadow var(--transition-fast); position: relative; }
.review-recent-row:last-child { border-bottom: 0; }
.review-recent-row:hover { background: var(--surface-muted); }
.review-recent-row:hover .review-record-actions { opacity: 1; }
.review-recent-row.is-selected { background: color-mix(in srgb, var(--accent-soft) 55%, var(--surface)); box-shadow: inset 3px 0 0 var(--accent); }
.review-record-chip { display: inline-flex; align-items: center; margin-right: 4px; padding: 1px 6px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); font-size: 10px; font-weight: 600; }
.review-record-chip--quiet { background: var(--surface-muted); color: var(--text-muted); }
.review-record-actions { display: flex; justify-content: flex-end; gap: 3px; opacity: .55; transition: opacity var(--transition-fast); }
.review-record-actions button { position: relative; }
.review-record-actions button::after { content: attr(data-label); position: absolute; right: calc(100% + 4px); top: 50%; transform: translateY(-50%); padding: 2px 6px; border-radius: 4px; background: var(--text); color: var(--surface); font-size: 10px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity var(--transition-fast); }
.review-record-actions button:hover::after { opacity: 1; }
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
.review-records > .review-filter-panel { margin-top: 0; }
.review-summary-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 12px; }
.review-export-btn { display: inline-flex; min-height: 34px; align-items: center; gap: 5px; padding: 0 12px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface); color: var(--accent-strong); font: inherit; font-size: 11.5px; font-weight: 650; cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast); }
.review-export-btn:hover, .review-export-btn.active { border-color: var(--accent); background: var(--accent-soft); }
.review-export-menu { position: relative; }
.review-export-menu__panel { position: absolute; right: 0; top: calc(100% + 4px); z-index: 4; min-width: 220px; padding: 4px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface); box-shadow: 0 12px 30px var(--text-7-fallback); }
.review-export-menu__panel button { display: block; width: 100%; padding: 8px 10px; border: 0; border-radius: 6px; background: transparent; color: var(--text); text-align: left; font: inherit; font-size: 12px; cursor: pointer; }
.review-export-menu__panel button:hover { background: var(--accent-soft); color: var(--accent-strong); }
.review-filter-panel { margin: 12px 0 8px; padding: 8px; border: 1px solid var(--divider-soft); border-radius: 12px; background: var(--surface-muted); }
.review-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; padding: 0; }
.review-filters label { display: flex; flex: 1 1 190px; min-width: 150px; height: 34px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface); color: var(--text-muted); }
.review-filters input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); font: inherit; font-size: 12px; }
.review-filters label:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.review-filter-reset { display: inline-flex; min-height: 34px; align-items: center; justify-content: center; gap: 5px; padding: 0 14px; border: 0; border-radius: 8px; background: transparent; color: var(--accent-strong); font-size: 11px; font-weight: 680; white-space: nowrap; }
.review-filter-reset:hover { background: var(--accent-soft); }
.review-filter-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 16px; min-height: 30px; padding: 5px 12px; margin: 0 0 10px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface); }
.review-filter-summary > div { display: inline-flex; align-items: baseline; gap: 4px; }
.review-filter-summary__export { display: inline-flex; margin-left: auto; }
.review-filter-summary__export .review-export-menu { display: inline-flex; }
.review-filter-summary span { color: var(--text-muted); font-size: 10.5px; }
.review-filter-summary strong { overflow: hidden; color: var(--text); font-size: 11.5px; font-weight: 700; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
.review-record-list { display: grid; gap: 5px; margin-top: 12px; }
.review-record-list button { display: grid; width: 100%; min-height: 58px; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 11px; padding: 8px 10px; border: 1px solid transparent; border-radius: 11px; color: var(--text-muted); text-align: left; transition: border-color var(--transition-fast), background var(--transition-fast); }
.review-record-list button:hover { border-color: var(--divider-soft); background: var(--surface-muted); }
.review-record-table { overflow: hidden; border: 1px solid var(--divider-soft); border-radius: 13px; }
.review-record-table__head, .review-record-row { display: grid; grid-template-columns: 28px minmax(200px, 1fr) 118px 96px 112px; align-items: center; }
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
.rhythm-action--completed { color: var(--accent-strong); }
.rhythm-action--natural-break { color: var(--accent-strong); }
.rhythm-action--snoozed { color: #c98a35; }
.rhythm-action--skipped-today, .rhythm-action--dismissed { color: #6a7773; }
.review-record-actions { display: flex; justify-content: flex-end; gap: 3px; }
.review-record-actions button { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 8px; color: var(--text-muted); }
.review-record-actions button:hover { background: var(--surface); color: var(--accent-strong); box-shadow: inset 0 0 0 1px var(--divider-soft); }
.review-record-actions button.is-danger:hover { color: var(--danger); }
.review-pagination { display: flex; min-height: 48px; align-items: center; justify-content: flex-end; gap: 14px; margin-top: 10px; color: var(--text-muted); font-size: 10px; }
.review-pagination label { display: inline-flex; align-items: center; gap: 5px; }
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
.review-detail > header { position: sticky; z-index: 2; top: 0; display: flex; min-height: 64px; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 20px; border-bottom: 1px solid var(--divider-soft); background: var(--surface); }
.review-detail-heading { display: flex; min-width: 0; align-items: center; gap: 11px; }
.review-detail-heading__icon { display: grid; width: 38px; height: 38px; flex: 0 0 auto; place-items: center; border-radius: 11px; }
.review-detail-heading__icon.is-focus { background: var(--accent-soft); color: var(--accent-strong); }
.review-detail-heading__icon.is-rhythm { background: #eaf2f8; color: #4f7fa6; }
.review-detail-heading > div { display: grid; min-width: 0; gap: 2px; }
.review-detail-heading > div > span { color: var(--accent-strong); font-size: 10px; font-weight: 730; }
.review-detail > header h2 { margin: 0; color: var(--text); font-size: 16px; letter-spacing: -.02em; }
.review-detail-heading p { margin: 0; color: var(--text-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.review-detail > header button { display: grid; width: 38px; height: 38px; flex: 0 0 auto; place-items: center; border-radius: 10px; color: var(--text-muted); }
.review-detail > header button:hover { background: var(--surface-muted); color: var(--text); }
.review-detail-hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px 18px; margin: 10px 20px 8px; padding: 12px 16px; border: 1px solid var(--divider-soft); border-radius: 16px; }
.review-detail-hero.is-focus { background: linear-gradient(145deg, var(--accent-tint), var(--surface)); }
.review-detail-hero.is-rhythm { background: linear-gradient(145deg, #f2f7fb, var(--surface)); }
.review-detail-hero__value { display: grid; min-width: 0; gap: 2px; }
.review-detail-hero__value > span { color: var(--text-muted); font-size: 10px; }
.review-detail-hero__value > strong { overflow: hidden; color: var(--text); font-size: 22px; letter-spacing: -.04em; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.review-detail-hero__value > small { color: var(--accent-strong); font-size: 11px; font-weight: 680; }
.review-detail-hero__window { display: flex; align-items: center; gap: 10px; color: var(--text-muted); }
.review-detail-hero__window > div { display: grid; min-width: 62px; gap: 2px; }
.review-detail-hero__window > div:last-child { justify-items: end; }
.review-detail-hero__window span, .review-detail-hero__window small { color: var(--text-muted); font-size: 9px; }
.review-detail-hero__window strong { color: var(--text); font-size: 13px; font-variant-numeric: tabular-nums; }
/* 统计行并入 hero 卡内底部，取代独立三格卡 */
.review-detail-hero__stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; padding-top: 9px; border-top: 1px solid color-mix(in srgb, var(--accent) 15%, var(--divider-soft)); }
.review-detail-hero__stats > div { display: grid; gap: 2px; padding: 0 12px; }
.review-detail-hero__stats > div:first-child { padding-left: 0; }
.review-detail-hero__stats > div:last-child { padding-right: 0; }
.review-detail-hero__stats > div + div { border-left: 1px solid var(--divider-soft); }
.review-detail-hero__stats span { color: var(--text-muted); font-size: 9.5px; }
.review-detail-hero__stats strong { color: var(--text); font-size: 12px; font-variant-numeric: tabular-nums; }
.review-detail-section { padding: 18px 20px 16px; border-top: 1px solid var(--border); }
.review-detail-section > header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: var(--accent-strong); }
.review-detail-section > header svg { color: var(--accent-strong); }
.review-detail-section h3 { margin: 0; color: var(--text); font-size: 14px; font-weight: 730; letter-spacing: -.01em; }
.review-detail-section__count { margin-left: auto; padding: 3px 8px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); font-size: 9px; font-weight: 700; }
.review-timeline { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.review-timeline li { position: relative; display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 10px; min-height: 44px; padding-bottom: 8px; }
.review-timeline li:last-child { padding-bottom: 0; }
.review-timeline li:not(:last-child)::before { position: absolute; top: 12px; bottom: -2px; left: 5px; width: 1px; background: color-mix(in srgb, var(--accent) 22%, var(--divider-soft)); content: ''; }
.review-timeline li > i { position: relative; z-index: 1; width: 11px; height: 11px; margin-top: 3px; border: 2px solid var(--surface); border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-soft); }
.review-timeline li > i.is-paused { background: #d69c42; box-shadow: 0 0 0 1px #d69c42; }
.review-timeline li > i.is-snoozed { background: #d69c42; box-shadow: 0 0 0 1px #d69c42; }
.review-timeline li > i.is-skipped { background: #89918f; box-shadow: 0 0 0 1px #89918f; }
.review-timeline li > i.is-dismissed { background: #89918f; box-shadow: 0 0 0 1px #89918f; }
.review-timeline li > i.is-natural-break { background: #6a9bc3; box-shadow: 0 0 0 1px #6a9bc3; }
.review-timeline li > i.is-duration-adjusted, .review-timeline li > i.is-task-changed { background: #6b91b4; box-shadow: 0 0 0 1px #6b91b4; }
.review-timeline li > i.is-finished { background: #677b75; box-shadow: 0 0 0 1px #677b75; }
.review-timeline li > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; gap: 2px 12px; }
.review-timeline strong { color: var(--text); font-size: 12px; font-weight: 680; }
.review-timeline span { color: var(--text-muted); font-size: 10px; font-variant-numeric: tabular-nums; justify-self: end; white-space: nowrap; }
.review-timeline small { grid-column: 1 / -1; color: var(--text-muted); font-size: 10px; line-height: 1.45; }
.review-detail-legacy { display: flex; align-items: flex-start; gap: 12px; padding: 13px; border: 1px solid #e7d9bd; border-radius: 12px; background: #fff9ee; color: #8a6a31; }
.review-detail-legacy > svg { flex: 0 0 auto; margin-top: 2px; }
.review-detail-legacy > div { display: grid; gap: 10px; min-width: 0; }
.review-detail-legacy p { display: grid; gap: 3px; margin: 0; }
.review-detail-legacy strong { font-size: 12px; }
.review-detail-legacy span { font-size: 11px; line-height: 1.55; }
.review-detail-fields--legacy { border-radius: 8px; background: rgba(255, 255, 255, .6); padding: 8px 10px; }
.review-detail-fields--legacy div { display: grid; grid-template-columns: 80px 1fr; gap: 6px; align-items: center; }
.review-detail-fields--legacy dt { margin: 0; color: #8a6a31; font-size: 10.5px; }
.review-detail-fields--legacy dd { margin: 0; color: #4a3819; font-size: 11.5px; }
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
/* 新记录：两列竖排，减少纵向占用（4 项 2 行） */
.review-detail-fields:not(.review-detail-fields--legacy) { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 22px; }
.review-detail-fields > div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--divider-soft); }
.review-detail-fields:not(.review-detail-fields--legacy) > div { grid-template-columns: 1fr; gap: 3px; padding: 9px 0; }
.review-detail-fields dt { color: var(--text-muted); font-size: 11px; }
.review-detail-fields dd { margin: 0; color: var(--text); font-size: 11px; text-align: right; }
.review-detail-fields:not(.review-detail-fields--legacy) dd { text-align: left; font-size: 12px; }
.review-detail-task-link { display: inline-flex; align-items: center; gap: 4px; color: var(--accent-strong); font: inherit; font-size: 11px; font-weight: 650; text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--accent) 35%, transparent); text-underline-offset: 2px; transition: text-decoration-color var(--transition-fast); }
.review-detail-task-link:hover { text-decoration-color: var(--accent-strong); }
.review-detail-task-link svg { flex-shrink: 0; }
.review-detail > footer { position: sticky; z-index: 2; bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding: 14px 20px; border-top: 1px solid var(--divider-soft); background-color: var(--surface, #fff); box-shadow: 0 -8px 20px var(--text-4-fallback); }
.review-detail > footer button { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 6px; padding: 0 13px; border-radius: 10px; font-size: 12px; font-weight: 680; }
.review-detail-delete { background: #fbf0ef; color: #b05757; border: 1px solid rgba(176, 87, 87, .16); }
.review-detail-delete:hover { background: #f7e3e0; border-color: rgba(176, 87, 87, .3); color: #a04949; }
.review-detail-close { min-width: 86px; background: var(--accent); color: #fff; }
.review-detail-close:hover { background: var(--accent-strong); }
@media (max-width: 900px) { .review-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }.review-overview-grid { grid-template-columns: 1fr; }.review-record-table, .review-recent-list { overflow-x: auto; }.review-record-table__head, .review-record-row, .review-recent-row { min-width: 720px; } }
@media (max-width: 900px) {
  .review-filters label { flex-basis: 100%; }
}
@media (max-width: 680px) { .review-workspace { padding: 14px; }.review-header { display: grid; gap: 14px; }.review-range, .review-tabs { overflow-x: auto; }.review-tabs button { white-space: nowrap; }.review-metrics { grid-template-columns: 1fr 1fr; }.review-metric { min-height: 88px; padding: 12px; }.review-recent__header { display: grid !important; }.review-recent-switch { width: 100%; }.review-recent-switch button { flex: 1; }.review-recent__footer { display: grid; }.review-recent__footer > div { display: grid; grid-template-columns: 1fr 1fr; }.review-filters label { flex-basis: 100%; }.review-filter-summary { gap: 4px 10px; }.review-pagination { flex-wrap: wrap; justify-content: space-between; }.review-detail-hero { grid-template-columns: 1fr; }.review-detail-hero__window { justify-content: space-between; }.review-detail-hero__stats { grid-template-columns: 1fr; }.review-detail-hero__stats > div + div { border-left: 0; border-top: 1px solid var(--divider-soft); } }
/* 新增：本期亮点洞察 */
.review-insights { display: grid; gap: clamp(8px, 1.2vw, 12px); margin-bottom: clamp(10px, 1.4vw, 16px); padding: clamp(12px, 1.6vw, 16px); border: 1px solid var(--accent-34-fallback); border-radius: 16px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent-soft) 70%, var(--surface)) 0%, var(--surface) 100%); }
.review-insights > header { display: flex; align-items: center; gap: 7px; color: var(--accent-strong); }
.review-insights > header > span { font-size: 12px; font-weight: 750; letter-spacing: .04em; }
.review-insights > header > small { margin-left: auto; color: var(--text-muted); font-size: 11px; font-weight: 500; }
.review-insights__list { display: grid; gap: 8px; }
.review-insight { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--surface); }
.review-insight__icon { display: grid; width: 32px; height: 32px; flex: 0 0 auto; place-items: center; border-radius: 10px; }
.review-insight.is-positive .review-insight__icon { background: var(--accent-soft); color: var(--accent-strong); }
.review-insight.is-caution .review-insight__icon { background: #fff0e1; color: #b6741a; }
.review-insight__body { display: grid; min-width: 0; gap: 3px; flex: 1; }
.review-insight strong { color: var(--text); font-size: 13px; line-height: 1.4; }
.review-insight small { display: block; color: var(--text-muted); font-size: 11px; line-height: 1.45; }
.review-insight__bar { position: relative; display: flex; align-items: stretch; gap: 2px; height: 6px; margin-top: 6px; border-radius: 4px; overflow: hidden; background: var(--surface-muted); }
.review-insight__bar i { display: block; height: 100%; border-radius: 3px; transition: width .25s ease; }
.review-insight__bar i.is-prev { background: var(--divider-soft); }
.review-insight__bar i.is-current { background: var(--accent); }
.review-insight.is-clickable { transition: box-shadow var(--transition-fast), transform var(--transition-fast); }
.review-insight.is-clickable:hover { box-shadow: 0 4px 14px var(--text-7-fallback); transform: translateY(-1px); }
.review-insight__click { display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.review-insight__click:focus-visible { outline: 3px solid var(--accent-20-border-fallback); outline-offset: 2px; border-radius: 8px; }
.review-insight__when { color: var(--accent-strong); font-size: 10px !important; font-weight: 650; }

/* 范围控件已抽到 ReviewRangeControl 组件，原有的双层按钮与自定义面板样式不再使用 */

/* 新增：分层空状态 */
.review-empty--zero { border-style: dashed; background: linear-gradient(145deg, color-mix(in srgb, var(--accent-soft) 50%, var(--surface)) 0%, var(--surface) 100%); }
.review-empty--zero > span { color: var(--accent-strong); }
.review-empty--empty-range { background: var(--surface-muted); border-color: var(--divider-soft); border-style: solid; }
.review-empty--empty-range > span { color: #5d89b0; }
.review-empty--empty-filter { background: var(--surface); border-style: solid; border-color: var(--divider-soft); }
.review-empty--empty-filter > span { color: var(--text-muted); background: var(--surface-muted); box-shadow: none; }
.review-empty__actions { display: flex; gap: 10px; }
.review-empty__actions button { display: inline-flex; min-height: 40px; align-items: center; gap: 6px; padding: 0 14px; border-radius: 10px; font-size: 12px; font-weight: 680; }
.review-empty__actions button:not(.review-empty__primary) { background: var(--surface); border: 1px solid var(--divider-soft); color: var(--text); }
.review-empty--inline { width: 100%; max-width: 100%; margin: 16px 0; padding: 32px 18px; }
.review-empty--inline > span { width: 44px; height: 44px; }
.review-empty--inline button { display: inline-flex; min-height: 36px; align-items: center; gap: 6px; padding: 0 14px; border-radius: 10px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 680; }

/* 节律卡空数据时折叠为细条 */
.review-rhythm-card.is-collapsed { padding: 14px 18px; }
.review-rhythm-card.is-collapsed > header { padding: 0; }
.review-rhythm-card.is-collapsed > header > div { gap: 0; }
.review-rhythm-card__empty-line { margin: 0; color: var(--text-muted); font-size: 12px; }

/* 键盘快捷键面板 */
.review-shortcuts { position: fixed; z-index: var(--z-sheet); inset: 0; display: grid; place-items: center; padding: 24px; background: rgba(9, 18, 16, .48); }
.review-shortcuts__panel { display: grid; width: min(440px, 100%); gap: 14px; padding: 22px 24px; border-radius: 16px; background: var(--surface); box-shadow: 0 24px 60px rgba(8, 24, 20, .28); }
.review-shortcuts__panel header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.review-shortcuts__panel h2 { display: inline-flex; align-items: center; gap: 8px; margin: 0; color: var(--text); font-size: 16px; letter-spacing: -.02em; }
.review-shortcuts__close { display: grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 8px; background: transparent; color: var(--text-muted); cursor: pointer; }
.review-shortcuts__close:hover { background: var(--surface-muted); color: var(--text); }
.review-shortcuts__panel ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.review-shortcuts__panel li { display: grid; grid-template-columns: 96px 1fr; align-items: center; gap: 12px; padding: 6px 10px; border-radius: 8px; background: var(--surface-muted); font-size: 12px; color: var(--text); }
.review-shortcuts__panel li kbd { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 6px; border: 1px solid var(--divider-soft); border-bottom-width: 2px; border-radius: 5px; background: var(--surface); color: var(--text); font: inherit; font-size: 11px; font-weight: 600; margin-right: 2px; }
.review-shortcuts__panel footer { color: var(--text-muted); font-size: 10.5px; line-height: 1.5; }
.review-shortcuts-trigger { position: fixed; right: 18px; bottom: 18px; display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--divider-soft); border-radius: 999px; background: var(--surface); color: var(--text-muted); box-shadow: 0 6px 18px var(--text-7-fallback); cursor: pointer; opacity: .8; transition: opacity var(--transition-fast), color var(--transition-fast); z-index: 5; }
.review-shortcuts-trigger:hover { opacity: 1; color: var(--accent-strong); }
.review-shortcuts-fade-enter-active, .review-shortcuts-fade-leave-active { transition: opacity .18s ease; }
.review-shortcuts-fade-enter-from, .review-shortcuts-fade-leave-to { opacity: 0; }

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
.review-chart-note__btn { display: inline-flex; align-items: center; min-height: 24px; margin: 0 2px; padding: 0 8px; border: 0; border-radius: 6px; background: var(--surface); color: var(--accent-strong); font: inherit; font-size: 10.5px; font-weight: 650; cursor: pointer; }
.review-chart-note__btn:hover { background: var(--accent-soft); }
.review-chart > div.is-today > i > b { background: linear-gradient(180deg, var(--accent), var(--accent-strong)); box-shadow: 0 0 0 2px var(--accent-soft); }
.review-chart > div.is-today small { color: var(--accent-strong); font-weight: 700; }
.review-chart > div.is-weekend > i { background: color-mix(in srgb, #6a9bc3 22%, var(--surface-muted)); }
.review-chart > div.is-weekend > i > b { background: linear-gradient(180deg, #6a9bc3, #4f7fa6); }
.review-chart > div.is-empty > i { background: transparent; }
.review-chart-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 6px; font-size: 10px; color: var(--text-muted); }
.review-chart-legend i { display: inline-block; width: 10px; height: 10px; margin-right: 4px; border-radius: 2px; vertical-align: middle; }
.review-chart-legend i.is-weekday { background: var(--accent); }
.review-chart-legend i.is-weekend { background: #6a9bc3; }
.review-chart-legend i.is-average { width: 12px; height: 0; border-top: 1px dashed var(--accent); border-radius: 0; background: transparent; }
.review-chart-empty { margin: 12px 0 4px; padding: 18px 12px; border-radius: 10px; background: var(--surface-muted); color: var(--text-muted); font-size: 12px; text-align: center; }
.review-chart__placeholder { display: block; width: 1px; height: 1px; background: var(--divider-soft); }
/* 日均参考线：画在图表主体内按投入比例定位，标签贴线显示，不再挤在底部轴区 */
.review-chart-average { position: absolute; left: 0; right: 0; top: calc(100% - var(--line, 50%)); height: 0; border-top: 1px dashed var(--accent); z-index: 3; pointer-events: none; }
.review-chart-average b { position: absolute; right: 4px; top: -21px; padding: 1px 6px; border-radius: 4px; background: var(--surface); color: var(--accent-strong); font-size: 9px; font-weight: 600; white-space: nowrap; }
.review-chart-average.is-high b { right: auto; left: 4px; }

/* 趋势图 hover 信息卡 */
.review-chart-tooltip { position: absolute; z-index: 6; width: max-content; max-width: 220px; padding: 9px 11px; border: 1px solid var(--divider-soft); border-radius: 10px; background: var(--surface); box-shadow: 0 10px 26px var(--text-7-fallback); pointer-events: none; font-size: 11px; color: var(--text); }
.review-chart-tooltip strong { display: block; margin-bottom: 3px; color: var(--text); font-size: 11.5px; font-weight: 700; }
.review-chart-tooltip p { margin: 0; color: var(--text-muted); }
.review-chart-tooltip p b { color: var(--accent-strong); font-weight: 700; font-variant-numeric: tabular-nums; }
.review-chart-tooltip p.is-empty { color: var(--text-muted); }
.review-chart-tooltip ul { display: grid; gap: 2px; margin: 6px 0 0; padding: 6px 0 0; border-top: 1px solid var(--divider-soft); list-style: none; }
.review-chart-tooltip li { max-width: 200px; overflow: hidden; color: var(--text); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
.review-chart-tooltip li.is-more { color: var(--text-muted); }

/* 新增：节律执行卡 - 响应速度 / 时段分布 */
.review-rhythm-buckets { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
.review-rhythm-bucket h4 { margin: 0; color: var(--text-muted); font-size: 10.5px; font-weight: 700; letter-spacing: .04em; }
.review-rhythm-bucket > header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.review-rhythm-bucket__adjust { display: inline-flex; align-items: center; gap: 3px; min-height: 24px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--text-muted); font: inherit; font-size: 10px; font-weight: 600; cursor: pointer; }
.review-rhythm-bucket__adjust:hover { background: var(--surface-muted); color: var(--accent-strong); }

/* 自定义分桶弹窗：fixed 浮层，不撑开节律卡片高度 */
.review-bucket-popover { position: fixed; z-index: 1100; display: grid; gap: 10px; padding: 14px 16px; border: 1px solid var(--divider-soft); border-radius: 14px; background: var(--surface, #fff); box-shadow: 0 24px 56px rgba(8, 24, 20, .22), 0 4px 12px rgba(8, 24, 20, .12); }
.review-bucket-popover h4 { display: inline-flex; align-items: center; gap: 6px; margin: 0; color: var(--text); font-size: 12.5px; letter-spacing: -.01em; }
.review-bucket-popover__hint { margin: 0; color: var(--text-muted); font-size: 10.5px; line-height: 1.5; }
.review-bucket-popover__field { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: center; gap: 8px; color: var(--text); font-size: 11.5px; }
.review-bucket-popover__field span { color: var(--text-muted); font-size: 11px; font-weight: 650; }
.review-bucket-popover__field input { width: 100%; min-width: 0; padding: 5px 8px; border: 1px solid var(--divider-soft); border-radius: 8px; background: var(--surface-muted); color: var(--text); font: inherit; font-size: 12px; text-align: right; font-variant-numeric: tabular-nums; }
.review-bucket-popover__field input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.review-bucket-popover__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 10px; border-top: 1px solid var(--divider-soft); }
.review-bucket-popover__foot button { display: inline-flex; align-items: center; gap: 5px; min-height: 28px; padding: 0 10px; border: 0; border-radius: 8px; background: transparent; color: var(--text-muted); font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
.review-bucket-popover__foot button:hover { color: var(--accent-strong); background: var(--accent-soft); }
.review-bucket-popover__foot .review-bucket-popover__done { background: var(--accent); color: #fff; }
.review-bucket-popover__foot .review-bucket-popover__done:hover { background: var(--accent-strong); color: #fff; }
.review-range-pop-enter-active, .review-range-pop-leave-active { transition: opacity .16s ease, transform .16s ease; }
.review-range-pop-enter-from, .review-range-pop-leave-to { opacity: 0; transform: translateY(-4px); }
.review-rhythm-weekday { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--divider-soft); }
.review-rhythm-weekday h4 { margin: 0 0 8px; color: var(--text-muted); font-size: 10.5px; font-weight: 700; letter-spacing: .04em; }
.review-rhythm-weekday__bar { display: flex; height: 18px; overflow: hidden; border-radius: 9px; background: var(--surface-muted); }
.review-rhythm-weekday__bar i { display: flex; align-items: center; justify-content: center; min-width: 0; font-size: 10px; font-weight: 600; color: #fff; transition: width .25s ease; }
.review-rhythm-weekday__bar i.is-weekday { background: var(--accent); }
.review-rhythm-weekday__bar i.is-weekend { background: #6a9bc3; }
.review-rhythm-weekday p { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 8px 0 0; color: var(--text-muted); font-size: 10.5px; }
.review-rhythm-weekday p i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 50%; vertical-align: middle; }
.review-rhythm-weekday p i.is-weekday { background: var(--accent); }
.review-rhythm-weekday p i.is-weekend { background: #6a9bc3; }
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

@media (prefers-reduced-motion: reduce) { .review-chart > div:not(.review-chart-tooltip):not(.review-chart-average) > i > b, .review-detail-fade-enter-active, .review-detail-fade-leave-active { transition: none; } }
</style>
