<template>
  <main ref="workspaceRef" class="clock-workspace review-workspace">
    <div class="review-shell">
      <div class="review-controls">
        <nav class="review-tabs" aria-label="回顾内容">
          <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" :aria-current="activeTab === tab.id ? 'page' : undefined" @click="selectTab(tab.id)">
            <component :is="tab.icon" :size="17" />
            {{ tab.label }}
            <span>{{ tab.count }}</span>
          </button>
        </nav>
      </div>

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
        <section class="review-card review-summary" aria-label="本周期概览">
          <header><div><span>数据摘要</span><h2>{{ selectedRangeLabel }}回顾</h2></div><div class="review-summary-actions"><div class="review-summary-range" aria-label="专注回顾时间范围"><ReviewRangeControl :range="range" :custom-start="customStart" :custom-end="customEnd" @update:range="range = $event" @update:custom-start="customStart = $event" @update:custom-end="customEnd = $event" /></div><small>{{ focusEntries.length + rhythmEntries.length }} 条</small>
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
          <section v-if="insights.length" class="review-insights" aria-label="本周期亮点">
            <header>
              <Lightbulb :size="15" />
              <span>亮点</span>
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
          <div class="review-metrics">
            <article class="review-metric review-metric--primary">
              <span class="review-metric__label" :title="`已记录的专注阶段（不含休息；中断或放弃的实际投入也会保留）`"><Timer :size="13" />专注投入</span>
              <strong :aria-label="`${selectedRangeLabel}累计专注投入 ${formatDuration(totalFocusSeconds)}`">{{ formatDuration(totalFocusSeconds) }}</strong>
              <small>{{ completedFocusEntries.length }} 段自然完成 · {{ focusActiveDays }} 天有投入</small>
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
              <div><span>投入节奏</span><h2>{{ trendTitle }}</h2></div>
              <div class="review-chart-meta">
                <strong>{{ trendTotalLabel }}</strong>
                <button v-if="trendPeak?.records.length" type="button" class="review-chart-meta__peak" @click="openTrendPeriod(trendPeak)">
                  {{ trendPeakLabel }}<ChevronRight :size="12" />
                </button>
                <small v-else>{{ trendPeakLabel }}</small>
              </div>
            </header>
            <p class="review-chart-description">{{ trendDescription }}</p>
            <div class="review-trend-tools">
              <div class="review-trend-metric" role="group" aria-label="投入节奏统计维度">
                <button type="button" :class="{ active: trendMetric === 'duration' }" :aria-pressed="trendMetric === 'duration'" @click="trendMetric = 'duration'">投入时长</button>
                <button type="button" :class="{ active: trendMetric === 'sessions' }" :aria-pressed="trendMetric === 'sessions'" @click="trendMetric = 'sessions'">专注段数</button>
              </div>
              <small>点击柱子看记录</small>
            </div>
            <div v-if="trendGranularity === 'day'" class="review-chart-legend" aria-hidden="true">
              <span><i class="is-weekday"></i>工作日</span>
              <span><i class="is-weekend"></i>周末</span>
            </div>
            <div ref="trendChartEl" class="review-trend-chart" role="img" :aria-label="trendChartAriaLabel"></div>
            <table class="sr-only" :aria-label="`${trendPeriodLabel}${trendMetricLabel}明细`">
              <caption>{{ trendPeriodLabel }}{{ trendMetricLabel }}</caption>
              <thead><tr><th scope="col">日期</th><th scope="col">{{ trendMetricLabel }}</th></tr></thead>
              <tbody>
                <tr v-for="day in trendDays" :key="day.key">
                  <th scope="row">{{ day.label }}{{ day.isCurrent ? '（当前）' : '' }}</th>
                  <td>{{ trendValue(day) ? formatTrendValue(trendValue(day)) : '无投入' }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!totalFocusSeconds" class="review-chart-empty">暂无专注记录。可切换到「全部」查看历史。</p>
          </article>

          <article class="review-card review-rhythm-card" :class="{ 'is-collapsed': !rhythmEntries.length }">
            <header>
              <div>
                <span>提醒使用情况</span>
                <h2 v-if="rhythmEntries.length">这些提醒适合你吗？</h2>
                <p v-else class="review-rhythm-card__empty-line">{{ selectedRangeLabel }} 还没有节律处理记录</p>
              </div>
              <BellRing :size="19" />
            </header>
            <template v-if="rhythmEntries.length">
              <section class="review-rhythm-status" :aria-label="`${selectedRangeLabel}提醒处理概览`">
                <div class="review-rhythm-status__summary"><strong>{{ rhythmEntries.length }} 次</strong><span>本期到点提醒</span></div>
                <div class="review-rhythm-status__bar" aria-hidden="true">
                  <i v-for="item in rhythmActionSummary.filter(item => item.count)" :key="item.action" :class="`is-${item.action}`" :style="{ width: `${item.percent}%` }"></i>
                </div>
                <div class="review-rhythm-status__legend">
                  <span v-for="item in rhythmActionSummary.filter(item => item.count)" :key="item.action"><i :class="`is-${item.action}`"></i>{{ item.shortLabel }} {{ item.count }} 次</span>
                </div>
                <p>{{ rhythmSummaryMessage }}</p>
              </section>
              <section class="review-rhythm-reminders" aria-label="按提醒查看使用情况">
                <header><h3>按提醒看一看</h3><small>点击可调整规则</small></header>
                <button v-for="item in rhythmReminderSummary.slice(0, 3)" :key="item.id" type="button" @click="openRhythmRuleFromRow(item.latest)">
                  <span><strong>{{ item.title }}</strong><small>本期 {{ item.count }} 次 · 完成 {{ item.completed }} 次 · 跳过 {{ item.skipped }} 次</small></span>
                  <ChevronRight :size="15" />
                </button>
              </section>
              <button v-if="rhythmEntries.length >= RHYTHM_DETAIL_MINIMUM" type="button" class="review-rhythm-detail-toggle" :aria-expanded="rhythmDetailsOpen" @click="rhythmDetailsOpen = !rhythmDetailsOpen">
                <span>{{ rhythmDetailsOpen ? '收起细节统计' : '查看细节统计' }}</span><ChevronDown :size="14" :class="{ 'is-open': rhythmDetailsOpen }" />
              </button>
              <div v-if="rhythmDetailsOpen && rhythmEntries.length >= RHYTHM_DETAIL_MINIMUM" class="review-rhythm-charts">
                <div class="review-rhythm-chart-block">
                  <header>
                    <h4>响应速度</h4>
                    <button ref="bucketTriggerRef" type="button" class="review-rhythm-bucket__adjust" :aria-expanded="customBucketsOpen" :aria-haspopup="true" @click="toggleBucketPopover">
                      <SlidersHorizontal :size="12" />自定义分桶
                    </button>
                  </header>
                  <div ref="rhythmResponseChartEl" class="review-rhythm-chart" role="img" :aria-label="`节律响应速度分布`"></div>
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
                <div class="review-rhythm-chart-block">
                  <h4>提醒时段</h4>
                  <div ref="rhythmHourChartEl" class="review-rhythm-chart" role="img" :aria-label="`节律提醒时段分布`"></div>
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
                <div class="review-rhythm-chart-block">
                  <h4>工作日 vs 周末</h4>
                  <div ref="rhythmWeekdayChartEl" class="review-rhythm-chart" role="img" :aria-label="`节律工作日与周末对比`"></div>
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
              </div>
            </template>
          </article>
        </section>

        <section v-if="focusEntries.length" class="review-card review-focus-map" aria-label="本期专注地图">
          <header>
            <div><span>专注地图</span><h2>精力去向</h2><p>{{ focusMapNarrative }}</p></div>
            <span class="review-focus-map__total"><Timer :size="15" />{{ formatCompactDuration(totalFocusSeconds) }}</span>
          </header>
          <div class="review-focus-map__signals">
            <button v-if="focusMapPrimaryTask" type="button" class="review-focus-map__signal" @click="openFocusSlice(focusMapPrimaryTask.query)"><span>主要投入</span><strong>{{ focusMapPrimaryTask.label }}</strong><small>{{ focusMapPrimaryTask.count }} 段 · {{ formatCompactDuration(focusMapPrimaryTask.seconds) }}</small></button>
            <div v-else class="review-focus-map__signal"><span>主要投入</span><strong>未关联任务</strong><small>本期仍完整计入投入</small></div>
            <button v-if="focusProfileSummary[0]" type="button" class="review-focus-map__signal" @click="openFocusSlice(focusProfileSummary[0].query)"><span>常用方式</span><strong>{{ focusProfileSummary[0].label }}</strong><small>{{ focusProfileSummary[0].count }} 段 · {{ formatCompactDuration(focusProfileSummary[0].seconds) }}</small></button>
            <div class="review-focus-map__signal"><span>高峰时段</span><strong>{{ focusTimePeak.label }}</strong><small>{{ focusTimePeak.count }} 段从这里开始</small></div>
          </div>
          <section class="review-focus-map__breakdown">
            <header><div><span>任务投入构成</span><small>按有效时长排序；点击查看对应记录</small></div><small>占本期投入</small></header>
            <button v-for="item in focusTaskSummary.filter(item => item.query).slice(0, 4)" :key="item.key" type="button" class="review-focus-map__row" :aria-label="`查看${item.label}的专注记录`" @click="openFocusSlice(item.query)">
              <span><strong>{{ item.label }}</strong><small>{{ item.count }} 段 · {{ formatCompactDuration(item.seconds) }}</small></span>
              <i><b :style="{ width: `${item.percent}%` }"></b></i>
              <em>{{ item.percent }}%</em>
            </button>
            <p v-if="!focusMapPrimaryTask" class="review-focus-map__empty">本期专注尚未关联任务，时长仍会被完整保留。</p>
          </section>
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
            <button type="button" class="review-filter-toggle" :class="{ active: focusFiltersOpen }" :aria-expanded="focusFiltersOpen" @click="focusFiltersOpen = !focusFiltersOpen"><SlidersHorizontal :size="14" />筛选<span v-if="focusFilterCount">{{ focusFilterCount }}</span></button>
            <button type="button" class="review-manage-toggle" :class="{ active: focusManageMode }" :aria-pressed="focusManageMode" @click="toggleFocusManageMode">{{ focusManageMode ? '完成整理' : '整理记录' }}</button>
            <template v-if="focusFiltersOpen">
              <ReviewSelect v-model="focusResult" :options="FOCUS_RESULT_OPTIONS" aria-label="筛选专注结果" />
              <ReviewSelect v-model="focusPhase" :options="FOCUS_PHASE_OPTIONS" aria-label="筛选专注类型" />
              <ReviewSelect v-model="focusPause" :options="FOCUS_PAUSE_OPTIONS" aria-label="筛选暂停情况" />
              <ReviewSelect v-model="focusSort" :options="FOCUS_SORT_OPTIONS" aria-label="专注记录排序" />
              <button v-if="focusFilterCount" class="review-filter-reset" type="button" @click="resetFocusFilters"><RotateCcw :size="14" />重置筛选</button>
            </template>
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
          <div><span>专注投入</span><strong>{{ formatDuration(filteredFocusSeconds) }}</strong></div>
          <div><span>完成率</span><strong>{{ filteredFocusCompletionRate }}%</strong></div>
          <div class="review-filter-summary__secondary"><span>暂停</span><strong>{{ filteredFocusPauseCount }} 次 · {{ formatDuration(filteredFocusPausedSeconds) }}</strong></div>
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
        <div v-if="pagedFocusRecords.length" class="review-record-table" :class="{ 'is-managing': focusManageMode }">
          <div class="review-record-table__head" aria-hidden="true">
            <label v-if="focusManageMode" class="review-record-check"><input type="checkbox" :checked="allFocusSelected" :indeterminate.prop="someFocusSelected" aria-label="全选当前筛选的专注记录" @change="toggleSelectAllFocus" /></label>
            <span>记录</span><span>时间</span><span>时长与状态</span><span></span>
          </div>
          <article v-for="item in pagedFocusRecords" :key="item.id" class="review-record-row" :class="{ 'is-selected': selectedFocusIds.has(item.id) }">
            <label v-if="focusManageMode" class="review-record-check"><input type="checkbox" :checked="selectedFocusIds.has(item.id)" :aria-label="`选择${focusTitle(item)}`" @change="toggleFocusSelect(item.id)" /></label>
            <button class="review-record-open" type="button" @click="openDetail('focus', item)">
              <span class="review-record-icon is-focus"><FocusRewardBadge v-if="item.reward" :reward="item.reward" size="sm" /><Coffee v-else-if="item.phase !== 'focus'" :size="17" /><Timer v-else :size="17" /></span>
              <span class="review-record-main"><strong>{{ focusTitle(item) }}</strong><small>{{ item.phase === 'focus' ? `${profileName(item.profileId, item)} · ${focusPauseCount(item) ? `暂停 ${focusPauseCount(item)} 次` : '未暂停'}` : `${phaseLabel(item.phase)} · 不计入专注投入` }}</small></span>
            </button>
            <span class="review-record-time"><strong>{{ formatShortDate(item.finishedAt) }}</strong><small>{{ formatTimeRange(item.startedAt, item.finishedAt) }}</small></span>
            <span class="review-record-meta"><strong>{{ item.phase === 'focus' ? formatCompactDuration(item.elapsedSeconds) : formatCompactDuration(item.elapsedSeconds) }}</strong><small :class="['review-record-status', `is-${item.result}`]">{{ resultLabel(item.result) }}</small></span>
            <span class="review-record-actions">
              <button v-if="focusManageMode" class="is-danger" type="button" aria-label="删除专注记录" data-label="删除专注记录" title="删除记录" @click="deleteFocusRecord(item)"><Trash2 :size="16" /></button>
              <button v-else type="button" aria-label="查看专注详情" data-label="查看专注详情" title="查看详情" @click="openDetail('focus', item)"><ChevronRight :size="17" /></button>
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
            <button type="button" class="review-filter-toggle" :class="{ active: rhythmFiltersOpen }" :aria-expanded="rhythmFiltersOpen" @click="rhythmFiltersOpen = !rhythmFiltersOpen"><SlidersHorizontal :size="14" />筛选<span v-if="rhythmFilterCount">{{ rhythmFilterCount }}</span></button>
            <button type="button" class="review-manage-toggle" :class="{ active: rhythmManageMode }" :aria-pressed="rhythmManageMode" @click="toggleRhythmManageMode">{{ rhythmManageMode ? '完成整理' : '整理记录' }}</button>
            <template v-if="rhythmFiltersOpen">
              <ReviewSelect v-model="rhythmAction" :options="RHYTHM_ACTION_OPTIONS" aria-label="筛选节律处理结果" />
              <ReviewSelect v-model="rhythmTrigger" :options="RHYTHM_TRIGGER_OPTIONS" aria-label="筛选节律触发方式" />
              <ReviewSelect v-model="rhythmSort" :options="RHYTHM_SORT_OPTIONS" aria-label="节律记录排序" />
              <button v-if="rhythmFilterCount" class="review-filter-reset" type="button" @click="resetRhythmFilters"><RotateCcw :size="14" />重置筛选</button>
            </template>
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
        <div v-if="pagedRhythmRecords.length" class="review-record-table" :class="{ 'is-managing': rhythmManageMode }">
          <div class="review-record-table__head" aria-hidden="true">
            <label v-if="rhythmManageMode" class="review-record-check"><input type="checkbox" :checked="allRhythmSelected" :indeterminate.prop="someRhythmSelected" aria-label="全选当前筛选的节律记录" @change="toggleSelectAllRhythm" /></label>
            <span>提醒</span><span>到点与处理</span><span>处理结果</span><span></span>
          </div>
          <article v-for="item in pagedRhythmRecords" :key="item.id" class="review-record-row" :class="{ 'is-selected': selectedRhythmIds.has(item.id) }">
            <label v-if="rhythmManageMode" class="review-record-check"><input type="checkbox" :checked="selectedRhythmIds.has(item.id)" :aria-label="`选择${item.reminderTitle}`" @change="toggleRhythmSelect(item.id)" /></label>
            <button class="review-record-open" type="button" @click="openDetail('rhythm', item)">
              <span class="review-record-icon is-rhythm"><BellRing :size="17" /></span>
              <span class="review-record-main"><strong>{{ item.reminderTitle }}</strong><small>{{ triggerTypeLabel(item.triggerType) }} · {{ item.triggerLabel || '未记录规则' }}</small></span>
            </button>
            <span class="review-record-time"><strong>{{ formatShortDate(item.triggeredAt) }}</strong><small>{{ formatClock(item.triggeredAt) }} → {{ formatClock(item.resolvedAt) }}</small></span>
            <span class="review-record-meta"><strong :class="`rhythm-action rhythm-action--${item.action}`">{{ rhythmActionLabel(item.action) }}</strong><small>{{ formatResponseTime(item.responseSeconds) }}响应</small></span>
            <span class="review-record-actions">
              <template v-if="rhythmManageMode"><button type="button" aria-label="查看提醒规则" data-label="查看提醒规则" title="查看提醒规则" @click="openRhythmRuleFromRow(item)"><ExternalLink :size="16" /></button><button class="is-danger" type="button" aria-label="删除节律记录" data-label="删除节律记录" title="删除记录" @click="deleteRhythmRecord(item)"><Trash2 :size="16" /></button></template>
              <button v-else type="button" aria-label="查看节律详情" data-label="查看节律详情" title="查看详情" @click="openDetail('rhythm', item)"><ChevronRight :size="17" /></button>
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
          <header class="review-detail-header" :class="{ 'is-focus': detail.kind === 'focus' }">
            <div class="review-detail-heading">
              <span class="review-detail-heading__icon" :class="`is-${detail.kind}`"><Timer v-if="detail.kind === 'focus'" :size="19" /><BellRing v-else :size="19" /></span>
              <div>
                <span>{{ detail.kind === 'focus' ? '专注记录详情' : '节律记录详情' }}</span>
                <h2 :id="detail.kind === 'focus' ? 'focus-detail-title' : 'rhythm-detail-title'">{{ detail.kind === 'focus' ? focusTitle(detail.item) : detail.item.reminderTitle }}</h2>
                <p>{{ detail.kind === 'focus' ? `${formatShortDate(detail.item.finishedAt)} · ${formatTimeRange(detail.item.startedAt, detail.item.finishedAt)}` : `${formatShortDate(detail.item.triggeredAt)} · ${formatClock(detail.item.triggeredAt)} → ${formatClock(detail.item.resolvedAt)}` }}</p>
              </div>
            </div>
            <div class="review-detail-header__actions">
              <span v-if="detailProgressLabel" class="review-detail-progress">{{ detailProgressLabel }}</span>
              <button v-if="hasPrevDetail || hasNextDetail" type="button" class="review-detail-nav" :disabled="!hasPrevDetail" aria-label="上一条" title="上一条（↑）" @click="goPrevDetail"><ChevronUp :size="16" /></button>
              <button v-if="hasPrevDetail || hasNextDetail" type="button" class="review-detail-nav" :disabled="!hasNextDetail" aria-label="下一条" title="下一条（↓）" @click="goNextDetail"><ChevronDown :size="16" /></button>
              <button type="button" aria-label="关闭详情" title="关闭（Esc）" @click="closeDetail"><X :size="19" /></button>
            </div>
          </header>

          <template v-if="detail.kind === 'focus'">
            <div class="review-focus-summary">
            <section class="review-detail-hero is-focus">
              <div class="review-detail-hero__value">
                <span>本次有效时长</span>
                <strong class="review-detail-duration" :aria-label="formatDuration(detail.item.elapsedSeconds)">
                  <template v-for="part in durationMetricParts(detail.item.elapsedSeconds)" :key="part.unit">
                    <b>{{ part.value }}</b><em>{{ part.unit }}</em>
                  </template>
                </strong>
                <small>{{ resultLabel(detail.item.result) }} · {{ profileName(detail.item.profileId, detail.item) }}</small>
              </div>
              <div class="review-detail-hero__illustration" aria-hidden="true">
                <i class="review-detail-hero__orbit"></i>
                <i class="review-detail-hero__sprout"><b></b></i>
              </div>
              <div class="review-detail-hero__window">
                <div><span>开始</span><strong>{{ formatClock(detail.item.startedAt) }}</strong><small>{{ formatShortDate(detail.item.startedAt) }}</small></div>
                <ArrowRight :size="19" />
                <div><span>结束</span><strong>{{ formatClock(detail.item.finishedAt) }}</strong><small>{{ formatShortDate(detail.item.finishedAt) }}</small></div>
              </div>
            </section>
            <section class="review-focus-process" aria-label="过程摘要">
              <header><PanelsTopLeft :size="16" /><h3>过程摘要</h3></header>
              <div class="review-focus-process__grid">
                <article class="review-focus-process__item" tabindex="0">
                  <span class="is-focus"><Clock3 :size="18" /></span><div><small>实际专注</small><strong>{{ formatDuration(detail.item.elapsedSeconds) }}</strong></div>
                </article>
                <article class="review-focus-process__item is-interactive" tabindex="0">
                  <span class="is-pause"><CirclePause :size="18" /></span><div><small>中途暂停</small><strong>{{ focusPauseCount(detail.item) }} 次</strong></div>
                  <div class="review-focus-process__tooltip"><strong>暂停明细</strong><p v-if="!detailFocusActivity.pauseDetails.length">本次没有暂停记录。</p><ul v-else><li v-for="(item, index) in detailFocusActivity.pauseDetails" :key="`${item.at}-${index}`"><time>{{ item.time }}</time><span>{{ item.text }}</span></li></ul></div>
                </article>
                <article class="review-focus-process__item is-interactive" tabindex="0">
                  <span class="is-adjust"><SlidersHorizontal :size="18" /></span><div><small>调时</small><strong>{{ detailFocusActivity.adjustmentDetails.length }} 次</strong></div>
                  <div class="review-focus-process__tooltip"><strong>调时明细</strong><p v-if="!detailFocusActivity.adjustmentDetails.length">本次未调整目标时长。</p><ul v-else><li v-for="(item, index) in detailFocusActivity.adjustmentDetails" :key="`${item.at}-${index}`"><time>{{ item.time }}</time><span>{{ item.text }}</span></li></ul></div>
                </article>
                <article class="review-focus-process__item is-interactive" tabindex="0">
                  <span class="is-task"><ArrowLeftRight :size="18" /></span><div><small>换任务</small><strong>{{ detailFocusActivity.taskDetails.length }} 次</strong></div>
                  <div class="review-focus-process__tooltip"><strong>任务变更</strong><p v-if="!detailFocusActivity.taskDetails.length">本次未更换关联任务。</p><ul v-else><li v-for="(item, index) in detailFocusActivity.taskDetails" :key="`${item.at}-${index}`"><time>{{ item.time }}</time><span>{{ item.text }}</span></li></ul></div>
                </article>
              </div>
            </section>
            <section class="review-focus-plan" aria-label="计划与实际">
              <header><Orbit :size="17" /><h3>计划与实际</h3><small v-if="detailFocusPlan.adjustments">中途调时 {{ detailFocusPlan.adjustments }} 次</small></header>
              <div class="review-focus-plan__track">
                <article><span>{{ detailFocusPlan.initialName }}</span><strong>{{ detailFocusPlan.initialLabel }}</strong></article>
                <ChevronRight class="review-focus-plan__connector" :size="22" aria-hidden="true" />
                <article class="is-adjusted"><span>{{ detailFocusPlan.targetName }}</span><strong>{{ detailFocusPlan.targetLabel }}</strong></article>
                <ChevronRight class="review-focus-plan__connector" :size="22" aria-hidden="true" />
                <article class="is-complete"><span>实际完成</span><strong>{{ formatDuration(detail.item.elapsedSeconds) }}</strong><CircleCheckBig :size="20" /></article>
              </div>
              <p><Sparkles :size="14" />{{ focusOutcomeSummary(detail.item) }}</p>
            </section>
            </div>
            <section class="review-detail-record-compact">
              <div class="review-detail-record-compact__main">
                <span>关联任务</span>
                <span v-if="focusTaskTrail(detail.item).length" class="review-detail-task-trail">
                  <template v-for="(task, index) in focusTaskTrail(detail.item)" :key="`${task.id || 'none'}-${task.at || index}`">
                    <ChevronRight v-if="index" :size="12" />
                    <button v-if="focusTaskAvailable(task.id)" type="button" class="review-detail-task-link" :title="`打开任务：${task.title}`" @click="openFocusTask(task)">{{ task.title }}<ExternalLink :size="11" /></button>
                    <strong v-else>{{ task.title }}</strong>
                  </template>
                </span>
                <strong v-else>未关联任务</strong>
              </div>
              <div class="review-detail-record-compact__facts" aria-label="记录信息">
                <span><small>方式</small>{{ profileName(detail.item.profileId, detail.item) }}</span>
                <span><small>阶段</small>{{ detail.item.phase === 'focus' ? '专注' : phaseLabel(detail.item.phase) }}</span>
                <span><small>结果</small>{{ resultLabel(detail.item.result) }}</span>
              </div>
              <p v-if="focusTaskChangeCount(detail.item)" class="review-detail-context-note"><Activity :size="13" />过程中调整过 {{ focusTaskChangeCount(detail.item) }} 次任务关联</p>
            </section>
            <section class="review-detail-section">
              <header><Clock3 :size="16" /><h3>过程回放</h3><span class="review-detail-section__count">{{ focusTimelineSummary(detail.item).length }} 个重点</span></header>
              <ol v-if="detail.item.timeline?.length" class="review-timeline">
                <li v-for="(event, index) in focusTimelineSummary(detail.item)" :key="`${event.type}-${event.at}-${index}`" :class="{ 'is-summary': event.isSummary }">
                  <i :class="`is-${event.type}`"></i>
                  <div><strong>{{ event.isSummary ? `调整时长 ${event.count} 次` : focusEventLabel(event) }}</strong><span :title="formatFullDateTime(event.at)">{{ formatClock(event.at) }}</span><small>{{ event.isSummary ? `目标从 ${formatDuration(event.initialSeconds)} 调整至 ${formatDuration(event.finalSeconds)}` : focusEventDescription(event) }}</small></div>
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
              <div class="review-detail-hero__value"><span>这次提醒如何处理</span><strong>{{ rhythmActionLabel(detail.item.action) }}</strong><small>{{ rhythmOutcomeDescription(detail.item) }}</small></div>
              <div class="review-detail-hero__window">
                <div><span>提醒</span><strong>{{ formatClock(detail.item.triggeredAt) }}</strong><small>{{ formatShortDate(detail.item.triggeredAt) }}</small></div>
                <ArrowRight :size="19" />
                <div><span>处理</span><strong>{{ formatClock(detail.item.resolvedAt) }}</strong><small>{{ formatShortDate(detail.item.resolvedAt) }}</small></div>
              </div>
              <div class="review-detail-hero__stats">
                <div><span>响应耗时</span><strong>{{ formatResponseTime(detail.item.responseSeconds) }}</strong></div>
                <div><span>提醒规则</span><strong>{{ detail.item.triggerLabel || triggerTypeLabel(detail.item.triggerType) }}</strong></div>
                <div><span>中途延后</span><strong>{{ detail.item.snoozeMinutes ? `${detail.item.snoozeMinutes} 分钟` : '未延后' }}</strong></div>
              </div>
            </section>
            <section v-if="detailRhythmPattern.count > 1" class="review-rhythm-pattern" aria-label="同一提醒的近期处理情况">
              <header><span>这条提醒的近期表现</span><small>最近 {{ detailRhythmPattern.count }} 次</small></header>
              <div class="review-rhythm-pattern__stats">
                <span><strong>{{ detailRhythmPattern.completed }}</strong>完成或离席</span>
                <span><strong>{{ detailRhythmPattern.snoozed }}</strong>延后</span>
                <span><strong>{{ detailRhythmPattern.skipped }}</strong>跳过或稍后</span>
              </div>
              <p>{{ rhythmPatternDescription(detail.item) }}</p>
            </section>
            <section class="review-detail-section">
              <header>
                <BellRing :size="16" />
                <h3>提醒信息</h3>
                <button type="button" class="review-detail-edit" @click="openRhythmRule"><ExternalLink :size="13" />调整提醒规则</button>
              </header>
              <dl class="review-detail-fields">
                <div><dt>触发方式</dt><dd>{{ triggerTypeLabel(detail.item.triggerType) }}</dd></div>
                <div><dt>触发规则</dt><dd>{{ detail.item.triggerLabel || '未记录' }}</dd></div>
                <div v-if="detail.item.snoozeMinutes"><dt>延后时长</dt><dd>{{ detail.item.snoozeMinutes }} 分钟</dd></div>
              </dl>
            </section>
            <section class="review-detail-section">
              <header><Activity :size="16" /><h3>提醒与处理</h3><span class="review-detail-section__count">{{ rhythmTimeline(detail.item).length }} 个节点</span></header>
              <ol class="review-timeline">
                <li v-for="(event, index) in rhythmTimeline(detail.item)" :key="`${event.type}-${event.at}-${index}`">
                  <i :class="`is-${event.type}`"></i>
                  <div>
                    <strong>{{ rhythmEventLabel(event) }}</strong>
                    <span :title="formatFullDateTime(event.at)">{{ formatClock(event.at) }}</span>
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
            <div class="review-detail-footer__actions">
              <button v-if="detail.kind === 'focus' && detail.item.taskId" type="button" class="review-detail-context-action" @click="openLinkedTask(detail.item)"><ExternalLink :size="14" />打开关联任务</button>
              <button v-else-if="detail.kind === 'rhythm'" type="button" class="review-detail-context-action" @click="openRhythmRule"><BellRing :size="14" />调整提醒</button>
              <button type="button" class="review-detail-close" @click="closeDetail">关闭详情</button>
            </div>
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
import { Activity, ArrowLeftRight, ArrowRight, BarChart3, BellRing, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleCheckBig, CirclePause, Clock3, Coffee, Download, ExternalLink, Eye, FileText, History, Keyboard, Lightbulb, Orbit, PanelsTopLeft, Pencil, Play, RotateCcw, Search, SlidersHorizontal, Sparkles, Timer, Trash2, TrendingDown, TrendingUp, X } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { saveTextFile } from '@/services/platform'
import { initChart, readChartColors, chartTooltipStyle, echarts } from '@/utils/chartTheme'
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
const REVIEW_PREFS_KEY = 'simple-todo.review-prefs.v2'
const DEFAULT_REVIEW_PREFS = {
  range: '7d',
  activeTab: 'overview',
  recentKind: 'all',
  focusResult: 'all',
  focusPhase: 'focus',
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
const focusFiltersOpen = ref(false)
const rhythmFiltersOpen = ref(false)
const focusManageMode = ref(false)
const rhythmManageMode = ref(false)
// 自定义日期范围（YYYY-MM-DD），默认近 7 天到今日
function isoToday() { return dateKey(new Date()) }
const customStart = ref(reviewPrefs.customStart || (() => { const d = new Date(); d.setDate(d.getDate() - 6); return dateKey(d) })())
const customEnd = ref(reviewPrefs.customEnd || isoToday())
const detail = ref(null)
const detailIndex = ref(-1) // 详情面板当前记录在筛选后列表中的位置，用于上下条导航
const detailReturnTarget = ref(null)
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
const focusTaskSummary = computed(() => summarizeFocusDimension(focusEntries.value, item => {
  const title = String(item.taskTitle || '').trim()
  return { key: title || '__unlinked__', label: title || '未关联任务', query: title }
}))
const focusMapPrimaryTask = computed(() => focusTaskSummary.value.find(item => item.query) || null)
const focusProfileSummary = computed(() => summarizeFocusDimension(focusEntries.value, item => {
  const label = profileName(item.profileId, item)
  return { key: item.profileId || label, label, query: label }
}))
const focusTimeSummary = computed(() => {
  const periods = [
    { id: 'morning', label: '上午', from: 6, to: 12 },
    { id: 'afternoon', label: '下午', from: 12, to: 18 },
    { id: 'evening', label: '晚上', from: 18, to: 24 },
    { id: 'late', label: '深夜', from: 0, to: 6 }
  ].map(period => ({ ...period, count: 0, seconds: 0 }))
  focusEntries.value.forEach(item => {
    const hour = new Date(item.startedAt || item.finishedAt).getHours()
    const period = periods.find(candidate => candidate.from <= hour && hour < candidate.to) || periods[0]
    period.count += 1
    period.seconds += Math.max(0, Number(item.elapsedSeconds) || 0)
  })
  return periods
})
const focusTimePeak = computed(() => focusTimeSummary.value.reduce((peak, item) => item.count > peak.count ? item : peak, focusTimeSummary.value[0] || { count: 0, label: '—', seconds: 0 }))
const focusMapNarrative = computed(() => {
  const task = focusMapPrimaryTask.value
  const profile = focusProfileSummary.value[0]
  const time = focusTimePeak.value
  if (!task || !profile || !time?.count) return '更多记录会让这里更清晰。'
  return `主要：${task.label} · 方式：${profile.label} · 高峰：${time.label}`
})
const completedRhythmEntries = computed(() => rhythmEntries.value.filter(item => ['completed', 'natural-break'].includes(item.action)))
const rhythmCompletionRate = computed(() => rhythmEntries.value.length ? Math.round(completedRhythmEntries.value.length / rhythmEntries.value.length * 100) : 0)
const tabs = computed(() => [
  { id: 'overview', label: '综合概览', icon: Activity, count: focusEntries.value.length + rhythmEntries.value.length },
  { id: 'focus', label: '专注记录', icon: Timer, count: focusHistory.value.length },
  { id: 'rhythm', label: '节律记录', icon: BellRing, count: rhythmEntries.value.length }
])
function summarizeFocusDimension(entries, getDimension) {
  const buckets = new Map()
  entries.forEach(item => {
    const dimension = getDimension(item)
    if (!buckets.has(dimension.key)) buckets.set(dimension.key, { ...dimension, count: 0, seconds: 0 })
    const bucket = buckets.get(dimension.key)
    bucket.count += 1
    bucket.seconds += Math.max(0, Number(item.elapsedSeconds) || 0)
  })
  const total = Math.max(1, entries.reduce((sum, item) => sum + Math.max(0, Number(item.elapsedSeconds) || 0), 0))
  return [...buckets.values()]
    .map(item => ({ ...item, percent: Math.round(item.seconds / total * 100) }))
    .sort((a, b) => b.seconds - a.seconds || b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'))
}
// 投入节奏：短范围按日、较长范围按周、完整历史按月聚合。
// 这样稀疏记录不会被大量空白日期放大，也不需要截断历史数据。
function dayStart(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}
function weekStart(value) {
  const date = dayStart(value)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date
}
function monthStart(value) {
  const date = dayStart(value)
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
function addTrendPeriod(date, granularity) {
  const next = new Date(date)
  if (granularity === 'day') next.setDate(next.getDate() + 1)
  else if (granularity === 'week') next.setDate(next.getDate() + 7)
  else next.setMonth(next.getMonth() + 1)
  return next
}
function trendPeriodEnd(date, granularity) {
  const nextPeriod = addTrendPeriod(date, granularity)
  nextPeriod.setDate(nextPeriod.getDate() - 1)
  return nextPeriod
}
function trendPeriodStart(value, granularity) {
  if (granularity === 'day') return dayStart(value)
  if (granularity === 'week') return weekStart(value)
  return monthStart(value)
}
const trendRangeStart = computed(() => {
  if (rangeStart.value) return dayStart(rangeStart.value)
  const earliest = focusEntries.value.reduce((result, item) => !result || new Date(item.finishedAt) < result ? new Date(item.finishedAt) : result, null)
  return earliest ? dayStart(earliest) : dayStart(new Date())
})
const trendRangeEnd = computed(() => dayStart(rangeEnd.value || new Date()))
const trendRangeDays = computed(() => Math.max(1, Math.round((trendRangeEnd.value - trendRangeStart.value) / 86400000) + 1))
const trendGranularity = computed(() => trendRangeDays.value <= 14 ? 'day' : trendRangeDays.value <= 120 ? 'week' : 'month')
const trendDays = computed(() => {
  const granularity = trendGranularity.value
  const recordsByPeriod = new Map()
  focusEntries.value.forEach(item => {
    const start = trendPeriodStart(item.finishedAt, granularity)
    const key = dateKey(start)
    if (!recordsByPeriod.has(key)) recordsByPeriod.set(key, [])
    recordsByPeriod.get(key).push(item)
  })
  const currentPeriod = trendPeriodStart(trendRangeEnd.value, granularity)
  const result = []
  let cursor = trendPeriodStart(trendRangeStart.value, granularity)
  while (cursor <= trendRangeEnd.value) {
    const key = dateKey(cursor)
    const records = recordsByPeriod.get(key) || []
    const end = trendPeriodEnd(cursor, granularity)
    const dayOfWeek = cursor.getDay()
    const label = granularity === 'day'
      ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(cursor)
      : granularity === 'week'
        ? `${cursor.getMonth() + 1}/${cursor.getDate()}–${end.getMonth() + 1}/${end.getDate()}`
        : `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`
    result.push({
      key,
      seconds: records.reduce((total, item) => total + item.elapsedSeconds, 0),
      records,
      date: cursor,
      end,
      sessionCount: records.length,
      label,
      shortLabel: granularity === 'day' ? `周${'日一二三四五六'[dayOfWeek]}` : granularity === 'week' ? `${cursor.getMonth() + 1}/${cursor.getDate()}` : `${cursor.getFullYear()}/${cursor.getMonth() + 1}`,
      isCurrent: key === dateKey(currentPeriod),
      isWeekend: granularity === 'day' && (dayOfWeek === 0 || dayOfWeek === 6)
    })
    cursor = addTrendPeriod(cursor, granularity)
  }
  return result
})
const trendMetric = ref('duration')
const trendMetricLabel = computed(() => trendMetric.value === 'sessions' ? '专注段数' : '投入时长')
function trendValue(item) { return trendMetric.value === 'sessions' ? item.sessionCount : item.seconds }
function formatTrendValue(value) { return trendMetric.value === 'sessions' ? `${value} 段` : formatDuration(value) }
function formatCompactTrendValue(value) { return trendMetric.value === 'sessions' ? `${value} 段` : formatCompactDuration(value) }
const trendTotalLabel = computed(() => trendMetric.value === 'sessions' ? `${focusEntries.value.length} 段` : formatCompactDuration(totalFocusSeconds.value))
const trendPeak = computed(() => trendDays.value.reduce((peak, item) => trendValue(item) > (peak ? trendValue(peak) : 0) ? item : peak, null))
const trendPeakLabel = computed(() => trendPeak.value && trendValue(trendPeak.value) ? `峰值 ${trendPeak.value.label} · ${formatCompactTrendValue(trendValue(trendPeak.value))}` : '还没有投入')
const trendPeriodLabel = computed(() => ({ day: '每日', week: '每周', month: '每月' }[trendGranularity.value]))
const trendChartAriaLabel = computed(() => `${trendPeriodLabel.value}${trendMetricLabel.value}柱状图，共 ${trendDays.value.length} 个时间段；点击柱子可查看该时段的原始记录。`)
const trendDescription = computed(() => {
  const scope = { day: '按天', week: '按周', month: '按月' }[trendGranularity.value]
  const noun = trendMetric.value === 'sessions' ? '看专注段数' : '看投入时长'
  return `${scope}${noun}${trendGranularity.value === 'day' ? '；周末为蓝色' : ''}。`
})
function shortenTrendTooltipText(value, limit = 18) {
  const text = String(value || '').trim()
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}
function summarizeTrendTooltip(day) {
  const outcomes = { completed: 0, interrupted: 0, abandoned: 0 }
  const taskBuckets = new Map()
  let linkedCount = 0
  day.records.forEach(record => {
    outcomes[record.result] = (outcomes[record.result] || 0) + 1
    const title = String(record.taskTitle || '').trim()
    if (!title) return
    linkedCount += 1
    const bucket = taskBuckets.get(title) || { title, seconds: 0, count: 0 }
    bucket.seconds += Math.max(0, Number(record.elapsedSeconds) || 0)
    bucket.count += 1
    taskBuckets.set(title, bucket)
  })
  const primaryTask = [...taskBuckets.values()].sort((a, b) => b.seconds - a.seconds || b.count - a.count)[0]
  const outcomeText = [
    outcomes.completed ? `完成 ${outcomes.completed} 段` : '',
    outcomes.interrupted ? `中断 ${outcomes.interrupted} 段` : '',
    outcomes.abandoned ? `放弃 ${outcomes.abandoned} 段` : ''
  ].filter(Boolean).join(' · ') || '暂无结果信息'
  const unlinkedCount = day.records.length - linkedCount
  const taskText = primaryTask
    ? `主要：${shortenTrendTooltipText(primaryTask.title)} ${formatCompactDuration(primaryTask.seconds)} · ${linkedCount} 段已关联${unlinkedCount ? ` · ${unlinkedCount} 段未关联` : ''}`
    : `全部为未关联专注 · ${unlinkedCount} 段`
  return { outcomeText, taskText }
}
function buildTrendTooltip(day) {
  if (!day.seconds) return `<b>${escapeHtml(day.label)}${day.isCurrent ? '（当前）' : ''}</b><br/>无投入`
  const summary = summarizeTrendTooltip(day)
  const secondaryValue = trendMetric.value === 'sessions' ? formatDuration(day.seconds) : `${day.sessionCount} 段专注`
  return `<div style="display:grid;gap:5px;max-width:256px;line-height:1.35"><b>${escapeHtml(day.label)}${day.isCurrent ? '（当前）' : ''}</b><strong style="font-size:13px">${escapeHtml(formatTrendValue(trendValue(day)))}</strong><span style="color:#687674">${escapeHtml(secondaryValue)}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(summary.outcomeText)}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#687674">${escapeHtml(summary.taskText)}</span><small style="color:#687674">点击查看完整记录</small></div>`
}
function positionTrendTooltip(point, _params, _dom, _rect, size) {
  const [pointerX, pointerY] = point
  const [viewWidth, viewHeight] = size?.viewSize || [0, 0]
  const [contentWidth, contentHeight] = size?.contentSize || [256, 136]
  const gap = 12
  const maxLeft = Math.max(gap, viewWidth - contentWidth - gap)
  const maxTop = Math.max(gap, viewHeight - contentHeight - gap)
  // 首尾柱子向内侧展开，中间柱子也优先避开鼠标与当前柱体。
  const preferredLeft = pointerX <= viewWidth / 2 ? pointerX + gap : pointerX - contentWidth - gap
  const preferredTop = pointerY > contentHeight + gap ? pointerY - contentHeight - gap : pointerY + gap
  return [Math.min(maxLeft, Math.max(gap, preferredLeft)), Math.min(maxTop, Math.max(gap, preferredTop))]
}
// 趋势图：ECharts 柱状图实例管理；按范围自动切换日 / 周 / 月粒度。
const trendChartEl = ref(null)
let trendChartInstance = null
function buildTrendChartOption() {
  const colors = readChartColors()
  const days = trendDays.value
  const data = days.map(day => (trendValue(day) ? { value: trendValue(day), day } : null))
  return {
    animationDuration: 280,
    grid: { left: 46, right: 10, top: 24, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      appendToBody: true,
      confine: true,
      z: 1000,
      position: positionTrendTooltip,
      ...chartTooltipStyle(colors),
      formatter: (params) => {
        const day = params?.[0]?.data?.day
        return day ? buildTrendTooltip(day) : ''
      }
    },
    xAxis: {
      type: 'category',
      data: days.map(d => d.shortLabel),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: {
        interval: 0,
        color: colors.textMuted,
        fontSize: 9,
        formatter: (value, index) => {
          const total = days.length
          const every = total <= 8 ? 1 : Math.ceil(total / 8)
          return index % every === 0 || index === total - 1 ? value : ''
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: value => formatCompactTrendValue(value) },
      splitLine: { lineStyle: { color: colors.border } }
    },
    series: [{
      type: 'bar',
      data,
      barMaxWidth: 16,
      cursor: 'pointer',
      itemStyle: {
        borderRadius: [3, 3, 0, 0],
        color: (params) => (params.data?.day?.isWeekend ? '#6a9bc3' : colors.accent)
      }
    }]
  }
}
function renderTrendChart() {
  const el = trendChartEl.value
  if (!el || typeof window === 'undefined') return
  // tab 切走再切回时 DOM 重建，旧的已卸载实例需要重建
  if (trendChartInstance && !trendChartInstance.getDom().isConnected) {
    trendChartInstance.dispose()
    trendChartInstance = null
  }
  if (!trendChartInstance) trendChartInstance = initChart(el)
  trendChartInstance.setOption(buildTrendChartOption(), true)
  trendChartInstance.off('click')
  trendChartInstance.on('click', params => {
    const period = params?.data?.day
    if (period?.records?.length) openTrendPeriod(period)
  })
}
watch([trendDays, trendMetric, () => store.settings.theme, activeTab], () => renderTrendChart(), { flush: 'post' })
function resizeCharts() {
  trendChartInstance?.resize()
  rhythmChartInstances.forEach(({ chart }) => chart.resize())
}
function disposeCharts() {
  trendChartInstance?.dispose()
  trendChartInstance = null
  rhythmChartInstances.forEach(({ chart }) => chart.dispose())
  rhythmChartInstances.length = 0
}
const trendTitle = computed(() => {
  if (trendGranularity.value === 'day') return selectedRange.value.id === 'today' ? '今天的投入分布' : '每天的投入节奏'
  if (trendGranularity.value === 'week') return '每周的投入节奏'
  return '每月的长期投入'
})
const rhythmActionSummary = computed(() => {
  const definitions = [
    { action: 'completed', label: '完成 / 自然离席', shortLabel: '完成', matches: item => ['completed', 'natural-break'].includes(item.action) },
    { action: 'snoozed', label: '延后', shortLabel: '延后', matches: item => item.action === 'snoozed' },
    { action: 'skipped', label: '跳过 / 关闭', shortLabel: '跳过', matches: item => ['skipped-today', 'dismissed'].includes(item.action) }
  ]
  return definitions.map(item => {
    const count = rhythmEntries.value.filter(item.matches).length
    return { ...item, count, percent: rhythmEntries.value.length ? Math.round(count / rhythmEntries.value.length * 100) : 0 }
  })
})
const RHYTHM_DETAIL_MINIMUM = 10
const rhythmDetailsOpen = ref(false)
const rhythmReminderSummary = computed(() => {
  const groups = new Map()
  rhythmEntries.value.forEach(item => {
    const id = item.reminderId || item.reminderTitle || item.id
    if (!groups.has(id)) groups.set(id, { id, title: item.reminderTitle || '未命名提醒', count: 0, completed: 0, snoozed: 0, skipped: 0, latest: item })
    const group = groups.get(id)
    group.count += 1
    if (['completed', 'natural-break'].includes(item.action)) group.completed += 1
    else if (item.action === 'snoozed') group.snoozed += 1
    else group.skipped += 1
    if (new Date(item.resolvedAt) > new Date(group.latest.resolvedAt)) group.latest = item
  })
  return [...groups.values()].sort((a, b) => b.count - a.count || b.skipped - a.skipped)
})
const rhythmSummaryMessage = computed(() => {
  const top = rhythmReminderSummary.value[0]
  if (!top) return ''
  if (top.skipped > top.completed && top.skipped >= 2) return `「${top.title}」本期有 ${top.skipped} 次被跳过，可能没有出现在合适的时段。`
  if (top.snoozed > top.completed && top.snoozed >= 2) return `「${top.title}」经常需要稍后处理，可以试试调整提醒时段或间隔。`
  if (completedRhythmEntries.value.length) return '至少有一部分提醒被自然地处理了；需要时可以继续微调具体规则。'
  return '先从最常出现的提醒开始看看，保留真正适合你的节奏。'
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

// 细节统计只在样本足够时按需展开，避免少量记录被拆成无意义的小图。
const rhythmResponseChartEl = ref(null)
const rhythmHourChartEl = ref(null)
const rhythmWeekdayChartEl = ref(null)
const rhythmChartInstances = []
// 横向条形图的统一 option：y 轴类别倒序（首项在顶部），label 显示次数与占比（0 值不显示）
function buildRhythmBarOption(items, { barColor = '#2f8f86', labelFormatter = p => `${p.value} 次 · ${p.data.percent}%`, tooltipFormatter = p => `<b>${escapeHtml(p.name)}</b><br/>${p.value} 次 · ${p.data.percent}%` } = {}) {
  const colors = readChartColors()
  return {
    animationDuration: 220,
    grid: { left: 96, right: 96, top: 4, bottom: 4 },
    tooltip: {
      trigger: 'item',
      ...chartTooltipStyle(colors),
      formatter: tooltipFormatter
    },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: items.map(item => item.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.text, fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: items.map(item => ({ value: item.count, percent: item.percent, itemStyle: { color: item.color || barColor, borderRadius: [0, 4, 4, 0] } })),
      barWidth: 10,
      label: { show: true, position: 'right', formatter: p => (p.value > 0 ? labelFormatter(p) : ''), color: colors.textMuted, fontSize: 10 }
    }]
  }
}
function renderRhythmCharts() {
  // 清理已从 DOM 移除的旧实例（v-if 或 tab 切换重建后 el 引用变化）
  for (let i = rhythmChartInstances.length - 1; i >= 0; i -= 1) {
    if (!rhythmChartInstances[i].el.isConnected) {
      rhythmChartInstances[i].chart.dispose()
      rhythmChartInstances.splice(i, 1)
    }
  }
  const bindings = [
    { el: rhythmResponseChartEl.value, key: 'response' },
    { el: rhythmHourChartEl.value, key: 'hour' },
    { el: rhythmWeekdayChartEl.value, key: 'weekday' }
  ]
  bindings.forEach(({ el, key }) => {
    if (!el) return
    let instance = rhythmChartInstances.find(item => item.el === el)
    if (!instance) {
      instance = { el, chart: initChart(el) }
      rhythmChartInstances.push(instance)
    }
    instance.chart.setOption(buildRhythmOptionFor(key), true)
  })
}
function rhythmActionColor(action) {
  if (action === 'completed') return readChartColors().accent
  if (action === 'snoozed') return '#d69c42'
  return '#89918f'
}
function buildRhythmOptionFor(key) {
  const colors = readChartColors()
  if (key === 'response') {
    return buildRhythmBarOption(rhythmResponseBuckets.value.map(b => ({ ...b, color: colors.accent })))
  }
  if (key === 'hour') {
    return buildRhythmBarOption(rhythmHourBuckets.value.map(b => ({ ...b, color: '#6a9bc3' })))
  }
  // weekday：两行，label 与其他图统一（次数 · 占比），完成率放到 tooltip
  const w = rhythmWeekdaySummary.value
  return buildRhythmBarOption([
    { label: '工作日', count: w.weekday.count, percent: w.weekday.percent, color: colors.accent },
    { label: '周末', count: w.weekend.count, percent: w.weekend.percent, color: '#6a9bc3' }
  ], {
    tooltipFormatter: p => {
      const rate = p.dataIndex === 0 ? w.weekday.completionRate : w.weekend.completionRate
      return `<b>${escapeHtml(p.name)}</b><br/>${p.value} 次 · ${p.data.percent}%<br/>完成率 ${rate}%`
    }
  })
}
watch([rhythmEntries, bucketFast, bucketMedium, bucketSlow, () => store.settings.theme, activeTab], () => renderRhythmCharts(), { flush: 'post' })
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
const detailProgressLabel = computed(() => detailIndex.value >= 0 && detailList.value.length > 1 ? `${detailIndex.value + 1} / ${detailList.value.length}` : '')
const detailFocusActivity = computed(() => detail.value?.kind === 'focus' ? focusActivityDetails(detail.value.item) : { pauseDetails: [], adjustmentDetails: [], taskDetails: [] })
const detailFocusPlan = computed(() => detail.value?.kind === 'focus' ? focusPlanSummary(detail.value.item) : { initialName: '原计划', initialLabel: '—', targetName: '本次目标', targetLabel: '—', adjustments: 0 })
const detailRhythmPattern = computed(() => detail.value?.kind === 'rhythm' ? rhythmPattern(detail.value.item) : { count: 0, completed: 0, snoozed: 0, skipped: 0 })

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
const filteredFocusOnlyRecords = computed(() => filteredFocusRecords.value.filter(item => item.phase === 'focus'))
const filteredFocusSeconds = computed(() => filteredFocusOnlyRecords.value.reduce((total, item) => total + item.elapsedSeconds, 0))
const filteredFocusCompletionRate = computed(() => filteredFocusOnlyRecords.value.length ? Math.round(filteredFocusOnlyRecords.value.filter(item => item.result === 'completed').length / filteredFocusOnlyRecords.value.length * 100) : 0)
const filteredFocusPauseCount = computed(() => filteredFocusOnlyRecords.value.reduce((total, item) => total + focusPauseCount(item), 0))
const filteredFocusPausedSeconds = computed(() => filteredFocusOnlyRecords.value.reduce((total, item) => total + focusPausedSeconds(item), 0))
const filteredRhythmCompletionRate = computed(() => filteredRhythmRecords.value.length ? Math.round(filteredRhythmRecords.value.filter(item => ['completed', 'natural-break'].includes(item.action)).length / filteredRhythmRecords.value.length * 100) : 0)
const filteredRhythmResponseAverage = computed(() => filteredRhythmRecords.value.length ? filteredRhythmRecords.value.reduce((total, item) => total + item.responseSeconds, 0) / filteredRhythmRecords.value.length : 0)
const filteredRhythmSnoozeCount = computed(() => filteredRhythmRecords.value.filter(item => item.action === 'snoozed').length)
const focusFilterCount = computed(() => [focusSearch.value, focusResult.value !== 'all', focusPhase.value !== 'focus', focusPause.value !== 'all', focusSort.value !== 'newest'].filter(Boolean).length)
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
function toggleFocusManageMode() {
  focusManageMode.value = !focusManageMode.value
  if (!focusManageMode.value) clearFocusSelection()
}
function toggleRhythmManageMode() {
  rhythmManageMode.value = !rhythmManageMode.value
  if (!rhythmManageMode.value) clearRhythmSelection()
}
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
// 导出报告图表：用 ECharts 临时实例渲染输出高清 PNG（替代手绘 canvas）
const EXPORT_CHART_COLORS = {
  weekday: '#8a75e3',
  weekend: '#6a9bc3',
  average: '#5d89b0',
  muted: '#9aa5a3',
  grid: '#e8eceb',
  text: '#4a5553'
}
function renderChartToDataUrl(option, width = 760, height = 240) {
  const holder = document.createElement('div')
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${width}px;height:${height}px`
  document.body.appendChild(holder)
  const chart = echarts.init(holder, null, { width, height, renderer: 'canvas' })
  chart.setOption(option)
  const url = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' })
  chart.dispose()
  holder.remove()
  return url
}
function buildExportTrendOption() {
  const days = trendDays.value
  return {
    grid: { left: 56, right: 16, top: 28, bottom: 28 },
    xAxis: {
      type: 'category',
      data: days.map(d => d.shortLabel),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: EXPORT_CHART_COLORS.grid } },
      axisLabel: { interval: 0, color: EXPORT_CHART_COLORS.muted, fontSize: 11, formatter: (value, index) => (index % Math.max(1, Math.ceil(days.length / 8)) === 0 || index === days.length - 1 ? value : '') }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: EXPORT_CHART_COLORS.muted, fontSize: 11, formatter: value => formatCompactDuration(value) },
      splitLine: { lineStyle: { color: EXPORT_CHART_COLORS.grid } }
    },
    series: [{
      type: 'bar',
      data: days.map(d => d.seconds || null),
      barMaxWidth: 18,
      itemStyle: { borderRadius: [3, 3, 0, 0], color: (params) => (days[params.dataIndex]?.isWeekend ? EXPORT_CHART_COLORS.weekend : EXPORT_CHART_COLORS.weekday) }
    }]
  }
}
function buildExportBarOption(items) {
  return {
    grid: { left: 160, right: 70, top: 8, bottom: 8 },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: items.map(item => item.label),
      axisLabel: { color: EXPORT_CHART_COLORS.text, fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: items.map(item => ({ value: item.count, percent: item.percent, itemStyle: { color: item.color, borderRadius: [0, 4, 4, 0] } })),
      barWidth: 12,
      label: { show: true, position: 'right', formatter: p => (p.value > 0 ? `${p.value} 次 · ${p.data.percent}%` : ''), color: EXPORT_CHART_COLORS.text, fontSize: 11 }
    }]
  }
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
  const trendImg = trendDays.value.length ? renderChartToDataUrl(buildExportTrendOption(), 760, 280) : null
  if (trendImg) {
    parts.push('<section><h2>专注趋势</h2><img src="' + trendImg + '" alt="每日专注时长趋势图" /></section>')
  }
  // 节律执行图
  if (rhythmEntries.value.length) {
    parts.push('<section><h2>节律执行</h2>')
    const actionImg = renderChartToDataUrl(buildExportBarOption(rhythmActionSummary.value.map(item => ({ label: item.label, count: item.count, percent: item.percent, color: item.action === 'completed' ? '#8a75e3' : item.action === 'snoozed' ? '#d69c42' : '#89918f' }))), 760, 130)
    parts.push('<img src="' + actionImg + '" alt="节律处理结果分布" style="margin-bottom:10px" />')
    const responseImg = renderChartToDataUrl(buildExportBarOption(rhythmResponseBuckets.value.map(b => ({ label: b.label, count: b.count, percent: b.percent, color: '#8a75e3' }))), 760, 160)
    parts.push('<img src="' + responseImg + '" alt="响应速度分布" style="margin-bottom:10px" />')
    const hourImg = renderChartToDataUrl(buildExportBarOption(rhythmHourBuckets.value.map(b => ({ label: b.label, count: b.count, percent: b.percent, color: '#6a9bc3' }))), 760, 160)
    parts.push('<img src="' + hourImg + '" alt="提醒时段分布" />')
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
function durationMetricParts(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0))
  if (value > 0 && value < 60) return [{ value, unit: '秒' }]
  const minutes = Math.round(value / 60)
  if (minutes < 60) return [{ value: minutes, unit: '分钟' }]
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return restMinutes
    ? [{ value: hours, unit: '小时' }, { value: restMinutes, unit: '分钟' }]
    : [{ value: hours, unit: '小时' }]
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
function focusInterruptionLabel(item) {
  const count = focusPauseCount(item)
  const seconds = focusPausedSeconds(item)
  if (!count) return '未暂停'
  if (seconds < 30) return `短暂操作 ${count} 次`
  return `${count} 次 · ${formatDuration(seconds)}`
}
function focusChangeLabel(item) {
  const timeline = item.timeline || []
  const adjustments = timeline.filter(event => event.type === 'duration-adjusted').length
  const taskChanges = timeline.filter(event => event.type === 'task-changed').length
  if (!adjustments && !taskChanges) return '无'
  return [adjustments ? `调时 ${adjustments} 次` : '', taskChanges ? `换任务 ${taskChanges} 次` : ''].filter(Boolean).join(' · ')
}
function focusDurationStory(item) {
  const adjustments = (item.timeline || []).filter(event => event.type === 'duration-adjusted' && Number.isFinite(Number(event.durationSeconds)) && Number.isFinite(Number(event.deltaSeconds)))
  if (!adjustments.length) return null
  const first = adjustments[0]
  const initialSeconds = Math.max(0, Number(first.durationSeconds) - Number(first.deltaSeconds))
  const finalSeconds = Math.max(0, Number(adjustments[adjustments.length - 1].durationSeconds))
  if (!initialSeconds || !finalSeconds) return null
  return { initialSeconds, finalSeconds, adjustments: adjustments.length }
}
function focusActivityDetails(item) {
  const timeline = item.timeline || []
  const pauseDetails = []
  let pausedAt = null
  timeline.forEach(event => {
    if (event.type === 'paused') pausedAt = event.at
    if (pausedAt && ['resumed', 'finished'].includes(event.type)) {
      const seconds = Number(event.pausedSeconds) || Math.max(0, Math.round((new Date(event.at).getTime() - new Date(pausedAt).getTime()) / 1000))
      pauseDetails.push({ at: pausedAt, time: formatClock(pausedAt), text: `${formatDuration(seconds)}后${event.type === 'resumed' ? '继续专注' : '结束记录'}` })
      pausedAt = null
    }
  })
  if (pausedAt) pauseDetails.push({ at: pausedAt, time: formatClock(pausedAt), text: '暂停后未记录继续操作' })
  const adjustmentDetails = timeline.filter(event => event.type === 'duration-adjusted').map(event => ({
    at: event.at,
    time: formatClock(event.at),
    text: `${event.deltaSeconds >= 0 ? '增加' : '减少'} ${formatDuration(Math.abs(event.deltaSeconds || 0))}，目标为 ${formatDuration(event.durationSeconds)}`
  }))
  const taskDetails = timeline.filter(event => event.type === 'task-changed').map(event => ({
    at: event.at,
    time: formatClock(event.at),
    text: event.taskId ? `换为「${focusTaskEventTitle(event)}」` : '解除任务关联'
  }))
  return { pauseDetails, adjustmentDetails, taskDetails }
}
function focusPlanSummary(item) {
  const story = focusDurationStory(item)
  if (story) return { initialName: '原计划', initialLabel: formatDuration(story.initialSeconds), targetName: '调整后目标', targetLabel: formatDuration(story.finalSeconds), adjustments: story.adjustments }
  const started = (item.timeline || []).find(event => event.type === 'started')
  if (Number.isFinite(Number(started?.durationSeconds)) && Number(started.durationSeconds) > 0) {
    const target = formatDuration(started.durationSeconds)
    return { initialName: '原计划', initialLabel: target, targetName: '本次目标', targetLabel: target, adjustments: 0 }
  }
  if (started && started.durationSeconds === null) return { initialName: '计时方式', initialLabel: '自由计时', targetName: '本次目标', targetLabel: '不设上限', adjustments: 0 }
  return { initialName: '记录时长', initialLabel: formatDuration(item.elapsedSeconds), targetName: '历史目标', targetLabel: '未记录', adjustments: 0 }
}
function focusTimelineSummary(item) {
  const timeline = item.timeline || []
  const adjustments = timeline.filter(event => event.type === 'duration-adjusted')
  if (adjustments.length < 2) return timeline
  const firstAdjust = adjustments[0]
  const lastAdjust = adjustments[adjustments.length - 1]
  const story = focusDurationStory(item)
  let summaryAdded = false
  return timeline.reduce((result, event) => {
    if (event.type === 'duration-adjusted') {
      if (!summaryAdded) {
        result.push({ type: 'duration-adjusted', at: firstAdjust.at, isSummary: true, count: adjustments.length, initialSeconds: story?.initialSeconds || 0, finalSeconds: story?.finalSeconds || Number(lastAdjust.durationSeconds) || 0 })
        summaryAdded = true
      }
      return result
    }
    result.push(event)
    return result
  }, [])
}
function rhythmOutcomeDescription(item) {
  if (item.action === 'natural-break') return '检测到自然离席，已自动记录本次休息'
  if (item.action === 'snoozed') return `已延后 ${item.snoozeMinutes || 0} 分钟，等待下一次提醒`
  if (item.action === 'skipped-today') return '今天不再为这条提醒打扰你'
  return `${formatResponseTime(item.responseSeconds)}后处理`
}
function focusTaskChangeCount(item) { return (item.timeline || []).filter(event => event.type === 'task-changed').length }
function focusTaskEventTitle(event) {
  if (!event?.taskId) return '解除关联'
  return event.taskTitle || store.activeTasks.find(task => task.id === event.taskId)?.title || '已关联任务'
}
function focusTaskAvailable(taskId) { return Boolean(taskId && store.activeTasks.some(task => task.id === taskId)) }
function focusTaskTrail(item) {
  const trail = []
  const pushTask = (id, title, at) => {
    const normalizedTitle = title || (id ? store.activeTasks.find(task => task.id === id)?.title || '已关联任务' : '解除关联')
    const previous = trail[trail.length - 1]
    if (previous?.id === (id || null) && previous.title === normalizedTitle) return
    trail.push({ id: id || null, title: normalizedTitle, at })
  }
  ;(item.timeline || []).filter(event => ['started', 'task-changed'].includes(event.type)).forEach(event => pushTask(event.taskId, focusTaskEventTitle(event), event.at))
  if (!trail.length && (item.taskId || item.taskTitle)) pushTask(item.taskId, item.taskTitle, item.finishedAt)
  else if (item.taskId && trail[trail.length - 1]?.id !== item.taskId) pushTask(item.taskId, item.taskTitle, item.finishedAt)
  return trail
}
function focusOutcomeSummary(item) {
  const story = focusDurationStory(item)
  if (story && item.result === 'completed') {
    const delta = Number(item.elapsedSeconds) - story.initialSeconds
    if (delta > 0) return `比原计划多投入 ${formatDuration(delta)}，这一段已顺利完成。`
    if (delta < 0) return `在原计划前结束，实际投入 ${formatDuration(item.elapsedSeconds)}。`
  }
  if (item.result !== 'completed') return `本次以“${resultLabel(item.result)}”结束，实际留下 ${formatDuration(item.elapsedSeconds)} 的投入记录。`
  if (focusPauseCount(item)) return `完成这段专注，中途有 ${focusInterruptionLabel(item)}。`
  return `完成这段专注，过程保持连贯。`
}
function rhythmPattern(item) {
  const key = item.reminderId || item.reminderTitle
  const records = rhythmHistory.value
    .filter(entry => (entry.reminderId || entry.reminderTitle) === key)
    .sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt))
    .slice(0, 7)
  return records.reduce((summary, entry) => {
    summary.count += 1
    if (['completed', 'natural-break'].includes(entry.action)) summary.completed += 1
    else if (entry.action === 'snoozed') summary.snoozed += 1
    else summary.skipped += 1
    return summary
  }, { count: 0, completed: 0, snoozed: 0, skipped: 0 })
}
function rhythmPatternDescription(item) {
  const pattern = rhythmPattern(item)
  if (pattern.completed === pattern.count) return '最近几次都顺利处理，可以继续保持当前节奏。'
  if (pattern.snoozed > pattern.completed) return '近期延后较多；如果经常不方便处理，可以考虑调整提醒时机。'
  if (pattern.skipped > pattern.completed) return '近期跳过或稍后处理较多；可以检查这条提醒是否仍适合当前安排。'
  return '近期处理方式较为均衡，可按需要继续观察。'
}
function focusEventLabel(event) { return ({ started: '开始计时', paused: '暂停', resumed: '继续计时', 'duration-adjusted': '调整时长', 'task-changed': '更换关联任务', finished: '结束并记录' }[event.type] || '状态变化') }
function focusEventDescription(event) {
  if (event.type === 'resumed' && event.pausedSeconds) return `本次暂停 ${formatDuration(event.pausedSeconds)}`
  if (event.type === 'duration-adjusted') return `${event.deltaSeconds >= 0 ? '增加' : '减少'} ${formatDuration(Math.abs(event.deltaSeconds))}，目标调整为 ${formatDuration(event.durationSeconds)}`
  if (event.type === 'task-changed') return event.taskId ? `关联至「${focusTaskEventTitle(event)}」` : '已解除任务关联'
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
function openFocusSlice(query) {
  focusPhase.value = 'focus'
  focusSearch.value = query || ''
  void selectTab('focus')
}
function openTrendPeriod(period) {
  if (!period?.records?.length) return
  const end = period.end > trendRangeEnd.value ? trendRangeEnd.value : period.end
  range.value = 'custom'
  customStart.value = dateKey(period.date)
  customEnd.value = dateKey(end)
  focusPhase.value = 'focus'
  focusResult.value = 'all'
  focusPause.value = 'all'
  focusSearch.value = ''
  focusPage.value = 1
  void selectTab('focus')
}
function openDetail(kind, item) {
  // 从概览页点开时，自动切到对应的管理 tab，让 prev/next 导航能在完整筛选列表里走
  if (activeTab.value === 'overview') activeTab.value = kind
  detailReturnTarget.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
  detail.value = { kind, item }
  editingNote.value = false
  noteDraft.value = ''
  syncDetailIndex()
  nextTick(() => focusFirstInDetail())
}
function closeDetail() {
  const returnTarget = detailReturnTarget.value
  detail.value = null
  detailIndex.value = -1
  detailReturnTarget.value = null
  nextTick(() => returnTarget?.isConnected && returnTarget.focus?.())
}
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
function trapDetailFocus(event) {
  const root = detailRef.value
  if (!root || event.key !== 'Tab') return false
  const nodes = [...root.querySelectorAll('button:not(:disabled), [href], textarea:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')]
    .filter(node => node instanceof HTMLElement && node.offsetParent !== null)
  if (!nodes.length) return false
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
    return true
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
    return true
  }
  return false
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
function openFocusTask(task) {
  if (!task?.id) return
  openLinkedTask({ taskId: task.id, taskTitle: task.title })
}
function resetFocusFilters() { focusSearch.value = ''; focusResult.value = 'all'; focusPhase.value = 'focus'; focusPause.value = 'all'; focusSort.value = 'newest' }
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
  if (detail.value && trapDetailFocus(event)) return
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

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', resizeCharts)
  renderTrendChart()
  renderRhythmCharts()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})
</script>

<style scoped>
.review-workspace {
  align-content: start;
  justify-items: stretch;
  overflow: auto;
  padding: clamp(18px, 2.6vw, 34px);
  background:
    radial-gradient(circle at 84% 2%, color-mix(in srgb, var(--accent-soft) 82%, transparent), transparent 30%),
    radial-gradient(circle at 2% 24%, color-mix(in srgb, #dbeaf4 54%, transparent), transparent 24%),
    var(--surface-muted);
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
.review-controls { display: flex; align-items: center; min-height: 48px; margin-bottom: 14px; padding: 4px 6px; border: 1px solid var(--divider-soft); border-radius: 14px; background: color-mix(in srgb, var(--surface) 88%, transparent); box-shadow: 0 6px 16px var(--text-4-fallback); }
.review-tabs { display: flex; flex: 0 0 auto; gap: 5px; padding: 0; }
.review-tabs button { display: inline-flex; min-height: 42px; align-items: center; gap: 7px; padding: 0 13px; border-radius: 10px; color: var(--text-muted); font-size: 12px; font-weight: 680; }
.review-tabs button:hover { color: var(--text); background: var(--surface-muted); }
.review-tabs button.active { color: var(--accent-strong); background: linear-gradient(135deg, var(--accent-soft), color-mix(in srgb, var(--accent-soft) 48%, var(--surface))); box-shadow: inset 0 0 0 1px var(--accent-20-border-fallback), 0 3px 9px var(--text-4-fallback); }
.review-tabs button span { min-width: 18px; padding: 2px 5px; border-radius: 999px; background: var(--surface); color: var(--text-muted); font-size: 9px; text-align: center; }
.review-tabs button:focus-visible, .review-record-list button:focus-visible, .review-detail button:focus-visible { outline: 3px solid var(--accent-20-border-fallback); outline-offset: 2px; }
.review-summary > header > div:first-child { flex: 0 1 360px; }.review-summary > header p { margin: 0; color: var(--text-muted); font-size: 10px; }
.review-metrics { display: grid; grid-template-columns: 1.25fr repeat(3, minmax(150px, .75fr)); gap: 1px; margin-top: 14px; overflow: hidden; border: 1px solid var(--divider-soft); border-radius: 13px; background: var(--divider-soft); }
.review-metric, .review-card { border: 1px solid var(--divider-soft); border-radius: 18px; background: color-mix(in srgb, var(--surface) 96%, transparent); box-shadow: 0 10px 26px var(--text-4-fallback); }
.review-metric { position: relative; display: grid; min-height: 122px; align-content: center; gap: 5px; padding: 16px 18px; border: 0; border-radius: 0; box-shadow: none; }
.review-metric::before { position: absolute; top: 17px; left: 0; width: 3px; height: 26px; border-radius: 0 999px 999px 0; background: var(--accent); content: ''; opacity: .72; }
.review-metric:not(.review-metric--primary)::before { background: #6a9bc3; opacity: .42; }
.review-metric > span, .review-metric small { color: var(--text-muted); font-size: 11px; }
.review-metric > strong { color: var(--text); font-size: 25px; letter-spacing: -.045em; font-variant-numeric: tabular-nums; }
.review-metric small { line-height: 1.45; }
.review-metric--primary { background: linear-gradient(145deg, var(--accent-tint), var(--surface)); }
.review-metric--primary > strong { font-size: clamp(25px, 2.5vw, 32px); }
.review-metric--rhythm { background: linear-gradient(145deg, var(--surface), color-mix(in srgb, var(--accent-soft) 30%, var(--surface))); }
.review-metric--rhythm .review-metric__delta.is-up { background: var(--accent-soft); color: var(--accent-strong); }
.review-overview-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(330px, 1fr); align-items: start; gap: 12px; margin-top: 12px; }
.review-card { min-width: 0; padding: 20px; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.review-card:hover { border-color: color-mix(in srgb, var(--accent) 22%, var(--divider-soft)); box-shadow: 0 14px 32px var(--text-7-fallback); }
.review-card > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.review-card > header > div { display: grid; gap: 4px; }
.review-card > header span { color: var(--accent-strong); font-size: 10px; font-weight: 730; letter-spacing: .06em; }
.review-card > header h2 { margin: 0; color: var(--text); font-size: 16px; letter-spacing: -.02em; }
.review-card > header > strong { color: var(--text); font-size: 14px; font-variant-numeric: tabular-nums; }
.review-card > header > small { color: var(--text-muted); font-size: 11px; }
.review-focus-map { margin-top: 12px; border-color: color-mix(in srgb, var(--accent) 18%, var(--divider-soft)); background: linear-gradient(118deg, color-mix(in srgb, var(--accent-soft) 36%, var(--surface)), var(--surface) 46%, color-mix(in srgb, #e8f1df 28%, var(--surface))); }
.review-focus-map__total { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; padding: 7px 9px; border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--divider-soft)); border-radius: 9px; background: var(--surface); color: var(--accent-strong) !important; font-size: 11px !important; font-weight: 750 !important; letter-spacing: 0 !important; font-variant-numeric: tabular-nums; }
.review-focus-map__signals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }.review-focus-map__signal { display: grid; min-width: 0; gap: 3px; padding: 10px 11px; border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--divider-soft)); border-radius: 11px; background: color-mix(in srgb, var(--surface) 86%, transparent); color: inherit; font: inherit; text-align: left; }.review-focus-map__signal:is(button) { cursor: pointer; }.review-focus-map__signal:is(button):hover { border-color: color-mix(in srgb, var(--accent) 34%, var(--divider-soft)); background: var(--surface); }.review-focus-map__signal span { color: var(--text-muted); font-size: 9px; font-weight: 680; }.review-focus-map__signal strong { overflow: hidden; color: var(--text); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.review-focus-map__signal small { overflow: hidden; color: var(--accent-strong); font-size: 9.5px; text-overflow: ellipsis; white-space: nowrap; }
.review-focus-map__breakdown { display: grid; gap: 0; margin-top: 12px; padding-top: 12px; border-top: 1px solid color-mix(in srgb, var(--accent) 16%, var(--divider-soft)); }.review-focus-map__breakdown > header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 7px; }.review-focus-map__breakdown > header > div { display: grid; gap: 2px; }.review-focus-map__breakdown > header span { color: var(--text); font-size: 11px; font-weight: 750; }.review-focus-map__breakdown > header small { color: var(--text-muted); font-size: 9px; }
.review-focus-map__row { display: grid; grid-template-columns: minmax(0, 1fr) 48px 31px; align-items: center; gap: 8px; width: 100%; min-height: 42px; padding: 5px 0; border: 0; border-top: 1px solid color-mix(in srgb, var(--divider-soft) 76%, transparent); color: inherit; font: inherit; text-align: left; cursor: pointer; }.review-focus-map__row:first-of-type { border-top: 0; }.review-focus-map__row:hover strong { color: var(--accent-strong); }.review-focus-map__row > span { display: grid; min-width: 0; gap: 2px; }.review-focus-map__row strong { overflow: hidden; color: var(--text); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; transition: color var(--transition-fast); }.review-focus-map__row small { overflow: hidden; color: var(--text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.review-focus-map__row i { height: 5px; overflow: hidden; border-radius: 99px; background: color-mix(in srgb, var(--accent) 10%, var(--surface-muted)); }.review-focus-map__row i b { display: block; height: 100%; border-radius: inherit; background: var(--accent); }.review-focus-map__section--profiles .review-focus-map__row i b { background: #6a9bc3; }.review-focus-map__row em { color: var(--text-muted); font-size: 9px; font-style: normal; font-variant-numeric: tabular-nums; text-align: right; }.review-focus-map__empty { margin: 12px 0 0; color: var(--text-muted); font-size: 10px; line-height: 1.55; }
/* 趋势图与节律图：ECharts 容器 */
.review-chart-description { margin: 8px 0 0; color: var(--text-muted); font-size: 11px; line-height: 1.55; }
.review-trend-chart { height: 218px; margin-top: 14px; }
.review-rhythm-card > header svg { color: #5d89b0; }
.review-rhythm-charts { display: grid; gap: 14px; margin-top: 16px; }
.review-rhythm-chart-block { display: grid; gap: 6px; min-width: 0; padding: 10px 11px; border: 1px solid color-mix(in srgb, var(--divider-soft) 84%, transparent); border-radius: 12px; background: color-mix(in srgb, var(--surface-muted) 55%, transparent); }
.review-rhythm-chart-block h4 { margin: 0; color: var(--text-muted); font-size: 10.5px; font-weight: 700; letter-spacing: .04em; }
.review-rhythm-chart-block > header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.review-rhythm-chart { height: 72px; }
.review-rhythm-status { display: grid; gap: 9px; margin-top: 16px; padding: 14px; border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--divider-soft)); border-radius: 14px; background: linear-gradient(145deg, color-mix(in srgb, var(--accent-soft) 52%, var(--surface)), var(--surface)); }
.review-rhythm-status__summary { display: flex; align-items: baseline; gap: 7px; }
.review-rhythm-status__summary strong { color: var(--text); font-size: 22px; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.review-rhythm-status__summary span { color: var(--text-muted); font-size: 11px; }
.review-rhythm-status__bar { display: flex; height: 8px; overflow: hidden; border-radius: 999px; background: var(--surface-muted); }
.review-rhythm-status__bar i { display: block; min-width: 0; height: 100%; }
.review-rhythm-status__bar i.is-completed, .review-rhythm-status__legend i.is-completed { background: var(--accent); }
.review-rhythm-status__bar i.is-snoozed, .review-rhythm-status__legend i.is-snoozed { background: #d69c42; }
.review-rhythm-status__bar i.is-skipped, .review-rhythm-status__legend i.is-skipped { background: #89918f; }
.review-rhythm-status__legend { display: flex; flex-wrap: wrap; gap: 6px 12px; }
.review-rhythm-status__legend span { display: inline-flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 10px; }
.review-rhythm-status__legend i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; }
.review-rhythm-status > p { margin: 0; color: var(--text); font-size: 11.5px; line-height: 1.55; }
.review-rhythm-reminders { display: grid; gap: 5px; margin-top: 14px; }
.review-rhythm-reminders > header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.review-rhythm-reminders h3 { margin: 0; color: var(--text); font-size: 12px; letter-spacing: -.01em; }
.review-rhythm-reminders header small { color: var(--text-muted); font-size: 10px; }
.review-rhythm-reminders > button { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 48px; padding: 8px 9px 8px 11px; border: 1px solid transparent; border-radius: 10px; background: var(--surface-muted); color: var(--text-muted); font: inherit; text-align: left; cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast); }
.review-rhythm-reminders > button:hover { border-color: color-mix(in srgb, var(--accent) 26%, var(--divider-soft)); background: var(--surface); color: var(--accent-strong); }
.review-rhythm-reminders > button > span { display: grid; min-width: 0; gap: 2px; }
.review-rhythm-reminders strong { overflow: hidden; color: var(--text); font-size: 11.5px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.review-rhythm-reminders small { color: var(--text-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.review-rhythm-reminders svg { flex: 0 0 auto; }
.review-rhythm-detail-toggle { display: inline-flex; align-items: center; justify-content: center; gap: 4px; width: 100%; min-height: 32px; margin-top: 12px; border: 0; border-radius: 9px; background: transparent; color: var(--accent-strong); font: inherit; font-size: 10.5px; font-weight: 700; cursor: pointer; }
.review-rhythm-detail-toggle:hover { background: var(--accent-soft); }
.review-rhythm-detail-toggle svg { transition: transform var(--transition-fast); }
.review-rhythm-detail-toggle svg.is-open { transform: rotate(180deg); }
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
.review-summary > header > .review-summary-actions { display: flex; flex: 0 0 auto; align-items: center; justify-content: flex-end; gap: 10px; min-width: max-content; }.review-summary-actions > small { white-space: nowrap; }.review-summary-range { display: flex; flex: 0 0 auto; align-items: center; gap: 7px; }.review-summary-range > span { display: inline-flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 10px; font-weight: 650; white-space: nowrap; }.review-summary-range > span svg { color: var(--accent-strong); }
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
.review-filter-toggle, .review-manage-toggle { display: inline-flex; min-height: 34px; align-items: center; justify-content: center; gap: 5px; padding: 0 10px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface); color: var(--text-muted); font: inherit; font-size: 11.5px; font-weight: 650; cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast); }
.review-filter-toggle span { display: grid; min-width: 16px; height: 16px; place-items: center; padding: 0 3px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); font-size: 9px; }
.review-filter-toggle:hover, .review-filter-toggle.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-strong); }
.review-manage-toggle:hover, .review-manage-toggle.active { border-color: var(--divider); background: var(--surface); color: var(--text); }
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
.review-record-table__head, .review-record-row { display: grid; grid-template-columns: minmax(200px, 1fr) 118px 96px 42px; align-items: center; }
.review-record-table.is-managing .review-record-table__head, .review-record-table.is-managing .review-record-row { grid-template-columns: 28px minmax(200px, 1fr) 118px 96px 74px; }
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
.review-record-status { display: inline-flex; width: fit-content; padding: 2px 6px; border-radius: 999px; background: var(--surface-muted); color: var(--text-muted); font-weight: 650; }
.review-record-status.is-completed { background: var(--accent-soft); color: var(--accent-strong); }
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
.review-detail > header { position: sticky; z-index: 2; top: 0; display: flex; min-height: 68px; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 20px; border-bottom: 1px solid var(--divider-soft); background: var(--surface); }
.review-detail-heading { display: flex; min-width: 0; align-items: center; gap: 11px; }
.review-detail-heading__icon { display: grid; width: 32px; height: 32px; flex: 0 0 auto; place-items: center; border-radius: 10px; }
.review-detail-heading__icon.is-focus { background: #f0ecff; color: #6649df; }
.review-detail-heading__icon.is-rhythm { background: #eaf2f8; color: #4f7fa6; }
.review-detail-heading > div { display: grid; min-width: 0; gap: 2px; }
.review-detail-heading > div > span { color: var(--accent-strong); font-size: 10px; font-weight: 730; }
.review-detail > header h2 { margin: 0; color: var(--text); font-size: 17px; letter-spacing: -.03em; }
.review-detail-heading p { margin: 0; color: var(--text-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.review-detail-header.is-focus .review-detail-heading > div > span { color: #6649df; }
.review-detail > header button { display: grid; width: 40px; height: 40px; flex: 0 0 auto; place-items: center; border-radius: 11px; color: var(--text-muted); }
.review-detail > header button:hover { background: var(--surface-muted); color: var(--text); }
.review-detail-progress { min-width: 38px; color: var(--text-muted); font-size: 10px; font-variant-numeric: tabular-nums; text-align: center; }
.review-detail-hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px 18px; margin: 10px 20px 8px; padding: 12px 16px; border: 1px solid var(--divider-soft); border-radius: 16px; }
.review-focus-summary { --accent: #7557e8; --accent-strong: #6246d8; --accent-soft: #f0ecff; margin: 14px 20px 12px; overflow: visible; border: 1px solid #d9d0fb; border-radius: 19px; background: var(--surface); box-shadow: 0 8px 24px var(--text-4-fallback); }
.review-detail-hero.is-focus { position: relative; grid-template-columns: minmax(145px, 1fr) 96px auto; min-height: 128px; margin: 0; overflow: hidden; gap: 9px; padding: 18px 20px; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--accent) 15%, var(--divider-soft)); border-radius: 18px 18px 0 0; background: radial-gradient(circle at 30% 18%, rgba(255, 255, 255, .92), transparent 32%), linear-gradient(135deg, color-mix(in srgb, var(--accent-soft) 78%, #f7f4ff) 0%, #fbfaff 54%, color-mix(in srgb, var(--accent-soft) 38%, #fff) 100%); }
.review-detail-hero.is-rhythm { background: linear-gradient(145deg, #f2f7fb, var(--surface)); }
.review-detail-hero.is-focus > * { position: relative; z-index: 1; }
.review-detail-hero__illustration { align-self: stretch; min-width: 0; }
.review-detail-hero__illustration::before, .review-detail-hero__illustration::after { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: rgba(255, 255, 255, .96); box-shadow: 0 0 10px rgba(117, 87, 232, .25); content: ''; }
.review-detail-hero__illustration::before { top: 9px; right: 2px; }
.review-detail-hero__illustration::after { right: 38px; bottom: 15px; }
.review-detail-hero__orbit { position: absolute; top: 1px; left: -2px; width: 78px; height: 78px; border: 8px solid rgba(255, 255, 255, .78); border-right-color: #ddd4fc; border-bottom-color: #c9bbfa; border-radius: 50%; transform: rotate(27deg); box-shadow: 0 0 0 1px rgba(121, 94, 230, .06), 0 12px 26px rgba(121, 94, 230, .08); }
.review-detail-hero__sprout { position: absolute; right: -1px; bottom: 3px; width: 58px; height: 14px; border-radius: 50% 50% 36% 36%; background: radial-gradient(ellipse at center, #cfc2fa 0%, #e6dfff 58%, transparent 70%); filter: drop-shadow(0 7px 7px rgba(105, 76, 205, .12)); }
.review-detail-hero__sprout::before { position: absolute; bottom: 7px; left: 23px; width: 2px; height: 29px; border-radius: 999px; background: #9c86ed; content: ''; transform: rotate(-8deg); transform-origin: bottom; }
.review-detail-hero__sprout::after { position: absolute; top: -22px; left: 25px; width: 25px; height: 13px; border-radius: 100% 0 100% 0; background: #a98ff1; content: ''; transform: rotate(-24deg); }
.review-detail-hero__sprout b { position: absolute; top: -15px; left: 4px; width: 26px; height: 13px; border-radius: 0 100% 0 100%; background: #bca9f7; transform: rotate(23deg); }
.review-detail-hero__value { display: grid; min-width: 0; gap: 2px; }
.review-detail-hero__value > span { color: var(--accent-strong); font-size: 11px; font-weight: 720; }
.review-detail-hero__value > strong { color: var(--accent-strong); font-size: clamp(27px, 2vw, 36px); font-weight: 780; letter-spacing: -.065em; line-height: 1.05; white-space: nowrap; }
.review-detail-hero__value > strong.review-detail-duration { display: flex; align-items: baseline; gap: 2px; letter-spacing: 0; }
.review-detail-duration b { color: var(--accent-strong); font-size: clamp(34px, 2.8vw, 46px); font-weight: 790; letter-spacing: -.055em; line-height: 1; }
.review-detail-duration em { color: var(--text); font-size: 15px; font-style: normal; font-weight: 750; letter-spacing: -.02em; }
.review-detail-duration em:not(:last-child) { margin-right: 4px; }
.review-detail-hero__value > small { color: var(--accent-strong); font-size: 11px; font-weight: 700; }
.review-detail-hero__window { display: flex; align-items: center; justify-content: space-between; gap: 11px; color: var(--text-muted); }
.review-detail-hero__window > div { display: grid; min-width: 56px; gap: 3px; }
.review-detail-hero__window > div:last-child { justify-items: end; }
.review-detail-hero__window span, .review-detail-hero__window small { color: var(--text-muted); font-size: 10px; }
.review-detail-hero__window strong { color: var(--text); font-size: 16px; font-variant-numeric: tabular-nums; }
/* 统计行并入 hero 卡内底部，取代独立三格卡 */
.review-detail-hero__stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; padding-top: 9px; border-top: 1px solid color-mix(in srgb, var(--accent) 15%, var(--divider-soft)); }
.review-detail-hero__stats > div { display: grid; gap: 2px; padding: 0 12px; }
.review-detail-hero__stats > div:first-child { padding-left: 0; }
.review-detail-hero__stats > div:last-child { padding-right: 0; }
.review-detail-hero__stats > div + div { border-left: 1px solid var(--divider-soft); }
.review-detail-hero__stats span { color: var(--text-muted); font-size: 9.5px; }
.review-detail-hero__stats strong { color: var(--text); font-size: 12px; font-variant-numeric: tabular-nums; }
.review-focus-process, .review-focus-plan { display: grid; gap: 10px; margin: 0; padding: 12px 16px; background: transparent; }
.review-focus-process > header, .review-focus-plan > header { display: flex; align-items: center; gap: 6px; color: var(--accent-strong); }
.review-focus-process h3, .review-focus-plan h3 { margin: 0; color: var(--text); font-size: 13px; font-weight: 750; }
.review-focus-process > header small, .review-focus-plan > header small { margin-left: auto; color: var(--text-muted); font-size: 9.5px; font-weight: 550; }
.review-focus-process__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.review-focus-process__item { position: relative; display: flex; min-width: 0; min-height: 50px; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--divider-soft) 88%, #fff); border-radius: 12px; background: linear-gradient(145deg, var(--surface), var(--surface-muted)); box-shadow: 0 5px 12px var(--text-4-fallback); }
.review-focus-process__item > span { display: grid; width: 30px; height: 30px; flex: 0 0 auto; place-items: center; border-radius: 50%; background: #f0ebff; color: #6647df; }
.review-focus-process__item > span.is-pause { background: #fff3df; color: #cb851e; }
.review-focus-process__item > span.is-adjust { background: #edf3ff; color: #537ea7; }
.review-focus-process__item > span.is-task { background: #f2ecff; color: #7053d4; }
.review-focus-process__item > div:not(.review-focus-process__tooltip) { display: grid; min-width: 0; gap: 2px; }
.review-focus-process__item small { color: var(--text-muted); font-size: 10px; white-space: nowrap; }
.review-focus-process__item strong { overflow: hidden; color: var(--text); font-size: 13px; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
.review-focus-process__item.is-interactive { cursor: help; transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast); }
.review-focus-process__item.is-interactive:hover, .review-focus-process__item.is-interactive:focus-visible { z-index: 3; border-color: color-mix(in srgb, var(--accent) 34%, var(--divider-soft)); box-shadow: 0 8px 18px var(--text-7-fallback); outline: none; transform: translateY(-1px); }
.review-focus-process__tooltip { position: absolute; z-index: 5; bottom: calc(100% + 4px); left: 0; display: grid; width: min(270px, 76vw); gap: 7px; padding: 10px 11px; border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--divider-soft)); border-radius: 10px; background: var(--surface); box-shadow: 0 14px 32px rgba(18, 23, 38, .18); cursor: default; opacity: 0; pointer-events: none; transform: translateY(4px); transition: opacity .16s ease, transform .16s ease; }
.review-focus-process__tooltip::after { position: absolute; right: 0; bottom: -6px; left: 0; height: 6px; content: ''; }
.review-focus-process__item:nth-child(n + 3) .review-focus-process__tooltip { right: 0; left: auto; }
.review-focus-process__item.is-interactive:hover .review-focus-process__tooltip, .review-focus-process__item.is-interactive:focus-visible .review-focus-process__tooltip { opacity: 1; pointer-events: auto; transform: translateY(0); }
.review-focus-process__tooltip > strong { color: var(--accent-strong); font-size: 10px; }
.review-focus-process__tooltip p { margin: 0; color: var(--text-muted); font-size: 10px; line-height: 1.45; }
.review-focus-process__tooltip ul { display: grid; gap: 5px; max-height: 150px; margin: 0; padding: 0 4px 0 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; list-style: none; }
.review-focus-process__tooltip ul::-webkit-scrollbar { width: 5px; }
.review-focus-process__tooltip ul::-webkit-scrollbar-thumb { border-radius: 999px; background: color-mix(in srgb, var(--accent) 35%, var(--divider-soft)); }
.review-focus-process__tooltip li { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 6px; color: var(--text); font-size: 10px; line-height: 1.4; }
.review-focus-process__tooltip time { color: var(--text-muted); font-variant-numeric: tabular-nums; }
.review-focus-plan { gap: 11px; padding-top: 2px; padding-bottom: 14px; }
.review-focus-plan__track { display: grid; grid-template-columns: minmax(0, .95fr) 28px minmax(0, 1fr) 28px minmax(0, 1.08fr); align-items: center; gap: 5px; }
.review-focus-plan__track > article { display: grid; min-width: 0; min-height: 58px; align-content: center; gap: 3px; padding: 10px 11px; border-radius: 12px; background: #f5f2ff; }
.review-focus-plan__track > article span { color: var(--text-muted); font-size: 10px; }
.review-focus-plan__track > article strong { color: var(--text); font-size: 14px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.review-focus-plan__track > article small { color: var(--accent-strong); font-size: 10px; }
.review-focus-plan__connector { width: 28px; height: 28px; color: #687277; stroke-width: 2.25; }
.review-focus-plan__track > article.is-adjusted { background: #f5f2ff; }
.review-focus-plan__track > article.is-complete { position: relative; border: 1px solid color-mix(in srgb, var(--accent) 48%, var(--divider-soft)); background: var(--surface); }
.review-focus-plan__track > article.is-complete svg { position: absolute; top: 50%; right: 8px; color: var(--accent); transform: translateY(-50%); }
.review-focus-plan > p { display: flex; align-items: flex-start; gap: 6px; margin: 0; color: var(--text); font-size: 10.5px; font-weight: 620; line-height: 1.45; }
.review-focus-plan > p svg { flex: 0 0 auto; color: var(--accent-strong); }
.review-rhythm-pattern { display: grid; gap: 9px; margin: 0 20px 10px; padding: 13px 14px; border: 1px solid #dbe7f0; border-radius: 13px; background: linear-gradient(135deg, #f2f7fb, var(--surface)); }
.review-rhythm-pattern > header { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.review-rhythm-pattern > header span { color: #426d8e; font-size: 11px; font-weight: 730; }
.review-rhythm-pattern > header small { color: var(--text-muted); font-size: 10px; }
.review-rhythm-pattern__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); overflow: hidden; border: 1px solid rgba(79, 127, 166, .14); border-radius: 9px; background: rgba(255, 255, 255, .68); }
.review-rhythm-pattern__stats span { display: grid; gap: 2px; padding: 8px 9px; color: var(--text-muted); font-size: 9.5px; line-height: 1.35; }
.review-rhythm-pattern__stats span + span { border-left: 1px solid rgba(79, 127, 166, .13); }
.review-rhythm-pattern__stats strong { color: #3f6d91; font-size: 14px; font-variant-numeric: tabular-nums; }
.review-rhythm-pattern > p { margin: 0; color: #536e81; font-size: 10.5px; line-height: 1.5; }
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
.review-timeline li.is-summary { min-height: 48px; padding: 8px 10px 8px 0; border-radius: 10px; background: color-mix(in srgb, var(--accent-soft) 46%, transparent); }
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
.review-detail-record-compact { display: grid; gap: 7px; padding: 10px 20px; border-top: 1px solid var(--border); }
.review-detail-record-compact__main { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 12px; }
.review-detail-record-compact__main > span { color: var(--text-muted); font-size: 10.5px; }
.review-detail-record-compact__main > strong { color: var(--text); font-size: 11.5px; font-weight: 600; }
.review-detail-task-trail { display: inline-flex; min-width: 0; align-items: center; justify-content: flex-end; gap: 3px; color: var(--text-muted); }
.review-detail-task-trail > svg { flex: 0 0 auto; color: var(--text-muted); }
.review-detail-task-trail .review-detail-task-link { max-width: 148px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.review-detail-task-trail > strong { overflow: hidden; max-width: 110px; color: var(--text-muted); font-size: 10.5px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.review-detail-record-compact__facts { display: flex; flex-wrap: wrap; gap: 5px; }
.review-detail-record-compact__facts span { display: inline-flex; align-items: center; gap: 4px; padding: 4px 7px; border-radius: 7px; background: var(--surface-muted); color: var(--text); font-size: 10.5px; font-weight: 600; }
.review-detail-record-compact__facts small { color: var(--text-muted); font-size: 9px; font-weight: 550; }
.review-detail-context-note { display: flex; align-items: flex-start; gap: 5px; margin: 0; padding: 5px 7px; border-radius: 7px; background: var(--surface-muted); color: var(--text-muted); font-size: 9.5px; line-height: 1.4; }
.review-detail-context-note svg { flex: 0 0 auto; margin-top: 1px; color: var(--accent-strong); }
.review-detail > footer { position: sticky; z-index: 2; bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding: 14px 20px; border-top: 1px solid var(--divider-soft); background-color: var(--surface, #fff); box-shadow: 0 -8px 20px var(--text-4-fallback); }
.review-detail > footer button { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 6px; padding: 0 13px; border-radius: 10px; font-size: 12px; font-weight: 680; }
.review-detail-footer__actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.review-detail-context-action { min-height: 36px !important; border: 1px solid var(--divider-soft); background: var(--surface); color: var(--accent-strong); }
.review-detail-context-action:hover { border-color: var(--accent); background: var(--accent-soft); }
.review-detail-delete { min-height: 34px !important; padding: 0 9px !important; border: 0; background: transparent; color: #b05757; }
.review-detail-delete:hover { background: #f7e3e0; border-color: rgba(176, 87, 87, .3); color: #a04949; }
.review-detail-close { min-width: 86px; background: var(--accent); color: #fff; }
.review-detail-close:hover { background: var(--accent-strong); }
@media (max-width: 900px) { .review-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }.review-overview-grid { grid-template-columns: 1fr; }.review-record-table, .review-recent-list { overflow-x: auto; }.review-record-table__head, .review-record-row, .review-recent-row { min-width: 720px; } }
@media (max-width: 900px) { .review-focus-map__signals { grid-template-columns: 1fr 1fr; }.review-summary > header { display: grid; }.review-summary-actions { justify-content: flex-start; flex-wrap: wrap; } }
@media (max-width: 620px) { .review-focus-map__signals { grid-template-columns: 1fr; }.review-focus-map__total { display: none; } }
@media (max-width: 900px) {
  .review-filters label { flex-basis: 100%; }
}
@media (max-width: 680px) { .review-workspace { padding: 14px; }.review-controls { display: grid; gap: 5px; padding: 5px; }.review-range-toolbar { order: -1; padding-left: 5px; }.review-range-toolbar__label { display: none; }.review-range-toolbar__control { width: 100%; }.review-range, .review-tabs { overflow-x: auto; }.review-tabs button { white-space: nowrap; }.review-metrics { grid-template-columns: 1fr 1fr; }.review-metric { min-height: 88px; padding: 12px; }.review-recent__header { display: grid !important; }.review-recent-switch { width: 100%; }.review-recent-switch button { flex: 1; }.review-recent__footer { display: grid; }.review-recent__footer > div { display: grid; grid-template-columns: 1fr 1fr; }.review-filters label { flex-basis: 100%; }.review-filter-summary { gap: 4px 10px; }.review-pagination { flex-wrap: wrap; justify-content: space-between; }.review-detail-hero { grid-template-columns: 1fr; }.review-detail-hero__window { justify-content: space-between; }.review-detail-hero__stats { grid-template-columns: 1fr; }.review-detail-hero__stats > div + div { border-left: 0; border-top: 1px solid var(--divider-soft); }.review-focus-process__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.review-focus-plan__track { grid-template-columns: minmax(0, 1fr) 17px minmax(0, 1fr) 17px minmax(0, 1fr); }.review-focus-plan__track > article { padding: 8px 6px; }.review-focus-plan__track > article strong { font-size: 11px; }.review-rhythm-pattern__stats { grid-template-columns: 1fr; }.review-rhythm-pattern__stats span + span { border-top: 1px solid rgba(79, 127, 166, .13); border-left: 0; }.review-detail-footer__actions { flex-wrap: wrap; } }
@media (max-width: 680px) { .review-detail-hero.is-focus { grid-template-columns: minmax(0, 1fr) auto; }.review-detail-hero__illustration { display: none; }.review-focus-plan__connector { width: 17px; height: 17px; } }
/* 新增：本期亮点洞察 */
.review-insights { display: grid; gap: 8px; margin-top: 14px; padding: 10px 0; border-top: 1px solid color-mix(in srgb, var(--accent) 18%, var(--divider-soft)); border-bottom: 1px solid color-mix(in srgb, var(--accent) 12%, var(--divider-soft)); }
.review-insights > header { display: flex; align-items: center; gap: 7px; color: var(--accent-strong); }
.review-insights > header > span { font-size: 12px; font-weight: 750; letter-spacing: .04em; }
.review-insights > header > small { margin-left: auto; color: var(--text-muted); font-size: 11px; font-weight: 500; }
.review-insights__list { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 8px; }
.review-insight { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 10px; background: var(--surface-muted); }
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
.review-chart-meta__peak { display: inline-flex; justify-self: end; align-items: center; gap: 1px; max-width: 100%; padding: 0; border: 0; background: transparent; color: var(--text-muted); font: inherit; font-size: 10px; cursor: pointer; }
.review-chart-meta__peak:hover { color: var(--accent-strong); }.review-chart-meta__peak:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 3px; }
.review-trend-tools { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; }.review-trend-tools > small { color: var(--text-muted); font-size: 10px; white-space: nowrap; }
.review-trend-metric { display: inline-flex; min-height: 28px; padding: 2px; border-radius: 8px; background: var(--surface-muted); }.review-trend-metric button { min-height: 24px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--text-muted); font: inherit; font-size: 10px; font-weight: 650; cursor: pointer; }.review-trend-metric button:hover { color: var(--text); }.review-trend-metric button.active { background: var(--surface); box-shadow: 0 1px 3px color-mix(in srgb, var(--text) 10%, transparent); color: var(--accent-strong); }.review-trend-metric button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.review-chart-note { margin: 0 0 10px; padding: 6px 10px; border-radius: 8px; background: color-mix(in srgb, var(--accent-soft) 50%, transparent); color: var(--accent-strong); font-size: 11px; }
.review-chart-note__btn { display: inline-flex; align-items: center; min-height: 24px; margin: 0 2px; padding: 0 8px; border: 0; border-radius: 6px; background: var(--surface); color: var(--accent-strong); font: inherit; font-size: 10.5px; font-weight: 650; cursor: pointer; }
.review-chart-note__btn:hover { background: var(--accent-soft); }
.review-chart-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 6px; font-size: 10px; color: var(--text-muted); }
.review-chart-legend i { display: inline-block; width: 10px; height: 10px; margin-right: 4px; border-radius: 2px; vertical-align: middle; }
.review-chart-legend i.is-weekday { background: var(--accent); }
.review-chart-legend i.is-weekend { background: #6a9bc3; }
.review-chart-legend i.is-average { width: 12px; height: 0; border-top: 1px dashed var(--accent); border-radius: 0; background: transparent; }
.review-chart-empty { margin: 12px 0 4px; padding: 18px 12px; border-radius: 10px; background: var(--surface-muted); color: var(--text-muted); font-size: 12px; text-align: center; }
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

@media (prefers-reduced-motion: reduce) { .review-detail-fade-enter-active, .review-detail-fade-leave-active { transition: none; } }
</style>
