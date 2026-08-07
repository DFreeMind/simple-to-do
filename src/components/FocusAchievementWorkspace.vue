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
        <button type="button" :class="{ active: activeTab === 'field' }" @click="activeTab = 'field'"><Flower2 :size="16" />花田总览</button>
        <button type="button" :class="{ active: activeTab === 'species' }" @click="activeTab = 'species'"><BookOpen :size="16" />花种图鉴</button>
        <button type="button" :class="{ active: activeTab === 'badges' }" @click="activeTab = 'badges'"><Trophy :size="16" />成长徽章</button>
      </nav>

      <section v-if="activeTab === 'field'" class="achievement-field">
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

        <aside class="achievement-summary card-surface" aria-label="专注成长摘要">
          <header><span>成长仪表</span><Leaf :size="18" /></header>
          <!-- 环形图：当前等级进度，中心显示累计专注 -->
          <div class="achievement-summary__ring" :title="`距离${nextGrowthRank ? nextGrowthRank.name : '盛放花田'}还差 ${nextGrowthRank ? nextGrowthRank.threshold - store.focusGardenTotals.totalMinutes : 0} 分钟`">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="27" class="achievement-summary__ring-track" />
              <circle cx="32" cy="32" r="27" class="achievement-summary__ring-fill" :style="{ '--p': growthRankProgress }" />
            </svg>
            <div>
              <small>累计专注</small>
              <strong>{{ durationHuman(store.focusGardenTotals.totalMinutes) }}</strong>
              <em>距离 {{ nextGrowthRank ? nextGrowthRank.name : '盛放花田' }} {{ nextGrowthRank ? `${Math.max(0, nextGrowthRank.threshold - store.focusGardenTotals.totalMinutes)} 分` : '已达成' }}</em>
            </div>
          </div>
          <dl>
            <div>
              <span class="achievement-summary__icon"><Flower2 :size="14" /></span>
              <dt>完整盛放</dt>
              <dd>{{ store.focusGardenTotals.bloomCount }} 朵</dd>
            </div>
            <div>
              <span class="achievement-summary__icon"><Trees :size="14" /></span>
              <dt>已培养花种</dt>
              <dd>{{ store.focusGardenTotals.speciesCount }} 种</dd>
            </div>
            <div>
              <span class="achievement-summary__icon"><Trophy :size="14" /></span>
              <dt>已获得徽章</dt>
              <dd>{{ unlockedAchievements.length }} 枚</dd>
            </div>
            <div>
              <span class="achievement-summary__icon"><Flame :size="14" /></span>
              <dt>最长连续</dt>
              <dd>{{ store.focusGardenTotals.longestStreak }} 天</dd>
            </div>
          </dl>
        </aside>

        <section class="achievement-month card-surface">
          <header class="achievement-section-heading">
            <div><span>月度花圃</span><h2>{{ selectedYear }} 年 {{ selectedMonth + 1 }} 月</h2><p>未完成目标的幼苗和花苞也会被如实保留。</p></div>
            <div class="achievement-month__nav">
              <button type="button" aria-label="上一个月" @click="shiftMonth(-1)"><ChevronLeft :size="16" /></button>
              <button type="button" aria-label="下一个月" @click="shiftMonth(1)"><ChevronRight :size="16" /></button>
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
          <div class="achievement-month__grid">
            <span v-for="blank in monthLeadingBlanks" :key="`blank-${blank}`" class="achievement-month__blank"></span>
            <button
              v-for="cell in monthCells"
              :key="cell.date"
              type="button"
              :class="{ grown: cell.entry, future: cell.date > todayKey, active: cell.date === todayKey }"
              :title="cell.entry ? `${cell.date} · ${stageName(cell.entry.stage)} · ${cell.entry.growthMinutes}/${cell.entry.goalMinutes} 分钟` : `${cell.date} · 没有专注成长`"
            >
              <span class="achievement-month__day">{{ cell.day }}</span>
              <FocusTerrarium
                class="achievement-month__terrarium"
                :size="cell.entry ? terrariumSizeFor(cell.entry.stage) : 'empty'"
                :species-id="cell.entry ? cell.entry.speciesId : 'daisy'"
                :stage="cell.entry ? cell.entry.stage : 'seed'"
                :highlight="cell.date === todayKey"
              />
            </button>
          </div>
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
      </section>

      <section v-else-if="activeTab === 'species'" class="achievement-species">
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
            <span class="species-playground__collection"><Flower2 :size="14" />{{ selectedCollection.name }}</span>
            <h2>{{ selectedSpecies.name }}</h2>
            <p>{{ selectedSpecies.description }}</p>
            <dl>
              <div><dt>累计培养</dt><dd>{{ selectedSpecies.growthMinutes }} 分钟</dd></div>
              <div><dt>完整盛放</dt><dd>{{ selectedSpecies.bloomCount }} 次</dd></div>
            </dl>
            <span v-if="selectedSpecies.unlocked" class="species-detail__status"><Check :size="14" />已解锁</span>
            <span v-else class="species-detail__status is-locked"><LockKeyhole :size="14" />累计 {{ selectedSpecies.unlockMinutes }} 分钟解锁</span>
            <button v-if="selectedSpecies.unlocked" class="species-playground__choose" type="button" :disabled="isCurrentSpecies(selectedSpecies.id)" @click="chooseSpecies(selectedSpecies.id)">
              <Sprout :size="15" />{{ speciesButtonLabel(selectedSpecies.id) }}
            </button>
            <div v-else class="achievement-progress"><i :style="{ width: `${speciesUnlockProgress(selectedSpecies)}%` }"></i></div>
          </aside>
        </section>

        <section class="species-replay card-surface">
          <header class="achievement-section-heading">
            <div><span>成长回放</span><h2>{{ selectedStage.name }}</h2><p>{{ stageDescriptions[selectedStage.id] }}</p></div>
            <div class="species-replay__actions">
              <button type="button" @click="toggleGrowthReplay">
                <Pause v-if="replayPlaying" :size="13" />
                <Play v-else :size="13" />
                {{ replayPlaying ? '暂停' : '播放成长' }}
              </button>
              <small>{{ selectedStageNumber + 1 }} / {{ gardenStages.length }}</small>
            </div>
          </header>
          <label class="species-replay__range">
            <span class="sr-only">查看 {{ selectedSpecies.name }} 的成长阶段</span>
            <input
              v-model.number="selectedStageIndex"
              type="range"
              min="0"
              :max="gardenStages.length - 1"
              step="0.01"
              :aria-valuetext="selectedStage.name"
              @pointerdown="beginReplayScrub"
              @pointerup="endReplayScrub"
              @pointercancel="endReplayScrub"
              @keydown="cancelGrowthReplay"
            />
          </label>
          <div class="species-replay__steps" role="tablist" aria-label="成长阶段">
            <button v-for="(stage, index) in gardenStages" :key="stage.id" type="button" role="tab" :aria-selected="selectedStageNumber === index" :class="{ active: selectedStageNumber === index, reached: selectedStageIndex >= index }" @click="selectReplayStage(index)">
              <i><Sprout v-if="index < 3" :size="13" /><Flower2 v-else :size="13" /></i>
              <span>{{ stage.name }}</span>
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
              :aria-label="species.unlocked ? `${species.name}，已解锁` : `${species.name}，累计 ${species.unlockMinutes} 分钟解锁`"
              :while-hover="{ y: -4 }"
              :while-press="{ scale: .97 }"
              @click="selectSpecies(species.id)"
            >
              <span v-if="!species.unlocked" class="species-collection__lock"><LockKeyhole :size="14" /></span>
              <span class="species-collection__plant">
                <FocusSpeciesPreview :species-id="species.id" alt="" />
              </span>
              <strong>{{ species.name }}</strong>
              <small>{{ species.growthMinutes }} 分钟 · {{ species.bloomCount }} 次</small>
              <small class="species-collection__unlock-note">{{ species.unlocked ? (species.unlockMinutes ? `已解锁 · 门槛 ${species.unlockMinutes} 分钟` : '入门花种 · 已解锁') : `还需 ${Math.max(0, species.unlockMinutes - store.focusGardenTotals.totalMinutes)} 分钟` }}</small>
              <i class="species-collection__progress"><b :style="{ width: `${speciesUnlockProgress(species)}%` }"></b></i>
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
              <span class="badges-overview__score">{{ achievementPoints }} / {{ maxAchievementPoints }} 成就点 · {{ achievementCompletion }}% 完成度</span>
              <p>每一枚徽章都对应花田里真实发生过的一次成长。</p>
            </div>
          </div>
          <div class="badges-overview__stats" aria-label="花田成长统计">
            <div><small>累计专注</small><strong>{{ durationHuman(store.focusGardenTotals.totalMinutes) }}</strong></div>
            <div><small>完整盛放</small><strong>{{ store.focusGardenTotals.bloomCount }} 朵</strong></div>
            <div><small>已培养花种</small><strong>{{ store.focusGardenTotals.speciesCount }} 种</strong></div>
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

        <section v-if="featuredAchievement" class="badges-featured card-surface" :class="{ unlocked: featuredAchievement.unlockedAt }">
          <div class="badges-featured__identity">
            <span class="badges-featured__seal"><component :is="achievementBadgeIcon(featuredAchievement)" :size="30" /><small v-if="badgeTier(featuredAchievement)">{{ badgeTier(featuredAchievement) }}</small></span>
            <div>
              <span class="badges-featured__eyebrow">{{ featuredAchievement.unlockedAt ? '最近获得' : '正在形成' }} · {{ featuredAchievementReward.label }}</span>
              <h2>{{ featuredAchievement.name }}</h2>
              <p>{{ featuredAchievement.description }}</p>
            </div>
          </div>
          <div class="badges-featured__progress">
            <div><small>{{ featuredAchievement.unlockedAt ? `获得于 ${formatShortDate(featuredAchievement.unlockedAt)}` : '当前完成度' }}</small><strong>{{ featuredAchievement.progress }} / {{ featuredAchievement.target }}</strong></div>
            <i><b :style="{ width: `${featuredAchievementProgress}%` }"></b></i>
            <span>{{ featuredAchievementReward.hint }}</span>
          </div>
        </section>

        <section class="badges-growth-panorama">
          <article class="badges-level card-surface">
            <header>
              <div><span>花田等级</span><h2>{{ currentGrowthRank.name }}</h2><p>{{ currentGrowthRank.description }}</p></div>
              <strong>Lv. {{ currentGrowthRankIndex + 1 }}</strong>
            </header>
            <div class="badges-level__progress"><i><b :style="{ width: `${growthRankProgress}%` }"></b></i><span>{{ durationHuman(store.focusGardenTotals.totalMinutes) }} · {{ nextGrowthRank ? `距离${nextGrowthRank.name}还差 ${nextGrowthRank.threshold - store.focusGardenTotals.totalMinutes} 分钟` : '已达到花田最高等级' }}</span></div>
            <div class="badges-level__steps" aria-label="花田成长等级">
              <span v-for="(rank, index) in growthRanks" :key="rank.id" :class="{ active: index <= currentGrowthRankIndex, current: index === currentGrowthRankIndex }"><i></i><small>{{ rank.shortName }}</small></span>
            </div>
          </article>

          <article class="badges-momentum card-surface">
            <header><span>花田节奏</span><Flame :size="18" /></header>
            <div class="badges-momentum__grid">
              <div><CalendarDays :size="15" /><small>有记录的日子</small><strong>{{ store.focusGardenTotals.activeDays }} 天</strong></div>
              <div><Flame :size="15" /><small>最长连续</small><strong>{{ store.focusGardenTotals.longestStreak }} 天</strong></div>
              <div><TimerReset :size="15" /><small>最长单次</small><strong>{{ durationHuman(store.focusGardenTotals.longestSessionMinutes) }}</strong></div>
              <div><Leaf :size="15" /><small>当前花种</small><strong>{{ todaySpeciesName }}</strong></div>
            </div>
          </article>
        </section>

        <section class="badges-category-index" aria-label="成就维度总览">
          <article v-for="group in achievementGroups" :key="`index-${group.id}`" class="badges-category-index__item" :class="`badges-category-index__item--${group.id}`">
            <div><span>{{ group.label }}</span><strong>{{ group.items.filter(item => item.unlockedAt).length }} / {{ group.items.length }}</strong></div>
            <small>{{ group.reward.label }}</small>
            <i><b :style="{ width: `${Math.round(group.items.filter(item => item.unlockedAt).length / group.items.length * 100)}%` }"></b></i>
          </article>
        </section>

        <section v-if="nextAchievement" class="badges-next card-surface">
          <div class="badges-next__label"><span>下一步</span><small>还差 {{ achievementRemaining(nextAchievement) }}</small></div>
          <div class="badges-next__copy"><h2>{{ nextAchievement.name }}</h2><p>{{ nextAchievement.description }}</p></div>
          <div class="badges-next__progress">
            <strong>{{ nextAchievement.progress }} / {{ nextAchievement.target }}</strong>
            <i><b :style="{ width: `${nextAchievementProgress}%` }"></b></i>
          </div>
        </section>
        <section v-else class="badges-next badges-next--complete card-surface">
          <div class="badges-next__label"><span>花田已盛放</span><small>全部徽章已获得</small></div>
          <div class="badges-next__copy"><h2>继续培养下一种花</h2><p>你的专注已经留下完整的成长记录，新的花种还在图鉴里等你发现。</p></div>
          <Flower2 :size="22" />
        </section>

        <section v-for="group in achievementGroups" :key="group.id" class="badges-group" :class="`badges-group--${group.id}`">
          <header><div><span>{{ group.label }}</span><h2>{{ group.description }}</h2><small class="badges-group__reward">{{ group.reward.label }} · {{ group.reward.hint }}</small></div><small><strong>{{ group.items.filter(item => item.unlockedAt).length }}</strong> / {{ group.items.length }} · {{ Math.round(group.items.filter(item => item.unlockedAt).length / group.items.length * 100) }}%</small></header>
          <div class="badges-grid">
            <article v-for="item in group.items" :key="item.id" class="badge-card card-surface" :class="[{ unlocked: item.unlockedAt }, `badge-card--${group.id}`]">
              <span class="badge-card__icon"><component :is="achievementBadgeIcon(item)" :size="25" /><small v-if="badgeTier(item)">{{ badgeTier(item) }}</small></span>
              <div><span class="badge-card__reward">{{ group.reward.label }}</span><h3>{{ item.name }}</h3><p>{{ item.description }}</p></div>
              <span v-if="item.unlockedAt" class="badge-card__date"><Check :size="13" />{{ formatShortDate(item.unlockedAt) }}</span>
              <div v-else class="badge-card__progress"><span>{{ item.progress }} / {{ item.target }}</span><i><b :style="{ width: `${Math.min(100, Math.round(item.progress / item.target * 100))}%` }"></b></i></div>
            </article>
          </div>
        </section>

        <details v-if="legacyRewards.length" class="legacy-rewards card-surface">
          <summary><span><Archive :size="17" />历史收获</span><small>旧版专注记录，只读保留</small></summary>
          <div><span v-for="reward in legacyRewards" :key="reward.id"><FocusRewardBadge :reward="reward.id" size="md" />{{ reward.name }} × {{ reward.count }}</span></div>
        </details>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, ref } from 'vue'
import { motion as Motion } from 'motion-v'
import { Archive, ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Flame, Flower2, Leaf, LockKeyhole, Pause, Play, Sparkles, Sprout, Timer, TimerReset, Trees, Trophy } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import {
  FOCUS_GARDEN_COLLECTIONS,
  FOCUS_GARDEN_ACHIEVEMENT_REWARDS,
  FOCUS_GARDEN_STAGES,
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
const activeTab = ref('field')
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth())
const selectedSpeciesId = ref(store.focusGarden.selectedSpeciesId)
const selectedStageIndex = ref(5)
const reactionBurst = ref(0)
const artworkStageFailed = ref(false)
const replayScrubbing = ref(false)
const replayPlaying = ref(false)
let replayAnimationFrame = 0
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
const monthCells = computed(() => monthGardenCells(selectedYear.value, selectedMonth.value, store.focusGarden.days))
const selectedMonthSummary = computed(() => {
  const entries = monthCells.value.map(cell => cell.entry).filter(Boolean)
  return {
    days: entries.filter(entry => entry.growthMinutes > 0).length,
    minutes: entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.growthMinutes) || 0), 0),
    blooms: entries.filter(entry => gardenStageFor(entry.growthMinutes, entry.goalMinutes).id === 'bloom').length,
    species: new Set(entries.filter(entry => entry.growthMinutes > 0).map(entry => entry.speciesId)).size
  }
})
const monthLeadingBlanks = computed(() => {
  const weekday = new Date(selectedYear.value, selectedMonth.value, 1).getDay()
  return (weekday + 6) % 7
})
const unlockedAchievements = computed(() => store.focusGardenAchievements.filter(item => item.unlockedAt))
const recentAchievements = computed(() => [...unlockedAchievements.value].sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)).slice(0, 3))
const achievementPoints = computed(() => unlockedAchievements.value.reduce((sum, item) => sum + (FOCUS_GARDEN_ACHIEVEMENT_REWARDS[item.kind]?.points || 1), 0))
const maxAchievementPoints = computed(() => store.focusGardenAchievements.reduce((sum, item) => sum + (FOCUS_GARDEN_ACHIEVEMENT_REWARDS[item.kind]?.points || 1), 0))
const achievementCompletion = computed(() => store.focusGardenAchievements.length ? Math.round(unlockedAchievements.value.length / store.focusGardenAchievements.length * 100) : 0)
const nextSpecies = computed(() => store.focusGardenSpecies.filter(item => !item.unlocked).sort((a, b) => a.unlockMinutes - b.unlockMinutes)[0] || null)
const nextSpeciesProgress = computed(() => nextSpecies.value ? Math.min(100, Math.round(store.focusGardenTotals.totalMinutes / nextSpecies.value.unlockMinutes * 100)) : 100)
const selectedSpecies = computed(() => store.focusGardenSpecies.find(item => item.id === selectedSpeciesId.value) || store.focusGardenSpecies[0])
const selectedStageNumber = computed(() => Math.max(0, Math.min(gardenStages.length - 1, Math.round(selectedStageIndex.value))))
const selectedStage = computed(() => gardenStages[selectedStageNumber.value] || gardenStages[0])
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
const growthRanks = [
  { id: 'seed', name: '播种者', shortName: '播种', threshold: 0, description: '第一分钟落进土壤，花田从今天开始。' },
  { id: 'sprout', name: '破土者', shortName: '破土', threshold: 60, description: '稳定的投入让第一株花真正破土。' },
  { id: 'leaves', name: '舒叶者', shortName: '舒叶', threshold: 180, description: '专注逐渐形成自己的节奏，叶片开始舒展。' },
  { id: 'bud', name: '守护者', shortName: '花苞', threshold: 600, description: '持续照料每一次投入，花苞正在聚拢。' },
  { id: 'opening', name: '初绽者', shortName: '初绽', threshold: 1800, description: '积累已经被看见，花田进入初绽阶段。' },
  { id: 'bloom', name: '盛放园丁', shortName: '盛放', threshold: 5400, description: '长久专注成为一座可以回望的完整花田。' }
]
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
const nextAchievement = computed(() => [...store.focusGardenAchievements]
  .filter(item => !item.unlockedAt)
  .sort((a, b) => {
    const remainingA = a.target ? Math.max(0, a.target - a.progress) / a.target : 1
    const remainingB = b.target ? Math.max(0, b.target - b.progress) / b.target : 1
    return remainingA - remainingB
  })[0] || null)
const nextAchievementProgress = computed(() => nextAchievement.value
  ? Math.min(100, Math.round(nextAchievement.value.progress / Math.max(1, nextAchievement.value.target) * 100))
  : 100)
const featuredAchievement = computed(() => recentAchievements.value[0] || nextAchievement.value || store.focusGardenAchievements[0] || null)
const featuredAchievementProgress = computed(() => featuredAchievement.value
  ? Math.min(100, Math.round(featuredAchievement.value.progress / Math.max(1, featuredAchievement.value.target) * 100))
  : 0)
const featuredAchievementReward = computed(() => featuredAchievement.value
  ? FOCUS_GARDEN_ACHIEVEMENT_REWARDS[featuredAchievement.value.kind]
  : { label: '成长徽记', hint: '每一次投入都会留下印记' })
const legacyRewards = computed(() => {
  const names = { blueberry: '蓝莓', strawberry: '草莓', tomato: '番茄', watermelon: '西瓜', pumpkin: '南瓜' }
  return Object.entries(names).map(([id, name]) => ({
    id,
    name,
    count: store.focusHistory.filter(item => item.reward === id).length
  })).filter(item => item.count)
})

function stageName(id) { return FOCUS_GARDEN_STAGES.find(item => item.id === id)?.name || '种子' }
function durationHuman(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0))
  if (value < 60) return `${value} 分钟`
  const hours = Math.floor(value / 60)
  return `${hours} 小时${value % 60 ? ` ${value % 60} 分钟` : ''}`
}
function achievementRemaining(item) {
  const labels = { totalMinutes: '分钟', bloomCount: '朵花', speciesCount: '种花', longestSessionMinutes: '分钟', activeDays: '天', longestStreak: '天' }
  return `${Math.max(0, item.target - item.progress)} ${labels[item.metric] || '点进度'}`
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
// 年格 drill down：点月份后切换 + 滚到月格
function goToMonth(monthIndex) {
  selectedMonth.value = monthIndex
  nextTick(() => {
    document.querySelector('.achievement-month')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
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

onBeforeUnmount(cancelGrowthReplay)
</script>

<style scoped>
.achievement-workspace {
  width: 100%;
  min-height: 0;
  padding: 24px;
  overflow: auto;
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
.achievement-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; border: 1px solid var(--divider-soft); border-radius: 14px; background: var(--surface); }
.achievement-tabs button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 38px; border: 0; border-radius: 10px; color: var(--text-muted); font: inherit; font-size: 13px; cursor: pointer; transition: color .15s ease, background-color .15s ease, transform .15s ease; }
.achievement-tabs button:hover { color: var(--accent-strong); background: color-mix(in srgb, var(--accent-soft) 70%, transparent); }
.achievement-tabs button:not(.active):hover { transform: translateY(-1px); }
.achievement-tabs button.active { color: var(--accent-strong); background: var(--accent-soft); font-weight: 700; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 16%, transparent); }
.card-surface { border: 1px solid var(--divider-soft); border-radius: 18px; background: var(--surface); box-shadow: 0 10px 28px rgba(36, 85, 73, .045); }
.achievement-field { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(230px, .75fr); gap: 14px; align-items: start; }
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
  min-height: 144px;
  padding: 22px 4px 6px;
  overflow: hidden;
  border: 1px solid var(--divider-soft);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: default;
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
.achievement-month__terrarium { display: block; }
.achievement-month__blank { min-height: 144px; }
/* 当日高亮：底色变浅绿，边框变绿，罩子也会变绿（在 terrarium--highlight 里） */
.achievement-month__grid button.active {
  background: color-mix(in srgb, #c5dda6 35%, var(--surface));
  box-shadow: 0 0 0 2px color-mix(in srgb, #6f9a5a 65%, transparent), 0 6px 14px rgba(36, 85, 73, .1);
}
.achievement-month__grid button.active .achievement-month__day { color: #4f7842; font-weight: 700; }
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
.achievement-species { display: grid; gap: 16px; }
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
.species-playground__info { display: grid; align-content: center; gap: 12px; padding: 28px; background: color-mix(in srgb, var(--surface) 92%, var(--species-scene)); }
.species-playground__collection { display: inline-flex; align-items: center; gap: 6px; width: fit-content; padding: 6px 9px; border-radius: 999px; background: color-mix(in srgb, var(--species-scene) 65%, var(--surface)); color: var(--accent-strong); font-size: 10px; font-weight: 750; }
.species-playground__info h2 { margin: 0; color: var(--text); font-size: 28px; letter-spacing: -.04em; }.species-playground__info > p { min-height: 42px; margin: -5px 0 0; color: var(--text-muted); font-size: 12px; line-height: 1.65; }
.species-playground__info dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 2px 0; }.species-playground__info dl div { display: grid; gap: 4px; padding: 10px; border: 1px solid color-mix(in srgb, var(--species-accent) 13%, var(--divider-soft)); border-radius: 12px; background: rgba(255,255,255,.68); }.species-playground__info dt { color: var(--text-muted); font-size: 9px; }.species-playground__info dd { margin: 0; color: var(--text); font-size: 12px; font-weight: 750; }
.species-detail__status { display: inline-flex; align-items: center; gap: 5px; width: fit-content; padding: 6px 9px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); font-size: 10px; font-weight: 700; }.species-detail__status.is-locked { background: var(--surface-muted); color: var(--text-muted); }
.species-playground__choose { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 39px; border-radius: 11px; background: linear-gradient(135deg, var(--accent), var(--accent-strong)); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 25%, transparent); }.species-playground__choose:disabled { background: var(--surface-muted); color: var(--text-muted); box-shadow: none; cursor: default; }
.species-replay { padding: 18px 20px 20px; }.species-replay__actions { display: flex; align-items: center; gap: 12px; }.species-replay__actions button { display: inline-flex; align-items: center; gap: 5px; padding: 6px 9px; border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--divider-soft)); border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); font-size: 10px; font-weight: 700; cursor: pointer; }.species-replay__actions small { color: var(--accent-strong); font-size: 11px; font-weight: 750; }.species-replay__range { display: block; margin: 17px 13px 4px; }.species-replay__range input { width: 100%; accent-color: var(--accent); cursor: grab; }.species-replay__range input:active { cursor: grabbing; }
.species-replay__steps { position: relative; display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }.species-replay__steps::before { position: absolute; top: 15px; right: 7%; left: 7%; height: 2px; background: var(--divider-soft); content: ''; }.species-replay__steps button { position: relative; z-index: 1; display: grid; justify-items: center; gap: 5px; padding: 3px; color: var(--text-muted); font-size: 10px; cursor: pointer; }.species-replay__steps button i { display: grid; width: 30px; height: 30px; place-items: center; border: 2px solid var(--surface); border-radius: 50%; background: var(--surface-muted); box-shadow: 0 0 0 1px var(--divider-soft); }.species-replay__steps button.reached i { background: var(--accent-soft); color: var(--accent-strong); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent); }.species-replay__steps button.active { color: var(--accent-strong); font-weight: 750; }.species-replay__steps button.active i { color: #fff; background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); transform: scale(1.06); }
.species-collection { padding: 18px 18px 14px; overflow: hidden; background: linear-gradient(180deg, var(--surface), color-mix(in srgb, var(--collection-scene) 54%, var(--surface))); }.species-collection > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }.species-collection > header span { color: var(--accent-strong); font-size: 11px; font-weight: 800; letter-spacing: .06em; }.species-collection > header h2 { margin: 4px 0 0; color: var(--text-muted); font-size: 11px; font-weight: 500; }.species-collection > header small { padding: 5px 8px; border-radius: 999px; background: rgba(255,255,255,.7); color: var(--text-muted); font-size: 9px; }
.species-collection__garden { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 12px; padding: 13px 12px 8px; border-radius: 17px; background: linear-gradient(180deg, rgba(255,255,255,.48), color-mix(in srgb, var(--collection-scene) 78%, #cadfc8)); }
.species-collection__garden > button { position: relative; display: grid; grid-template-rows: 116px auto auto 3px; justify-items: center; align-items: end; min-width: 0; min-height: 178px; padding: 5px 8px 10px; border: 1px solid transparent; border-radius: 15px; color: var(--text); cursor: pointer; transform: translateY(calc(var(--plant-level) * 7px)); }.species-collection__garden > button:hover,.species-collection__garden > button:focus-visible { border-color: color-mix(in srgb, var(--plant-accent) 35%, transparent); background: color-mix(in srgb, var(--plant-scene) 48%, rgba(255,255,255,.62)); outline: none; }.species-collection__garden > button.selected { border-color: var(--plant-accent); background: color-mix(in srgb, var(--plant-scene) 56%, rgba(255,255,255,.82)); box-shadow: 0 8px 22px color-mix(in srgb, var(--plant-accent) 17%, transparent); }.species-collection__garden > button.locked { color: var(--text-muted); }
.species-collection__plant { position: relative; display: grid; width: 100%; height: 116px; place-items: end center; overflow: hidden; border: 1px solid rgba(255,255,255,.72); border-radius: 13px; background: rgba(255,255,255,.4); box-shadow: 0 7px 15px rgba(54,83,74,.07); }.species-collection__garden .focus-plant { width: 104px; margin-bottom: -2px; }.species-collection__plant :deep(.focus-species-preview) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }.species-collection__garden > button.locked :deep(.focus-species-preview) { filter: grayscale(.82) saturate(.28); opacity: .62; }.species-collection__garden strong { align-self: center; font-size: 12px; }.species-collection__garden small { align-self: start; overflow: hidden; max-width: 100%; margin-top: 2px; color: var(--text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.species-collection__lock { position: absolute; z-index: 2; top: 9px; right: 9px; display: grid; width: 24px; height: 24px; place-items: center; border-radius: 50%; background: rgba(255,255,255,.72); color: var(--text-muted); }.species-collection__progress { align-self: end; width: 100%; height: 3px; margin-top: 8px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.62); }.species-collection__progress b { display: block; height: 100%; border-radius: inherit; background: var(--plant-accent); }
.species-collection__garden small.species-collection__unlock-note { color: color-mix(in srgb, var(--plant-accent) 78%, var(--text)); }
.achievement-badges { display: grid; gap: 18px; }.badges-overview { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px; }.badges-overview > div { display: flex; align-items: center; gap: 11px; }.badges-overview > div > span { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 14px; background: var(--accent-soft); color: var(--accent-strong); }.badges-overview p { margin: 0; color: var(--text-muted); font-size: 11px; }.badges-overview h2 { margin: 2px 0 0; color: var(--text); font-size: 18px; }.badges-overview > p { max-width: 420px; line-height: 1.6; }
.badges-group > header { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-bottom: 9px; }.badges-group header span { color: var(--accent-strong); font-size: 10px; font-weight: 750; }.badges-group header h2 { margin: 2px 0 0; color: var(--text); font-size: 15px; }.badges-group header small { color: var(--text-muted); font-size: 10px; }.badges-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }.badge-card { display: grid; grid-template-columns: 46px 1fr; gap: 10px; padding: 14px; opacity: .66; }.badge-card.unlocked { opacity: 1; }.badge-card__icon { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 50%; background: var(--surface-muted); color: var(--text-muted); }.badge-card.unlocked .badge-card__icon { background: linear-gradient(145deg, #fff5cf, #e8f5e9); color: #8b7429; box-shadow: inset 0 0 0 1px rgba(194,159,61,.22); }.badge-card h3 { margin: 3px 0; color: var(--text); font-size: 13px; }.badge-card p { margin: 0; color: var(--text-muted); font-size: 10px; line-height: 1.45; }.badge-card__date { grid-column: 1 / -1; display: inline-flex; align-items: center; gap: 4px; color: var(--accent-strong); font-size: 9px; }.badge-card__progress { grid-column: 1 / -1; display: grid; gap: 4px; }.badge-card__progress > span { color: var(--text-muted); font-size: 9px; text-align: right; }.badge-card__progress i { height: 5px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badge-card__progress b { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
.legacy-rewards { padding: 14px 16px; }.legacy-rewards summary { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }.legacy-rewards summary span { display: inline-flex; align-items: center; gap: 6px; color: var(--text); font-size: 12px; font-weight: 650; }.legacy-rewards summary small { color: var(--text-muted); font-size: 9px; }.legacy-rewards > div { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 14px; }.legacy-rewards > div > span { display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px; border-radius: 10px; background: var(--surface-muted); color: var(--text); font-size: 11px; }
.badges-overview { display: grid; grid-template-columns: minmax(230px, 1.15fr) minmax(220px, .9fr) minmax(210px, .85fr); align-items: center; gap: 18px; padding: 20px; border-color: color-mix(in srgb, var(--accent) 15%, var(--divider-soft)); background: linear-gradient(120deg, color-mix(in srgb, var(--accent-soft) 50%, var(--surface)), var(--surface) 48%, color-mix(in srgb, #e8f0d9 26%, var(--surface))); }
.badges-overview__main { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }.badges-overview__mark { display: grid; flex: 0 0 auto; width: 46px; height: 46px; place-items: center; border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent); border-radius: 15px; background: var(--accent-soft); color: var(--accent-strong); }.badges-overview__main h2 { margin: 2px 0 3px; color: var(--text); font-size: 21px; letter-spacing: -.04em; }.badges-overview__main p { margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.55; }.badges-overview__main .badges-overview__eyebrow { color: var(--accent-strong); font-size: 10px; font-weight: 800; letter-spacing: .05em; }.badges-overview__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }.badges-overview__stats div { display: grid; gap: 5px; min-width: 0; padding: 9px 8px; border: 1px solid var(--divider-soft); border-radius: 11px; background: rgba(255,255,255,.52); }.badges-overview__stats small { color: var(--text-muted); font-size: 9px; white-space: nowrap; }.badges-overview__stats strong { overflow: hidden; color: var(--text); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.badges-overview__today { display: flex; align-items: center; gap: 9px; min-width: 0; padding: 8px 10px; border: 1px solid color-mix(in srgb, #9bbf85 25%, var(--divider-soft)); border-radius: 13px; background: color-mix(in srgb, #f2f7e9 64%, var(--surface)); }.badges-overview__today :deep(.focus-species-preview) { width: 66px; height: 66px; flex: 0 0 auto; object-fit: contain; }.badges-overview__today > div { display: grid; min-width: 0; gap: 3px; }.badges-overview__today small { color: var(--text-muted); font-size: 9px; }.badges-overview__today strong { overflow: hidden; color: var(--text); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }.badges-overview__today span { overflow: hidden; color: var(--text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.badges-overview__today i { display: block; width: 100%; height: 4px; overflow: hidden; border-radius: 99px; background: color-mix(in srgb, #a8c18e 22%, var(--surface-muted)); }.badges-overview__today i b { display: block; height: 100%; border-radius: inherit; background: #8fac70; }
.badges-next { display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(150px, .45fr); align-items: center; gap: 16px; padding: 15px 18px; border-color: color-mix(in srgb, var(--accent) 18%, var(--divider-soft)); background: var(--surface); }.badges-next__label { display: grid; gap: 5px; min-width: 87px; }.badges-next__label span { color: var(--accent-strong); font-size: 10px; font-weight: 800; }.badges-next__label small { color: var(--text-muted); font-size: 9px; white-space: nowrap; }.badges-next__copy { min-width: 0; }.badges-next__copy h2 { margin: 0 0 3px; color: var(--text); font-size: 15px; }.badges-next__copy p { overflow: hidden; margin: 0; color: var(--text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.badges-next__progress { display: grid; gap: 5px; }.badges-next__progress strong { color: var(--text); font-size: 11px; text-align: right; }.badges-next__progress i { height: 6px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badges-next__progress b { display: block; height: 100%; border-radius: inherit; background: var(--accent); }.badges-next--complete { grid-template-columns: auto minmax(0, 1fr) auto; }.badges-next--complete > svg { color: #8fac70; }
.badges-group > header { align-items: center; }.badges-group header small { display: inline-flex; align-items: baseline; gap: 2px; padding: 4px 8px; border: 1px solid var(--divider-soft); border-radius: 999px; background: var(--surface); }.badges-group header small strong { color: var(--text); font-size: 11px; }.badge-card { position: relative; min-height: 137px; border-color: var(--divider-soft); background: color-mix(in srgb, var(--surface-muted) 22%, var(--surface)); transition: border-color .2s ease, background .2s ease, transform .2s ease; }.badge-card:hover { border-color: color-mix(in srgb, var(--accent) 28%, var(--divider-soft)); background: var(--surface); transform: translateY(-2px); }.badge-card.unlocked { border-color: color-mix(in srgb, #9daf70 28%, var(--divider-soft)); background: color-mix(in srgb, #f3f7e7 48%, var(--surface)); }.badge-card__icon { border: 1px solid var(--divider-soft); }.badge-card.unlocked .badge-card__icon { background: color-mix(in srgb, #f5d66e 24%, var(--accent-soft)); color: #8b7429; box-shadow: inset 0 0 0 1px rgba(194,159,61,.18); }.badge-card h3 { letter-spacing: -.01em; }.badge-card__date { font-weight: 650; }.badge-card__progress i { background: color-mix(in srgb, var(--accent) 8%, var(--surface-muted)); }.badge-card__progress b { background: color-mix(in srgb, var(--accent) 82%, #8fac70); }
.badges-growth-panorama { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(260px, .8fr); gap: 12px; }.badges-level,.badges-momentum { min-width: 0; padding: 16px 18px; }.badges-level { display: grid; gap: 13px; background: color-mix(in srgb, #f7f3d9 22%, var(--surface)); }.badges-level > header,.badges-momentum > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }.badges-level > header span,.badges-momentum > header span { color: var(--accent-strong); font-size: 10px; font-weight: 800; letter-spacing: .04em; }.badges-level h2 { margin: 3px 0 2px; color: var(--text); font-size: 18px; }.badges-level p { margin: 0; color: var(--text-muted); font-size: 10px; line-height: 1.5; }.badges-level > header > strong { padding: 5px 8px; border-radius: 9px; background: var(--accent-soft); color: var(--accent-strong); font-size: 12px; white-space: nowrap; }.badges-level__progress { display: grid; gap: 6px; }.badges-level__progress i { display: block; height: 7px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badges-level__progress b { display: block; height: 100%; border-radius: inherit; background: color-mix(in srgb, #9eae72 82%, var(--accent)); }.badges-level__progress span { color: var(--text-muted); font-size: 9px; }.badges-level__steps { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }.badges-level__steps span { display: grid; justify-items: center; gap: 5px; min-width: 0; color: var(--text-muted); }.badges-level__steps i { display: block; width: 9px; height: 9px; border: 2px solid var(--divider-soft); border-radius: 50%; background: var(--surface); }.badges-level__steps span.active i { border-color: #9eae72; background: #9eae72; }.badges-level__steps span.current i { box-shadow: 0 0 0 4px color-mix(in srgb, #9eae72 22%, transparent); }.badges-level__steps small { overflow: hidden; max-width: 100%; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.badges-level__steps span.active small { color: var(--text); font-weight: 650; }.badges-momentum { display: grid; gap: 12px; }.badges-momentum > header svg { color: #9eae72; }.badges-momentum__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }.badges-momentum__grid div { display: grid; grid-template-columns: 17px 1fr; gap: 2px 5px; padding: 9px; border: 1px solid var(--divider-soft); border-radius: 11px; background: color-mix(in srgb, var(--surface-muted) 32%, var(--surface)); }.badges-momentum__grid svg { grid-row: span 2; align-self: center; color: var(--accent-strong); }.badges-momentum__grid small { color: var(--text-muted); font-size: 9px; }.badges-momentum__grid strong { overflow: hidden; color: var(--text); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.badges-overview__score { display: inline-flex; width: fit-content; margin: 1px 0 4px; padding: 4px 7px; border-radius: 7px; background: color-mix(in srgb, #d6b55b 15%, var(--surface)); color: #92752a; font-size: 9px; font-weight: 750; letter-spacing: .02em; }.badges-group__reward { display: block !important; width: fit-content; margin-top: 5px; padding: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; color: var(--text-muted) !important; font-size: 9px !important; font-weight: 500 !important; }.badge-card { --badge-accent: var(--accent); }.badge-card--start { --badge-accent: #bd9841; }.badge-card--streak { --badge-accent: #6f9d75; }.badge-card--accumulate { --badge-accent: #c47f45; }.badge-card--deep { --badge-accent: #7081b6; }.badge-card--variety { --badge-accent: #a477ae; }.badge-card__icon { position: relative; border-color: color-mix(in srgb, var(--badge-accent) 20%, var(--divider-soft)); color: color-mix(in srgb, var(--badge-accent) 78%, var(--text-muted)); }.badge-card__icon small { position: absolute; right: -4px; bottom: -3px; display: grid; width: 17px; height: 17px; place-items: center; border: 2px solid var(--surface); border-radius: 50%; background: color-mix(in srgb, var(--badge-accent) 82%, var(--text)); color: #fff; font-size: 7px; font-weight: 800; line-height: 1; }.badge-card.unlocked .badge-card__icon { background: color-mix(in srgb, var(--badge-accent) 18%, var(--surface)); color: var(--badge-accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--badge-accent) 24%, transparent), 0 5px 14px color-mix(in srgb, var(--badge-accent) 14%, transparent); }.badge-card__reward { display: block; margin-bottom: 2px; color: var(--badge-accent); font-size: 9px; font-weight: 750; letter-spacing: .03em; }.badge-card.unlocked .badge-card__reward { color: color-mix(in srgb, var(--badge-accent) 84%, var(--text)); }.badge-card.unlocked { border-color: color-mix(in srgb, var(--badge-accent) 28%, var(--divider-soft)); background: color-mix(in srgb, var(--badge-accent) 5%, var(--surface)); }
.badges-category-index { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }.badges-category-index__item { --category-accent: var(--accent); display: grid; gap: 6px; padding: 10px 11px; border: 1px solid var(--divider-soft); border-radius: 12px; background: var(--surface); }.badges-category-index__item--start { --category-accent: #bd9841; }.badges-category-index__item--streak { --category-accent: #6f9d75; }.badges-category-index__item--accumulate { --category-accent: #c47f45; }.badges-category-index__item--deep { --category-accent: #7081b6; }.badges-category-index__item--variety { --category-accent: #a477ae; }.badges-category-index__item > div { display: flex; align-items: center; justify-content: space-between; gap: 5px; }.badges-category-index__item span { color: var(--category-accent); font-size: 10px; font-weight: 800; }.badges-category-index__item strong { color: var(--text); font-size: 10px; }.badges-category-index__item small { overflow: hidden; color: var(--text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.badges-category-index__item > i { height: 4px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badges-category-index__item > i b { display: block; height: 100%; border-radius: inherit; background: var(--category-accent); }
.badges-featured { --featured-accent: #bd9841; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(220px, .75fr); align-items: center; gap: 22px; padding: 18px 22px; border-color: color-mix(in srgb, var(--featured-accent) 24%, var(--divider-soft)); background: radial-gradient(circle at 14% 50%, color-mix(in srgb, var(--featured-accent) 13%, transparent), transparent 32%), color-mix(in srgb, var(--featured-accent) 3%, var(--surface)); }.badges-featured.unlocked { --featured-accent: #8c9f61; }.badges-featured__identity { display: flex; align-items: center; gap: 14px; min-width: 0; }.badges-featured__seal { position: relative; display: grid; flex: 0 0 auto; width: 72px; height: 72px; place-items: center; border: 1px solid color-mix(in srgb, var(--featured-accent) 34%, var(--divider-soft)); border-radius: 22px; background: color-mix(in srgb, var(--featured-accent) 13%, var(--surface)); color: var(--featured-accent); box-shadow: inset 0 0 0 7px color-mix(in srgb, var(--featured-accent) 6%, transparent), 0 8px 18px color-mix(in srgb, var(--featured-accent) 13%, transparent); }.badges-featured__seal::before,.badges-featured__seal::after { position: absolute; width: 9px; height: 9px; border: 1px solid color-mix(in srgb, var(--featured-accent) 38%, transparent); border-radius: 50%; content: ''; }.badges-featured__seal::before { top: 9px; right: 12px; }.badges-featured__seal::after { bottom: 10px; left: 12px; }.badges-featured__seal small { position: absolute; right: -6px; bottom: -5px; display: grid; width: 20px; height: 20px; place-items: center; border: 2px solid var(--surface); border-radius: 50%; background: var(--featured-accent); color: #fff; font-size: 8px; font-weight: 800; }.badges-featured__identity > div { min-width: 0; }.badges-featured__eyebrow { display: block; overflow: hidden; color: var(--featured-accent); font-size: 10px; font-weight: 800; letter-spacing: .04em; text-overflow: ellipsis; white-space: nowrap; }.badges-featured h2 { margin: 4px 0 3px; color: var(--text); font-size: 19px; letter-spacing: -.03em; }.badges-featured p { margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.5; }.badges-featured__progress { display: grid; gap: 7px; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--featured-accent) 20%, var(--divider-soft)); border-radius: 13px; background: color-mix(in srgb, var(--featured-accent) 5%, var(--surface)); }.badges-featured__progress > div { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }.badges-featured__progress small { color: var(--text-muted); font-size: 9px; }.badges-featured__progress strong { color: var(--text); font-size: 12px; }.badges-featured__progress > i { height: 6px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }.badges-featured__progress > i b { display: block; height: 100%; border-radius: inherit; background: var(--featured-accent); }.badges-featured__progress > span { color: var(--text-muted); font-size: 9px; }
.badge-card::before { position: absolute; top: -1px; right: 16px; left: 16px; height: 3px; border-radius: 0 0 99px 99px; background: var(--badge-accent); opacity: .12; content: ''; }.badge-card.unlocked::before { opacity: .72; }.badge-card.unlocked:hover { transform: translateY(-3px); box-shadow: 0 12px 25px color-mix(in srgb, var(--badge-accent) 12%, transparent); }
@media (prefers-reduced-motion: reduce) { .species-playground__particle { animation: none; }.species-replay__steps button.active i { transform: none; } }
@media (max-width: 980px) { .achievement-field { grid-template-columns: 1fr; }.achievement-year__landscape { grid-template-columns: repeat(4, 1fr); }.badges-grid { grid-template-columns: repeat(2, 1fr); }.achievement-summary,.achievement-trail { display: grid; }.species-playground { grid-template-columns: 1fr; }.species-playground__info { grid-template-columns: 1fr 1fr; align-items: center; }.species-playground__info > p,.species-playground__info h2,.species-playground__collection { grid-column: 1 / -1; } }
@media (max-width: 620px) { .achievement-workspace { padding: 14px; }.achievement-header { align-items: flex-start; }.achievement-header__today { display: none; }.achievement-year__landscape { grid-template-columns: repeat(3, 1fr); }.badges-grid { grid-template-columns: 1fr; }.achievement-month__grid button,.achievement-month__blank { min-height: 56px; }.achievement-tabs button { font-size: 11px; }.badges-overview { align-items: flex-start; flex-direction: column; }.species-playground__scene { min-height: 300px; }.species-playground__plant { width: 204px; }.species-playground__plant.is-artwork { width: 204px; margin-bottom: 28px; }.species-playground__info { display: grid; grid-template-columns: 1fr; padding: 20px; }.species-playground__info > * { grid-column: auto; }.species-replay__steps span { font-size: 9px; }.species-collection__garden { grid-template-columns: repeat(2, 1fr); }.species-collection__garden > button { min-height: 156px; } }
@media (max-width: 980px) { .badges-overview { grid-template-columns: 1fr 1fr; }.badges-overview__today { grid-column: 1 / -1; }.badges-next { grid-template-columns: auto minmax(0, 1fr); }.badges-next__progress { grid-column: 1 / -1; } }
@media (max-width: 620px) { .badges-overview { display: grid; gap: 14px; }.badges-overview__stats { width: 100%; }.badges-overview__today { width: 100%; box-sizing: border-box; }.badges-next,.badges-next--complete { grid-template-columns: 1fr auto; gap: 11px; }.badges-next__copy { grid-column: 1 / -1; grid-row: 2; }.badges-next__progress { grid-column: 1 / -1; grid-row: 3; }.badges-next--complete .badges-next__copy { grid-column: 1 / -1; }.badges-next--complete > svg { grid-column: 2; grid-row: 1; } }
@media (max-width: 760px) { .badges-growth-panorama { grid-template-columns: 1fr; } }
@media (max-width: 420px) { .badges-level,.badges-momentum { padding: 14px; }.badges-level__steps small { font-size: 8px; }.badges-momentum__grid div { padding: 8px 7px; } }
@media (max-width: 980px) { .field-hero { grid-template-columns: minmax(0, 1.2fr) minmax(180px, .8fr); }.field-hero__progress { grid-column: 1 / -1; } .badges-category-index { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 620px) { .field-hero { grid-template-columns: 1fr; gap: 13px; padding: 18px; }.field-hero__copy h2 { font-size: 21px; }.field-hero__plant { order: -1; }.field-hero__facts { margin-top: 12px; }.field-hero__progress { grid-column: auto; }.achievement-month__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }.badges-category-index { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
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
.species-replay__actions button,
.species-replay__steps button,
.species-collection__garden > button,
.focus-plant,
.field-hero__plant > div {
  outline: none;
  &:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
}
</style>
