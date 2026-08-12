<template>
  <main class="achievement-workspace">
    <div class="achievement-shell">
      <header class="achievement-header">
        <div>
          <p class="eyebrow">专注留下的长期风景</p>
          <h1>专注成就</h1>
          <p>每天的一株花，在这里慢慢长成自己的花田。</p>
        </div>
        <div class="achievement-header__today">
          <FocusPlant :species-id="store.focusGardenToday.speciesId" :stage="store.focusGardenToday.stage" />
          <span><small>今日花</small><strong>{{ todaySpeciesName }} · {{ todayStageName }}</strong></span>
        </div>
      </header>

      <nav class="achievement-tabs" aria-label="专注成就内容">
        <button type="button" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'"><Sprout :size="16" />成长总览</button>
        <button type="button" :class="{ active: activeTab === 'field' }" @click="activeTab = 'field'"><Flower2 :size="16" />花田回顾</button>
        <button type="button" :class="{ active: activeTab === 'species' }" @click="activeTab = 'species'"><BookOpen :size="16" />花种图鉴</button>
        <button type="button" :class="{ active: activeTab === 'badges' }" @click="activeTab = 'badges'"><Trophy :size="16" />成长徽章</button>
      </nav>

      <section v-if="activeTab === 'overview'" class="achievement-overview">
        <section class="overview-hero card-surface">
          <div class="overview-hero__copy">
            <span>现在的成长</span>
            <h2>{{ currentGrowthRank.name }}</h2>
            <p>{{ currentGrowthRank.description }}</p>
            <div class="overview-hero__facts">
              <div><small>最长连续</small><strong>{{ store.focusGardenTotals.longestStreak }} 天</strong></div>
              <div><small>累计投入</small><strong>{{ durationHuman(store.focusGardenTotals.totalMinutes) }}</strong></div>
              <div><small>已培养花种</small><strong>{{ store.focusGardenTotals.speciesCount }} 种</strong></div>
            </div>
          </div>
          <div class="overview-hero__plant">
            <FocusPlant :species-id="store.focusGardenToday.speciesId" :stage="store.focusGardenToday.stage" />
            <span>{{ todaySpeciesName }} · {{ todayStageName }}</span>
          </div>
        </section>

        <section v-if="primaryGoal" class="overview-goal card-surface">
          <span class="overview-goal__icon"><component :is="primaryGoal.icon" :size="20" /></span>
          <div><span>下一步</span><h2>{{ primaryGoal.title }}</h2><p>{{ primaryGoal.description }}</p></div>
          <div class="overview-goal__progress"><strong>{{ primaryGoal.progress }}%</strong><i><b :style="{ width: `${primaryGoal.progress}%` }" /></i></div>
          <button type="button" @click="openPrimaryGoal"><component :is="primaryGoal.icon" :size="14" />{{ primaryGoal.actionLabel }}</button>
        </section>

        <section class="overview-week card-surface">
          <header class="achievement-section-heading"><div><span>最近 7 天</span><h2>成长痕迹</h2><p>有专注的日子留下花，没有记录的日子安静留白。</p></div><button type="button" @click="activeTab = 'field'">查看花田 <ChevronRight :size="14" /></button></header>
          <div class="overview-week__days">
            <button v-for="day in recentGardenDays" :key="day.date" type="button" :class="{ grown: day.entry, active: day.date === todayKey }" :aria-label="dayCellLabel(day)" @click="openOverviewDay(day, $event)">
              <span>{{ day.weekday }}</span><strong>{{ day.day }}</strong>
              <FocusTerrarium :size="day.entry ? terrariumSizeFor(day.entry.stage) : 'empty'" :species-id="day.entry ? day.entry.speciesId : 'daisy'" :stage="day.entry ? day.entry.stage : 'seed'" :highlight="day.date === todayKey" />
            </button>
          </div>
        </section>

        <div class="overview-doors">
          <button type="button" class="overview-door card-surface" @click="activeTab = 'species'"><span><BookOpen :size="18" /></span><div><small>花种图鉴</small><strong>{{ nextSpecies ? `下一种：${nextSpecies.name}` : '第一册图鉴已完成' }}</strong><em>{{ nextSpecies ? `还差 ${Math.max(0, nextSpecies.unlockMinutes - store.focusGardenTotals.totalMinutes)} 分钟` : `已深入培养 ${deepCompanionCount} / ${store.focusGardenSpecies.length} 种` }}</em></div><ChevronRight :size="17" /></button>
          <button type="button" class="overview-door card-surface" @click="activeTab = 'badges'"><span><Trophy :size="18" /></span><div><small>成长徽章</small><strong>{{ nextAchievement ? `下一枚：${nextAchievement.name}` : '全部徽章已获得' }}</strong><em>{{ nextAchievement ? `还差 ${achievementRemaining(nextAchievement)}` : '查看你的成长档案' }}</em></div><ChevronRight :size="17" /></button>
        </div>
      </section>

      <section v-else-if="activeTab === 'field'" class="achievement-field">
        <section class="field-hero card-surface">
          <div class="field-hero__copy">
            <span>花田总览 · {{ selectedYear }}</span>
            <h2>把专注过成一座可以回望的花园</h2>
            <p>花田总览记录时间留下的形状，成长徽章则把其中值得记住的节点收拢起来。</p>
            <div class="field-hero__facts">
              <div><small>累计专注</small><strong>{{ durationHuman(store.focusGardenTotals.totalMinutes) }}</strong></div>
              <div><small>成长日</small><strong>{{ store.focusGardenTotals.activeDays }} 天</strong></div>
              <div><small>花田等级</small><strong>{{ currentGrowthRank.name }}</strong></div>
            </div>
          </div>
          <div class="field-hero__plant">
            <div><FocusPlant :species-id="store.focusGardenToday.speciesId" :stage="store.focusGardenToday.stage" /></div>
            <span><small>今天的花</small><strong>{{ todaySpeciesName }} · {{ todayStageName }}</strong></span>
          </div>
          <div class="field-hero__progress">
            <span>距离下一阶段</span>
            <strong>{{ nextGrowthRank ? nextGrowthRank.name : '盛放花田' }}</strong>
            <i><b :style="{ width: `${growthRankProgress}%` }"></b></i>
            <small>{{ nextGrowthRank ? `还差 ${nextGrowthRank.threshold - store.focusGardenTotals.totalMinutes} 分钟` : '已达到最高等级' }}</small>
            <button type="button" @click="activeTab = 'badges'"><Trophy :size="13" />查看成长徽章</button>
          </div>
        </section>

        <section class="achievement-year card-surface">
          <header class="achievement-section-heading">
            <div><span>四季花田</span><h2>{{ selectedYear }} 年的专注风景</h2><p>每块花畦代表一个月，点击可查看每天留下的植物。</p></div>
            <label>年份
              <select v-model.number="selectedYear">
                <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
              </select>
            </label>
          </header>
          <div class="achievement-year__landscape" aria-label="年度十二个月花田">
            <span class="achievement-year__sky" aria-hidden="true">
              <span class="achievement-year__bird" />
              <span class="achievement-year__bird achievement-year__bird--two" />
            </span>
            <span class="achievement-year__hills" aria-hidden="true">
              <span class="achievement-year__hill achievement-year__hill--back" />
              <span class="achievement-year__hill achievement-year__hill--front" />
              <span class="achievement-year__tree achievement-year__tree--left" />
              <span class="achievement-year__tree achievement-year__tree--right" />
              <span class="achievement-year__bush achievement-year__bush--a" />
              <span class="achievement-year__bush achievement-year__bush--b" />
            </span>
            <button
              v-for="month in yearMonths"
              :key="month.index"
              type="button"
              :class="[
                { active: selectedMonth === month.index, empty: !month.entries.length },
                `achievement-year__season--${seasonOf(month.index)}`
              ]"
              :aria-label="`${month.index + 1} 月，${month.entries.length} 个成长日`"
              @click="goToMonth(month.index)"
            >
              <span class="achievement-year__month">{{ month.index + 1 }} 月</span>
              <!-- 年格用 'standard' 尺寸：所有月都展示完整玻璃罩，无数据月是空罩子 -->
              <FocusTerrarium
                class="achievement-year__terrarium"
                size="standard"
                :species-id="month.speciesId"
                :stage="month.stage"
                :highlight="selectedMonth === month.index"
              />
              <small>
                <Leaf :size="11" />
                <span>{{ month.entries.length ? `${month.entries.length} 天` : '静待生长' }}</span>
              </small>
              <!-- drill down 提示，hover 时显示 -->
              <span class="achievement-year__drill" aria-hidden="true">
                <ArrowRight :size="13" />
              </span>
            </button>
          </div>
        </section>

        <aside class="achievement-side" aria-label="年度花田档案与近期足迹">
          <section class="achievement-summary card-surface">
            <header><span>年度档案</span><Leaf :size="18" /></header>
            <div class="achievement-summary__overview">
              <div class="achievement-summary__ring" :title="`${selectedYear} 年有 ${yearSummary.activeMonths} 个月留下成长`">
                <svg viewBox="0 0 64 64" aria-hidden="true">
                  <circle cx="32" cy="32" r="27" class="achievement-summary__ring-track" />
                  <circle cx="32" cy="32" r="27" class="achievement-summary__ring-fill" :style="{ '--p': yearSummary.monthProgress }" />
                </svg>
                <div>
                  <small>{{ selectedYear }} 年</small>
                  <strong>{{ yearSummary.activeMonths }} / 12 月</strong>
                  <em>留下专注成长</em>
                </div>
              </div>
              <div class="achievement-summary__headline">
                <small>这一年的花田</small>
                <strong>已有 {{ yearSummary.activeMonths }} 个月留下风景</strong>
                <p>每一次有效专注，都会成为属于你的生长记录。</p>
              </div>
            </div>
            <dl>
              <div>
                <span class="achievement-summary__icon"><Timer :size="14" /></span>
                <dt>年度投入</dt>
                <dd>{{ durationHuman(yearSummary.minutes) }}</dd>
              </div>
              <div>
                <span class="achievement-summary__icon"><Flower2 :size="14" /></span>
                <dt>完整盛放</dt>
                <dd>{{ yearSummary.blooms }} 朵</dd>
              </div>
              <div>
                <span class="achievement-summary__icon"><Trees :size="14" /></span>
                <dt>常种花</dt>
                <dd>{{ yearSummary.favoriteSpeciesName }}</dd>
              </div>
              <div>
                <span class="achievement-summary__icon"><Sprout :size="14" /></span>
                <dt>最丰盛月份</dt>
                <dd>{{ yearSummary.bestMonthLabel }}</dd>
              </div>
            </dl>
          </section>

          <section class="achievement-trail card-surface">
            <header class="achievement-section-heading">
              <div><span>近期足迹</span><h2>成长徽章</h2></div>
              <button type="button" @click="activeTab = 'badges'">查看全部 <ChevronRight :size="14" /></button>
            </header>
            <!-- 下一个花种预览（紧凑版，叠在徽章列表上方） -->
            <div v-if="nextSpecies" class="achievement-trail__next" :title="`${nextSpecies.name} · 再专注 ${Math.max(0, nextSpecies.unlockMinutes - store.focusGardenTotals.totalMinutes)} 分钟解锁`">
              <span class="achievement-trail__next-icon"><LockKeyhole :size="13" /></span>
              <FocusSpeciesPreview :species-id="nextSpecies.id" :alt="`${nextSpecies.name}预览`" class="achievement-trail__next-preview" />
              <div class="achievement-trail__next-meta">
                <small>下一个花种</small>
                <strong>{{ nextSpecies.name }}</strong>
                <i><b :style="{ width: `${nextSpeciesProgress}%` }"></b></i>
              </div>
            </div>
            <div v-else class="achievement-trail__next achievement-trail__next--done">
              <span class="achievement-trail__next-icon"><Check :size="13" /></span>
              <div class="achievement-trail__next-meta">
                <small>花种收集</small>
                <strong>当前花种已全部解锁</strong>
              </div>
            </div>
            <div v-if="recentAchievements.length" class="achievement-recent__list">
              <article v-for="item in recentAchievements" :key="item.id"><span><Trophy :size="20" /></span><div><strong>{{ item.name }}</strong><small>{{ item.description }}</small></div><time>{{ formatShortDate(item.unlockedAt) }}</time></article>
            </div>
            <div v-else class="achievement-empty"><Sprout :size="26" /><p>完成第一段有效专注，第一枚成长徽章就会在这里出现。</p></div>
          </section>
        </aside>

        <section v-if="monthGardenExpanded" class="achievement-month card-surface">
          <header class="achievement-section-heading">
            <div><span>月度花圃</span><h2>{{ selectedYear }} 年 {{ selectedMonth + 1 }} 月</h2><p>未完成目标的幼苗和花苞也会被如实保留。</p></div>
            <div class="achievement-month__nav">
              <button type="button" aria-label="上一个月" @click="shiftMonth(-1)"><ChevronLeft :size="16" /></button>
              <button v-if="!isCurrentMonth" type="button" aria-label="回到本月" @click="goToCurrentMonth"><CalendarDays :size="15" /></button>
              <button type="button" aria-label="下一个月" @click="shiftMonth(1)"><ChevronRight :size="16" /></button>
              <button type="button" aria-label="收起月度花圃" @click="collapseMonthGarden"><ChevronUp :size="16" /></button>
            </div>
          </header>
          <div class="achievement-month__stats" aria-label="本月成长统计">
            <span class="achievement-month__stat">
              <Sprout :size="14" class="achievement-month__stat-icon" />
              <small>成长日</small>
              <strong>{{ selectedMonthSummary.days }} 天</strong>
            </span>
            <span class="achievement-month__stat-divider" aria-hidden="true" />
            <span class="achievement-month__stat">
              <Timer :size="14" class="achievement-month__stat-icon" />
              <small>投入时间</small>
              <strong :title="durationHuman(selectedMonthSummary.minutes)">{{ durationHuman(selectedMonthSummary.minutes) }}</strong>
            </span>
            <span class="achievement-month__stat-divider" aria-hidden="true" />
            <span class="achievement-month__stat">
              <Flower2 :size="14" class="achievement-month__stat-icon" />
              <small>完整盛放</small>
              <strong>{{ selectedMonthSummary.blooms }} 朵</strong>
            </span>
            <span class="achievement-month__stat-divider" aria-hidden="true" />
            <span class="achievement-month__stat">
              <Trees :size="14" class="achievement-month__stat-icon" />
              <small>花种数</small>
              <strong>{{ selectedMonthSummary.species }} 种</strong>
            </span>
          </div>
          <div class="achievement-month__weekdays" aria-hidden="true"><span v-for="day in ['一','二','三','四','五','六','日']" :key="day">{{ day }}</span></div>
          <div :ref="setMonthGrid" class="achievement-month__grid">
            <span v-for="blank in monthLeadingBlanks" :key="`blank-${blank}`" class="achievement-month__blank"></span>
            <button
              v-for="cell in monthCells"
              :key="cell.date"
              type="button"
              :class="{ grown: cell.entry, future: cell.date > todayKey, active: cell.date === todayKey }"
              :aria-label="dayCellLabel(cell)"
              @click="openDayDetail(cell)"
            >
              <span class="achievement-month__day">{{ cell.day }}</span>
              <FocusTerrarium
                class="achievement-month__terrarium"
                :style="{ transform: `scale(${monthTerrariumScale})` }"
                :size="cell.entry ? terrariumSizeFor(cell.entry.stage) : 'empty'"
                :species-id="cell.entry ? cell.entry.speciesId : 'daisy'"
                :stage="cell.entry ? cell.entry.stage : 'seed'"
                :highlight="cell.date === todayKey"
              />
            </button>
          </div>
        </section>

        <section v-else class="achievement-month-entry card-surface">
          <div><span>月度花圃</span><h2>{{ selectedYear }} 年 {{ selectedMonth + 1 }} 月</h2><p>{{ selectedMonthSummary.days ? `本月留下 ${selectedMonthSummary.days} 个成长日与 ${durationHuman(selectedMonthSummary.minutes)} 的投入。` : '选择一个月份，回看每天留下的花。' }}</p></div>
          <button type="button" @click="expandMonthGarden"><CalendarDays :size="15" />展开本月花圃</button>
        </section>

        <div v-if="selectedDayCell" class="achievement-day-dialog" role="presentation" @click.self="closeDayDetail">
          <section class="achievement-day-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="achievement-day-dialog-title" tabindex="-1" @keydown.esc="closeDayDetail">
            <header>
              <div>
                <span>{{ formatLongDate(selectedDayCell.date) }}</span>
                <h2 id="achievement-day-dialog-title">{{ selectedDayCell.entry ? `${stageName(selectedDayCell.entry.stage)}的花` : selectedDayCell.date > todayKey ? '这一天还没有到来' : '这一天没有留下成长' }}</h2>
              </div>
              <button ref="dayDialogCloseButton" type="button" aria-label="关闭当日成长详情" @click="closeDayDetail"><X :size="18" /></button>
            </header>

            <template v-if="selectedDayCell.entry">
              <div class="achievement-day-dialog__hero">
                <FocusPlant :species-id="selectedDayCell.entry.speciesId" :stage="selectedDayCell.entry.stage" />
                <div>
                  <small>{{ daySpeciesName(selectedDayCell.entry.speciesId) }} · {{ stageName(selectedDayCell.entry.stage) }}</small>
                  <strong>{{ selectedDayProgress >= 100 ? '当天目标已完成' : '这株花正在生长' }}</strong>
                  <p>{{ stageDescriptions[selectedDayCell.entry.stage] || '这一天的专注，已经在花田里留下了可回望的成长。' }}</p>
                  <div class="achievement-day-dialog__focus-total"><Timer :size="16" /><b>{{ durationHuman(selectedDayCell.entry.growthMinutes) }}</b><span>有效专注</span></div>
                  <i class="achievement-day-dialog__progress" aria-label="当天目标完成进度"><b :style="{ width: `${selectedDayProgress}%` }" /></i>
                </div>
              </div>
              <dl class="achievement-day-dialog__stats">
                <div><dt>当天目标</dt><dd>{{ selectedDayCell.entry.goalMinutes }} 分钟</dd><small>为这株花设定</small></div>
                <div><dt>完成进度</dt><dd>{{ selectedDayProgress }}%</dd><small>{{ selectedDayProgress >= 100 ? '目标已达成' : '持续投入中' }}</small></div>
                <div><dt>完成专注</dt><dd>{{ selectedDayFocusCount }} 段</dd><small>已保存的专注记录</small></div>
              </dl>
              <section class="achievement-day-dialog__tasks">
                <header><span>当天专注</span><small>{{ selectedDayFocusCount ? `${selectedDayFocusCount} 段 · ${durationHuman(selectedDayCell.entry.growthMinutes)}` : '历史记录不可用' }}</small></header>
                <ul v-if="selectedDayFocusSessions.length" class="achievement-day-dialog__timeline">
                  <li v-for="session in selectedDayFocusSessions" :key="session.id">
                    <time><strong>{{ session.startedTime }}</strong><span>至 {{ session.finishedTime }}</span></time>
                    <i><Timer :size="15" /></i>
                    <div><strong>{{ session.taskTitle || '未关联任务' }}</strong><small>{{ session.profileName || '已完成专注' }}</small></div>
                    <b>{{ durationHuman(session.minutes) }}</b>
                  </li>
                </ul>
                <p v-else>花田保留了这一天的成长结果；对应的专注记录可能已被清理或来自旧版本数据。</p>
              </section>
            </template>
            <div v-else class="achievement-day-dialog__empty">
              <Sprout :size="30" />
              <p>{{ selectedDayCell.date > todayKey ? '等这一天真正到来后，再把专注交给一株新的花。' : '没有专注的日子保持空白，不会被记作中断或失败。' }}</p>
            </div>
          </section>
        </div>

      </section>

      <section v-else-if="activeTab === 'species'" class="achievement-species">
        <button v-if="nextSpecies" type="button" class="species-next card-surface" @click="selectSpecies(nextSpecies.id)">
          <FocusSpeciesPreview :species-id="nextSpecies.id" :alt="`${nextSpecies.name}预览`" />
          <div><span>下一种花</span><strong>{{ nextSpecies.name }}</strong><small>解锁门槛 {{ nextSpecies.unlockMinutes }} 分钟 · 还差 {{ speciesUnlockRemaining(nextSpecies) }} 分钟</small><i><b :style="{ width: `${nextSpeciesProgress}%` }" /></i></div>
          <ChevronRight :size="18" />
        </button>
        <section v-else class="species-complete card-surface" aria-label="第一册花种图鉴已完成">
          <span class="species-complete__seal"><Check :size="22" /></span>
          <div><span>第一册 · 十二花境</span><strong>图鉴已完整收藏</strong><small>{{ collectionCompletedAt ? `${formatCollectionDate(collectionCompletedAt)} 完成 · ` : '' }}接下来，选择喜欢的花继续培养陪伴等级。</small></div>
          <div class="species-complete__depth"><small>深入培养</small><strong>{{ deepCompanionCount }} / {{ store.focusGardenSpecies.length }}</strong><i><b :style="{ width: `${companionCollectionProgress}%` }" /></i></div>
        </section>
        <section
          class="species-playground card-surface"
          :class="[`species-playground--${selectedSpecies.id}`, { 'is-night': selectedSpecies.night }]"
          :style="{
            '--species-scene': selectedSpecies.scene,
            '--species-horizon': selectedSpecies.horizon,
            '--species-ground': selectedSpecies.ground,
            '--species-sun': selectedSpecies.sun,
            '--species-accent': selectedSpecies.accent
          }"
        >
          <div class="species-playground__scene" :class="{ 'has-artwork-backdrop': selectedSpeciesBackdrop }" @click="handleSceneClick">
            <img v-if="selectedSpeciesBackdrop" class="species-playground__backdrop" :src="selectedSpeciesBackdrop" alt="" aria-hidden="true" />
            <span v-if="selectedSpeciesBackdrop" class="species-playground__focus-wash" aria-hidden="true"></span>
            <div class="species-playground__sun" aria-hidden="true"></div>
            <div class="species-playground__clouds" aria-hidden="true"><i></i><i></i></div>
            <div class="species-playground__hills" aria-hidden="true"><i></i><i></i></div>
            <div class="species-playground__foreground" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            <Motion.div
              :key="selectedSpecies.id"
              class="species-playground__plant"
              :class="{ 'is-artwork': usesArtworkStage }"
              :initial="{ opacity: 0, y: 12, scale: .9 }"
              :animate="{ opacity: 1, y: 0, scale: 1 }"
              :transition="{ type: 'spring', stiffness: 180, damping: 19 }"
            >
              <FocusStageArtwork
                v-if="usesArtworkStage"
                :key="selectedSpecies.id"
                :species-id="selectedSpecies.id"
                :stage="selectedStage.id"
                :progress="selectedStageIndex"
                :scrubbing="replayScrubbing"
                motion="interactive"
                :reaction="reactionBurst"
                @error="artworkStageFailed = true"
              />
              <FocusPlant v-else :species-id="selectedSpecies.id" :stage="selectedStage.id" variant="diorama" motion="interactive" />
            </Motion.div>
            <span
              v-for="index in !usesArtworkStage && reactionBurst ? 8 : 0"
              :key="`${reactionBurst}-${index}`"
              class="species-playground__particle"
              :style="{ '--particle-index': index }"
              aria-hidden="true"
            ></span>
            <button type="button" class="species-playground__hint" @click.stop="triggerPlantReaction"><Sparkles :size="13" />轻点花朵看看</button>
          </div>
          <aside class="species-playground__info">
            <header class="species-playground__identity">
              <span class="species-playground__collection"><Flower2 :size="14" />{{ selectedCollection.name }}</span>
              <h2>{{ selectedSpecies.name }}</h2>
              <p><span>花语</span><strong>{{ selectedSpeciesProfile.flowerLanguage }}</strong></p>
            </header>
            <div class="species-playground__meaning">
              <span>花园寄语</span>
              <blockquote>{{ selectedSpeciesProfile.gardenMessage }}</blockquote>
            </div>
            <p class="species-playground__description"><span>花朵档案</span>{{ selectedSpecies.description }}</p>
            <section class="species-playground__progress" aria-label="培养进度">
              <dl>
                <div><dt>累计培养</dt><dd>{{ selectedSpecies.growthMinutes }} <small>分钟</small></dd></div>
                <div><dt>完整盛放</dt><dd>{{ selectedSpecies.bloomCount }} <small>次</small></dd></div>
              </dl>
              <div v-if="selectedSpecies.companion" class="species-companion">
                <header>
                  <div><span>陪伴等级</span><strong>{{ selectedSpecies.companion.name }}</strong></div>
                  <b>{{ selectedSpecies.companion.progress }}%</b>
                </header>
                <p>{{ selectedSpecies.companion.description }}</p>
                <div class="species-companion__next">
                  <span v-if="selectedSpecies.companion.next">迈向「{{ selectedSpecies.companion.next.name }}」</span>
                  <span v-else>陪伴纪念</span>
                  <strong v-if="selectedSpecies.companion.next">还需 {{ companionRequirement(selectedSpecies) }}</strong>
                  <strong v-else>已达最高等级</strong>
                </div>
                <i><b :style="{ width: `${selectedSpecies.companion.progress}%` }" /></i>
              </div>
              <div class="species-detail__unlock" :class="{ 'is-locked': !selectedSpecies.unlocked }">
                <span><Check v-if="selectedSpecies.unlocked" :size="14" /><LockKeyhole v-else :size="14" /></span>
                <div><small>解锁门槛</small><strong>累计 {{ selectedSpecies.unlockMinutes }} 分钟</strong><em v-if="!selectedSpecies.unlocked">还差 {{ speciesUnlockRemaining(selectedSpecies) }} 分钟</em></div>
              </div>
              <div
                v-if="selectedSpecies.unlocked || selectedSpecies.growthMinutes > 0"
                class="species-playground__actions"
              >
                <button v-if="selectedSpecies.unlocked" class="species-playground__choose" type="button" :disabled="isCurrentSpecies(selectedSpecies.id)" @click="chooseSpecies(selectedSpecies.id)">
                  <Sprout :size="14" />{{ speciesButtonLabel(selectedSpecies.id) }}
                </button>
                <button v-if="selectedSpecies.growthMinutes > 0" class="species-playground__footprint" type="button" @click="openSpeciesFootprint(selectedSpecies.id)">
                  <CalendarDays :size="14" />查看足迹
                </button>
              </div>
              <div v-if="!selectedSpecies.growthMinutes" class="achievement-progress"><i :style="{ width: `${speciesUnlockProgress(selectedSpecies)}%` }"></i></div>
            </section>
          </aside>
        </section>

        <section class="species-replay card-surface">
          <header class="achievement-section-heading">
            <div><span>成长回放 · 以今日目标 {{ store.focusGardenToday.goalMinutes }} 分钟计算</span><h2>{{ selectedStage.name }} <small>累计 {{ selectedStageMilestone.minutes }} 分钟</small></h2><p>{{ stageDescriptions[selectedStage.id] }}</p></div>
            <div class="species-replay__actions">
              <button type="button" @click="toggleGrowthReplay">
                <Pause v-if="replayPlaying" :size="13" />
                <Play v-else :size="13" />
                {{ replayPlaying ? '暂停' : '播放成长' }}
              </button>
              <small>{{ selectedStageNumber + 1 }} / {{ gardenStages.length }}</small>
            </div>
          </header>
          <label class="species-replay__range" :style="{ '--replay-progress': `${replayProgress}%` }">
            <span class="sr-only">查看 {{ selectedSpecies.name }} 的成长阶段</span>
            <input
              v-model.number="selectedStageIndex"
              type="range"
              min="0"
              :max="gardenStages.length - 1"
              step="0.01"
              :aria-valuetext="`${selectedStage.name}，累计 ${selectedStageMilestone.minutes} 分钟`"
              @pointerdown="beginReplayScrub"
              @pointerup="endReplayScrub"
              @pointercancel="endReplayScrub"
              @keydown="cancelGrowthReplay"
            />
          </label>
          <div class="species-replay__steps" role="tablist" aria-label="成长阶段">
            <button v-for="(stage, index) in gardenStages" :key="stage.id" type="button" role="tab" :aria-selected="selectedStageNumber === index" :class="{ active: selectedStageNumber === index, reached: selectedStageIndex >= index }" @click="selectReplayStage(index)">
              <i><Sprout v-if="index < 3" :size="13" /><Flower2 v-else :size="13" /></i>
              <span><b>{{ stage.name }}</b><small>累计 {{ stageMilestones[index].minutes }} 分钟</small></span>
            </button>
          </div>
        </section>

        <section v-for="collection in speciesCollections" :key="collection.id" class="species-collection card-surface" :style="{ '--collection-scene': collection.scene }">
          <header>
            <div><span>{{ collection.name }}</span><h2>{{ collection.description }}</h2></div>
            <small>{{ collection.unlockedCount }} / {{ collection.species.length }} 已解锁</small>
          </header>
          <div class="species-collection__garden">
            <Motion.button
              v-for="(species, index) in collection.species"
              :key="species.id"
              type="button"
              layout
              :class="{ selected: selectedSpeciesId === species.id, locked: !species.unlocked }"
              :style="{ '--plant-level': index % 2, '--plant-accent': species.accent, '--plant-scene': species.scene }"
              :aria-pressed="selectedSpeciesId === species.id"
              :aria-label="speciesCardLabel(species)"
              :while-hover="{ y: -4 }"
              :while-press="{ scale: .97 }"
              @click="selectSpecies(species.id)"
            >
              <span v-if="!species.unlocked" class="species-collection__lock"><LockKeyhole :size="14" /></span>
              <span class="species-collection__plant">
                <FocusSpeciesPreview :species-id="species.id" alt="" />
              </span>
              <strong>{{ species.name }}</strong>
              <small class="species-collection__growth">{{ species.growthMinutes }} 分钟 · 盛放 {{ species.bloomCount }} 次</small>
              <span class="species-collection__status" :class="{ 'is-locked': !species.unlocked }">
                <Check v-if="species.unlocked" :size="12" />
                <LockKeyhole v-else :size="12" />
                <template v-if="species.unlocked">{{ species.companion.name }} · {{ species.companion.progress }}%</template>
                <template v-else><span>门槛 {{ species.unlockMinutes }} 分钟</span><b>还差 {{ speciesUnlockRemaining(species) }} 分钟</b></template>
              </span>
            </Motion.button>
          </div>
        </section>
      </section>

      <section v-else class="achievement-badges">
        <header class="badges-overview card-surface">
          <div class="badges-overview__main">
            <span class="badges-overview__mark"><Trophy :size="22" /></span>
            <div>
              <p class="badges-overview__eyebrow">专注成长路径</p>
              <h2>{{ unlockedAchievements.length }} / {{ store.focusGardenAchievements.length }} 已获得</h2>
              <span class="badges-overview__score">{{ achievementCompletion }}% 完成 · 每枚徽章都来自真实专注记录</span>
            </div>
          </div>
          <div class="badges-overview__stats" aria-label="花田成长统计">
            <div><small>累计专注</small><strong>{{ durationHuman(store.focusGardenTotals.totalMinutes) }}</strong></div>
            <div><small>当前连续</small><strong>{{ currentFocusGardenStreak }} 天</strong></div>
            <div><small>完整盛放</small><strong>{{ store.focusGardenTotals.bloomCount }} 朵</strong></div>
          </div>
          <div class="badges-overview__today">
            <FocusSpeciesPreview :species-id="store.focusGardenToday.speciesId" alt="" />
            <div>
              <small>今天的花</small>
              <strong>{{ todaySpeciesName }}</strong>
              <span>{{ todayStageName }} · {{ store.focusGardenToday.growthMinutes }} / {{ store.focusGardenToday.goalMinutes }} 分钟</span>
              <i><b :style="{ width: `${todayGrowthProgress}%` }"></b></i>
            </div>
          </div>
        </header>

        <section v-if="focusAchievement" class="badge-focus card-surface" :class="{ complete: focusAchievement.unlockedAt }">
          <div class="badge-focus__identity">
            <span class="badge-focus__icon"><component :is="achievementBadgeIcon(focusAchievement)" :size="30" /></span>
            <div>
              <p>{{ trackedAchievement ? '正在追踪' : (focusAchievement.unlockedAt ? '最近获得' : '建议下一枚') }}</p>
              <h2>{{ focusAchievement.name }}</h2>
              <span>{{ focusAchievement.description }}</span>
            </div>
          </div>
          <div class="badge-focus__progress">
            <div><span>{{ focusAchievement.unlockedAt ? `获得于 ${formatShortDate(focusAchievement.unlockedAt)}` : `还差 ${achievementRemaining(focusAchievement)}` }}</span><strong>{{ achievementPercent(focusAchievement) }}%</strong></div>
            <i role="progressbar" :aria-label="`${focusAchievement.name}完成度`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="achievementPercent(focusAchievement)"><b :style="{ width: `${achievementPercent(focusAchievement)}%` }"></b></i>
          </div>
          <div class="badge-focus__actions">
            <button v-if="!focusAchievement.unlockedAt" type="button" class="badge-focus__primary" @click="performAchievementAction(focusAchievement)">{{ achievementActionLabel(focusAchievement) }}<ArrowRight :size="15" /></button>
            <button type="button" @click="openAchievementDetail(focusAchievement, $event.currentTarget)">查看规则</button>
          </div>
        </section>
        <section v-else class="badge-focus badge-focus--complete card-surface">
          <Flower2 :size="24" />
          <div><p>成长路径已完成</p><h2>继续留下属于你的专注记录</h2></div>
        </section>

        <section class="badge-library" aria-labelledby="badge-library-title">
          <header class="badge-library__header">
            <div><p>徽章收藏</p><h2 id="badge-library-title">浏览全部成长记录</h2></div>
            <span>显示 {{ visibleAchievements.length }} 枚，共 {{ store.focusGardenAchievements.length }} 枚</span>
          </header>
          <div class="badge-library__filters">
            <div class="badge-category-tabs" role="tablist" aria-label="按成长维度筛选" @keydown="handleBadgeCategoryKeydown">
              <button v-for="option in badgeCategoryOptions" :key="option.id" type="button" role="tab" data-badge-category :tabindex="selectedBadgeGroupId === option.id ? 0 : -1" :aria-selected="selectedBadgeGroupId === option.id" :class="{ active: selectedBadgeGroupId === option.id }" @click="selectedBadgeGroupId = option.id">{{ option.label }} <small>{{ option.count }}</small></button>
            </div>
            <div class="badge-status-filter" role="group" aria-label="按获得状态筛选">
              <button v-for="option in badgeStatusOptions" :key="option.id" type="button" :aria-pressed="badgeStatusFilter === option.id" :class="{ active: badgeStatusFilter === option.id }" @click="badgeStatusFilter = option.id">{{ option.label }}</button>
            </div>
          </div>
          <div v-if="visibleAchievements.length" class="badges-grid">
            <button v-for="item in visibleAchievements" :key="item.id" type="button" class="badge-card card-surface" :class="[{ unlocked: item.unlockedAt, tracked: trackedAchievement?.id === item.id }, `badge-card--${item.kind}`]" @click="openAchievementDetail(item, $event.currentTarget)">
              <div class="badge-card__identity">
                <span class="badge-card__icon"><component :is="achievementBadgeIcon(item)" :size="25" /><small v-if="badgeTier(item)">{{ badgeTier(item) }}</small></span>
                <div class="badge-card__copy"><span class="badge-card__reward">{{ achievementReward(item).label }}<small v-if="badgeTier(item)">第 {{ badgeTier(item) }} 阶</small></span><h3>{{ item.name }}</h3><p>{{ item.description }}</p></div>
              </div>
              <span v-if="trackedAchievement?.id === item.id" class="badge-card__tracked"><Pin :size="12" />追踪中</span>
              <div class="badge-card__footer">
                <span v-if="item.unlockedAt" class="badge-card__date"><Check :size="14" /><span><small>已获得</small><strong>{{ formatShortDate(item.unlockedAt) }}</strong></span></span>
                <div v-else class="badge-card__progress">
                  <div><span>当前 {{ item.progress }} / {{ item.target }}</span><strong>{{ achievementPercent(item) }}%</strong></div>
                  <i role="progressbar" :aria-label="`${item.name}完成度`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="achievementPercent(item)"><b :style="{ width: `${achievementPercent(item)}%` }"></b></i>
                  <small>还差 {{ achievementRemaining(item) }}</small>
                </div>
                <span class="badge-card__open" aria-hidden="true"><ArrowRight :size="15" /></span>
              </div>
            </button>
          </div>
          <div v-else class="badge-library__empty"><Trophy :size="20" /><p>当前筛选下没有徽章，换个分类或状态看看。</p></div>
        </section>

        <details v-if="legacyRewards.length" class="legacy-rewards card-surface">
          <summary><span><Archive :size="17" />历史收获</span><small>旧版专注记录，只读保留</small></summary>
          <div><span v-for="reward in legacyRewards" :key="reward.id"><FocusRewardBadge :reward="reward.id" size="md" />{{ reward.name }} × {{ reward.count }}</span></div>
        </details>

        <Teleport to=".app">
          <div v-if="selectedAchievement" class="badge-detail-backdrop" @click.self="closeAchievementDetail">
            <section class="badge-detail" role="dialog" aria-modal="true" aria-labelledby="badge-detail-title" @keydown="handleBadgeDetailKeydown">
              <button ref="badgeDetailCloseButton" type="button" class="badge-detail__close" aria-label="关闭徽章详情" @click="closeAchievementDetail"><X :size="18" /></button>
              <header class="badge-detail__header">
                <span class="badge-detail__icon"><component :is="achievementBadgeIcon(selectedAchievement)" :size="34" /></span>
                <div>
                  <p class="badge-detail__eyebrow">{{ achievementReward(selectedAchievement).label }}</p>
                  <h2 id="badge-detail-title">{{ selectedAchievement.name }}</h2>
                  <p>{{ selectedAchievement.description }}</p>
                </div>
              </header>
              <div class="badge-detail__rule">
                <span>完成条件</span>
                <strong>{{ achievementRuleText(selectedAchievement) }}</strong>
                <i role="progressbar" :aria-label="`${selectedAchievement.name}完成度`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="achievementPercent(selectedAchievement)"><b :style="{ width: `${achievementPercent(selectedAchievement)}%` }"></b></i>
                <small v-if="selectedAchievement.unlockedAt">已于 {{ formatShortDate(selectedAchievement.unlockedAt) }} 获得</small>
                <small v-else>当前 {{ selectedAchievement.progress }} / {{ selectedAchievement.target }}，还差 {{ achievementRemaining(selectedAchievement) }}</small>
              </div>
              <div class="badge-detail__insights">
                <article>
                  <span><BookOpen :size="14" />统计口径</span>
                  <p>{{ achievementScopeText(selectedAchievement) }}</p>
                </article>
                <article>
                  <span><CalendarDays :size="14" />最近进展</span>
                  <strong>{{ achievementRecentProgress(selectedAchievement).value }}</strong>
                  <p>{{ achievementRecentProgress(selectedAchievement).detail }}</p>
                </article>
              </div>
              <div v-if="achievementSeriesNeighbors(selectedAchievement).length" class="badge-detail__series">
                <span>同系列徽章</span>
                <div>
                  <button v-for="item in achievementSeriesNeighbors(selectedAchievement)" :key="item.id" type="button" @click="selectedAchievement = item">
                    <component :is="achievementBadgeIcon(item)" :size="16" />
                    <span><small>{{ item.unlockedAt ? '已获得' : `${achievementPercent(item)}%` }}</small><strong>{{ item.name }}</strong></span>
                    <ArrowRight :size="14" />
                  </button>
                </div>
              </div>
              <p class="badge-detail__hint">{{ achievementActionHint(selectedAchievement) }}</p>
              <div class="badge-detail__actions">
                <button v-if="!selectedAchievement.unlockedAt" type="button" class="primary" @click="performAchievementAction(selectedAchievement)">{{ achievementActionLabel(selectedAchievement) }}</button>
                <button v-if="!selectedAchievement.unlockedAt" type="button" :aria-pressed="trackedAchievement?.id === selectedAchievement.id" @click="toggleTrackedAchievement(selectedAchievement)"><Pin :size="14" />{{ trackedAchievement?.id === selectedAchievement.id ? '取消追踪' : '设为追踪目标' }}</button>
              </div>
            </section>
          </div>
        </Teleport>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, ref } from 'vue'
import { motion as Motion } from 'motion-v'
import { Archive, ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, ChevronUp, Flame, Flower2, Leaf, LockKeyhole, Pause, Pin, Play, Sparkles, Sprout, Timer, TimerReset, Trees, Trophy, X } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import {
  FOCUS_GARDEN_COLLECTIONS,
  FOCUS_GARDEN_ACHIEVEMENT_REWARDS,
  FOCUS_GARDEN_RANKS,
  FOCUS_GARDEN_SPECIES,
  FOCUS_GARDEN_STAGES,
  focusGardenCollectionCompletionDate,
  focusGardenStageMilestones,
  gardenStageFor,
  localGardenDateKey,
  monthGardenCells
} from '@/utils/focusGarden.mjs'
import FocusPlant from './FocusPlant.vue'
import FocusRewardBadge from './FocusRewardBadge.vue'
import FocusSpeciesPreview from './FocusSpeciesPreview.vue'
import FocusTerrarium from './FocusTerrarium.vue'

// 阶段 id → 温室尺寸档位
// empty: 无罩（基础花田位）；small: 幼苗温室；medium: 成长温室；large: 盛放温室
const TERRARIUM_SIZE_BY_STAGE = {
  seed: 'empty',
  sprout: 'small',
  leaves: 'small',
  bud: 'medium',
  opening: 'medium',
  bloom: 'large'
}

function terrariumSizeFor(stageId) {
  return TERRARIUM_SIZE_BY_STAGE[stageId] || 'small'
}
import camelliaStageBackdrop from '@/assets/focus-garden/stage-backgrounds/camellia.png'
import cosmosStageBackdrop from '@/assets/focus-garden/stage-backgrounds/cosmos.png'
import daisyStageBackdrop from '@/assets/focus-garden/stage-backgrounds/daisy.png'
import hydrangeaStageBackdrop from '@/assets/focus-garden/stage-backgrounds/hydrangea.png'
import irisStageBackdrop from '@/assets/focus-garden/stage-backgrounds/iris.png'
import lavenderStageBackdrop from '@/assets/focus-garden/stage-backgrounds/lavender.png'
import lilyStageBackdrop from '@/assets/focus-garden/stage-backgrounds/lily.png'
import moonflowerStageBackdrop from '@/assets/focus-garden/stage-backgrounds/moonflower.png'
import peonyStageBackdrop from '@/assets/focus-garden/stage-backgrounds/peony.png'
import poppyStageBackdrop from '@/assets/focus-garden/stage-backgrounds/poppy.png'
import sunflowerStageBackdrop from '@/assets/focus-garden/stage-backgrounds/sunflower.png'
import tulipStageBackdrop from '@/assets/focus-garden/stage-backgrounds/tulip.png'

const FocusStageArtwork = defineAsyncComponent(() => import('./FocusStageArtwork.vue'))
const store = useTaskStore()
const activeTab = ref('overview')
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth())
const selectedBadgeGroupId = ref('all')
const badgeStatusFilter = ref('all')
const selectedAchievement = ref(null)
const badgeDetailCloseButton = ref(null)
const selectedSpeciesId = ref(store.focusGarden.selectedSpeciesId)
const selectedStageIndex = ref(5)
const reactionBurst = ref(0)
const artworkStageFailed = ref(false)
const replayScrubbing = ref(false)
const replayPlaying = ref(false)
const selectedDayCell = ref(null)
const dayDialogCloseButton = ref(null)
const overviewDayTrigger = ref(null)
const returnToOverviewAfterDayDialog = ref(false)
const monthGardenExpanded = ref(false)
const monthGridWidth = ref(0)
let monthGridObserver = null
let replayAnimationFrame = 0
let badgeDetailTrigger = null
const todayKey = localGardenDateKey()
const gardenStages = FOCUS_GARDEN_STAGES
const stageDescriptions = {
  seed: '一颗种子安静落进土壤，等待第一分钟投入。',
  sprout: '嫩芽推开土壤，今天的成长已经真正开始。',
  leaves: '叶片逐渐舒展，开始积蓄更多光与能量。',
  bud: '花苞沿着稳定的花茎抬起，轮廓已经清晰。',
  opening: '第一层花瓣打开，专注带来的变化被看见。',
  bloom: '花朵完整盛放，也保留今天真实投入的结果。'
}
const achievementBadgeIcons = {
  'first-growth': Sprout,
  'first-bloom': Flower2,
  'active-days-3': CalendarDays,
  'goal-days-3': Check,
  'focus-600': Trophy,
  'focus-1800': Sparkles,
  'focus-3600': Trophy,
  'bloom-10': Flower2,
  'bloom-25': Flower2,
  'deep-90': TimerReset,
  'deep-120': TimerReset,
  'deep-180': Sparkles,
  'species-3': Leaf,
  'species-6': BookOpen,
  'species-9': Sparkles,
  'species-12': Trophy,
  'collections-3': Flower2,
  'streak-3': CalendarDays,
  'streak-7': Flame,
  'streak-14': Sparkles,
  'active-days-30': CalendarDays
}
const achievementBadgeTiers = {
  'first-growth': 'I',
  'first-bloom': 'I',
  'active-days-3': 'I',
  'goal-days-3': 'I',
  'focus-600': 'II',
  'focus-1800': 'III',
  'focus-3600': 'IV',
  'bloom-10': 'II',
  'bloom-25': 'III',
  'deep-90': 'II',
  'deep-120': 'III',
  'deep-180': 'IV',
  'species-3': 'I',
  'species-6': 'II',
  'species-9': 'III',
  'species-12': 'IV',
  'collections-3': 'III',
  'streak-3': 'I',
  'streak-7': 'II',
  'streak-14': 'III',
  'active-days-30': 'IV'
}

const availableYears = computed(() => {
  const years = new Set([new Date().getFullYear(), ...store.focusGarden.days.map(day => Number(day.date.slice(0, 4)))])
  return [...years].filter(Number.isFinite).sort((a, b) => b - a)
})
const yearMonths = computed(() => Array.from({ length: 12 }, (_, index) => {
  const prefix = `${selectedYear.value}-${String(index + 1).padStart(2, '0')}`
  const entries = store.focusGarden.days.filter(day => day.date.startsWith(prefix))
  const speciesCounts = new Map()
  entries.forEach(day => speciesCounts.set(day.speciesId, (speciesCounts.get(day.speciesId) || 0) + day.growthMinutes))
  const speciesId = [...speciesCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || store.focusGarden.selectedSpeciesId
  const totalGrowth = entries.reduce((sum, day) => sum + day.growthMinutes, 0)
  const totalGoal = entries.reduce((sum, day) => sum + day.goalMinutes, 0) || 50
  return {
    index,
    entries,
    speciesId,
    stage: gardenStageFor((totalGrowth / totalGoal) * 50, 50).id
  }
}))
const yearSummary = computed(() => {
  const entries = yearMonths.value.flatMap(month => month.entries)
  const speciesMinutes = new Map()
  entries.forEach(entry => speciesMinutes.set(entry.speciesId, (speciesMinutes.get(entry.speciesId) || 0) + Math.max(0, Number(entry.growthMinutes) || 0)))
  const favoriteSpeciesId = [...speciesMinutes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const bestMonth = [...yearMonths.value].sort((a, b) => (
    b.entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.growthMinutes) || 0), 0) - a.entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.growthMinutes) || 0), 0)
  ))[0]
  return {
    minutes: entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.growthMinutes) || 0), 0),
    blooms: entries.filter(entry => gardenStageFor(entry.growthMinutes, entry.goalMinutes).id === 'bloom').length,
    activeMonths: yearMonths.value.filter(month => month.entries.some(entry => entry.growthMinutes > 0)).length,
    monthProgress: Math.round(yearMonths.value.filter(month => month.entries.some(entry => entry.growthMinutes > 0)).length / 12 * 100),
    favoriteSpeciesName: favoriteSpeciesId ? daySpeciesName(favoriteSpeciesId) : '等待第一株花',
    bestMonthLabel: bestMonth?.entries.length ? `${bestMonth.index + 1} 月` : '静待生长'
  }
})
const monthCells = computed(() => monthGardenCells(selectedYear.value, selectedMonth.value, store.focusGarden.days))
const monthTerrariumScale = computed(() => {
  if (!monthGridWidth.value) return .86
  const cellWidth = (monthGridWidth.value - 36) / 7
  return Math.min(1, Math.max(.48, (cellWidth - 10) / 100))
})
const isCurrentMonth = computed(() => selectedYear.value === new Date().getFullYear() && selectedMonth.value === new Date().getMonth())
const selectedMonthSummary = computed(() => {
  const entries = monthCells.value.map(cell => cell.entry).filter(Boolean)
  return {
    days: entries.filter(entry => entry.growthMinutes > 0).length,
    minutes: entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.growthMinutes) || 0), 0),
    blooms: entries.filter(entry => gardenStageFor(entry.growthMinutes, entry.goalMinutes).id === 'bloom').length,
    species: new Set(entries.filter(entry => entry.growthMinutes > 0).map(entry => entry.speciesId)).size
  }
})
const selectedDayProgress = computed(() => {
  const entry = selectedDayCell.value?.entry
  if (!entry) return 0
  return Math.min(100, Math.round((Number(entry.growthMinutes) || 0) / Math.max(1, Number(entry.goalMinutes) || 1) * 100))
})
const selectedDayFocusRecords = computed(() => {
  const date = selectedDayCell.value?.date
  if (!date) return []
  return store.focusHistory.filter(item => (
    item.phase === 'focus' && item.result === 'completed' && localGardenDateKey(item.finishedAt) === date
  ))
})
const selectedDayFocusCount = computed(() => selectedDayFocusRecords.value.length)
const selectedDayFocusSessions = computed(() => [...selectedDayFocusRecords.value]
  .sort((a, b) => new Date(a.startedAt || a.finishedAt).getTime() - new Date(b.startedAt || b.finishedAt).getTime())
  .map(item => ({
    id: item.id,
    taskTitle: String(item.taskTitle || '').trim(),
    profileName: String(item.profileName || '').trim(),
    minutes: Math.max(0, Math.floor((Number(item.elapsedSeconds) || 0) / 60)),
    startedTime: formatDayTime(item.startedAt || item.finishedAt),
    finishedTime: formatDayTime(item.finishedAt)
  })))
const monthLeadingBlanks = computed(() => {
  const weekday = new Date(selectedYear.value, selectedMonth.value, 1).getDay()
  return (weekday + 6) % 7
})
const unlockedAchievements = computed(() => store.focusGardenAchievements.filter(item => item.unlockedAt))
const recentAchievements = computed(() => [...unlockedAchievements.value].sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)).slice(0, 3))
const achievementCompletion = computed(() => store.focusGardenAchievements.length ? Math.round(unlockedAchievements.value.length / store.focusGardenAchievements.length * 100) : 0)
const currentFocusGardenStreak = computed(() => {
  const activeDates = new Set(store.focusGarden.days.filter(item => item.growthMinutes > 0).map(item => item.date))
  const cursor = new Date()
  if (!activeDates.has(localGardenDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (activeDates.has(localGardenDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
})
const nextSpecies = computed(() => store.focusGardenSpecies.filter(item => !item.unlocked).sort((a, b) => a.unlockMinutes - b.unlockMinutes)[0] || null)
const nextSpeciesProgress = computed(() => nextSpecies.value ? Math.min(100, Math.round(store.focusGardenTotals.totalMinutes / nextSpecies.value.unlockMinutes * 100)) : 100)
const collectionCompletedAt = computed(() => nextSpecies.value ? null : focusGardenCollectionCompletionDate(store.focusGarden))
const deepCompanionCount = computed(() => store.focusGardenSpecies.filter(item => item.companion && ['companion', 'familiar', 'symbiosis'].includes(item.companion.id)).length)
const companionCollectionProgress = computed(() => Math.round(deepCompanionCount.value / Math.max(1, store.focusGardenSpecies.length) * 100))
const nextCompanionSpecies = computed(() => [...store.focusGardenSpecies]
  .filter(item => item.unlocked && item.companion?.next)
  .sort((a, b) => {
    const usedDifference = Number(b.growthMinutes > 0) - Number(a.growthMinutes > 0)
    return usedDifference || b.companion.progress - a.companion.progress || b.growthMinutes - a.growthMinutes
  })[0] || null)
const selectedSpecies = computed(() => store.focusGardenSpecies.find(item => item.id === selectedSpeciesId.value) || store.focusGardenSpecies[0])
const selectedSpeciesProfile = computed(() => FOCUS_GARDEN_SPECIES.find(item => item.id === selectedSpecies.value?.id) || selectedSpecies.value)
const selectedStageNumber = computed(() => Math.max(0, Math.min(gardenStages.length - 1, Math.round(selectedStageIndex.value))))
const selectedStage = computed(() => gardenStages[selectedStageNumber.value] || gardenStages[0])
const stageMilestones = computed(() => focusGardenStageMilestones(store.focusGardenToday.goalMinutes))
const selectedStageMilestone = computed(() => stageMilestones.value[selectedStageNumber.value] || stageMilestones.value[0])
const replayProgress = computed(() => selectedStageIndex.value / Math.max(1, gardenStages.length - 1) * 100)
const selectedCollection = computed(() => FOCUS_GARDEN_COLLECTIONS.find(item => item.id === selectedSpecies.value.collectionId) || FOCUS_GARDEN_COLLECTIONS[0])
const speciesStageBackdrops = {
  camellia: camelliaStageBackdrop,
  cosmos: cosmosStageBackdrop,
  daisy: daisyStageBackdrop,
  hydrangea: hydrangeaStageBackdrop,
  iris: irisStageBackdrop,
  lavender: lavenderStageBackdrop,
  lily: lilyStageBackdrop,
  moonflower: moonflowerStageBackdrop,
  peony: peonyStageBackdrop,
  poppy: poppyStageBackdrop,
  sunflower: sunflowerStageBackdrop,
  tulip: tulipStageBackdrop
}
const selectedSpeciesBackdrop = computed(() => speciesStageBackdrops[selectedSpecies.value.id] || '')
const usesArtworkStage = computed(() => !artworkStageFailed.value)
const speciesCollections = computed(() => FOCUS_GARDEN_COLLECTIONS.map(collection => {
  const species = store.focusGardenSpecies.filter(item => item.collectionId === collection.id)
  return {
    ...collection,
    species,
    unlockedCount: species.filter(item => item.unlocked).length
  }
}))
const todaySpeciesName = computed(() => store.focusGardenSpecies.find(item => item.id === store.focusGardenToday.speciesId)?.name || '小雏菊')
const todayStageName = computed(() => stageName(store.focusGardenToday.stage))
const todayGrowthProgress = computed(() => {
  const goal = Math.max(1, Number(store.focusGardenToday.goalMinutes) || 1)
  return Math.min(100, Math.round((Number(store.focusGardenToday.growthMinutes) || 0) / goal * 100))
})
const recentGardenDays = computed(() => {
  const entries = new Map(store.focusGarden.days.map(entry => [entry.date, entry]))
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const today = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - 6 + index)
    const dateKey = localGardenDateKey(date)
    return { date: dateKey, day: date.getDate(), weekday: weekdays[date.getDay()], entry: entries.get(dateKey) || null }
  })
})
const growthRanks = FOCUS_GARDEN_RANKS
const currentGrowthRankIndex = computed(() => {
  const total = store.focusGardenTotals.totalMinutes
  return Math.max(0, growthRanks.reduce((index, rank, currentIndex) => total >= rank.threshold ? currentIndex : index, 0))
})
const currentGrowthRank = computed(() => growthRanks[currentGrowthRankIndex.value])
const nextGrowthRank = computed(() => growthRanks[currentGrowthRankIndex.value + 1] || null)
const growthRankProgress = computed(() => {
  if (!nextGrowthRank.value) return 100
  const current = currentGrowthRank.value.threshold
  const next = nextGrowthRank.value.threshold
  return Math.min(100, Math.max(0, Math.round((store.focusGardenTotals.totalMinutes - current) / (next - current) * 100)))
})
const achievementGroups = computed(() => [
  { id: 'start', label: '开始', description: '从第一分钟和第一朵花开始', icon: Sprout },
  { id: 'streak', label: '相伴', description: '让专注形成连续而温柔的节奏', icon: CalendarDays },
  { id: 'accumulate', label: '积累', description: '让持续投入慢慢形成花田', icon: Flower2 },
  { id: 'deep', label: '深入', description: '记录真正沉浸的一段时间', icon: TimerReset },
  { id: 'variety', label: '多样', description: '培养不同花种留下的色彩', icon: Leaf }
].map(group => ({ ...group, reward: FOCUS_GARDEN_ACHIEVEMENT_REWARDS[group.id], items: store.focusGardenAchievements.filter(item => item.kind === group.id) })).filter(group => group.items.length))
const badgeStatusOptions = [
  { id: 'all', label: '全部' },
  { id: 'unlocked', label: '已获得' },
  { id: 'near', label: '接近完成' }
]
const nextAchievement = computed(() => [...store.focusGardenAchievements]
  .filter(item => !item.unlockedAt)
  .sort((a, b) => {
    const remainingA = a.target ? Math.max(0, a.target - a.progress) / a.target : 1
    const remainingB = b.target ? Math.max(0, b.target - b.progress) / b.target : 1
    return remainingA - remainingB
  })[0] || null)
const badgeCategoryOptions = computed(() => [
  { id: 'all', label: '全部', count: store.focusGardenAchievements.length },
  ...achievementGroups.value.map(group => ({ id: group.id, label: group.label, count: group.items.length }))
])
const trackedAchievement = computed(() => store.focusGardenAchievements.find(item => (
  item.id === store.focusGarden.trackedAchievementId && !item.unlockedAt
)) || null)
const focusAchievement = computed(() => trackedAchievement.value || nextAchievement.value || recentAchievements.value[0] || null)
const visibleAchievements = computed(() => {
  const filtered = store.focusGardenAchievements.filter(item => {
    if (selectedBadgeGroupId.value !== 'all' && item.kind !== selectedBadgeGroupId.value) return false
    if (badgeStatusFilter.value === 'unlocked') return Boolean(item.unlockedAt)
    if (badgeStatusFilter.value === 'near') return !item.unlockedAt && achievementPercent(item) >= 40
    return true
  })
  return [...filtered].sort((a, b) => {
    if (trackedAchievement.value?.id === a.id) return -1
    if (trackedAchievement.value?.id === b.id) return 1
    if (Boolean(a.unlockedAt) !== Boolean(b.unlockedAt)) return a.unlockedAt ? -1 : 1
    if (a.unlockedAt && b.unlockedAt) return new Date(b.unlockedAt) - new Date(a.unlockedAt)
    return achievementPercent(b) - achievementPercent(a)
  })
})
const nextAchievementProgress = computed(() => nextAchievement.value
  ? Math.min(100, Math.round(nextAchievement.value.progress / Math.max(1, nextAchievement.value.target) * 100))
  : 100)
const primaryGoal = computed(() => {
  const candidates = []
  if (nextSpecies.value) candidates.push({
    type: 'species', icon: Leaf, progress: nextSpeciesProgress.value, title: `解锁 ${nextSpecies.value.name}`,
    description: `再专注 ${Math.max(0, nextSpecies.value.unlockMinutes - store.focusGardenTotals.totalMinutes)} 分钟，让花圃多一种颜色。`, actionLabel: '查看图鉴'
  })
  if (!nextSpecies.value && nextCompanionSpecies.value) candidates.push({
    type: 'companion', icon: Flower2, progress: nextCompanionSpecies.value.companion.progress,
    title: `${nextCompanionSpecies.value.name} · ${nextCompanionSpecies.value.companion.next.name}`,
    description: `继续培养这株花，还需${companionRequirement(nextCompanionSpecies.value)}。`, actionLabel: '继续培养'
  })
  if (nextAchievement.value) candidates.push({
    type: 'badges', icon: Trophy, progress: nextAchievementProgress.value, title: `获得「${nextAchievement.value.name}」`,
    description: `${nextAchievement.value.description} 还差 ${achievementRemaining(nextAchievement.value)}。`, actionLabel: '查看徽章'
  })
  if (nextGrowthRank.value) candidates.push({
    type: 'field', icon: Sprout, progress: growthRankProgress.value, title: `成为${nextGrowthRank.value.name}`,
    description: `再专注 ${nextGrowthRank.value.threshold - store.focusGardenTotals.totalMinutes} 分钟，花田会进入下一阶段。`, actionLabel: '查看花田'
  })
  return candidates.sort((a, b) => b.progress - a.progress)[0] || null
})
const legacyRewards = computed(() => {
  const names = { blueberry: '蓝莓', strawberry: '草莓', tomato: '番茄', watermelon: '西瓜', pumpkin: '南瓜' }
  return Object.entries(names).map(([id, name]) => ({
    id,
    name,
    count: store.focusHistory.filter(item => item.reward === id).length
  })).filter(item => item.count)
})

function stageName(id) { return FOCUS_GARDEN_STAGES.find(item => item.id === id)?.name || '种子' }
function daySpeciesName(id) { return store.focusGardenSpecies.find(item => item.id === id)?.name || '小雏菊' }
function formatCollectionDate(value) {
  const [year, month, day] = String(value).split('-')
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`
}
function companionRequirement(species) {
  const requirements = []
  if (species?.companion?.remainingMinutes) requirements.push(`${species.companion.remainingMinutes} 分钟`)
  if (species?.companion?.remainingBlooms) requirements.push(`盛放 ${species.companion.remainingBlooms} 次`)
  return requirements.join('、') || '完成当前条件'
}
function speciesCardLabel(species) {
  if (!species.unlocked) return `${species.name}，解锁门槛 ${species.unlockMinutes} 分钟，还差 ${speciesUnlockRemaining(species)} 分钟`
  const next = species.companion?.next
  return next
    ? `${species.name}，已解锁，陪伴等级${species.companion.name}，当前进度${species.companion.progress}%，下一阶${next.name}，还需${companionRequirement(species)}`
    : `${species.name}，已解锁，陪伴等级${species.companion?.name || '初识'}，已达到最高陪伴等级`
}
function durationHuman(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0))
  if (value < 60) return `${value} 分钟`
  const hours = Math.floor(value / 60)
  return `${hours} 小时${value % 60 ? ` ${value % 60} 分钟` : ''}`
}
function achievementRemaining(item) {
  const labels = { totalMinutes: '分钟', bloomCount: '朵花', speciesCount: '种花', longestSessionMinutes: '分钟', activeDays: '天', goalDays: '天', collectionCount: '座花圃', longestStreak: '天' }
  return `${Math.max(0, item.target - item.progress)} ${labels[item.metric] || '点进度'}`
}
function achievementPercent(item) {
  return Math.min(100, Math.max(0, Math.round((Number(item?.progress) || 0) / Math.max(1, Number(item?.target) || 1) * 100)))
}
function achievementReward(item) {
  return FOCUS_GARDEN_ACHIEVEMENT_REWARDS[item?.kind] || { label: '成长徽记', hint: '每一次投入都会留下印记' }
}
function achievementRuleText(item) {
  const labels = {
    totalMinutes: `累计完成 ${durationHuman(item.target)} 专注`,
    bloomCount: `让花朵完整盛放 ${item.target} 次`,
    speciesCount: `培养过 ${item.target} 种不同花种`,
    longestSessionMinutes: `在同一轮中累计完成 ${item.target} 分钟有效专注`,
    activeDays: `在 ${item.target} 个不同日期留下专注记录`,
    goalDays: `有 ${item.target} 天达到当天专注目标`,
    collectionCount: `完成 ${item.target} 个花种系列`,
    longestStreak: `连续 ${item.target} 天留下专注记录`
  }
  return labels[item.metric] || item.description
}
function achievementActionLabel(item) {
  return ['speciesCount', 'collectionCount'].includes(item.metric) ? '查看花种图鉴' : '开始一轮专注'
}
function achievementActionHint(item) {
  if (item.unlockedAt) return '这枚徽章已经收入你的成长档案。'
  if (item.metric === 'longestSessionMinutes') return '长时间投入请按身体状态安排暂停和休息；徽章只记录有效专注时长。'
  if (item.metric === 'goalDays' && store.focusGardenToday.growthMinutes > 0) return `今天已完成 ${store.focusGardenToday.growthMinutes} 分钟，目标为 ${store.focusGardenToday.goalMinutes} 分钟。`
  return achievementReward(item).hint
}
function achievementScopeText(item) {
  const scopes = {
    totalMinutes: '只累计已完成专注中的有效分钟，不包含休息、暂停和提前结束的时间。',
    bloomCount: '当天有效专注达到当天目标时记为一次盛放；同一天只记录一株今日花。',
    speciesCount: '花种在任意一天产生有效专注后即算培养过，重复培养不会增加种类数。',
    longestSessionMinutes: '取单轮已完成专注的有效分钟；暂停和休息不计时，请按身体状态合理休息。',
    activeDays: '自然日内产生至少 1 分钟有效专注，即记为一个成长日。',
    goalDays: '当天累计有效专注达到该日保存的目标分钟数，即记为一个达标日。',
    collectionCount: '同一花圃系列中的花种产生有效专注后，该系列才计入已培养花圃。',
    longestStreak: '按自然日连续计算；没有成长记录的日期会中断连续天数，但不会撤销已获得徽章。'
  }
  return scopes[item.metric] || '根据花田中保存的有效专注记录自动计算。'
}
function achievementRecentProgress(item) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 6)
  const startKey = localGardenDateKey(start)
  const recentDays = store.focusGarden.days.filter(day => day.date >= startKey && day.growthMinutes > 0)
  const recentFocusRecords = store.focusHistory.filter(record => (
    record.phase === 'focus' && record.result === 'completed' && localGardenDateKey(record.finishedAt) >= startKey
  ))
  const lastDay = [...store.focusGarden.days].filter(day => day.growthMinutes > 0).sort((a, b) => b.date.localeCompare(a.date))[0]
  const lastText = lastDay ? `最近一次推进：${formatShortDate(`${lastDay.date}T12:00:00`)}` : '还没有有效专注记录'
  const values = {
    totalMinutes: recentDays.reduce((sum, day) => sum + day.growthMinutes, 0),
    bloomCount: recentDays.filter(day => gardenStageFor(day.growthMinutes, day.goalMinutes).id === 'bloom').length,
    speciesCount: new Set(recentDays.map(day => day.speciesId)).size,
    longestSessionMinutes: Math.max(0, ...recentFocusRecords.map(record => Math.floor((Number(record.elapsedSeconds) || 0) / 60))),
    activeDays: recentDays.length,
    goalDays: recentDays.filter(day => day.growthMinutes >= day.goalMinutes).length,
    collectionCount: new Set(recentDays.map(day => FOCUS_GARDEN_SPECIES.find(species => species.id === day.speciesId)?.collectionId).filter(Boolean)).size,
    longestStreak: currentFocusGardenStreak.value
  }
  const labels = {
    totalMinutes: `${durationHuman(values.totalMinutes)}投入`,
    bloomCount: `${values.bloomCount} 朵盛放`,
    speciesCount: `${values.speciesCount} 种花`,
    longestSessionMinutes: `最长 ${durationHuman(values.longestSessionMinutes)}`,
    activeDays: `${values.activeDays} 个成长日`,
    goalDays: `${values.goalDays} 个达标日`,
    collectionCount: `${values.collectionCount} 座花圃`,
    longestStreak: `当前连续 ${values.longestStreak} 天`
  }
  return { value: `近 7 天 · ${labels[item.metric] || '持续成长'}`, detail: lastText }
}
function achievementSeriesNeighbors(item) {
  const series = store.focusGardenAchievements.filter(candidate => candidate.kind === item.kind)
  const index = series.findIndex(candidate => candidate.id === item.id)
  return [series[index - 1], series[index + 1]].filter(Boolean)
}
function performAchievementAction(item) {
  closeAchievementDetail(false)
  if (['speciesCount', 'collectionCount'].includes(item.metric)) activeTab.value = 'species'
  else store.setClockView('focus')
}
function toggleTrackedAchievement(item) {
  store.trackFocusGardenAchievement(item.id)
  closeAchievementDetail()
}
function openAchievementDetail(item, trigger) {
  selectedAchievement.value = item
  badgeDetailTrigger = trigger instanceof HTMLElement ? trigger : null
  nextTick(() => badgeDetailCloseButton.value?.focus())
}
function closeAchievementDetail(restoreFocus = true) {
  selectedAchievement.value = null
  const trigger = badgeDetailTrigger
  badgeDetailTrigger = null
  if (restoreFocus) nextTick(() => trigger?.focus())
}
function handleBadgeDetailKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeAchievementDetail()
    return
  }
  if (event.key !== 'Tab') return
  const dialog = event.currentTarget
  const focusable = [...dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
function handleBadgeCategoryKeydown(event) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const tabs = [...event.currentTarget.querySelectorAll('[data-badge-category]')]
  const currentIndex = tabs.indexOf(document.activeElement)
  let nextIndex = currentIndex
  if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = tabs.length - 1
  else nextIndex = (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  event.preventDefault()
  tabs[nextIndex]?.click()
  tabs[nextIndex]?.focus()
}
function achievementBadgeIcon(item) {
  return achievementBadgeIcons[item.id] || Trophy
}
function badgeTier(item) {
  return achievementBadgeTiers[item.id] || ''
}
function shiftMonth(delta) {
  const date = new Date(selectedYear.value, selectedMonth.value + delta, 1)
  selectedYear.value = date.getFullYear()
  selectedMonth.value = date.getMonth()
}
function goToCurrentMonth() {
  const now = new Date()
  selectedYear.value = now.getFullYear()
  selectedMonth.value = now.getMonth()
}
function dayCellLabel(cell) {
  if (cell.entry) return `${cell.date}，${daySpeciesName(cell.entry.speciesId)}，${stageName(cell.entry.stage)}，${cell.entry.growthMinutes}/${cell.entry.goalMinutes} 分钟。查看详情`
  return cell.date > todayKey ? `${cell.date}，未来日期` : `${cell.date}，没有专注成长。查看说明`
}
function formatLongDate(value) {
  const [year, month, day] = String(value).split('-').map(Number)
  return `${year} 年 ${month} 月 ${day} 日`
}
function formatDayTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知时间'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
function openDayDetail(cell) {
  selectedDayCell.value = cell
  nextTick(() => dayDialogCloseButton.value?.focus())
}
function openOverviewDay(day, event) {
  overviewDayTrigger.value = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  returnToOverviewAfterDayDialog.value = true
  const [year, month] = day.date.split('-').map(Number)
  selectedYear.value = year
  selectedMonth.value = month - 1
  monthGardenExpanded.value = true
  activeTab.value = 'field'
  nextTick(() => openDayDetail(day))
}
function closeDayDetail() {
  selectedDayCell.value = null
  if (returnToOverviewAfterDayDialog.value) activeTab.value = 'overview'
  nextTick(() => {
    overviewDayTrigger.value?.focus()
    overviewDayTrigger.value = null
    returnToOverviewAfterDayDialog.value = false
  })
}
function expandMonthGarden() {
  monthGardenExpanded.value = true
  nextTick(() => document.querySelector('.achievement-month')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
function collapseMonthGarden() {
  monthGardenExpanded.value = false
}
function openPrimaryGoal() {
  if (primaryGoal.value?.type === 'companion' && nextCompanionSpecies.value) {
    selectedSpeciesId.value = nextCompanionSpecies.value.id
    activeTab.value = 'species'
    return
  }
  if (!primaryGoal.value) return
  activeTab.value = primaryGoal.value.type === 'badges' ? 'badges' : primaryGoal.value.type === 'species' ? 'species' : 'field'
}
// 年格 drill down：点月份后切换 + 滚到月格
function goToMonth(monthIndex) {
  selectedMonth.value = monthIndex
  monthGardenExpanded.value = true
  nextTick(() => {
    document.querySelector('.achievement-month')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
function openSpeciesFootprint(speciesId) {
  const latestDay = [...store.focusGarden.days]
    .filter(day => day.speciesId === speciesId && day.growthMinutes > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!latestDay) return
  const [year, month] = latestDay.date.split('-').map(Number)
  selectedYear.value = year
  selectedMonth.value = month - 1
  monthGardenExpanded.value = true
  activeTab.value = 'field'
  nextTick(() => document.querySelector('.achievement-month')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
// 月份 → 季节：3-5 春 / 6-8 夏 / 9-11 秋 / 12-2 冬
function seasonOf(monthIndex) {
  if (monthIndex >= 2 && monthIndex <= 4) return 'spring'
  if (monthIndex >= 5 && monthIndex <= 7) return 'summer'
  if (monthIndex >= 8 && monthIndex <= 10) return 'autumn'
  return 'winter'
}
function formatShortDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function isCurrentSpecies(id) {
  return store.focusGardenToday.growthMinutes > 0
    ? store.focusGarden.nextSpeciesId === id || (!store.focusGarden.nextSpeciesId && store.focusGardenToday.speciesId === id)
    : store.focusGarden.selectedSpeciesId === id
}
function speciesButtonLabel(id) {
  if (isCurrentSpecies(id)) return store.focusGardenToday.growthMinutes > 0 && store.focusGarden.nextSpeciesId === id ? '明日种植' : '当前花种'
  return store.focusGardenToday.growthMinutes > 0 ? '设为明日' : '今日种植'
}
function speciesUnlockProgress(species) {
  if (species.unlocked || !species.unlockMinutes) return 100
  return Math.min(100, Math.round(store.focusGardenTotals.totalMinutes / species.unlockMinutes * 100))
}
function speciesUnlockRemaining(species) {
  return Math.max(0, (Number(species?.unlockMinutes) || 0) - store.focusGardenTotals.totalMinutes)
}
function selectSpecies(id) {
  cancelGrowthReplay()
  selectedSpeciesId.value = id
  selectedStageIndex.value = 5
  reactionBurst.value += 1
}
function triggerPlantReaction() { reactionBurst.value += 1 }
function handleSceneClick() {
  if (!usesArtworkStage.value) triggerPlantReaction()
}
function chooseSpecies(id) {
  selectedSpeciesId.value = id
  store.updateFocusGardenSettings({ speciesId: id })
}
function cancelGrowthReplay() {
  if (replayAnimationFrame) cancelAnimationFrame(replayAnimationFrame)
  replayAnimationFrame = 0
  replayPlaying.value = false
  replayScrubbing.value = false
}
function beginReplayScrub() {
  cancelGrowthReplay()
  replayScrubbing.value = true
}
function endReplayScrub() {
  replayScrubbing.value = false
}
function selectReplayStage(index) {
  cancelGrowthReplay()
  selectedStageIndex.value = index
}
function toggleGrowthReplay() {
  if (replayPlaying.value) {
    cancelGrowthReplay()
    return
  }
  cancelGrowthReplay()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    selectedStageIndex.value = gardenStages.length - 1
    return
  }
  replayPlaying.value = true
  replayScrubbing.value = true
  selectedStageIndex.value = 0
  const startedAt = performance.now()
  const duration = 4400
  const animate = now => {
    const elapsed = Math.min(1, (now - startedAt) / duration)
    const eased = elapsed < 0.5
      ? 2 * elapsed * elapsed
      : 1 - Math.pow(-2 * elapsed + 2, 2) / 2
    selectedStageIndex.value = eased * (gardenStages.length - 1)
    if (elapsed < 1) {
      replayAnimationFrame = requestAnimationFrame(animate)
      return
    }
    replayAnimationFrame = 0
    replayPlaying.value = false
    replayScrubbing.value = false
  }
  replayAnimationFrame = requestAnimationFrame(animate)
}

function setMonthGrid(element) {
  monthGridObserver?.disconnect()
  monthGridObserver = null
  monthGridWidth.value = element?.clientWidth || 0
  if (!element || typeof ResizeObserver === 'undefined') return
  monthGridObserver = new ResizeObserver(([entry]) => {
    monthGridWidth.value = entry?.contentRect.width || 0
  })
  monthGridObserver.observe(element)
}

onBeforeUnmount(() => {
  cancelGrowthReplay()
  monthGridObserver?.disconnect()
})
</script>

<style scoped>
.achievement-workspace {
  width: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 24px;
  overflow: auto;
  container-type: inline-size;
  background: radial-gradient(circle at 14% 0, var(--accent-soft), transparent 26%), var(--main-bg);
  scrollbar-width: thin;
  scrollbar-color: var(--text-muted-26-fallback) transparent;
  scrollbar-gutter: stable;
}
.achievement-workspace::-webkit-scrollbar { width: 6px; height: 6px; }
.achievement-workspace::-webkit-scrollbar-track { background: transparent; }
.achievement-workspace::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: var(--text-muted-26-fallback);
  background-clip: padding-box;
}
.achievement-workspace:hover::-webkit-scrollbar-thumb {
  background: var(--text-muted);
  background-clip: padding-box;
}
/* Windows WebView 会给未显式设置背景的 button 加灰底；成就页同样需要重置。 */
.achievement-workspace :where(button) { background: transparent; }
.achievement-shell { display: grid; gap: 16px; width: min(1180px, 100%); margin: 0 auto; }
.achievement-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.achievement-header .eyebrow { margin: 0 0 4px; color: var(--accent-strong); font-size: 11px; font-weight: 750; letter-spacing: .1em; }
.achievement-header h1 { margin: 0; color: var(--text); font-size: 28px; letter-spacing: -.035em; }
.achievement-header p { margin: 5px 0 0; color: var(--text-muted); font-size: 13px; }
.achievement-header__today { display: flex; align-items: center; gap: 4px; min-width: 210px; padding: 6px 14px 6px 4px; border: 0; border-radius: 16px; background: var(--surface-muted); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .6); }
.achievement-header__today .focus-plant { width: 68px; margin: -14px 0 -16px; }
.achievement-header__today span { display: grid; gap: 2px; }.achievement-header__today small { color: var(--text-muted); font-size: 10px; }.achievement-header__today strong { color: var(--text); font-size: 12px; }
.achievement-tabs { position: sticky; top: -24px; z-index: 10; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 4px; border: 1px solid var(--divider-soft); border-radius: 14px; background: var(--surface); box-shadow: 0 8px 18px rgba(36, 85, 73, .09); }
.achievement-tabs button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 38px; border: 0; border-radius: 10px; color: var(--text-muted); font: inherit; font-size: 13px; cursor: pointer; transition: color .15s ease, background-color .15s ease, transform .15s ease; }
.achievement-tabs button:hover { color: var(--accent-strong); background: color-mix(in srgb, var(--accent-soft) 70%, transparent); }
.achievement-tabs button:not(.active):hover { transform: translateY(-1px); }
.achievement-tabs button.active { color: var(--accent-strong); background: var(--accent-soft); font-weight: 700; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 16%, transparent); }
.card-surface { border: 1px solid var(--divider-soft); border-radius: 18px; background: var(--surface); box-shadow: 0 10px 28px rgba(36, 85, 73, .045); }
.achievement-overview { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.overview-hero { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 156px; align-items: center; min-height: 148px; padding: 17px 24px; overflow: hidden; border-color: color-mix(in srgb, #a7bd86 28%, var(--divider-soft)); background: radial-gradient(circle at 82% 48%, color-mix(in srgb, #d4e5bb 38%, transparent), transparent 22%), linear-gradient(115deg, color-mix(in srgb, #eff5e4 74%, var(--surface)), var(--surface) 64%); }
.overview-hero__copy { position: relative; z-index: 1; max-width: 640px; }.overview-hero__copy > span,.overview-goal > div > span,.overview-week header > div > span { color: var(--accent-strong); font-size: 10px; font-weight: 800; letter-spacing: .08em; }.overview-hero h2 { margin: 3px 0; color: var(--text); font-size: 23px; letter-spacing: -.045em; }.overview-hero p { margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.5; }.overview-hero__facts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }.overview-hero__facts div { display: grid; gap: 2px; min-width: 88px; padding: 6px 9px; border: 1px solid color-mix(in srgb, #9bb27b 22%, var(--divider-soft)); border-radius: 9px; background: rgba(255,255,255,.58); }.overview-hero__facts small { color: var(--text-muted); font-size: 8.5px; }.overview-hero__facts strong { color: var(--text); font-size: 12px; }.overview-hero__plant { position: relative; z-index: 1; display: grid; justify-items: center; align-self: stretch; align-content: end center; }.overview-hero__plant .focus-plant { width: 126px; margin: 0 0 -17px; }.overview-hero__plant span { margin-top: 1px; color: var(--text); font-size: 9px; font-weight: 700; }
.overview-goal { display: grid; grid-template-columns: 42px minmax(0, 1fr) minmax(120px, .35fr) auto; align-items: center; gap: 13px; padding: 15px 18px; border-color: color-mix(in srgb, var(--accent) 24%, var(--divider-soft)); background: color-mix(in srgb, var(--accent-soft) 28%, var(--surface)); }.overview-goal__icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 13px; background: var(--accent-soft); color: var(--accent-strong); }.overview-goal h2 { margin: 3px 0; color: var(--text); font-size: 15px; }.overview-goal p { margin: 0; color: var(--text-muted); font-size: 10px; line-height: 1.5; }.overview-goal__progress { display: grid; gap: 5px; }.overview-goal__progress strong { color: var(--accent-strong); font-size: 11px; text-align: right; }.overview-goal__progress i,.overview-goal__progress b { display: block; height: 6px; border-radius: 99px; }.overview-goal__progress i { overflow: hidden; background: color-mix(in srgb, var(--accent) 12%, var(--surface)); }.overview-goal__progress b { background: var(--accent); }.overview-goal button,.overview-week header button,.achievement-month-entry button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 34px; padding: 0 11px; border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--divider-soft)); border-radius: 9px; background: var(--surface); color: var(--accent-strong); font-size: 10px; font-weight: 750; cursor: pointer; }.overview-goal button:hover,.overview-week header button:hover,.achievement-month-entry button:hover { background: var(--accent-soft); }
.overview-week { padding: 18px; }.overview-week header button { flex: 0 0 auto; border: 0; padding: 0; background: transparent; }.overview-week__days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 7px; margin-top: 13px; }.overview-week__days button { position: relative; display: grid; min-height: 116px; place-items: end center; padding: 22px 4px 5px; overflow: visible; border: 1px solid var(--divider-soft); border-radius: 13px; color: var(--text-muted); cursor: pointer; }.overview-week__days button > span { position: absolute; top: 7px; left: 9px; font-size: 9px; }.overview-week__days button > strong { position: absolute; top: 6px; right: 9px; color: var(--text); font-size: 11px; }.overview-week__days button.active { border-color: color-mix(in srgb, #6f9a5a 65%, var(--divider-soft)); background: color-mix(in srgb, #c5dda6 24%, var(--surface)); box-shadow: 0 0 0 1px color-mix(in srgb, #6f9a5a 42%, transparent); }.overview-week__days .terrarium { transform: scale(.86); transform-origin: center bottom; }
.overview-doors { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }.overview-door { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 11px; padding: 14px; text-align: left; cursor: pointer; }.overview-door > span { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; background: var(--accent-soft); color: var(--accent-strong); }.overview-door div { display: grid; gap: 2px; min-width: 0; }.overview-door small,.overview-door em { overflow: hidden; color: var(--text-muted); font-size: 9px; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }.overview-door strong { overflow: hidden; color: var(--text); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.overview-door > svg { color: var(--text-muted); }.overview-door:hover { border-color: color-mix(in srgb, var(--accent) 32%, var(--divider-soft)); background: color-mix(in srgb, var(--accent-soft) 24%, var(--surface)); }
.achievement-field { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(230px, .75fr); gap: 14px; align-items: stretch; }
/* 年度档案与近期足迹作为一个整体，和左侧四季花田共享同一行高。 */
.achievement-side { display: grid; grid-template-rows: minmax(0, .86fr) minmax(0, 1fr); min-width: 0; height: 100%; gap: 14px; align-content: stretch; }
.field-hero { position: relative; display: grid; grid-column: 1 / -1; grid-template-columns: minmax(0, 1.35fr) minmax(180px, .7fr) minmax(190px, .78fr); align-items: center; gap: 18px; min-height: 216px; padding: 22px 24px; overflow: hidden; border-color: color-mix(in srgb, #a7bd86 26%, var(--divider-soft)); background: linear-gradient(112deg, color-mix(in srgb, #eff5e4 68%, var(--surface)), var(--surface) 54%, color-mix(in srgb, #f7f1dc 52%, var(--surface))); }.field-hero::after { position: absolute; right: 24%; bottom: -88px; width: 260px; height: 150px; border-radius: 50%; background: color-mix(in srgb, #b6ce9b 18%, transparent); content: ''; pointer-events: none; }.field-hero__copy,.field-hero__plant,.field-hero__progress { position: relative; z-index: 1; }.field-hero__copy > span { color: var(--accent-strong); font-size: 10px; font-weight: 800; letter-spacing: .08em; }.field-hero__copy h2 { max-width: 430px; margin: 5px 0 6px; color: var(--text); font-size: 24px; letter-spacing: -.045em; line-height: 1.2; }.field-hero__copy > p { max-width: 460px; margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.65; }.field-hero__facts { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px; }.field-hero__facts div { display: grid; gap: 3px; min-width: 86px; padding: 8px 10px; border: 1px solid color-mix(in srgb, #9bb27b 22%, var(--divider-soft)); border-radius: 10px; background: rgba(255,255,255,.52); }.field-hero__facts small { color: var(--text-muted); font-size: 9px; }.field-hero__facts strong { color: var(--text); font-size: 12px; }.field-hero__plant { display: grid; justify-items: center; align-self: stretch; align-content: center; }.field-hero__plant > div { display: grid; width: 160px; height: 148px; place-items: end center; border-radius: 50% 50% 42% 42%; background: radial-gradient(ellipse at center bottom, rgba(183,205,145,.62), transparent 68%); }.field-hero__plant .focus-plant { width: 146px; margin: -12px 0 -25px; }.field-hero__plant > span { display: grid; gap: 3px; margin-top: 5px; text-align: center; }.field-hero__plant small { color: var(--text-muted); font-size: 9px; }.field-hero__plant strong { color: var(--text); font-size: 11px; }.field-hero__progress { display: grid; align-content: center; gap: 7px; padding: 15px; border: 1px solid color-mix(in srgb, #9bb27b 25%, var(--divider-soft)); border-radius: 14px; background: rgba(255,255,255,.5); }.field-hero__progress > span { color: var(--text-muted); font-size: 10px; }.field-hero__progress > strong { color: var(--text); font-size: 18px; }.field-hero__progress > i { height: 7px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.field-hero__progress > i b { display: block; height: 100%; border-radius: inherit; background: #9aaf73; }.field-hero__progress > small { color: var(--text-muted); font-size: 9px; }.field-hero__progress button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 34px; margin-top: 4px; border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--divider-soft)); border-radius: 9px; background: var(--accent-soft); color: var(--accent-strong); font-size: 10px; font-weight: 700; cursor: pointer; }.field-hero__progress button:hover { border-color: color-mix(in srgb, var(--accent) 34%, var(--divider-soft)); background: color-mix(in srgb, var(--accent-soft) 72%, var(--surface)); }
.achievement-year { padding: 18px; }
.achievement-section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.achievement-section-heading span { color: var(--accent-strong); font-size: 10px; font-weight: 750; letter-spacing: .08em; }.achievement-section-heading h2 { margin: 3px 0; color: var(--text); font-size: 18px; letter-spacing: -.02em; }.achievement-section-heading p { margin: 0; color: var(--text-muted); font-size: 11px; }
.achievement-section-heading label { display: flex; align-items: center; gap: 7px; color: var(--text-muted); font-size: 11px; }.achievement-section-heading select { min-height: 30px; padding: 0 28px 0 8px; border: 1px solid var(--divider-soft); border-radius: 8px; background: var(--surface-muted); color: var(--text); }
/* 年格"专注风景"整体：使用浅绿山丘风景作为背景，6 列网格 */
.achievement-year__landscape {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
  padding: 22px 14px 18px;
  border-radius: 18px;
  overflow: hidden;
  background:
    linear-gradient(180deg, #eaf2e0 0%, #e1ecd5 50%, #d2e0c0 100%);
}
/* 左右下角叶子装饰（设计图左右下角各有小叶丛） */
.achievement-year__landscape::before,
.achievement-year__landscape::after {
  content: '';
  position: absolute;
  bottom: 0;
  width: 80px;
  height: 60px;
  pointer-events: none;
  z-index: 0;
  background-image:
    radial-gradient(ellipse at 20% 70%, #9cbf80 0 14px, transparent 16px),
    radial-gradient(ellipse at 55% 80%, #b5d09a 0 10px, transparent 12px),
    radial-gradient(ellipse at 85% 60%, #87a86c 0 12px, transparent 14px);
  opacity: .5;
}
.achievement-year__landscape::before { left: 0; transform: scaleX(-1); }
.achievement-year__landscape::after { right: 0; }
/* 山丘与树的远景（z-index 0，terrarium cell z-index 1 覆盖在上面） */
.achievement-year__hills { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.achievement-year__hill { position: absolute; left: -15%; right: -15%; border-radius: 50% 50% 0 0 / 100% 100% 0 0; }
.achievement-year__hill--back { top: 55%; height: 70%; background: rgba(184, 207, 162, .42); }
.achievement-year__hill--front { top: 65%; right: -30%; left: 30%; height: 65%; background: rgba(166, 192, 140, .38); }
/* 树缩小并降低不透明度，避免遮住空格子。位置放网格左右两侧外缘 */
.achievement-year__tree {
  position: absolute;
  bottom: 14%;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 60%, #b5d09a 0%, #8fb87a 70%, #7aa468 100%);
  box-shadow: inset 0 -4px 8px rgba(0, 0, 0, .08);
  opacity: .5;
}
.achievement-year__tree::before { content: ''; position: absolute; bottom: -6px; left: 50%; width: 5px; height: 10px; transform: translateX(-50%); background: #8a7250; border-radius: 2px; }
.achievement-year__tree--left { left: -2%; bottom: 38%; }
.achievement-year__tree--right { right: -2%; bottom: 38%; transform: scale(.85); }
.achievement-year__bush { position: absolute; bottom: 12%; width: 30px; height: 18px; border-radius: 50%; background: rgba(127, 165, 100, .42); }
.achievement-year__bush--a { left: 8%; }
.achievement-year__bush--b { right: 8%; transform: scale(.8); }
/* 飞鸟：放顶部天空区 */
.achievement-year__sky { position: absolute; top: 6%; left: 0; right: 0; height: 16%; pointer-events: none; z-index: 0; }
.achievement-year__bird { position: absolute; top: 30%; left: 32%; width: 16px; height: 8px; }
.achievement-year__bird::before, .achievement-year__bird::after { content: ''; position: absolute; top: 0; width: 8px; height: 8px; border-top: 1.4px solid #6f8a5a; border-right: 1.4px solid #6f8a5a; border-radius: 50%; }
.achievement-year__bird::before { left: 0; transform: rotate(-45deg); }
.achievement-year__bird::after { right: 0; transform: rotate(135deg); }
.achievement-year__bird--two { top: 60%; left: auto; right: 26%; transform: scale(.7); }

/* cell 按钮：月份 pill 在上，温室在中间行底对齐，底部"🌱 静待生长/N天" pill
   align-items: end 让罩子底座固定贴住底 pill 上沿，避免不同 stage 高度不同导致底座漂移 */
.achievement-year__landscape button {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: end;
  justify-items: center;
  gap: 4px;
  min-width: 0;
  min-height: 180px;
  padding: 8px 4px 10px;
  border: 0;
  border-radius: 14px;
  color: var(--text-muted);
  cursor: pointer;
  background: rgba(255, 255, 255, .42);
  z-index: 1;
  transition: transform .15s ease, background-color .15s ease, box-shadow .15s ease;
  /* 抑制点击/键盘聚焦时的浏览器默认黑框 */
  outline: none;
}
/* 顶部季节色条（用 ::before 避免被 active 态的 box-shadow 覆盖） */
.achievement-year__landscape button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12px;
  right: 12px;
  height: 2px;
  border-radius: 0 0 6px 6px;
  background: var(--season-accent, transparent);
  pointer-events: none;
  transition: background-color .2s ease, height .2s ease;
}
.achievement-year__landscape button.active::before { height: 3px; left: 0; right: 0; border-radius: 14px 14px 0 0; }
/* 季节色调：春嫩 / 夏浓 / 秋暖 / 冬冷 */
.achievement-year__season--spring { --season-accent: #b8d09c; background: rgba(232, 244, 220, .55); }
.achievement-year__season--summer { --season-accent: #6f9a5a; background: rgba(220, 234, 204, .55); }
.achievement-year__season--autumn { --season-accent: #c8a872; background: rgba(244, 232, 210, .55); }
.achievement-year__season--winter { --season-accent: #a8b8c4; background: rgba(228, 232, 236, .55); }
.achievement-year__landscape button:focus,
.achievement-year__landscape button:focus-visible,
.achievement-year__landscape button *:focus,
.achievement-year__landscape button *:focus-visible { outline: none; }
.achievement-year__landscape button:hover { transform: translateY(-2px); }
/* active 不再加 transform，避免底座与同行其他 cell 错开 2px；底色 + 描边已经能区分 */
.achievement-year__landscape button.active { transform: none; }
.achievement-year__terrarium { width: 100%; height: 100%; }
.achievement-year__landscape .achievement-year__month,
.achievement-year__landscape button > small {
  position: static;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .92);
  color: var(--text);
  line-height: 1.4;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(36, 85, 73, .08);
  z-index: 2;
}
.achievement-year__landscape .achievement-year__month { font-size: 10.5px; font-weight: 700; letter-spacing: .02em; }
.achievement-year__landscape button > small { color: var(--text-muted); font-size: 10px; padding: 2px 9px; }
.achievement-year__landscape button > small :deep(svg) { color: #6f9a5a; }
/* 激活态：底色变成更亮的浅绿，月/天 pill 变绿底白字 */
.achievement-year__landscape button.active {
  background: rgba(255, 255, 255, .9);
  box-shadow:
    0 8px 22px rgba(36, 85, 73, .12),
    0 0 0 1.5px color-mix(in srgb, #6f9a5a 50%, transparent);
}
.achievement-year__landscape button.active .achievement-year__month {
  background: #6f9a5a;
  color: #fff;
}
.achievement-year__landscape button.active > small {
  background: #6f9a5a;
  color: #fff;
}
.achievement-year__landscape button.active > small :deep(svg) { color: #fff; }
/* 空格子：让底座更轻，未占月份不放大按钮高度 */
.achievement-year__landscape button.empty { min-height: 168px; }
/* drill down 提示：右上角小箭头，hover/active 时显示 */
.achievement-year__drill {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--surface);
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity .15s ease, transform .15s ease, color .15s ease, background-color .15s ease;
  pointer-events: none;
  z-index: 2;
}
.achievement-year__landscape button:hover .achievement-year__drill,
.achievement-year__landscape button.active .achievement-year__drill {
  opacity: 1;
  transform: translateX(0);
}
.achievement-year__landscape button:hover .achievement-year__drill { color: var(--accent-strong); background: var(--accent-soft); }
.achievement-year__landscape button.active .achievement-year__drill { color: #fff; background: #6f9a5a; }
.achievement-summary { padding: 17px; }.achievement-summary > header,.achievement-unlock > header { display: flex; justify-content: space-between; align-items: center; color: var(--accent-strong); font-size: 11px; font-weight: 700; }
/* 环形图：SVG 双圆，外圈轨道 + 内圈进度（用 stroke-dasharray 实现） */
.achievement-summary__ring { position: relative; display: grid; place-items: center; margin: 12px 0 4px; }
.achievement-summary__ring svg { width: 124px; height: 124px; transform: rotate(-90deg); }
.achievement-summary__ring-track { fill: none; stroke: color-mix(in srgb, var(--divider-soft) 60%, transparent); stroke-width: 6; }
.achievement-summary__ring-fill { fill: none; stroke: #6f9a5a; stroke-width: 6; stroke-linecap: round; stroke-dasharray: calc(2 * 3.14159 * 27); stroke-dashoffset: calc(2 * 3.14159 * 27 * (1 - var(--p, 0) / 100)); transition: stroke-dashoffset .6s cubic-bezier(.2, .7, .2, 1); }
.achievement-summary__ring > div { position: absolute; inset: 0; display: grid; align-content: center; justify-items: center; text-align: center; padding: 4px; gap: 1px; }
.achievement-summary__ring > div small { color: var(--text-muted); font-size: 9px; letter-spacing: .03em; }
.achievement-summary__ring > div strong { display: block; color: var(--text); font-size: 14px; font-weight: 800; letter-spacing: -.02em; line-height: 1.15; }
.achievement-summary__ring > div em { color: var(--accent-strong); font-size: 9px; font-style: normal; line-height: 1.25; }
.achievement-summary dl { display: grid; gap: 0; margin: 8px 0 0; }
.achievement-summary dl div { display: grid; grid-template-columns: 16px 1fr auto; align-items: center; gap: 9px; padding: 9px 0; border-top: 1px solid var(--divider-soft); }
.achievement-summary__icon { display: grid; place-items: center; color: #6f9a5a; }
.achievement-summary dt { color: var(--text-muted); font-size: 11px; }
.achievement-summary dd { margin: 0; color: var(--text); font-size: 13px; font-weight: 750; }
.achievement-month,.achievement-month-entry { grid-column: 1 / -1; }
.achievement-month { padding: 18px; }.achievement-month__nav { display: flex; gap: 5px; }.achievement-month__nav button { display: grid; width: 30px; height: 30px; place-items: center; border: 1px solid var(--divider-soft); border-radius: 8px; color: var(--text-muted); cursor: pointer; }.achievement-month__nav button:hover { color: var(--accent-strong); background: var(--accent-soft); }
/* 月格统计条：横向紧凑数据条（替代原来的 4 个等宽卡），垂直高度从 ~80px 压到 ~36px */
.achievement-month__stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 12px;
  padding: 8px 14px;
  border: 1px solid var(--divider-soft);
  border-radius: 12px;
  background: color-mix(in srgb, #eff5e4 32%, var(--surface));
}
.achievement-month__stat { display: inline-flex; align-items: baseline; gap: 6px; min-width: 0; }
.achievement-month__stat-icon { color: #6f9a5a; align-self: center; flex: none; }
.achievement-month__stat small { color: var(--text-muted); font-size: 10px; letter-spacing: .02em; }
.achievement-month__stat strong {
  overflow: hidden; max-width: 14ch; color: var(--text); font-size: 12.5px; font-weight: 750;
  text-overflow: ellipsis; white-space: nowrap;
}
.achievement-month__stat-divider { width: 1px; height: 12px; background: color-mix(in srgb, var(--divider-soft) 80%, transparent); flex: none; }
.achievement-month__weekdays,.achievement-month__grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.achievement-month__weekdays { margin: 14px 0 6px; }
.achievement-month__weekdays span { color: var(--text-muted); font-size: 10px; text-align: center; font-weight: 600; }
/* 月格子：每个 cell 都是温室。日期数字在左上角，温室底对齐到 cell 底部。
   关键：align-items: flex-end 让所有 stage 高度的罩子底座贴到 cell 底（y 一致） */
.achievement-month__grid button {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  /* 最大盛放罩高 128px，连同上下内边距需要至少 156px，避免 flex 为塞进格子而压缩花罩。 */
  min-height: 156px;
  padding: 22px 4px 6px;
  /* 完整温室会按格宽缩放，保留底座和叶片的完整轮廓。 */
  overflow: visible;
  border: 1px solid var(--divider-soft);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease;
  /* 抑制点击/键盘聚焦时的浏览器默认黑框 */
  outline: none;
}
.achievement-month__grid button:focus,
.achievement-month__grid button:focus-visible,
.achievement-month__grid button *:focus,
.achievement-month__grid button *:focus-visible { outline: none; }
.achievement-month__grid button:hover { transform: translateY(-1px); }
.achievement-month__grid button.future { opacity: .5; }
.achievement-month__day { position: absolute; top: 5px; left: 8px; font-size: 10px; color: var(--text-muted); font-weight: 600; }
.achievement-month__terrarium { display: block; flex: 0 0 auto; transform-origin: center bottom; }
.achievement-month__blank { min-height: 156px; }
.achievement-month-entry { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px; border-style: dashed; background: color-mix(in srgb, #eff5e4 30%, var(--surface)); }.achievement-month-entry > div { min-width: 0; }.achievement-month-entry span { color: var(--accent-strong); font-size: 10px; font-weight: 800; letter-spacing: .08em; }.achievement-month-entry h2 { margin: 4px 0 3px; color: var(--text); font-size: 17px; }.achievement-month-entry p { margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.5; }.achievement-month-entry button { flex: 0 0 auto; }
/* 当日高亮：底色变浅绿，边框变绿，罩子也会变绿（在 terrarium--highlight 里） */
.achievement-month__grid button.active {
  background: color-mix(in srgb, #c5dda6 35%, var(--surface));
  box-shadow: 0 0 0 2px color-mix(in srgb, #6f9a5a 65%, transparent), 0 6px 14px rgba(36, 85, 73, .1);
}
.achievement-month__grid button.active .achievement-month__day { color: #4f7842; font-weight: 700; }
.achievement-day-dialog { position: fixed; z-index: 40; inset: 0; display: grid; place-items: center; padding: 24px; background: rgba(25, 39, 32, .34); backdrop-filter: blur(5px); }
.achievement-day-dialog__panel { width: min(440px, 100%); max-height: min(650px, calc(100vh - 48px)); overflow: auto; padding: 19px; border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--divider-soft)); border-radius: 18px; background: var(--surface); box-shadow: 0 24px 70px rgba(20, 42, 33, .25); }
.achievement-day-dialog__panel > header,.achievement-day-dialog__tasks > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.achievement-day-dialog__panel > header > div > span,.achievement-day-dialog__tasks > header > span { color: var(--accent-strong); font-size: 10px; font-weight: 800; letter-spacing: .05em; }
.achievement-day-dialog__panel h2 { margin: 4px 0 0; color: var(--text); font-size: 20px; letter-spacing: -.03em; }
.achievement-day-dialog__panel > header > button { display: grid; flex: 0 0 auto; width: 30px; height: 30px; place-items: center; border: 1px solid var(--divider-soft); border-radius: 9px; color: var(--text-muted); cursor: pointer; }
.achievement-day-dialog__panel > header > button:hover { color: var(--accent-strong); background: var(--accent-soft); }
.achievement-day-dialog__hero { display: grid; grid-template-columns: 128px 1fr; align-items: center; gap: 14px; min-height: 128px; margin-top: 16px; padding: 8px 14px 8px 5px; border: 1px solid color-mix(in srgb, #9bbf85 22%, var(--divider-soft)); border-radius: 14px; background: color-mix(in srgb, #eff5e4 42%, var(--surface)); }
.achievement-day-dialog__hero :deep(.focus-plant) { width: 128px; height: 112px; }
.achievement-day-dialog__hero > div { display: grid; gap: 3px; min-width: 0; }.achievement-day-dialog__hero small { color: var(--accent-strong); font-size: 10px; font-weight: 750; }.achievement-day-dialog__hero strong { color: var(--text); font-size: 17px; }.achievement-day-dialog__hero p { margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.5; }
.achievement-day-dialog__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 13px 0; }.achievement-day-dialog__stats div { display: grid; gap: 4px; padding: 10px 8px; border: 1px solid var(--divider-soft); border-radius: 10px; background: var(--surface-muted); }.achievement-day-dialog__stats dt { color: var(--text-muted); font-size: 9px; }.achievement-day-dialog__stats dd { margin: 0; overflow: hidden; color: var(--text); font-size: 12px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.achievement-day-dialog__tasks { padding-top: 13px; border-top: 1px solid var(--divider-soft); }.achievement-day-dialog__tasks > header { align-items: baseline; }.achievement-day-dialog__tasks > header small { color: var(--text-muted); font-size: 9px; }.achievement-day-dialog__tasks ul { display: grid; gap: 7px; margin: 10px 0 0; padding: 0; list-style: none; }.achievement-day-dialog__tasks li { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 9px 10px; border-radius: 9px; background: var(--surface-muted); }.achievement-day-dialog__tasks li span { overflow: hidden; color: var(--text); font-size: 11px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }.achievement-day-dialog__tasks li small,.achievement-day-dialog__tasks > p { flex: 0 0 auto; margin: 0; color: var(--text-muted); font-size: 9px; }.achievement-day-dialog__tasks > p { margin-top: 10px; line-height: 1.6; }
.achievement-day-dialog__empty { display: grid; justify-items: center; gap: 10px; padding: 38px 24px 20px; color: var(--accent-strong); text-align: center; }.achievement-day-dialog__empty p { max-width: 260px; margin: 0; color: var(--text-muted); font-size: 12px; line-height: 1.65; }
/* 当日详情以“投入结果 → 目标完成度 → 专注记录”的顺序呈现，避免小字号挤在一起。 */
.achievement-day-dialog { background: rgba(25, 39, 32, .38); backdrop-filter: blur(7px); }
.achievement-day-dialog__panel { width: min(640px, 100%); max-height: calc(100vh - 32px); padding: 24px; border-radius: 22px; box-shadow: 0 28px 80px rgba(20, 42, 33, .27); }
.achievement-day-dialog__panel > header,.achievement-day-dialog__tasks > header { gap: 14px; }.achievement-day-dialog__panel > header > div > span,.achievement-day-dialog__tasks > header > span { font-size: 13px; }.achievement-day-dialog__panel h2 { margin-top: 5px; font-size: 27px; line-height: 1.15; }.achievement-day-dialog__panel > header > button { width: 40px; height: 40px; border-radius: 12px; }
.achievement-day-dialog__hero { grid-template-columns: 156px 1fr; gap: 18px; min-height: 156px; margin-top: 19px; padding: 11px 18px 11px 7px; border-color: color-mix(in srgb, #9bbf85 28%, var(--divider-soft)); border-radius: 17px; background: linear-gradient(118deg, color-mix(in srgb, #eff5e4 74%, var(--surface)), color-mix(in srgb, #f8faef 46%, var(--surface))); }.achievement-day-dialog__hero :deep(.focus-plant) { width: 154px; height: 136px; }.achievement-day-dialog__hero > div { gap: 5px; }.achievement-day-dialog__hero small { font-size: 12px; font-weight: 800; }.achievement-day-dialog__hero strong { font-size: 20px; letter-spacing: -.025em; }.achievement-day-dialog__hero p { font-size: 13px; line-height: 1.55; }
.achievement-day-dialog__focus-total { display: flex; align-items: baseline; gap: 6px; margin-top: 3px; color: var(--accent-strong); }.achievement-day-dialog__focus-total b { color: var(--text); font-size: 16px; }.achievement-day-dialog__focus-total span { color: var(--text-muted); font-size: 11px; }.achievement-day-dialog__progress { display: block; height: 6px; overflow: hidden; margin-top: 3px; border-radius: 999px; background: color-mix(in srgb, var(--accent) 12%, var(--surface)); }.achievement-day-dialog__progress b { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--accent), #87aa70); }
.achievement-day-dialog__stats { gap: 10px; margin: 15px 0 17px; }.achievement-day-dialog__stats div { align-content: center; min-height: 70px; padding: 11px 12px; border-radius: 13px; }.achievement-day-dialog__stats dt,.achievement-day-dialog__stats small { font-size: 11px; }.achievement-day-dialog__stats dd { font-size: 17px; font-weight: 800; }
.achievement-day-dialog__tasks { padding-top: 16px; }.achievement-day-dialog__tasks > header > span { font-size: 14px; }.achievement-day-dialog__tasks > header small { font-size: 11px; }.achievement-day-dialog__tasks ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }.achievement-day-dialog__tasks li { display: grid; grid-template-columns: 32px minmax(0, 1fr); align-items: center; gap: 9px; min-height: 52px; padding: 10px 12px; border-radius: 11px; }.achievement-day-dialog__tasks li > span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 9px; background: var(--accent-soft); color: var(--accent-strong); }.achievement-day-dialog__tasks li div { display: grid; min-width: 0; gap: 2px; }.achievement-day-dialog__tasks li strong { overflow: hidden; color: var(--text); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.achievement-day-dialog__tasks li small,.achievement-day-dialog__tasks > p { margin: 0; color: var(--text-muted); font-size: 11px; }.achievement-day-dialog__tasks li > b { grid-column: 2; color: var(--text); font-size: 12px; white-space: nowrap; }.achievement-day-dialog__tasks > p { margin-top: 12px; padding: 12px; border-radius: 11px; background: var(--surface-muted); line-height: 1.65; }.achievement-day-dialog__tasks-more { color: var(--accent-strong) !important; }.achievement-day-dialog__empty { gap: 11px; padding: 42px 24px 22px; }.achievement-day-dialog__empty p { max-width: 290px; font-size: 13px; }
/* 当日专注按真实时间轴完整呈现；内容过长时可继续滚动，但不显示干扰性的滚动条。 */
.achievement-day-dialog__panel { overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }.achievement-day-dialog__panel::-webkit-scrollbar { display: none; }
.achievement-day-dialog__tasks ul.achievement-day-dialog__timeline { grid-template-columns: 1fr; gap: 7px; }.achievement-day-dialog__timeline li { grid-template-columns: 84px 28px minmax(0, 1fr) auto; min-height: 46px; gap: 8px; padding: 9px 11px; }.achievement-day-dialog__timeline time { display: grid; align-content: center; gap: 1px; color: var(--text-muted); font-style: normal; }.achievement-day-dialog__timeline time strong { color: var(--text); font-size: 12px; }.achievement-day-dialog__timeline time span { font-size: 10px; }.achievement-day-dialog__timeline li > i { display: grid; width: 26px; height: 26px; place-items: center; border-radius: 50%; background: var(--accent-soft); color: var(--accent-strong); }.achievement-day-dialog__timeline li > b { grid-column: auto; font-size: 13px; }.achievement-day-dialog__timeline li div { gap: 1px; }.achievement-day-dialog__timeline li small { font-size: 10px; }
/* 近期足迹：原 下一个解锁 紧凑化为顶部一行，下面是徽章列表 */
.achievement-trail { padding: 18px; }
.achievement-trail__next { display: grid; grid-template-columns: 22px 56px 1fr; align-items: center; gap: 12px; margin-top: 12px; padding: 10px 12px; border: 1px dashed color-mix(in srgb, #b9c89e 65%, transparent); border-radius: 12px; background: color-mix(in srgb, #eff5e4 35%, var(--surface)); }
.achievement-trail__next--done { grid-template-columns: 22px 1fr; }
.achievement-trail__next-icon { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--accent-soft); color: var(--accent-strong); }
.achievement-trail__next-preview { width: 56px; height: 56px; }
.achievement-trail__next-meta { min-width: 0; }
.achievement-trail__next-meta small { color: var(--accent-strong); font-size: 9.5px; font-weight: 700; letter-spacing: .04em; }
.achievement-trail__next-meta strong { display: block; overflow: hidden; color: var(--text); font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.achievement-trail__next-meta i { display: block; height: 4px; margin-top: 6px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--divider-soft) 60%, transparent); }
.achievement-trail__next-meta i b { display: block; height: 100%; border-radius: inherit; background: var(--accent); transition: width .4s ease; }
.achievement-recent { padding: 18px; }.achievement-recent .achievement-section-heading > button { align-self: center; display: inline-flex; align-items: center; gap: 3px; color: var(--accent-strong); font-size: 11px; cursor: pointer; }.achievement-recent__list { display: grid; gap: 7px; margin-top: 13px; }.achievement-recent__list article { display: grid; grid-template-columns: 36px 1fr auto; align-items: center; gap: 9px; padding: 9px; border-radius: 11px; background: var(--surface-muted); }.achievement-recent__list article > span { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 50%; background: var(--accent-soft); color: var(--accent-strong); }.achievement-recent__list article div { display: grid; gap: 2px; }.achievement-recent__list strong { color: var(--text); font-size: 12px; }.achievement-recent__list small,.achievement-recent__list time { color: var(--text-muted); font-size: 9px; }.achievement-empty { display: grid; justify-items: center; gap: 6px; margin-top: 18px; padding: 22px; border-radius: 12px; background: var(--surface-muted); color: var(--accent); text-align: center; }.achievement-empty p { max-width: 280px; margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.55; }
/* 右栏留白改由年度档案承接：先给出年度进度，再用完整的四项记录讲清这一年的投入。 */
.achievement-summary { display: grid; grid-template-rows: auto auto minmax(0, 1fr); min-height: 0; padding: 18px; box-sizing: border-box; }
.achievement-summary > header { margin-bottom: 13px; }
.achievement-summary__overview { display: grid; grid-template-columns: 118px minmax(0, 1fr); align-items: center; gap: 15px; }
.achievement-summary__ring { margin: 0; }
.achievement-summary__ring svg { width: 118px; height: 118px; }
.achievement-summary__ring > div small,.achievement-summary__ring > div em { font-size: 9px; }
.achievement-summary__ring > div strong { font-size: 14px; }
.achievement-summary__headline { display: grid; align-content: center; gap: 4px; min-width: 0; }
.achievement-summary__headline small { color: var(--accent-strong); font-size: 10px; font-weight: 750; letter-spacing: .06em; }
.achievement-summary__headline strong { color: var(--text); font-size: 15px; line-height: 1.35; letter-spacing: -.02em; }
.achievement-summary__headline p { margin: 2px 0 0; color: var(--text-muted); font-size: 10px; line-height: 1.6; }
.achievement-summary dl { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 8px; min-height: 0; margin: 16px 0 0; }
.achievement-summary dl div { grid-template-columns: 26px minmax(0, 1fr); align-content: center; min-height: 0; gap: 3px 7px; padding: 9px; border: 1px solid var(--divider-soft); border-radius: 11px; background: var(--surface-muted); }
.achievement-summary dl div:first-child,.achievement-summary dl div:nth-child(3) { grid-column: auto; }
.achievement-summary__icon { grid-row: span 2; display: grid; width: 25px; height: 25px; place-items: center; border-radius: 8px; background: color-mix(in srgb, #eff5e4 74%, var(--surface)); }.achievement-summary dt { overflow: hidden; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.achievement-summary dd { grid-column: 2; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.achievement-trail { min-height: 0; padding: 13px; box-sizing: border-box; }
.achievement-trail .achievement-section-heading h2 { font-size: 16px; }
.achievement-trail .achievement-section-heading > button { padding-top: 2px; color: var(--accent-strong); font-size: 10px; cursor: pointer; }
.achievement-trail__next { grid-template-columns: 19px 46px minmax(0, 1fr); gap: 8px; margin-top: 8px; padding: 7px 8px; }
.achievement-trail__next-icon { width: 19px; height: 19px; }.achievement-trail__next-preview { width: 46px; height: 46px; }.achievement-trail__next-meta small { font-size: 8.5px; }.achievement-trail__next-meta strong { font-size: 11px; }.achievement-trail__next-meta i { height: 3px; margin-top: 4px; }
.achievement-trail .achievement-recent__list { gap: 5px; margin-top: 8px; }
.achievement-trail .achievement-recent__list article { grid-template-columns: 29px minmax(0, 1fr) auto; gap: 7px; padding: 6px; border-radius: 9px; }
.achievement-trail .achievement-recent__list article > span { width: 27px; height: 27px; }.achievement-trail .achievement-recent__list article > span svg { width: 16px; height: 16px; }.achievement-trail .achievement-recent__list strong { font-size: 10px; }.achievement-trail .achievement-recent__list small,.achievement-trail .achievement-recent__list time { font-size: 8px; }
.achievement-species { display: grid; gap: 16px; }
.species-next { display: grid; grid-template-columns: 60px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 10px 14px; border-color: color-mix(in srgb, var(--accent) 23%, var(--divider-soft)); background: color-mix(in srgb, var(--accent-soft) 24%, var(--surface)); text-align: left; cursor: pointer; }.species-next :deep(.focus-species-preview) { width: 58px; height: 58px; object-fit: contain; }.species-next > div { display: grid; gap: 3px; min-width: 0; }.species-next span { color: var(--accent-strong); font-size: 10px; font-weight: 800; letter-spacing: .06em; }.species-next strong { color: var(--text); font-size: 14px; }.species-next small { overflow: hidden; color: var(--text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.species-next i { display: block; width: min(360px, 100%); height: 5px; margin-top: 3px; overflow: hidden; border-radius: 99px; background: color-mix(in srgb, var(--accent) 12%, var(--surface)); }.species-next i b { display: block; height: 100%; border-radius: inherit; background: var(--accent); }.species-next > svg { color: var(--text-muted); }.species-next:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--divider-soft)); }
.species-complete { display: grid; grid-template-columns: 46px minmax(0, 1fr) minmax(150px, .32fr); align-items: center; gap: 14px; padding: 13px 16px; border-color: color-mix(in srgb, #9eae72 34%, var(--divider-soft)); background: linear-gradient(110deg, color-mix(in srgb, #f7f3d9 52%, var(--surface)), var(--surface)); }.species-complete__seal { display: grid; width: 44px; height: 44px; place-items: center; border: 1px solid color-mix(in srgb, #9eae72 38%, var(--divider-soft)); border-radius: 50%; background: color-mix(in srgb, #f0d96b 22%, var(--surface)); color: #78884f; box-shadow: inset 0 0 0 5px rgba(255,255,255,.48); }.species-complete > div { display: grid; min-width: 0; gap: 3px; }.species-complete > div > span,.species-complete__depth small { color: var(--accent-strong); font-size: 9px; font-weight: 800; letter-spacing: .05em; }.species-complete > div > strong { color: var(--text); font-size: 15px; }.species-complete > div > small { overflow: hidden; color: var(--text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.species-complete__depth { justify-items: stretch; padding-left: 14px; border-left: 1px solid var(--divider-soft); }.species-complete__depth strong { font-size: 13px !important; text-align: right; }.species-complete__depth i,.species-companion > i { display: block; height: 5px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.species-complete__depth i b,.species-companion > i b { display: block; height: 100%; border-radius: inherit; background: color-mix(in srgb, #9eae72 82%, var(--accent)); }
.species-playground {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, .72fr);
  min-height: 360px;
  overflow: hidden;
  border-color: color-mix(in srgb, var(--species-accent) 24%, var(--divider-soft));
}
.species-playground__scene {
  position: relative;
  display: grid;
  min-height: 360px;
  place-items: end center;
  overflow: hidden;
  background:
    radial-gradient(circle at 72% 17%, color-mix(in srgb, var(--species-sun) 52%, transparent), transparent 22%),
    linear-gradient(180deg, color-mix(in srgb, var(--species-scene) 76%, #fff), var(--species-horizon));
  cursor: pointer;
}
.species-playground__backdrop { position: absolute; z-index: 0; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center bottom; filter: saturate(.78) contrast(.92) brightness(1.03); opacity: .82; pointer-events: none; }
.species-playground__focus-wash { position: absolute; z-index: 1; inset: 0; pointer-events: none; background: radial-gradient(ellipse 42% 54% at 50% 54%, rgba(255,255,255,.5) 0 20%, rgba(255,255,255,.14) 58%, transparent 100%); }
.species-playground__scene.has-artwork-backdrop { background: var(--species-horizon); }
.species-playground__scene.has-artwork-backdrop::before,.species-playground__scene.has-artwork-backdrop::after,.species-playground__scene.has-artwork-backdrop .species-playground__sun,.species-playground__scene.has-artwork-backdrop .species-playground__clouds,.species-playground__scene.has-artwork-backdrop .species-playground__hills,.species-playground__scene.has-artwork-backdrop .species-playground__foreground { display: none; }
.species-playground__scene::before,.species-playground__scene::after { position: absolute; inset: 0; pointer-events: none; content: ''; }
.species-playground__scene::after { z-index: 1; opacity: .42; }
.species-playground.is-night .species-playground__scene::before { background-image: radial-gradient(circle, rgba(255,255,255,.88) 0 1px, transparent 1.5px), radial-gradient(circle, rgba(224,228,255,.65) 0 1px, transparent 1.5px); background-position: 11% 17%, 31% 8%; background-size: 72px 66px, 101px 87px; opacity: .72; }
.species-playground__sun { position: absolute; top: 42px; right: 14%; width: 58px; height: 58px; border-radius: 50%; background: color-mix(in srgb, var(--species-sun) 76%, #fff); box-shadow: 0 0 0 20px color-mix(in srgb, var(--species-sun) 24%, transparent); }
.species-playground.is-night .species-playground__sun { width: 48px; height: 48px; background: #eef0ff; box-shadow: 0 0 0 17px rgba(214,220,255,.09), 0 0 42px rgba(214,220,255,.42); }
.species-playground__clouds i { position: absolute; width: 98px; height: 30px; border-radius: 999px; background: rgba(255,255,255,.62); }
.species-playground__clouds i::before,.species-playground__clouds i::after { position: absolute; bottom: 0; border-radius: 50%; background: inherit; content: ''; }
.species-playground__clouds i::before { left: 18px; width: 42px; height: 42px; }.species-playground__clouds i::after { right: 13px; width: 32px; height: 32px; }
.species-playground__clouds i:first-child { top: 74px; left: -26px; }.species-playground__clouds i:last-child { top: 130px; right: -38px; transform: scale(.72); }
.species-playground__hills i { position: absolute; right: -10%; bottom: -70px; left: -10%; height: 190px; border-radius: 50% 50% 0 0; background: var(--species-ground); opacity: .82; }
.species-playground__hills i:last-child { right: 42%; bottom: -98px; left: -22%; background: color-mix(in srgb, var(--species-accent) 14%, var(--species-horizon)); opacity: .7; }
.species-playground__foreground { position: absolute; z-index: 2; right: 0; bottom: 0; left: 0; height: 118px; overflow: hidden; pointer-events: none; }
.species-playground__foreground i { position: absolute; bottom: 0; width: 3px; height: 58px; border-radius: 100% 100% 0 0; background: #6c9664; transform-origin: bottom; opacity: 1; }
.species-playground__foreground i::before { position: absolute; bottom: 47px; left: 50%; width: 8px; height: 8px; border-radius: 50%; background: #f7fbf2; box-shadow: 0 -7px 0 -1px #fff, 7px 0 0 -1px #fff, 0 7px 0 -1px #fff, -7px 0 0 -1px #fff, 0 1px 3px rgba(49,86,54,.28); content: ''; transform: translateX(-50%); }
.species-playground__foreground i::after { position: absolute; bottom: 20px; left: 2px; width: 14px; height: 7px; border-radius: 100% 0 100% 0; background: #8bb47b; box-shadow: -11px -7px 0 -2px #8bb47b, 5px 30px 0 1px rgba(117,100,77,.5), -11px 34px 0 0 rgba(117,100,77,.44); content: ''; transform: rotate(-24deg); }
.species-playground__foreground i:nth-child(1) { left: 8%; height: 61px; transform: rotate(-8deg); }.species-playground__foreground i:nth-child(2) { left: 17%; height: 39px; transform: rotate(7deg); }.species-playground__foreground i:nth-child(3) { right: 15%; height: 55px; transform: rotate(-5deg); }.species-playground__foreground i:nth-child(4) { right: 7%; height: 37px; transform: rotate(9deg); }.species-playground__foreground i:nth-child(5) { right: 29%; height: 31px; transform: rotate(-4deg); }
.species-playground.is-night .species-playground__clouds { opacity: .24; }
/* 花种不仅换色：天空位置、远景和地表纹理随其自然环境改变。 */
.species-playground--daisy .species-playground__sun { top: 34px; right: 19%; transform: scale(.88); }.species-playground--daisy .species-playground__scene::after { background: radial-gradient(ellipse at 16% 78%, rgba(255,255,255,.7) 0 2px, transparent 3px) 0 0 / 30px 16px, radial-gradient(ellipse at 84% 83%, rgba(255,255,255,.46) 0 2px, transparent 3px) 0 0 / 37px 19px; }
.species-playground--tulip .species-playground__sun { top: 30px; right: 22%; transform: scale(.86); }.species-playground--tulip .species-playground__scene::after { background: radial-gradient(ellipse at 16% 78%, rgba(255,255,255,.6) 0 2px, transparent 3px) 0 0 / 26px 13px; }
.species-playground--cosmos .species-playground__clouds i:last-child { top: 54px; right: 8%; }.species-playground--cosmos .species-playground__hills i:first-child { transform: scaleY(.8); transform-origin: bottom; }
.species-playground--sunflower .species-playground__sun { top: 25px; right: 18%; width: 68px; height: 68px; }.species-playground--sunflower .species-playground__scene::after { background: repeating-linear-gradient(82deg, transparent 0 17px, rgba(116,147,77,.26) 18px 20px, transparent 21px 39px); }
.species-playground--poppy .species-playground__hills i:last-child { right: 20%; left: -32%; transform: scaleY(.7); transform-origin: bottom; }.species-playground--poppy .species-playground__clouds { opacity: .72; }
.species-playground--lavender .species-playground__scene::after { background: repeating-linear-gradient(72deg, transparent 0 14px, rgba(116,95,157,.22) 15px 18px, transparent 19px 32px); }.species-playground--lavender .species-playground__sun { right: 24%; transform: scale(.76); }
.species-playground--iris .species-playground__scene::after { background: linear-gradient(112deg, transparent 0 43%, rgba(255,255,255,.35) 44% 45%, transparent 46% 100%); }.species-playground--hydrangea .species-playground__scene::after { background: radial-gradient(circle at 12% 78%, rgba(255,255,255,.32) 0 14px, transparent 15px) 0 0 / 44px 32px; }
.species-playground--lily .species-playground__sun { top: 57px; right: 10%; transform: scale(.8); }.species-playground--camellia .species-playground__scene::after { background: radial-gradient(ellipse at 13% 83%, rgba(65,104,78,.25) 0 22px, transparent 23px) 0 0 / 70px 36px; }
.species-playground--peony .species-playground__hills i:first-child { bottom: -90px; height: 210px; }.species-playground--moonflower .species-playground__scene::after { background: radial-gradient(circle at 78% 76%, rgba(177,187,255,.18), transparent 26%); }
.species-playground--sunflower .species-playground__foreground i::before,.species-playground--sunflower .species-playground__foreground i::after { background: #f5cc5a; }.species-playground--lavender .species-playground__foreground i::before,.species-playground--lavender .species-playground__foreground i::after { background: #a89adc; }.species-playground--moonflower .species-playground__foreground { opacity: .42; }.species-playground--moonflower .species-playground__foreground i::before,.species-playground--moonflower .species-playground__foreground i::after { background: #c4c8ff; }
.species-playground__plant { position: relative; z-index: 3; width: 232px; margin-bottom: -23px; }
.species-playground__plant.is-artwork { width: 232px; margin-bottom: 50px; }
.species-playground__hint { position: absolute; z-index: 4; right: 18px; bottom: 16px; display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px; border: 1px solid rgba(255,255,255,.72); border-radius: 999px; background: rgba(255,255,255,.72); color: var(--accent-strong); font-size: 10px; cursor: pointer; backdrop-filter: blur(6px); }
.species-playground__particle { --angle: calc(var(--particle-index) * 45deg); position: absolute; z-index: 3; bottom: 144px; left: 50%; width: 7px; height: 7px; border-radius: 70% 30% 70% 30%; background: var(--species-accent); opacity: 0; animation: species-particle .85s ease-out both; }
@keyframes species-particle { 20% { opacity: .8; } to { opacity: 0; transform: rotate(var(--angle)) translateY(-90px) scale(.3); } }
.species-playground__info { display: grid; align-content: start; grid-template-rows: auto auto minmax(42px, auto) auto auto auto auto; gap: 13px; padding: 26px 28px; background: color-mix(in srgb, var(--surface) 92%, var(--species-scene)); }
.species-playground__identity { display: grid; justify-items: start; gap: 7px; }.species-playground__collection { display: inline-flex; align-items: center; gap: 6px; width: fit-content; padding: 5px 8px; border-radius: 999px; background: color-mix(in srgb, var(--species-scene) 65%, var(--surface)); color: var(--accent-strong); font-size: 10px; font-weight: 750; }.species-playground__identity h2 { margin: 0; color: var(--text); font-size: 31px; line-height: 1.1; letter-spacing: -.045em; }.species-playground__identity > p { display: flex; align-items: baseline; gap: 8px; margin: 0; }.species-playground__identity > p span,.species-playground__meaning > span,.species-playground__description > span { flex: none; color: var(--text-muted); font-size: 10px; font-weight: 750; letter-spacing: .08em; }.species-playground__identity > p strong { color: color-mix(in srgb, var(--species-accent) 76%, var(--text)); font-size: 15px; font-weight: 800; line-height: 1.4; }
.species-playground__meaning { display: grid; gap: 5px; min-width: 0; padding: 11px 13px 12px; border-radius: 12px; background: linear-gradient(90deg, color-mix(in srgb, var(--species-scene) 58%, var(--surface)), rgba(255,255,255,.54)); }.species-playground__meaning > span { color: var(--accent-strong); }.species-playground__meaning blockquote { position: relative; margin: 0; padding-left: 11px; color: color-mix(in srgb, var(--text-muted) 88%, var(--text)); font-size: 13px; line-height: 1.65; }.species-playground__meaning blockquote::before { position: absolute; top: 4px; bottom: 4px; left: 0; width: 2px; border-radius: 999px; background: color-mix(in srgb, var(--species-accent) 64%, transparent); content: ''; }.species-playground__description { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 8px; min-height: 42px; margin: 0; padding-top: 11px; border-top: 1px solid color-mix(in srgb, var(--species-accent) 14%, var(--divider-soft)); color: var(--text-muted); font-size: 12px; line-height: 1.65; }.species-playground__description > span { padding-top: 2px; }
.species-playground__progress { display: grid; gap: 10px; padding-top: 1px; }.species-playground__progress dl { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 0; border: 1px solid color-mix(in srgb, var(--species-accent) 16%, var(--divider-soft)); border-radius: 12px; background: rgba(255,255,255,.6); overflow: hidden; }.species-playground__progress dl div { display: grid; gap: 4px; min-height: 48px; padding: 10px 12px; }.species-playground__progress dl div + div { border-left: 1px solid color-mix(in srgb, var(--species-accent) 13%, var(--divider-soft)); }.species-playground__progress dt { color: var(--text-muted); font-size: 10px; }.species-playground__progress dd { margin: 0; color: var(--text); font-size: 17px; font-weight: 800; letter-spacing: -.02em; }.species-playground__progress dd small { color: var(--text-muted); font-size: 10px; font-weight: 650; letter-spacing: 0; }
.species-detail__status { display: inline-flex; align-items: center; gap: 5px; width: fit-content; padding: 6px 9px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); font-size: 10px; font-weight: 700; }.species-detail__status.is-locked { background: var(--surface-muted); color: var(--text-muted); }
.species-companion { display: grid; gap: 8px; padding: 12px; border-radius: 13px; background: linear-gradient(120deg, color-mix(in srgb, #f5f2d8 54%, var(--surface)), color-mix(in srgb, var(--species-scene) 34%, var(--surface))); }.species-companion > header { display: flex; align-items: start; justify-content: space-between; gap: 10px; }.species-companion > header > div { display: grid; gap: 2px; }.species-companion > header span,.species-companion__next span { color: var(--text-muted); font-size: 10px; font-weight: 650; letter-spacing: .04em; }.species-companion > header strong { color: #657440; font-size: 16px; font-weight: 800; letter-spacing: -.02em; }.species-companion > header > b { min-width: 34px; padding: 4px 6px; border-radius: 999px; background: rgba(255,255,255,.58); color: #78884f; font-size: 10px; font-weight: 800; text-align: center; }.species-companion p { margin: -1px 0 0; color: var(--text-muted); font-size: 11px; line-height: 1.5; }.species-companion__next { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding-top: 2px; }.species-companion__next strong { color: #657440; font-size: 10px; font-weight: 750; text-align: right; }.species-companion i { height: 5px; overflow: hidden; border-radius: 99px; background: rgba(120,136,79,.14); }.species-companion i b { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #aebb77, #78884f); }
.species-detail__unlock { display: flex; align-items: center; gap: 7px; min-height: 22px; color: var(--text-muted); }.species-detail__unlock > span { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: var(--accent-soft); color: var(--accent-strong); }.species-detail__unlock > div { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 6px; }.species-detail__unlock small,.species-detail__unlock em { color: var(--text-muted); font-size: 10px; font-style: normal; }.species-detail__unlock strong { color: var(--text-muted); font-size: 10px; font-weight: 650; }.species-detail__unlock em { color: var(--accent-strong); font-weight: 700; }.species-detail__unlock.is-locked > span { background: var(--surface-muted); color: var(--text-muted); }
.species-playground__actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }.species-playground__actions > :only-child { grid-column: 1 / -1; }.species-playground__choose { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 10px; background: linear-gradient(135deg, var(--accent), var(--accent-strong)); color: #fff; font-size: 11px; font-weight: 750; cursor: pointer; box-shadow: 0 6px 14px color-mix(in srgb, var(--accent) 19%, transparent); }.species-playground__choose:disabled { background: var(--surface-muted); color: var(--text-muted); box-shadow: none; cursor: default; }.species-playground__footprint { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 36px; padding: 0 11px; border: 1px solid color-mix(in srgb, var(--species-accent) 25%, var(--divider-soft)); border-radius: 10px; color: var(--species-accent); font-size: 10px; font-weight: 750; cursor: pointer; }.species-playground__footprint:hover { background: color-mix(in srgb, var(--species-accent) 10%, var(--surface)); }
.species-replay { --replay-step-gap: 8px; --replay-stage-center-inset: calc(8.333333% - 3.333333px); --replay-thumb-size: 16px; --replay-range-inset: calc(var(--replay-stage-center-inset) - 8px); padding: 20px 24px 22px; }.species-replay .achievement-section-heading h2 { display: flex; align-items: baseline; gap: 9px; }.species-replay .achievement-section-heading h2 small { color: var(--accent-strong); font-size: 12px; font-weight: 700; }.species-replay__actions { display: flex; align-items: center; gap: 12px; }.species-replay__actions button { display: inline-flex; align-items: center; gap: 5px; min-height: 30px; padding: 6px 10px; border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--divider-soft)); border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); font-size: 11px; font-weight: 700; cursor: pointer; }.species-replay__actions small { color: var(--accent-strong); font-size: 12px; font-weight: 750; }.species-replay__range { position: relative; display: block; height: 18px; margin: 18px 0 8px; }.species-replay__range::before { position: absolute; top: 6px; right: var(--replay-stage-center-inset); left: var(--replay-stage-center-inset); height: 6px; border-radius: 999px; background: linear-gradient(to right, var(--accent) 0 var(--replay-progress), var(--divider-soft) var(--replay-progress) 100%); content: ''; }.species-replay__range input { position: relative; display: block; width: calc(100% - var(--replay-range-inset) - var(--replay-range-inset)); height: 18px; margin: 0 var(--replay-range-inset); appearance: none; -webkit-appearance: none; background: transparent; cursor: grab; }.species-replay__range input::-webkit-slider-runnable-track { height: 6px; border-radius: 999px; background: transparent; }.species-replay__range input::-webkit-slider-thumb { box-sizing: border-box; width: var(--replay-thumb-size); height: var(--replay-thumb-size); margin-top: -5px; border: 3px solid var(--surface); border-radius: 50%; appearance: none; -webkit-appearance: none; background: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent); }.species-replay__range input:active { cursor: grabbing; }.species-replay__range input:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 999px; }
.species-replay__steps { position: relative; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: var(--replay-step-gap); }.species-replay__steps::before { position: absolute; top: 17px; right: var(--replay-stage-center-inset); left: var(--replay-stage-center-inset); height: 2px; background: var(--divider-soft); content: ''; }.species-replay__steps button { position: relative; z-index: 1; display: grid; grid-template-rows: 34px minmax(39px, auto); justify-items: center; align-items: start; gap: 6px; min-width: 0; min-height: 79px; padding: 0 2px; color: var(--text-muted); cursor: pointer; }.species-replay__steps button i { display: grid; width: 34px; height: 34px; place-items: center; border: 2px solid var(--surface); border-radius: 50%; background: var(--surface-muted); box-shadow: 0 0 0 1px var(--divider-soft); }.species-replay__steps button span { display: grid; justify-items: center; gap: 2px; min-width: 0; }.species-replay__steps button span b { color: currentColor; font-size: 12px; font-weight: 700; line-height: 1.35; }.species-replay__steps button span small { display: block; max-width: 100%; overflow: hidden; color: var(--text-muted); font-size: 10px; font-weight: 550; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }.species-replay__steps button.reached i { background: var(--accent-soft); color: var(--accent-strong); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent); }.species-replay__steps button.active { color: var(--accent-strong); font-weight: 750; }.species-replay__steps button.active span small { color: var(--accent-strong); }.species-replay__steps button.active i { color: #fff; background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); transform: scale(1.06); }
.species-collection { padding: 18px 18px 14px; overflow: hidden; background: linear-gradient(180deg, var(--surface), color-mix(in srgb, var(--collection-scene) 54%, var(--surface))); }.species-collection > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }.species-collection > header span { color: var(--accent-strong); font-size: 11px; font-weight: 800; letter-spacing: .06em; }.species-collection > header h2 { margin: 4px 0 0; color: var(--text-muted); font-size: 11px; font-weight: 500; }.species-collection > header small { padding: 5px 8px; border-radius: 999px; background: rgba(255,255,255,.7); color: var(--text-muted); font-size: 9px; }
.species-collection__garden { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 12px; padding: 13px 12px 8px; border-radius: 17px; background: linear-gradient(180deg, rgba(255,255,255,.48), color-mix(in srgb, var(--collection-scene) 78%, #cadfc8)); }
.species-collection__garden > button { position: relative; display: grid; grid-template-rows: 116px auto auto auto; justify-items: center; align-items: end; min-width: 0; min-height: 191px; padding: 5px 8px 11px; border: 1px solid transparent; border-radius: 15px; color: var(--text); cursor: pointer; transform: translateY(calc(var(--plant-level) * 7px)); }.species-collection__garden > button:hover,.species-collection__garden > button:focus-visible { border-color: color-mix(in srgb, var(--plant-accent) 35%, transparent); background: color-mix(in srgb, var(--plant-scene) 48%, rgba(255,255,255,.62)); outline: none; }.species-collection__garden > button.selected { border-color: var(--plant-accent); background: color-mix(in srgb, var(--plant-scene) 56%, rgba(255,255,255,.82)); box-shadow: 0 8px 22px color-mix(in srgb, var(--plant-accent) 17%, transparent); }.species-collection__garden > button.locked { color: var(--text-muted); }
.species-collection__plant { position: relative; display: grid; width: 100%; height: 116px; place-items: end center; overflow: hidden; border: 1px solid rgba(255,255,255,.72); border-radius: 13px; background: rgba(255,255,255,.4); box-shadow: 0 7px 15px rgba(54,83,74,.07); }.species-collection__garden .focus-plant { width: 104px; margin-bottom: -2px; }.species-collection__plant :deep(.focus-species-preview) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }.species-collection__garden > button.locked :deep(.focus-species-preview) { filter: grayscale(.82) saturate(.28); opacity: .62; }.species-collection__garden strong { align-self: center; margin-top: 4px; font-size: 15px; line-height: 1.25; }.species-collection__garden small { align-self: start; overflow: hidden; max-width: 100%; margin-top: 2px; color: var(--text-muted); font-size: 11px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }.species-collection__lock { position: absolute; z-index: 2; top: 9px; right: 9px; display: grid; width: 24px; height: 24px; place-items: center; border-radius: 50%; background: rgba(255,255,255,.72); color: var(--text-muted); }.species-collection__status { display: inline-flex; align-items: center; justify-content: center; gap: 4px; max-width: 100%; min-height: 22px; margin-top: 6px; padding: 3px 8px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--plant-accent) 28%, rgba(255,255,255,.8)); border-radius: 999px; background: color-mix(in srgb, var(--plant-scene) 52%, rgba(255,255,255,.88)); color: color-mix(in srgb, var(--plant-accent) 80%, var(--text)); font-size: 10px; font-weight: 750; line-height: 1; text-overflow: ellipsis; white-space: nowrap; }.species-collection__status.is-locked { border-color: var(--divider-soft); background: rgba(255,255,255,.62); color: var(--text-muted); }
.species-collection__garden > button { min-height: 198px; }.species-collection__status.is-locked { display: grid; grid-template-columns: auto minmax(0, 1fr); justify-items: start; gap: 2px 4px; padding: 5px 8px; border-radius: 9px; white-space: normal; }.species-collection__status.is-locked > b { grid-column: 2; color: color-mix(in srgb, var(--plant-accent) 84%, var(--text)); font-size: 9px; }
.achievement-badges { display: grid; gap: 18px; }.badges-overview { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px; }.badges-overview > div { display: flex; align-items: center; gap: 11px; }.badges-overview > div > span { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 14px; background: var(--accent-soft); color: var(--accent-strong); }.badges-overview p { margin: 0; color: var(--text-muted); font-size: 11px; }.badges-overview h2 { margin: 2px 0 0; color: var(--text); font-size: 18px; }.badges-overview > p { max-width: 420px; line-height: 1.6; }
.badges-group > header { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-bottom: 9px; }.badges-group header span { color: var(--accent-strong); font-size: 10px; font-weight: 750; }.badges-group header h2 { margin: 2px 0 0; color: var(--text); font-size: 15px; }.badges-group header small { color: var(--text-muted); font-size: 10px; }.badges-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }.badge-card { display: grid; grid-template-columns: 46px 1fr; gap: 10px; padding: 14px; opacity: .66; }.badge-card.unlocked { opacity: 1; }.badge-card__icon { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 50%; background: var(--surface-muted); color: var(--text-muted); }.badge-card.unlocked .badge-card__icon { background: linear-gradient(145deg, #fff5cf, #e8f5e9); color: #8b7429; box-shadow: inset 0 0 0 1px rgba(194,159,61,.22); }.badge-card h3 { margin: 3px 0; color: var(--text); font-size: 13px; }.badge-card p { margin: 0; color: var(--text-muted); font-size: 10px; line-height: 1.45; }.badge-card__date { grid-column: 1 / -1; display: inline-flex; align-items: center; gap: 4px; color: var(--accent-strong); font-size: 9px; }.badge-card__progress { grid-column: 1 / -1; display: grid; gap: 4px; }.badge-card__progress > span { color: var(--text-muted); font-size: 9px; text-align: right; }.badge-card__progress i { height: 5px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badge-card__progress b { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
.legacy-rewards { padding: 14px 16px; }.legacy-rewards summary { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }.legacy-rewards summary span { display: inline-flex; align-items: center; gap: 6px; color: var(--text); font-size: 12px; font-weight: 650; }.legacy-rewards summary small { color: var(--text-muted); font-size: 9px; }.legacy-rewards > div { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 14px; }.legacy-rewards > div > span { display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px; border-radius: 10px; background: var(--surface-muted); color: var(--text); font-size: 11px; }
.badges-overview { display: grid; grid-template-columns: minmax(230px, 1.15fr) minmax(220px, .9fr) minmax(210px, .85fr); align-items: center; gap: 18px; padding: 20px; border-color: color-mix(in srgb, var(--accent) 15%, var(--divider-soft)); background: linear-gradient(120deg, color-mix(in srgb, var(--accent-soft) 50%, var(--surface)), var(--surface) 48%, color-mix(in srgb, #e8f0d9 26%, var(--surface))); }
.badges-overview__main { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }.badges-overview__mark { display: grid; flex: 0 0 auto; width: 46px; height: 46px; place-items: center; border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent); border-radius: 15px; background: var(--accent-soft); color: var(--accent-strong); }.badges-overview__main h2 { margin: 2px 0 3px; color: var(--text); font-size: 21px; letter-spacing: -.04em; }.badges-overview__main p { margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.55; }.badges-overview__main .badges-overview__eyebrow { color: var(--accent-strong); font-size: 10px; font-weight: 800; letter-spacing: .05em; }.badges-overview__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }.badges-overview__stats div { display: grid; gap: 5px; min-width: 0; padding: 9px 8px; border: 1px solid var(--divider-soft); border-radius: 11px; background: rgba(255,255,255,.52); }.badges-overview__stats small { color: var(--text-muted); font-size: 9px; white-space: nowrap; }.badges-overview__stats strong { overflow: hidden; color: var(--text); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.badges-overview__today { display: flex; align-items: center; gap: 9px; min-width: 0; padding: 8px 10px; border: 1px solid color-mix(in srgb, #9bbf85 25%, var(--divider-soft)); border-radius: 13px; background: color-mix(in srgb, #f2f7e9 64%, var(--surface)); }.badges-overview__today :deep(.focus-species-preview) { width: 66px; height: 66px; flex: 0 0 auto; object-fit: contain; }.badges-overview__today > div { display: grid; min-width: 0; gap: 3px; }.badges-overview__today small { color: var(--text-muted); font-size: 9px; }.badges-overview__today strong { overflow: hidden; color: var(--text); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.badges-overview__today span { overflow: hidden; color: var(--text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.badges-overview__today i { display: block; width: 100%; height: 4px; overflow: hidden; border-radius: 99px; background: color-mix(in srgb, #a8c18e 22%, var(--surface-muted)); }.badges-overview__today i b { display: block; height: 100%; border-radius: inherit; background: #8fac70; }
.badges-next { display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(150px, .45fr); align-items: center; gap: 16px; padding: 15px 18px; border-color: color-mix(in srgb, var(--accent) 18%, var(--divider-soft)); background: var(--surface); }.badges-next__label { display: grid; gap: 5px; min-width: 87px; }.badges-next__label span { color: var(--accent-strong); font-size: 10px; font-weight: 800; }.badges-next__label small { color: var(--text-muted); font-size: 9px; white-space: nowrap; }.badges-next__copy { min-width: 0; }.badges-next__copy h2 { margin: 0 0 3px; color: var(--text); font-size: 15px; }.badges-next__copy p { overflow: hidden; margin: 0; color: var(--text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.badges-next__progress { display: grid; gap: 5px; }.badges-next__progress strong { color: var(--text); font-size: 11px; text-align: right; }.badges-next__progress i { height: 6px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badges-next__progress b { display: block; height: 100%; border-radius: inherit; background: var(--accent); }.badges-next--complete { grid-template-columns: auto minmax(0, 1fr) auto; }.badges-next--complete > svg { color: #8fac70; }
.badges-group > header { align-items: center; }.badges-group header small { display: inline-flex; align-items: baseline; gap: 2px; padding: 4px 8px; border: 1px solid var(--divider-soft); border-radius: 999px; background: var(--surface); }.badges-group header small strong { color: var(--text); font-size: 11px; }.badges-group__controls { display: grid; justify-items: end; gap: 7px; }.badges-group__controls > div { display: inline-flex; gap: 3px; padding: 3px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface-muted); }.badges-group__controls button { min-height: 27px; padding: 0 8px; border: 0; border-radius: 6px; color: var(--text-muted); font: inherit; font-size: 10px; cursor: pointer; }.badges-group__controls button.active { background: var(--surface); color: var(--accent-strong); font-weight: 750; box-shadow: 0 1px 3px rgba(36, 85, 73, .09); }.badges-group__empty { display: grid; min-height: 112px; place-content: center; justify-items: center; gap: 7px; grid-column: 1 / -1; border: 1px dashed var(--divider-soft); border-radius: 13px; color: var(--accent-strong); }.badges-group__empty p { margin: 0; color: var(--text-muted); font-size: 11px; }.badge-card { position: relative; min-height: 137px; border-color: var(--divider-soft); background: color-mix(in srgb, var(--surface-muted) 22%, var(--surface)); transition: border-color .2s ease, background .2s ease, transform .2s ease; }.badge-card:hover { border-color: color-mix(in srgb, var(--accent) 28%, var(--divider-soft)); background: var(--surface); transform: translateY(-2px); }.badge-card.unlocked { border-color: color-mix(in srgb, #9daf70 28%, var(--divider-soft)); background: color-mix(in srgb, #f3f7e7 48%, var(--surface)); }.badge-card__icon { border: 1px solid var(--divider-soft); }.badge-card.unlocked .badge-card__icon { background: color-mix(in srgb, #f5d66e 24%, var(--accent-soft)); color: #8b7429; box-shadow: inset 0 0 0 1px rgba(194,159,61,.18); }.badge-card h3 { letter-spacing: -.01em; }.badge-card__date { font-weight: 650; }.badge-card__progress i { background: color-mix(in srgb, var(--accent) 8%, var(--surface-muted)); }.badge-card__progress b { background: color-mix(in srgb, var(--accent) 82%, #8fac70); }
.badges-growth-panorama { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(260px, .8fr); gap: 12px; }.badges-level,.badges-momentum { min-width: 0; padding: 16px 18px; }.badges-level { display: grid; gap: 13px; background: color-mix(in srgb, #f7f3d9 22%, var(--surface)); }.badges-level > header,.badges-momentum > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }.badges-level > header span,.badges-momentum > header span { color: var(--accent-strong); font-size: 10px; font-weight: 800; letter-spacing: .04em; }.badges-level h2 { margin: 3px 0 2px; color: var(--text); font-size: 18px; }.badges-level p { margin: 0; color: var(--text-muted); font-size: 10px; line-height: 1.5; }.badges-level > header > strong { padding: 5px 8px; border-radius: 9px; background: var(--accent-soft); color: var(--accent-strong); font-size: 12px; white-space: nowrap; }.badges-level__progress { display: grid; gap: 6px; }.badges-level__progress i { display: block; height: 7px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badges-level__progress b { display: block; height: 100%; border-radius: inherit; background: color-mix(in srgb, #9eae72 82%, var(--accent)); }.badges-level__progress span { color: var(--text-muted); font-size: 9px; }.badges-level__steps { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }.badges-level__steps span { display: grid; justify-items: center; gap: 5px; min-width: 0; color: var(--text-muted); }.badges-level__steps i { display: block; width: 9px; height: 9px; border: 2px solid var(--divider-soft); border-radius: 50%; background: var(--surface); }.badges-level__steps span.active i { border-color: #9eae72; background: #9eae72; }.badges-level__steps span.current i { box-shadow: 0 0 0 4px color-mix(in srgb, #9eae72 22%, transparent); }.badges-level__steps small { overflow: hidden; max-width: 100%; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.badges-level__steps span.active small { color: var(--text); font-weight: 650; }.badges-momentum { display: grid; gap: 12px; }.badges-momentum > header svg { color: #9eae72; }.badges-momentum__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }.badges-momentum__grid div { display: grid; grid-template-columns: 17px 1fr; gap: 2px 5px; padding: 9px; border: 1px solid var(--divider-soft); border-radius: 11px; background: color-mix(in srgb, var(--surface-muted) 32%, var(--surface)); }.badges-momentum__grid svg { grid-row: span 2; align-self: center; color: var(--accent-strong); }.badges-momentum__grid small { color: var(--text-muted); font-size: 9px; }.badges-momentum__grid strong { overflow: hidden; color: var(--text); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.badges-overview__score { display: inline-flex; width: fit-content; margin: 1px 0 4px; padding: 4px 7px; border-radius: 7px; background: color-mix(in srgb, #d6b55b 15%, var(--surface)); color: #92752a; font-size: 9px; font-weight: 750; letter-spacing: .02em; }.badges-group__reward { display: block !important; width: fit-content; margin-top: 5px; padding: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; color: var(--text-muted) !important; font-size: 9px !important; font-weight: 500 !important; }.badge-card { --badge-accent: var(--accent); }.badge-card--start { --badge-accent: #bd9841; }.badge-card--streak { --badge-accent: #6f9d75; }.badge-card--accumulate { --badge-accent: #c47f45; }.badge-card--deep { --badge-accent: #7081b6; }.badge-card--variety { --badge-accent: #a477ae; }.badge-card__icon { position: relative; border-color: color-mix(in srgb, var(--badge-accent) 20%, var(--divider-soft)); color: color-mix(in srgb, var(--badge-accent) 78%, var(--text-muted)); }.badge-card__icon small { position: absolute; right: -4px; bottom: -3px; display: grid; width: 17px; height: 17px; place-items: center; border: 2px solid var(--surface); border-radius: 50%; background: color-mix(in srgb, var(--badge-accent) 82%, var(--text)); color: #fff; font-size: 7px; font-weight: 800; line-height: 1; }.badge-card.unlocked .badge-card__icon { background: color-mix(in srgb, var(--badge-accent) 18%, var(--surface)); color: var(--badge-accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--badge-accent) 24%, transparent), 0 5px 14px color-mix(in srgb, var(--badge-accent) 14%, transparent); }.badge-card__reward { display: block; margin-bottom: 2px; color: var(--badge-accent); font-size: 9px; font-weight: 750; letter-spacing: .03em; }.badge-card.unlocked .badge-card__reward { color: color-mix(in srgb, var(--badge-accent) 84%, var(--text)); }.badge-card.unlocked { border-color: color-mix(in srgb, var(--badge-accent) 28%, var(--divider-soft)); background: color-mix(in srgb, var(--badge-accent) 5%, var(--surface)); }
.badges-category-index { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }.badges-category-index__item { --category-accent: var(--accent); display: grid; gap: 6px; padding: 10px 11px; border: 1px solid var(--divider-soft); border-radius: 12px; background: var(--surface); color: inherit; font: inherit; text-align: left; cursor: pointer; transition: transform .16s ease, border-color .16s ease, background-color .16s ease; }.badges-category-index__item:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--category-accent) 35%, var(--divider-soft)); }.badges-category-index__item.active { border-color: color-mix(in srgb, var(--category-accent) 52%, var(--divider-soft)); background: color-mix(in srgb, var(--category-accent) 8%, var(--surface)); box-shadow: 0 7px 16px color-mix(in srgb, var(--category-accent) 12%, transparent); }.badges-category-index__item--start { --category-accent: #bd9841; }.badges-category-index__item--streak { --category-accent: #6f9d75; }.badges-category-index__item--accumulate { --category-accent: #c47f45; }.badges-category-index__item--deep { --category-accent: #7081b6; }.badges-category-index__item--variety { --category-accent: #a477ae; }.badges-category-index__item > div { display: flex; align-items: center; justify-content: space-between; gap: 5px; }.badges-category-index__item span { color: var(--category-accent); font-size: 10px; font-weight: 800; }.badges-category-index__item strong { color: var(--text); font-size: 10px; }.badges-category-index__item small { overflow: hidden; color: var(--text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.badges-category-index__item > i { height: 4px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badges-category-index__item > i b { display: block; height: 100%; border-radius: inherit; background: var(--category-accent); }
.badges-featured { --featured-accent: #bd9841; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(220px, .75fr); align-items: center; gap: 22px; padding: 18px 22px; border-color: color-mix(in srgb, var(--featured-accent) 24%, var(--divider-soft)); background: radial-gradient(circle at 14% 50%, color-mix(in srgb, var(--featured-accent) 13%, transparent), transparent 32%), color-mix(in srgb, var(--featured-accent) 3%, var(--surface)); }.badges-featured.unlocked { --featured-accent: #8c9f61; }.badges-featured__identity { display: flex; align-items: center; gap: 14px; min-width: 0; }.badges-featured__seal { position: relative; display: grid; flex: 0 0 auto; width: 72px; height: 72px; place-items: center; border: 1px solid color-mix(in srgb, var(--featured-accent) 34%, var(--divider-soft)); border-radius: 22px; background: color-mix(in srgb, var(--featured-accent) 13%, var(--surface)); color: var(--featured-accent); box-shadow: inset 0 0 0 7px color-mix(in srgb, var(--featured-accent) 6%, transparent), 0 8px 18px color-mix(in srgb, var(--featured-accent) 13%, transparent); }.badges-featured__seal::before,.badges-featured__seal::after { position: absolute; width: 9px; height: 9px; border: 1px solid color-mix(in srgb, var(--featured-accent) 38%, transparent); border-radius: 50%; content: ''; }.badges-featured__seal::before { top: 9px; right: 12px; }.badges-featured__seal::after { bottom: 10px; left: 12px; }.badges-featured__seal small { position: absolute; right: -6px; bottom: -5px; display: grid; width: 20px; height: 20px; place-items: center; border: 2px solid var(--surface); border-radius: 50%; background: var(--featured-accent); color: #fff; font-size: 8px; font-weight: 800; }.badges-featured__identity > div { min-width: 0; }.badges-featured__eyebrow { display: block; overflow: hidden; color: var(--featured-accent); font-size: 10px; font-weight: 800; letter-spacing: .04em; text-overflow: ellipsis; white-space: nowrap; }.badges-featured h2 { margin: 4px 0 3px; color: var(--text); font-size: 19px; letter-spacing: -.03em; }.badges-featured p { margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.5; }.badges-featured__progress { display: grid; gap: 7px; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--featured-accent) 20%, var(--divider-soft)); border-radius: 13px; background: color-mix(in srgb, var(--featured-accent) 5%, var(--surface)); }.badges-featured__progress > div { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }.badges-featured__progress small { color: var(--text-muted); font-size: 9px; }.badges-featured__progress strong { color: var(--text); font-size: 12px; }.badges-featured__progress > i { height: 6px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badges-featured__progress > i b { display: block; height: 100%; border-radius: inherit; background: var(--featured-accent); }.badges-featured__progress > span { color: var(--text-muted); font-size: 9px; }
.badge-card::before { position: absolute; top: -1px; right: 16px; left: 16px; height: 3px; border-radius: 0 0 99px 99px; background: var(--badge-accent); opacity: .12; content: ''; }.badge-card.unlocked::before { opacity: .72; }.badge-card.unlocked:hover { transform: translateY(-3px); box-shadow: 0 12px 25px color-mix(in srgb, var(--badge-accent) 12%, transparent); }
.badge-focus { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, .55fr) auto; align-items: center; gap: 20px; padding: 18px 20px; border-color: color-mix(in srgb, var(--accent) 24%, var(--divider-soft)); background: linear-gradient(105deg, color-mix(in srgb, var(--accent-soft) 62%, var(--surface)), var(--surface) 66%); }.badge-focus.complete { border-color: color-mix(in srgb, #9daf70 34%, var(--divider-soft)); }.badge-focus__identity { display: flex; align-items: center; gap: 13px; min-width: 0; }.badge-focus__icon { display: grid; flex: 0 0 auto; width: 58px; height: 58px; place-items: center; border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--divider-soft)); border-radius: 18px; background: var(--surface); color: var(--accent-strong); box-shadow: 0 7px 18px color-mix(in srgb, var(--accent) 12%, transparent); }.badge-focus__identity p,.badge-library__header p { margin: 0; color: var(--accent-strong); font-size: 10px; font-weight: 800; letter-spacing: .04em; }.badge-focus__identity h2 { margin: 3px 0; color: var(--text); font-size: 18px; }.badge-focus__identity span { display: block; color: var(--text-muted); font-size: 10px; line-height: 1.5; }.badge-focus__progress { display: grid; gap: 7px; }.badge-focus__progress > div { display: flex; justify-content: space-between; gap: 9px; color: var(--text-muted); font-size: 10px; }.badge-focus__progress strong { color: var(--accent-strong); }.badge-focus__progress > i,.badge-detail__rule > i { display: block; height: 7px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badge-focus__progress b,.badge-detail__rule b { display: block; height: 100%; border-radius: inherit; background: var(--accent); }.badge-focus__actions { display: flex; gap: 7px; }.badge-focus__actions button,.badge-detail__actions button { display: inline-flex; min-height: 34px; align-items: center; justify-content: center; gap: 5px; padding: 0 11px; border: 1px solid var(--divider-soft); border-radius: 9px; background: var(--surface); color: var(--text); font: inherit; font-size: 10px; font-weight: 700; cursor: pointer; white-space: nowrap; }.badge-focus__actions .badge-focus__primary,.badge-detail__actions .primary { border-color: var(--accent); background: var(--accent); color: #fff; }.badge-focus--complete { grid-template-columns: auto 1fr; }.badge-focus--complete > svg { color: var(--accent-strong); }.badge-focus--complete p { margin: 0; color: var(--accent-strong); font-size: 10px; }.badge-focus--complete h2 { margin: 3px 0 0; color: var(--text); font-size: 16px; }
.badge-library { display: grid; gap: 12px; }.badge-library__header { display: flex; align-items: end; justify-content: space-between; gap: 12px; }.badge-library__header h2 { margin: 2px 0 0; color: var(--text); font-size: 16px; }.badge-library__header > span { color: var(--text-muted); font-size: 10px; }.badge-library__filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.badge-category-tabs,.badge-status-filter { display: flex; align-items: center; gap: 4px; }.badge-category-tabs { overflow-x: auto; padding: 3px; border: 1px solid var(--divider-soft); border-radius: 11px; background: var(--surface); scrollbar-width: none; }.badge-category-tabs::-webkit-scrollbar { display: none; }.badge-category-tabs button,.badge-status-filter button { min-height: 32px; padding: 0 10px; border: 0; border-radius: 8px; background: transparent; color: var(--text-muted); font: inherit; font-size: 10px; cursor: pointer; white-space: nowrap; }.badge-category-tabs button small { margin-left: 3px; color: inherit; opacity: .72; }.badge-category-tabs button.active,.badge-status-filter button.active { background: var(--accent-soft); color: var(--accent-strong); font-weight: 750; }.badge-status-filter { flex: 0 0 auto; padding: 3px; border-radius: 10px; background: var(--surface-muted); }.badge-card { width: 100%; color: inherit; font: inherit; text-align: left; cursor: pointer; }.badge-card:focus-visible,.badge-category-tabs button:focus-visible,.badge-status-filter button:focus-visible,.badge-focus button:focus-visible,.badge-detail button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }.badge-card.tracked { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 12%, transparent); }.badge-card__copy { min-width: 0; }.badge-card__tracked { position: absolute; top: 9px; right: 10px; display: inline-flex; align-items: center; gap: 3px; padding: 3px 6px; border-radius: 99px; background: var(--accent-soft); color: var(--accent-strong); font-size: 8px; font-weight: 750; }.badge-library__empty { display: grid; min-height: 150px; place-content: center; justify-items: center; gap: 8px; border: 1px dashed var(--divider-soft); border-radius: 14px; color: var(--accent-strong); }.badge-library__empty p { margin: 0; color: var(--text-muted); font-size: 11px; }
.badge-detail-backdrop { position: fixed; z-index: 1200; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(17, 31, 28, .32); backdrop-filter: blur(3px); }.badge-detail { position: relative; display: grid; width: min(520px, calc(100vw - 32px)); max-height: min(760px, calc(100vh - 40px)); gap: 14px; overflow-y: auto; box-sizing: border-box; padding: 28px; border: 1px solid var(--divider-soft, #e2e8e6); border-radius: 20px; background: var(--surface, #fff); box-shadow: 0 24px 70px rgba(20, 46, 40, .22); }.badge-detail__close { position: absolute; top: 15px; right: 15px; display: grid; width: 40px; height: 40px; place-items: center; border: 0; border-radius: 11px; background: var(--surface-muted, #f8faf9); color: var(--text-muted, #687674); cursor: pointer; }.badge-detail__header { display: grid; grid-template-columns: 68px minmax(0, 1fr); align-items: center; gap: 16px; padding-right: 42px; }.badge-detail__header > div { display: grid; min-width: 0; gap: 5px; }.badge-detail__icon { display: grid; width: 68px; height: 68px; place-items: center; border-radius: 20px; background: var(--accent-soft, #e5f5f2); color: var(--accent-strong, #1f6f68); }.badge-detail__eyebrow { margin: 0 !important; color: var(--accent-strong, #1f6f68) !important; font-size: 12px !important; font-weight: 800; }.badge-detail h2 { margin: 0; color: var(--text, #17211f); font-size: 26px; line-height: 1.25; }.badge-detail__header p:last-child { margin: 0; color: var(--text-muted, #53635f); font-size: 14px; line-height: 1.5; }.badge-detail__rule { display: grid; gap: 9px; margin-top: 2px; padding: 16px; border: 1px solid var(--divider-soft, #e2e8e6); border-radius: 14px; background: var(--surface-muted, #f8faf9); }.badge-detail__rule > span { color: var(--accent-strong, #1f6f68); font-size: 12px; font-weight: 800; }.badge-detail__rule strong { color: var(--text, #17211f); font-size: 15px; line-height: 1.45; }.badge-detail__rule small { color: var(--text-muted, #53635f); font-size: 12px; }.badge-detail__insights { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }.badge-detail__insights article { display: grid; align-content: start; gap: 6px; padding: 13px 14px; border: 1px solid var(--divider-soft, #e2e8e6); border-radius: 13px; }.badge-detail__insights span,.badge-detail__series > span { display: inline-flex; align-items: center; gap: 5px; color: var(--accent-strong, #1f6f68); font-size: 12px; font-weight: 800; }.badge-detail__insights strong { color: var(--text, #17211f); font-size: 13px; }.badge-detail__insights p { margin: 0; color: var(--text-muted, #53635f); font-size: 12px; line-height: 1.55; }.badge-detail__series { display: grid; gap: 8px; }.badge-detail__series > div { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }.badge-detail__series button { display: grid; grid-template-columns: 28px minmax(0, 1fr) 14px; align-items: center; gap: 7px; min-height: 54px; padding: 8px 10px; border: 1px solid var(--divider-soft, #e2e8e6); border-radius: 11px; background: var(--surface, #fff); color: var(--accent-strong, #1f6f68); font: inherit; text-align: left; cursor: pointer; }.badge-detail__series button > span { display: grid; min-width: 0; gap: 2px; }.badge-detail__series button small { color: var(--text-muted, #53635f); font-size: 10px; }.badge-detail__series button strong { overflow: hidden; color: var(--text, #17211f); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.badge-detail__series button > svg:last-child { color: var(--text-muted, #53635f); }.badge-detail__hint { padding: 11px 13px; border-left: 3px solid var(--accent, #2f8f86); background: var(--accent-soft, #e5f5f2); }.badge-detail__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 1px; }.badge-detail__actions button { min-height: 38px; padding-inline: 14px; font-size: 12px; }
.badge-card { grid-template-columns: 1fr; min-height: 164px; gap: 13px; padding: 16px; overflow: hidden; opacity: .78; }.badge-card__identity { display: grid; grid-template-columns: 52px minmax(0, 1fr); align-items: start; gap: 12px; }.badge-card__icon { width: 50px; height: 50px; border-radius: 16px; }.badge-card__copy { display: grid; gap: 3px; padding-top: 1px; }.badge-card__reward { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 10px; }.badge-card__reward small { padding-left: 6px; border-left: 1px solid color-mix(in srgb, var(--badge-accent) 25%, var(--divider-soft)); color: var(--text-muted); font-size: 9px; font-weight: 600; }.badge-card h3 { margin: 0; font-size: 15px; line-height: 1.35; }.badge-card p { display: -webkit-box; margin-top: 1px; overflow: hidden; color: color-mix(in srgb, var(--text-muted) 92%, var(--text)); font-size: 11px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }.badge-card__footer { display: grid; grid-template-columns: minmax(0, 1fr) 30px; align-items: end; gap: 10px; margin-top: auto; padding-top: 11px; border-top: 1px solid color-mix(in srgb, var(--badge-accent) 13%, var(--divider-soft)); }.badge-card__date { grid-column: auto; align-items: center; gap: 7px; color: var(--badge-accent); font-size: 11px; }.badge-card__date > span { display: flex; align-items: baseline; gap: 6px; }.badge-card__date small { color: var(--text-muted); font-size: 10px; font-weight: 600; }.badge-card__date strong { color: var(--text); font-size: 11px; }.badge-card__progress { grid-column: auto; gap: 5px; }.badge-card__progress > div { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }.badge-card__progress > div span,.badge-card__progress > small { color: var(--text-muted); font-size: 9px; }.badge-card__progress > div strong { color: var(--badge-accent); font-size: 11px; }.badge-card__progress > small { text-align: left; }.badge-card__open { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 9px; background: color-mix(in srgb, var(--badge-accent) 8%, var(--surface)); color: var(--badge-accent); transition: background-color .18s ease, transform .18s ease; }.badge-card:hover .badge-card__open { background: color-mix(in srgb, var(--badge-accent) 16%, var(--surface)); transform: translateX(2px); }.badge-card.unlocked { opacity: 1; }.badge-card.unlocked::after { position: absolute; top: 12px; right: 12px; width: 7px; height: 7px; border: 2px solid var(--surface); border-radius: 50%; background: var(--badge-accent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--badge-accent) 25%, transparent); content: ''; }.badge-card.tracked::after { display: none; }.badge-card__tracked { top: 10px; right: 10px; padding: 4px 7px; font-size: 9px; }.badge-card::before { right: 0; left: 0; height: 4px; border-radius: 0; }
@media (prefers-reduced-motion: reduce) { .species-playground__particle { animation: none; }.species-replay__steps button.active i { transform: none; } }
@media (max-width: 980px) { .achievement-field { grid-template-columns: 1fr; }.achievement-side { grid-template-rows: none; height: auto; }.achievement-year__landscape { grid-template-columns: repeat(4, 1fr); }.badges-grid { grid-template-columns: repeat(2, 1fr); }.achievement-summary,.achievement-trail { display: grid; }.species-playground { grid-template-columns: 1fr; }.species-playground__info { grid-template-columns: 1fr 1fr; align-items: center; }.species-playground__identity,.species-playground__meaning,.species-playground__description,.species-playground__progress { grid-column: 1 / -1; } }
/* 应用侧栏展开时右栏会先收窄；缩小进度环，让年度寄语仍以自然短句阅读。 */
@media (max-width: 1280px) and (min-width: 981px) { .achievement-summary { padding: 15px; }.achievement-summary__overview { grid-template-columns: 86px minmax(0, 1fr); gap: 9px; }.achievement-summary__ring svg { width: 86px; height: 86px; }.achievement-summary__ring > div small,.achievement-summary__ring > div em { font-size: 7px; }.achievement-summary__ring > div strong { font-size: 11px; }.achievement-summary__headline { gap: 3px; }.achievement-summary__headline small { font-size: 8px; }.achievement-summary__headline strong { font-size: 12px; line-height: 1.35; }.achievement-summary__headline p { font-size: 8.5px; line-height: 1.55; }.achievement-summary dl { gap: 6px; margin-top: 12px; }.achievement-summary dl div { grid-template-columns: 21px minmax(0, 1fr); min-height: 52px; padding: 7px; }.achievement-summary__icon { width: 21px; height: 21px; border-radius: 7px; }.achievement-summary__icon svg { width: 12px; height: 12px; }.achievement-summary dt { font-size: 8px; }.achievement-summary dd { font-size: 10px; } }
@media (max-width: 620px) { .achievement-workspace { padding: 14px; }.achievement-header { align-items: flex-start; }.achievement-header__today { display: none; }.achievement-year__landscape { grid-template-columns: repeat(3, 1fr); }.badges-grid { grid-template-columns: 1fr; }.achievement-month__grid button,.achievement-month__blank { min-height: 56px; }.achievement-tabs { top: -14px; }.achievement-tabs button { font-size: 11px; }.badges-overview { align-items: flex-start; flex-direction: column; }.species-playground__scene { min-height: 300px; }.species-playground__plant { width: 204px; }.species-playground__plant.is-artwork { width: 204px; margin-bottom: 28px; }.species-playground__info { display: grid; grid-template-columns: 1fr; padding: 20px; }.species-playground__info > * { grid-column: auto; }.species-replay__steps span { font-size: 9px; }.species-collection__garden { grid-template-columns: repeat(2, 1fr); }.species-collection__garden > button { min-height: 156px; } }
@media (max-width: 760px) { .overview-hero { grid-template-columns: minmax(0, 1fr) 118px; padding: 16px; }.overview-hero__plant .focus-plant { width: 104px; }.overview-goal { grid-template-columns: 40px minmax(0, 1fr) auto; }.overview-goal__progress { display: none; }.overview-week__days { gap: 4px; }.overview-week__days button { min-height: 92px; padding-inline: 0; }.overview-week__days .terrarium { transform: scale(.67); }.overview-week__days button > span { left: 5px; }.overview-week__days button > strong { right: 5px; }.achievement-month-entry { align-items: flex-start; flex-direction: column; gap: 10px; }.species-next { grid-template-columns: 50px minmax(0, 1fr) auto; }.species-next :deep(.focus-species-preview) { width: 48px; height: 48px; } }
@media (max-width: 760px) { .species-complete { grid-template-columns: 42px minmax(0, 1fr); }.species-complete__depth { grid-column: 1 / -1; grid-template-columns: 1fr auto; align-items: center; padding: 9px 0 0; border-top: 1px solid var(--divider-soft); border-left: 0; }.species-complete__depth i { grid-column: 1 / -1; } }
@media (max-width: 520px) { .achievement-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }.overview-hero { grid-template-columns: 1fr; }.overview-hero__plant { display: none; }.overview-hero__facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }.overview-hero__facts div { min-width: 0; padding: 8px; }.overview-hero__facts strong { font-size: 11px; }.overview-goal { grid-template-columns: 38px minmax(0, 1fr); }.overview-goal button { grid-column: 1 / -1; }.overview-doors { grid-template-columns: 1fr; }.overview-week { padding: 14px 9px; }.overview-week__days { gap: 1px; }.overview-week__days button { min-height: 76px; border-color: transparent; background: transparent; }.overview-week__days .terrarium { transform: scale(.53); }.overview-week__days button > strong { font-size: 10px; } }
@media (max-width: 980px) { .badges-overview { grid-template-columns: 1fr 1fr; }.badges-overview__today { grid-column: 1 / -1; }.badges-next { grid-template-columns: auto minmax(0, 1fr); }.badges-next__progress { grid-column: 1 / -1; } }
@media (max-width: 620px) { .badges-overview { display: grid; gap: 14px; }.badges-overview__stats { width: 100%; }.badges-overview__today { width: 100%; box-sizing: border-box; }.badges-next,.badges-next--complete { grid-template-columns: 1fr auto; gap: 11px; }.badges-next__copy { grid-column: 1 / -1; grid-row: 2; }.badges-next__progress { grid-column: 1 / -1; grid-row: 3; }.badges-next--complete .badges-next__copy { grid-column: 1 / -1; }.badges-next--complete > svg { grid-column: 2; grid-row: 1; } }
@media (max-width: 760px) { .badges-growth-panorama { grid-template-columns: 1fr; } }
@media (max-width: 420px) { .badges-level,.badges-momentum { padding: 14px; }.badges-level__steps small { font-size: 8px; }.badges-momentum__grid div { padding: 8px 7px; } }
@media (max-width: 980px) { .field-hero { grid-template-columns: minmax(0, 1.2fr) minmax(180px, .8fr); }.field-hero__progress { grid-column: 1 / -1; } .badges-category-index { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 620px) { .field-hero { grid-template-columns: 1fr; gap: 13px; padding: 18px; }.field-hero__copy h2 { font-size: 21px; }.field-hero__plant { order: -1; }.field-hero__facts { margin-top: 12px; }.field-hero__progress { grid-column: auto; }.achievement-month__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }.badges-category-index { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .achievement-day-dialog { padding: 14px; }.achievement-day-dialog__panel { max-height: calc(100vh - 28px); padding: 16px; }.achievement-day-dialog__hero { grid-template-columns: 106px 1fr; }.achievement-day-dialog__hero :deep(.focus-plant) { width: 106px; }.achievement-day-dialog__stats { grid-template-columns: 1fr; }.achievement-day-dialog__stats div { grid-template-columns: 1fr auto; align-items: center; }.achievement-day-dialog__tasks li { align-items: flex-start; flex-direction: column; gap: 3px; } }
@media (max-width: 760px) { .badges-featured { grid-template-columns: 1fr; gap: 14px; padding: 16px; }.badges-featured__progress { width: auto; } }

/* 修复：WebView2 上鼠标点完花朵后系统会强制显示深色 outline（Chromium 桌面版默认
   走 :focus-visible 会被覆盖；WebView2 在部分场景把任何 :focus 都按可视焦点处理）。
   直接把 outline 默认置为 none，只在键盘 :focus-visible 时回显以兼顾 a11y。 */
.achievement-tabs button,
.achievement-year__landscape button,
.achievement-month__nav button,
.achievement-month__grid button,
.achievement-recent .achievement-section-heading > button,
.species-playground__hint,
.species-playground__choose,
.species-playground__footprint,
.species-replay__actions button,
.species-replay__steps button,
.species-collection__garden > button,
.badges-category-index__item,
.badges-group__controls button,
.focus-plant,
.field-hero__plant > div {
  outline: none;
  &:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
}
@media (max-width: 980px) {
  .badge-focus { grid-template-columns: minmax(0, 1fr) minmax(190px, .6fr); }
  .badge-focus__actions { grid-column: 1 / -1; }
  .badge-library__filters { align-items: stretch; flex-direction: column; }
  .badge-category-tabs { width: 100%; box-sizing: border-box; }
  .badge-status-filter { width: fit-content; }
}
@media (max-width: 620px) {
  .badge-focus { grid-template-columns: 1fr; gap: 14px; padding: 16px; }
  .badge-focus__actions { grid-column: auto; flex-wrap: wrap; }
  .badge-library__header { align-items: flex-start; flex-direction: column; }
  .badge-status-filter { width: 100%; box-sizing: border-box; }
  .badge-status-filter button { flex: 1; }
  .badge-detail-backdrop { align-items: end; padding: 0; }
  .badge-detail { width: 100%; max-height: 90vh; overflow-y: auto; border-radius: 20px 20px 0 0; }
  .badge-detail__header { grid-template-columns: 56px minmax(0, 1fr); gap: 12px; padding-right: 36px; }
  .badge-detail__icon { width: 56px; height: 56px; border-radius: 17px; }
  .badge-detail h2 { font-size: 22px; }
  .badge-detail__insights,.badge-detail__series > div { grid-template-columns: 1fr; }
}
@container (max-width: 700px) {
  .achievement-header { align-items: flex-start; }
  .achievement-header__today { min-width: 170px; }
  .achievement-tabs button { gap: 4px; font-size: 11px; }
  .badges-overview { grid-template-columns: 1fr; gap: 14px; }
  .badges-overview__stats { width: 100%; }
  .badges-overview__today { width: 100%; box-sizing: border-box; }
  .badge-focus { grid-template-columns: 1fr; gap: 14px; }
  .badge-focus__actions { grid-column: auto; flex-wrap: wrap; }
  .badge-library__filters { align-items: stretch; flex-direction: column; }
  .badge-category-tabs { width: 100%; box-sizing: border-box; }
  .badge-status-filter { width: 100%; box-sizing: border-box; }
  .badge-status-filter button { flex: 1; }
  .badges-grid { grid-template-columns: 1fr; }
}
@container (max-width: 430px) {
  .achievement-header__today { display: none; }
  .achievement-header h1 { font-size: 23px; }
  .achievement-tabs button { padding-inline: 3px; }
  .badges-overview__stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
