<template>
  <main v-if="store.settings.clockView === 'focus'" class="clock-workspace clock-home">
    <div class="clock-home__body">
      <section class="clock-stage" :class="{ 'clock-stage--break': activeSession?.phase !== 'focus' && activeSession }" aria-live="polite">
          <div class="clock-stage__atmosphere" aria-hidden="true">
            <i></i><i></i><i></i><i></i>
          </div>
          <header class="clock-stage__intro">
            <span><Sparkles :size="13" /> 今日专注</span>
            <h1>{{ headline }}</h1>
            <p>{{ selectedTask ? `为「${selectedTask.title}」留出一段完整时间` : '把注意力放回当下，先完成眼前这一小步' }}</p>
          </header>
          <div class="clock-stage__dial" :title="activeSession ? sessionTimeRange : ''">
            <button
              v-if="activeSession"
              class="clock-stage__desktop-controller"
              type="button"
              aria-label="打开桌面专注控制器"
              title="打开桌面专注控制器"
              @click="openDesktopController"
            >
              <PictureInPicture2 :size="18" />
            </button>
            <svg class="clock-stage__ring" viewBox="0 0 220 220" aria-hidden="true">
              <g transform="rotate(-90 110 110)"><circle class="clock-stage__ring-track" cx="110" cy="110" r="101" /><circle class="clock-stage__ring-progress" cx="110" cy="110" r="101" :style="timerRingStyle" /></g>
            </svg>
            <div class="clock-stage__content">
              <span class="clock-stage__status"><i v-if="activeSession?.status === 'running'"></i>{{ stageLabel }}</span>
              <div class="clock-stage__time-row">
                <div ref="freeDurationEditor" class="clock-free-time-wrap">
                  <button v-if="canSetFreeDuration" class="clock-free-time" type="button" :aria-expanded="freeDurationEditing" title="点击设定本次自由专注时长" @click="toggleFreeDurationEditor">{{ formattedTime }}</button><strong v-else>{{ formattedTime }}</strong>
                </div>
              </div>
              <p>{{ stageDetail }}</p>
            </div>
          </div>

          <section v-if="isPomodoroCycle" class="clock-stage__cycle-context" aria-label="番茄节奏进度">
            <span>第 {{ currentPomodoroRound }} / {{ focusSettings.focusesBeforeLongBreak }} 轮</span>
            <strong>本轮后{{ nextBreakLabel }}</strong>
          </section>

          <section v-if="activeSession?.phase !== 'focus' && (activeSession || pendingBreak)" class="clock-stage__break-context" aria-label="休息安排">
            <span>{{ activeSession ? '本次休息结束后' : '下一步安排' }}</span>
            <strong>{{ nextFocusTaskTitle === '不关联任务' ? '回到下一轮专注' : `继续「${nextFocusTaskTitle}」` }}</strong>
            <small>{{ activeSession ? `还剩 ${formattedTime}，先离开屏幕一会儿。` : `先休息 ${durationText(pendingBreak.durationSeconds)}，恢复后再继续。` }}</small>
          </section>

          <Teleport to=".app">
            <div v-if="freeDurationEditing" class="clock-free-time__overlay" @click.self="freeDurationEditing = false">
              <div class="clock-free-time__editor" :style="freeDurationEditorStyle" role="dialog" aria-label="设定本次倒计时" @click.stop>
                <p>设定本次倒计时</p>
                <div class="clock-free-time__presets"><button v-for="minutes in [15, 25, 45, 60]" :key="minutes" type="button" @click="setFreeDuration(minutes)">{{ minutes }} 分钟</button></div>
                <label>自定义 <input v-model.number="freeDurationMinutes" type="number" min="1" max="480" /> 分钟</label>
                <div><button class="clock-free-time__confirm" type="button" @click="confirmFreeDuration">使用此时长</button><button type="button" @click="freeDurationEditing = false">取消</button></div>
              </div>
            </div>
          </Teleport>

          <Teleport to="body">
            <Transition name="clock-end-confirm">
              <div v-if="endConfirmOpen" class="clock-end-confirm" role="dialog" aria-modal="true" aria-labelledby="clock-end-confirm-title" @keydown.esc.stop="endConfirmOpen = false">
                <button class="clock-end-confirm__scrim" type="button" aria-label="取消提前结束" @click="endConfirmOpen = false" />
                <section class="clock-end-confirm__card">
                  <button class="clock-end-confirm__close" type="button" aria-label="关闭" @click="endConfirmOpen = false"><X :size="17" /></button>
                  <span class="clock-end-confirm__icon"><Pause :size="20" /></span>
                  <p>提前结束</p>
                  <h2 id="clock-end-confirm-title">要结束这一轮专注吗？</h2>
                  <span>本轮会记录为未完成；已投入的整分钟仍会计入今日花成长。</span>
                  <div class="clock-end-confirm__actions"><button type="button" @click="endConfirmOpen = false">继续专注</button><button type="button" @click="confirmEndFocus">确认结束</button></div>
                </section>
              </div>
            </Transition>
          </Teleport>

          <section class="clock-stage__garden-companion" aria-label="今日花成长">
            <div
              ref="gardenPreviewAnchor"
              class="clock-stage__garden-art"
              role="img"
              tabindex="0"
              :aria-label="`今日花「${gardenSpeciesName}」${gardenStageName}阶段缩略图；悬停或聚焦可查看大图`"
              @mouseenter="showGardenPreview"
              @mouseleave="hideGardenPreview"
              @focusin="showGardenPreview"
              @focusout="hideGardenPreview"
            >
              <FocusStageArtwork :species-id="gardenToday.speciesId" :stage="gardenToday.stage" motion="static" />
            </div>
            <div class="clock-stage__garden-copy">
              <div class="clock-stage__garden-heading">
                <span><Leaf :size="12" /> 今日花 · {{ gardenSpeciesName }}</span>
                <strong>{{ gardenStageName }}</strong>
              </div>
              <p><b>{{ gardenToday.growthMinutes }} / {{ gardenToday.goalMinutes }}</b> 分钟 · {{ gardenNextStageHint }}</p>
              <div class="clock-stage__garden-progress" role="progressbar" :aria-valuenow="gardenProgress" aria-valuemin="0" aria-valuemax="100" aria-label="今日花成长进度">
                <i :style="{ width: `${gardenProgress}%` }" />
              </div>
              <div class="clock-stage__garden-stages" aria-label="成长阶段">
                <i
                  v-for="(stage, index) in FOCUS_GARDEN_STAGES"
                  :key="stage.id"
                  :class="{ reached: index <= gardenStageIndex, current: index === gardenStageIndex }"
                  :title="`${stage.name} · 累计 ${gardenStageMilestones[index].minutes} 分钟`"
                />
              </div>
            </div>
          </section>

          <Teleport to=".app">
            <section v-if="gardenPreviewOpen" class="app-popover-surface clock-garden-preview" :style="gardenPreviewStyle" role="tooltip" aria-hidden="true">
              <span>{{ gardenSpeciesName }} · {{ gardenStageName }}</span>
              <FocusStageArtwork :species-id="gardenToday.speciesId" :stage="gardenToday.stage" motion="static" />
            </section>
          </Teleport>

          <div v-if="activeSession" class="clock-stage__actions">
            <button v-if="activeSession.status === 'running'" class="clock-button clock-button--primary" type="button" @click="store.pauseFocus"><Pause :size="18" fill="currentColor" />暂停专注</button>
            <button v-else class="clock-button clock-button--primary" type="button" @click="store.resumeFocus"><Play :size="18" fill="currentColor" />继续</button>
            <button class="clock-button clock-button--secondary clock-button--complete" type="button" @click="finish('completed')"><Check :size="18" />{{ activeSession.phase === 'focus' ? '完成本轮' : '完成休息' }}</button>
            <span v-if="canAdjustTime" class="clock-stage__adjustments"><button class="clock-button clock-button--adjust" type="button" @click.stop="adjustTime(-5)"><Minus :size="15" />5 分</button><button class="clock-button clock-button--adjust" type="button" @click.stop="adjustTime(5)"><Plus :size="15" />5 分</button></span>
            <button v-if="activeSession.phase === 'focus'" class="clock-button clock-button--end" type="button" @click="requestEndFocus">提前结束</button>
          </div>
          <div v-else-if="pendingBreak" class="clock-stage__actions">
            <button class="clock-button clock-button--primary" type="button" @click="store.startPendingBreak"><Coffee :size="18" />开始{{ pendingBreak.phase === 'long-break' ? '长休息' : '短休息' }}</button>
            <button class="clock-button clock-button--quiet" type="button" title="跳过本次休息，继续当前任务的下一轮专注" @click="skipPendingBreak">跳过休息，继续当前任务</button>
          </div>
        <button v-else class="clock-button clock-button--primary clock-button--start" type="button" @click="start"><Play :size="20" fill="currentColor" />开始专注</button>
      </section>

      <aside class="clock-side" aria-label="本次专注设置">
        <section class="clock-side-card clock-side-card--plan">
          <header><span class="clock-side-card__icon"><Target :size="19" /></span><span class="clock-side-card__heading"><h2>本次计划</h2><small>选好节奏和要推进的事，再开始</small></span></header>
          <template v-if="!activeSession && !pendingBreak">
            <div class="clock-plan-section">
              <span class="clock-plan-section__label">专注方式</span>
              <div class="clock-mode-picker">
                <button v-for="profile in primaryFocusProfiles" :key="profile.id" type="button" :class="{ active: selectedProfileId === profile.id }" @click="selectedProfileId = profile.id">
                  <component :is="profile.id === 'pomodoro' ? Timer : profile.id === 'deep-work' ? Focus : Clock3" :size="24" /><strong>{{ profile.name }}</strong><small>{{ profile.id === 'free-focus' ? '不设上限' : durationText(profile.durationSeconds) }}</small>
                </button>
              </div>
            </div>
            <div ref="taskPicker" class="clock-task-picker clock-plan-section">
              <span class="clock-plan-section__label">关联任务 <small>可跳过</small></span>
              <button class="clock-task-picker__trigger" type="button" :aria-expanded="taskPickerOpen" @click="toggleTaskPicker">
                <span class="clock-task-picker__trigger-icon" :class="{ 'is-empty': !selectedTask }">
                  <ListTodo v-if="!selectedTask" :size="20" />
                  <span v-else class="clock-task-picker__list-dot clock-task-picker__list-dot--lg" :style="{ background: listColorOf(selectedTask.listId) }" />
                </span>
                <span class="clock-task-picker__trigger-body">
                  <strong>{{ selectedTaskTitle }}</strong>
                  <span v-if="selectedTask" class="clock-task-picker__trigger-sub">
                    <span class="clock-task-picker__list-dot" :style="{ background: listColorOf(selectedTask.listId) }" />
                    {{ listNameOf(selectedTask.listId) }}
                  </span>
                  <span v-else class="clock-task-picker__trigger-sub clock-task-picker__trigger-sub--muted">不选择任务，直接开始专注</span>
                </span>
                <ChevronRight :size="16" class="clock-task-picker__trigger-chevron" />
              </button>
              <Transition name="clock-task-picker">
                <div v-if="taskPickerOpen" class="clock-quick-task-picker" role="dialog" aria-label="选择要专注的任务">
                  <label class="clock-quick-task-picker__search">
                    <Search :size="15" /><span class="sr-only">搜索任务</span>
                    <input ref="taskSearchInput" v-model="taskSearchQuery" type="text" placeholder="搜索任务或清单" />
                    <button v-if="taskSearchQuery" type="button" aria-label="清空搜索" @click="taskSearchQuery = ''"><X :size="14" /></button>
                  </label>
                  <div class="clock-quick-task-picker__list" role="listbox" aria-label="任务列表">
                    <button v-if="!taskSearchQuery.trim()" type="button" :class="['clock-quick-task-picker__item', 'clock-quick-task-picker__item--none', { active: !selectedTaskId }]" role="option" :aria-selected="!selectedTaskId" @click="chooseTask(null)">
                      <ListTodo :size="15" /><span><strong>不关联任务</strong><small>直接开始专注</small></span><Check v-if="!selectedTaskId" :size="16" />
                    </button>
                    <template v-if="!taskSearchQuery.trim()">
                      <p v-if="recentTasks.length" class="clock-quick-task-picker__label">最近使用</p>
                      <button v-for="task in recentTasks" :key="task.id" type="button" :class="['clock-quick-task-picker__item', { active: selectedTaskId === task.id }]" role="option" :aria-selected="selectedTaskId === task.id" @click="chooseTask(task.id)">
                        <i :style="{ background: listColorOf(task.listId) }" /><span><strong>{{ task.title }}</strong><small>{{ listNameOf(task.listId) }}</small></span><Check v-if="selectedTaskId === task.id" :size="16" />
                      </button>
                      <p class="clock-quick-task-picker__label">全部任务</p>
                    </template>
                    <button v-for="task in quickPickerTasks" :key="task.id" type="button" :class="['clock-quick-task-picker__item', { active: selectedTaskId === task.id }]" role="option" :aria-selected="selectedTaskId === task.id" @click="chooseTask(task.id)">
                      <i :style="{ background: listColorOf(task.listId) }" /><span><strong>{{ task.title }}</strong><small>{{ listNameOf(task.listId) }}</small></span><Check v-if="selectedTaskId === task.id" :size="16" />
                    </button>
                    <p v-if="taskSearchQuery.trim() && !quickPickerTasks.length" class="clock-quick-task-picker__empty">没有匹配的待处理任务</p>
                  </div>
                </div>
              </Transition>
            </div>
          </template>
          <template v-else>
            <div class="clock-plan-current">
              <div><span>当前节奏</span><strong>{{ currentPlanMode }}</strong></div>
              <div v-if="activeSession?.phase === 'focus'" class="clock-plan-current__task">
                <div class="clock-plan-current__task-header">
                  <span>正在推进</span>
                  <div ref="currentTaskPicker" class="clock-current-task-picker">
                    <button
                      class="clock-current-task-picker__trigger"
                      type="button"
                      :aria-expanded="currentTaskPickerOpen"
                      aria-label="更换当前专注任务"
                      @click="toggleCurrentTaskPicker"
                    >
                      <span>更换任务</span><ChevronDown :size="15" />
                    </button>
                    <div v-if="currentTaskPickerOpen" class="clock-current-task-picker__menu" role="dialog" aria-label="更换当前专注任务">
                      <label class="clock-current-task-picker__search">
                        <Search :size="14" /><span class="sr-only">搜索任务</span>
                        <input ref="currentTaskSearchInput" v-model="currentTaskSearchQuery" type="search" placeholder="搜索任务或清单" />
                      </label>
                      <div class="clock-current-task-picker__options" role="listbox" aria-label="可关联的任务">
                        <button
                          type="button"
                          class="clock-current-task-picker__option clock-current-task-picker__option--clear"
                          :class="{ active: !activeSession.taskId }"
                          role="option"
                          :aria-selected="!activeSession.taskId"
                          @click="setCurrentTask(null)"
                        >
                          <span class="clock-current-task-picker__option-icon"><ListTodo :size="15" /></span>
                          <span><strong>暂不关联任务</strong></span>
                          <Check v-if="!activeSession.taskId" :size="16" />
                        </button>
                        <p v-if="!currentTaskSearchQuery.trim() && currentTaskRecentTasks.length" class="clock-current-task-picker__label">最近使用</p>
                        <button
                          v-for="task in currentTaskRecentTasks"
                          :key="task.id"
                          type="button"
                          class="clock-current-task-picker__option"
                          :class="{ active: activeSession.taskId === task.id }"
                          role="option"
                          :aria-selected="activeSession.taskId === task.id"
                          @click="setCurrentTask(task.id)"
                        >
                          <span class="clock-current-task-picker__option-icon"><i :style="{ background: listColorOf(task.listId) }" /></span>
                          <span><strong>{{ task.title }}</strong><small>{{ listNameOf(task.listId) }}</small></span>
                          <Check v-if="activeSession.taskId === task.id" :size="16" />
                        </button>
                        <p v-if="!currentTaskSearchQuery.trim()" class="clock-current-task-picker__label">全部任务</p>
                        <button
                          v-for="task in currentTaskPickerTasks"
                          :key="task.id"
                          type="button"
                          class="clock-current-task-picker__option"
                          :class="{ active: activeSession.taskId === task.id }"
                          role="option"
                          :aria-selected="activeSession.taskId === task.id"
                          @click="setCurrentTask(task.id)"
                        >
                          <span class="clock-current-task-picker__option-icon"><i :style="{ background: listColorOf(task.listId) }" /></span>
                          <span><strong>{{ task.title }}</strong><small>{{ listNameOf(task.listId) }}</small></span>
                          <Check v-if="activeSession.taskId === task.id" :size="16" />
                        </button>
                        <p v-if="!currentTaskPickerTasks.length && !(currentTaskRecentTasks.length && !currentTaskSearchQuery.trim())" class="clock-current-task-picker__empty">没有匹配的待处理任务</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="clock-plan-current__task-title">
                  <i class="clock-task-picker__list-dot" :style="{ background: currentTask ? listColorOf(currentTask.listId) : 'var(--accent)' }" />
                  <strong :title="currentTaskTitle">{{ currentTaskTitle }}</strong>
                </div>
                <small>{{ currentTask ? listNameOf(currentTask.listId) : '本轮不关联具体任务' }}</small>
              </div>
              <div v-else><span>关联任务</span><strong>{{ nextFocusTaskTitle }}</strong></div>
            </div>
            <label v-if="activeSession?.phase === 'focus'" class="clock-task-picker"><span>结束备注（可选）</span><input v-model="finishNote" maxlength="240" placeholder="例如：已完成初稿" /></label>
          </template>
        </section>

        <section class="clock-side-card clock-side-card--stats">
          <header><span class="clock-side-card__icon"><BarChart3 :size="19" /></span><span class="clock-side-card__heading"><h2>今日状态</h2><small>当前投入与今日成长</small></span><button class="clock-side-card__history-link" type="button" @click="store.openFocusHistory({ tab: 'overview', range: 'today', resetFilters: true })">回顾 <ChevronDown :size="14" /></button></header>
          <div class="clock-today clock-today--garden">
            <div><span>今日有效专注</span><strong>{{ gardenToday.growthMinutes }} / {{ gardenToday.goalMinutes }} 分钟</strong><small>{{ gardenSpeciesName }} · {{ gardenStageName }} · {{ todayCompletedCount }} 次完成</small></div>
          </div>
          <div class="clock-garden-progress" role="progressbar" :aria-valuenow="gardenProgress" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: `${gardenProgress}%` }" /></div>
          <div class="clock-stat-grid"><div><span>有效专注</span><strong>{{ durationText(todayEffectiveSeconds) }}</strong></div><div><span>完成轮次</span><strong>{{ todayCompletedCount }} 轮</strong></div><div><span>{{ goalRemainingMinutes ? '距目标' : '今日目标' }}</span><strong>{{ goalRemainingMinutes ? `还差 ${goalRemainingMinutes} 分钟` : '已达成' }}</strong></div></div>
          <label class="clock-garden-goal">
            <span class="clock-garden-goal__copy">
              <span>今日目标
                <span class="clock-garden-goal__help">
                  <button
                    type="button"
                    aria-label="查看今日目标设置规则"
                    :aria-expanded="gardenGoalHelpOpen"
                    @mouseenter="gardenGoalHelpOpen = true"
                    @mouseleave="gardenGoalHelpOpen = false"
                    @focus="gardenGoalHelpOpen = true"
                    @blur="gardenGoalHelpOpen = false"
                    @keydown.esc.stop="gardenGoalHelpOpen = false"
                    @click.stop="gardenGoalHelpOpen = true"
                  ><CircleHelp :size="13" /></button>
                  <span v-if="gardenGoalHelpOpen" class="clock-garden-goal__tooltip" role="tooltip">{{ gardenGoalRule }}</span>
                </span>
              </span>
              <small>{{ gardenGoalHint }}</small>
            </span>
            <select :value="gardenToday.goalMinutes" :disabled="!canAdjustGardenGoal" :title="gardenGoalRule" @change="setGardenGoal">
              <option v-for="minutes in [25, 50, 90, 120, 180, 240]" :key="minutes" :value="minutes">{{ minutes }} 分钟</option>
            </select>
          </label>
        </section>
      </aside>
    </div>

  </main>
  <RhythmWorkspace v-else-if="store.settings.clockView === 'rhythm'" />
  <FocusHistoryWorkspace v-else-if="store.settings.clockView === 'history'" />
  <FocusAchievementWorkspace v-else />
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { AlignLeft, BarChart3, Calendar, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Coffee, Flag, Folder, Focus, History, LayoutGrid, Leaf, ListTodo, Minus, Pause, PictureInPicture2, Pin, Play, Plus, Search, Sparkles, Star, Target, Timer, X } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { openFocusController } from '@/services/platform'
import RhythmWorkspace from './RhythmWorkspace.vue'
import FocusHistoryWorkspace from './FocusHistoryWorkspace.vue'
import FocusAchievementWorkspace from './FocusAchievementWorkspace.vue'
import { FOCUS_GARDEN_SPECIES, FOCUS_GARDEN_STAGES, focusGardenStageMilestones } from '@/utils/focusGarden.mjs'

const FocusStageArtwork = defineAsyncComponent(() => import('./FocusStageArtwork.vue'))
const store = useTaskStore()
const selectedProfileId = ref('pomodoro')
const selectedTaskId = ref(null)
const freeDurationMinutes = ref(15)
const freeDurationEditing = ref(false)
const freeDurationEditor = ref(null)
const freeDurationEditorStyle = ref({})
const gardenPreviewAnchor = ref(null)
const gardenPreviewOpen = ref(false)
const gardenPreviewStyle = ref({})
const finishNote = ref('')
const endConfirmOpen = ref(false)
const taskPicker = ref(null)
const taskPickerOpen = ref(false)
const taskSearchQuery = ref('')
const currentTaskPicker = ref(null)
const currentTaskPickerOpen = ref(false)
const currentTaskSearchQuery = ref('')
const currentTaskSearchInput = ref(null)
const sidebarId = ref('all')
const pickerScope = ref('suggested')
const viewMode = ref('list')
const expandedPickerGroupIds = ref(new Set())
const keyboardIndex = ref(0)
const taskSearchInput = ref(null)
const collapsedListGroupKeys = ref(new Set())
const visualClockNow = ref(Date.now())
let visualClockFrame = null
const activeSession = computed(() => store.activeFocusSession)
const pendingBreak = computed(() => store.focusPendingBreak)
const gardenToday = computed(() => store.focusGardenToday)
const gardenSpeciesName = computed(() => FOCUS_GARDEN_SPECIES.find(item => item.id === gardenToday.value.speciesId)?.name || '小雏菊')
const gardenStageName = computed(() => FOCUS_GARDEN_STAGES.find(item => item.id === gardenToday.value.stage)?.name || '种子')
const gardenStageIndex = computed(() => Math.max(0, FOCUS_GARDEN_STAGES.findIndex(item => item.id === gardenToday.value.stage)))
const gardenStageMilestones = computed(() => focusGardenStageMilestones(gardenToday.value.goalMinutes))
const nextGardenStage = computed(() => gardenStageMilestones.value[gardenStageIndex.value + 1] || null)
const gardenNextStageHint = computed(() => {
  if (!nextGardenStage.value) return '今日花已盛放'
  const remaining = Math.max(0, nextGardenStage.value.minutes - gardenToday.value.growthMinutes)
  return `距${nextGardenStage.value.name}还差 ${remaining} 分钟`
})
const gardenProgress = computed(() => Math.min(100, Math.round((gardenToday.value.growthMinutes / gardenToday.value.goalMinutes) * 100)))
const gardenGoalAdjustments = computed(() => Math.max(0, Number(gardenToday.value.goalAdjustments) || 0))
const canAdjustGardenGoal = computed(() => gardenToday.value.growthMinutes === 0 || gardenGoalAdjustments.value < 1)
const gardenGoalRule = computed(() => '开始专注前可自由调整；当天已有成长后，还可修正一次。修正后会立即按新目标重新计算今日花的阶段。')
const gardenGoalHint = computed(() => gardenToday.value.growthMinutes === 0
  ? '开始前可自由调整'
  : canAdjustGardenGoal.value ? '今天还可修正 1 次' : '今日已修正，明日可重设')
const gardenGoalHelpOpen = ref(false)
const selectedProfile = computed(() => store.focusProfiles.find(item => item.id === selectedProfileId.value) || store.focusProfiles[0])
const currentProfile = computed(() => store.currentFocusProfile || selectedProfile.value)
const primaryFocusProfiles = computed(() => store.focusProfiles.filter(profile => profile.id !== 'custom-focus'))
const openTasks = computed(() => store.activeTasks.filter(task => !task.completed))
const decorateTask = (task) => ({ ...task, listName: store.lists.find(list => list.id === task.listId)?.name || '收集箱' })
const currentTaskTitle = computed(() => openTasks.value.find(task => task.id === activeSession.value?.taskId)?.title || '不关联任务')
const selectedTaskTitle = computed(() => openTasks.value.find(task => task.id === selectedTaskId.value)?.title || '不关联任务')
const selectedTask = computed(() => openTasks.value.find(task => task.id === selectedTaskId.value) || null)
const currentTask = computed(() => openTasks.value.find(task => task.id === activeSession.value?.taskId) || null)
const quickPickerTasks = computed(() => {
  const query = taskSearchQuery.value.trim().toLocaleLowerCase()
  if (query) return allPickerTasks.value.filter(task => `${task.title || ''} ${task.listName || ''}`.toLocaleLowerCase().includes(query)).slice(0, 30)
  const recentIds = new Set(recentTasks.value.map(task => task.id))
  return allPickerTasks.value.filter(task => !recentIds.has(task.id)).slice(0, 30)
})
const currentTaskSearchResults = computed(() => {
  const query = currentTaskSearchQuery.value.trim().toLocaleLowerCase()
  if (!query) return openTasks.value.slice(0, 80)
  return openTasks.value.filter(task => `${task.title || ''} ${listNameOf(task.listId)}`.toLocaleLowerCase().includes(query))
})
const currentList = computed(() => store.currentList)
const recentLists = computed(() => {
  const seen = new Set()
  const result = []
  for (const item of (store.focusHistory || [])) {
    const listId = item.taskId
      ? openTasks.value.find(task => task.id === item.taskId)?.listId
      : null
    if (!listId || seen.has(listId)) continue
    const list = store.lists.find(entry => entry.id === listId)
    if (!list) continue
    seen.add(listId)
    result.push(list)
    if (result.length >= 6) break
  }
  return result
})
const recentTaskCount = computed(() => {
  const listIds = new Set(recentLists.value.map(list => list.id))
  return openTasks.value.filter(task => listIds.has(task.listId)).length
})
const recentTasks = computed(() => {
  const seen = new Set()
  const result = []
  for (const item of (store.focusHistory || [])) {
    const task = item.taskId ? openTasks.value.find(entry => entry.id === item.taskId) : null
    if (!task || seen.has(task.id)) continue
    seen.add(task.id)
    result.push({ ...decorateTask(task), recommendation: '最近专注' })
    if (result.length >= 6) break
  }
  return result
})
const currentTaskRecentTasks = computed(() => recentTasks.value.filter(task => task.id !== activeSession.value?.taskId))
const currentTaskPickerTasks = computed(() => {
  if (currentTaskSearchQuery.value.trim()) return currentTaskSearchResults.value
  const recentIds = new Set(currentTaskRecentTasks.value.map(task => task.id))
  return currentTaskSearchResults.value.filter(task => !recentIds.has(task.id))
})
const dueSoonTasks = computed(() => openTasks.value
  .filter(task => task.dueDate && startOfDayLocal(new Date(task.dueDate)) <= startOfDayLocal(new Date()))
  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  .map(task => ({ ...decorateTask(task), recommendation: isOverdue(task.dueDate) ? '已逾期' : '今天到期' })))
const allPickerTasks = computed(() => openTasks.value
  .slice()
  .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (Number(b.important) - Number(a.important)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  .map(task => ({ ...decorateTask(task), recommendation: '' })))
const suggestedTasks = computed(() => {
  const result = []
  const seen = new Set()
  const add = (task) => {
    if (!task || seen.has(task.id) || result.length >= 6) return
    seen.add(task.id)
    result.push(task)
  }
  recentTasks.value.forEach(add)
  dueSoonTasks.value.forEach(add)
  openTasks.value
    .filter(task => task.pinned || task.important)
    .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (Number(b.important) - Number(a.important)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .forEach(task => add({ ...decorateTask(task), recommendation: task.pinned ? '已置顶' : '重要任务' }))
  allPickerTasks.value.forEach(task => add({ ...task, recommendation: '待处理' }))
  return result
})
const pickerTasks = computed(() => {
  if (pickerScope.value === 'suggested') return suggestedTasks.value
  if (pickerScope.value === 'recent') return recentTasks.value
  if (pickerScope.value === 'due') return dueSoonTasks.value
  if (pickerScope.value === 'list') {
    return openTasks.value
      .filter(task => task.listId === sidebarId.value)
      .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (Number(b.important) - Number(a.important)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(task => ({ ...decorateTask(task), recommendation: '' }))
  }
  return allPickerTasks.value
})
const pickerTitle = computed(() => ({
  suggested: '建议专注',
  recent: '最近专注',
  due: '今天需要推进',
  list: store.lists.find(list => list.id === sidebarId.value)?.name || '清单任务',
  all: '全部任务'
}[pickerScope.value] || '全部任务'))
const pickerEmptyText = computed(() => ({
  suggested: '暂时没有推荐任务，去“全部任务”挑一项吧',
  recent: '还没有专注记录，去“全部任务”挑一项吧',
  due: '今天没有到期任务',
  list: '这个清单下还没有待处理任务',
  all: '还没有待处理任务'
}[pickerScope.value] || '还没有待处理任务'))
const groupedPickerTasks = computed(() => {
  if (pickerScope.value === 'list') {
    const taskGroups = (store.taskGroups || [])
      .filter(group => group.listId === sidebarId.value)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(group => ({ id: group.id, name: group.name, emoji: group.emoji || '', color: group.color || '#7f9b94', tasks: pickerTasks.value.filter(task => task.taskGroupId === group.id) }))
      .filter(group => group.tasks.length)
    const ungrouped = pickerTasks.value.filter(task => !task.taskGroupId)
    if (ungrouped.length) taskGroups.push({ id: '__ungrouped__', name: '未分组', emoji: '', color: '#9aa8a4', tasks: ungrouped })
    return taskGroups
  }

  const groups = new Map()
  pickerTasks.value.forEach(task => {
    if (!groups.has(task.listId)) {
      groups.set(task.listId, { id: task.listId, name: listNameOf(task.listId), emoji: '', color: listColorOf(task.listId), tasks: [] })
    }
    groups.get(task.listId).tasks.push(task)
  })
  return [...groups.values()]
})
const listGroups = computed(() => {
  const taskCountByList = new Map()
  openTasks.value.forEach(task => { taskCountByList.set(task.listId, (taskCountByList.get(task.listId) || 0) + 1) })
  const groups = (store.groups || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const decoratedLists = store.lists.map(list => ({ ...list, taskCount: taskCountByList.get(list.id) || 0 }))
  const result = []
  const used = new Set()
  groups.forEach(group => {
    const lists = decoratedLists.filter(list => list.groupId === group.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    if (lists.length) {
      result.push({ key: `g:${group.id}`, name: group.name, lists })
      lists.forEach(list => used.add(list.id))
    }
  })
  const ungrouped = decoratedLists.filter(list => !used.has(list.id) && !list.groupId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  if (ungrouped.length) result.push({ key: '__ungrouped', name: '', lists: ungrouped })
  return result
})
function formatDueLabel(date) {
  if (!date) return ''
  const today = new Date()
  const due = new Date(date)
  const diffDays = Math.round((startOfDayLocal(due) - startOfDayLocal(today)) / 86400000)
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays === -1) return '昨天'
  if (diffDays < 0) return `已过期 ${-diffDays} 天`
  if (diffDays <= 7) return `${diffDays} 天后`
  return `${due.getMonth() + 1} 月 ${due.getDate()} 日`
}
function isOverdue(date) { return date && startOfDayLocal(new Date(date)) < startOfDayLocal(new Date()) }
function priorityLabel(priority) { return ({ 1: '低优先级', 2: '中优先级', 3: '高优先级' })[Number(priority)] || '已设优先级' }
function startOfDayLocal(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
const ctaLabel = computed(() => `${selectedTaskId.value ? '开始' : '直接开始'} ${durationText(selectedDurationSeconds.value)}专注`)
const searchResults = computed(() => {
  const query = taskSearchQuery.value.trim().toLowerCase()
  if (!query) return []
  const hits = []
  openTasks.value.forEach(task => {
    const title = (task.title || '').toLowerCase()
    if (title.includes(query)) {
      hits.push({ key: `t:${task.id}`, kind: 'task', id: task.id, title: task.title, subtitle: listNameOf(task.listId), color: listColorOf(task.listId) })
    }
  })
  store.lists.forEach(list => {
    if ((list.name || '').toLowerCase().includes(query)) {
      hits.push({ key: `l:${list.id}`, kind: 'list', id: list.id, target: list.id, title: list.name, subtitle: `清单 · ${openTasks.value.filter(task => task.listId === list.id).length} 项`, color: list.color })
    }
  })
  ;(store.groups || []).forEach(group => {
    if ((group.name || '').toLowerCase().includes(query)) {
      const count = (store.lists.filter(list => list.groupId === group.id)).reduce((total, list) => total + openTasks.value.filter(task => task.listId === list.id).length, 0)
      if (count) hits.push({ key: `g:${group.id}`, kind: 'group', id: group.id, target: `g:${group.id}`, title: group.name, subtitle: `分组 · ${count} 项` })
    }
  })
  return hits.slice(0, 16)
})
const remainingSeconds = computed(() => store.focusRemainingSeconds)
const selectedDurationSeconds = computed(() => selectedProfileId.value === 'free-focus' ? Math.max(60, Math.min(480 * 60, Math.round(Number(freeDurationMinutes.value) || 15) * 60)) : selectedProfile.value?.durationSeconds)
const timerDuration = computed(() => activeSession.value?.durationSeconds ?? pendingBreak.value?.durationSeconds ?? selectedDurationSeconds.value ?? null)
const timerProgress = computed(() => {
  if (timerDuration.value === null) return 1
  const session = activeSession.value
  const seconds = session?.status === 'running' && session.startedAt
    ? Math.max(0, timerDuration.value - (Number(session.elapsedSeconds) || 0) - Math.max(0, (visualClockNow.value - new Date(session.startedAt).getTime()) / 1000))
    : (session ? remainingSeconds.value : timerDuration.value)
  return Math.max(0, Math.min(1, Number(seconds) / timerDuration.value))
})
const timerRingStyle = computed(() => ({ '--ring-offset': String(634.6 * (1 - timerProgress.value)) }))
const formattedTime = computed(() => formatClock(activeSession.value ? (remainingSeconds.value === null ? store.focusElapsedSeconds : remainingSeconds.value) : (selectedDurationSeconds.value || 0)))
const canAdjustTime = computed(() => activeSession.value?.phase === 'focus' && activeSession.value.durationSeconds !== null)
const canSetFreeDuration = computed(() => !activeSession.value && !pendingBreak.value && selectedProfileId.value === 'free-focus')
watch(canSetFreeDuration, (canOpen) => { if (!canOpen) freeDurationEditing.value = false })
const sessionTimeRange = computed(() => {
  const session = activeSession.value
  if (!session) return ''
  const startedAt = new Date(session.startedAt || session.createdAt)
  const start = formatTime(startedAt)
  if (session.durationSeconds === null) return `开始于 ${start} · 自由计时`
  const end = new Date(startedAt.getTime() + session.durationSeconds * 1000)
  return `${start} — 预计 ${formatTime(end)} 结束`
})
const stageLabel = computed(() => activeSession.value ? (activeSession.value.status === 'paused' ? '已暂停' : activeSession.value.phase === 'focus' ? '正在专注' : '正在休息') : pendingBreak.value ? '下一步' : '准备开始')
const pausedDuration = computed(() => {
  const session = activeSession.value
  const lastEvent = session?.timeline?.[session.timeline.length - 1]
  if (session?.status !== 'paused' || lastEvent?.type !== 'paused') return 0
  const pausedAt = new Date(lastEvent.at).getTime()
  return Number.isFinite(pausedAt) ? Math.max(0, Math.floor((visualClockNow.value - pausedAt) / 1000)) : 0
})
const stageDetail = computed(() => activeSession.value
  ? (activeSession.value.status === 'paused'
      ? `已暂停 ${formatDuration(pausedDuration.value)} · 继续后从当前进度接着计时`
      : activeSession.value.phase === 'focus' ? currentTaskTitle.value : '暂时离开屏幕，回来再继续。')
  : pendingBreak.value ? '刚完成一段专注，给自己一点恢复时间。' : selectedProfileId.value === 'free-focus' && selectedDurationSeconds.value ? `自由设定 ${durationText(selectedDurationSeconds.value)}，点击时间可修改。` : selectedProfile.value?.description || '')
const headline = computed(() => activeSession.value ? (activeSession.value.phase === 'focus' ? '保持在这件事上' : '让大脑真正休息') : pendingBreak.value ? '先恢复，再继续' : '从一件小事开始')
const todayHistory = computed(() => store.focusHistory.filter(item => new Date(item.finishedAt).toDateString() === new Date().toDateString()))
const todaySeconds = computed(() => todayHistory.value.filter(item => item.phase === 'focus').reduce((total, item) => total + item.elapsedSeconds, 0))
const todayCompletedCount = computed(() => todayHistory.value.filter(item => item.phase === 'focus' && item.result === 'completed').length)
const todayInterruptedCount = computed(() => todayHistory.value.filter(item => item.phase === 'focus' && item.result !== 'completed').length)
const todayEffectiveSeconds = computed(() => todayHistory.value
  .filter(item => item.phase === 'focus' && ['completed', 'abandoned'].includes(item.result))
  .reduce((total, item) => total + item.elapsedSeconds, 0) + (activeSession.value?.phase === 'focus' ? store.focusElapsedSeconds : 0))
const goalRemainingMinutes = computed(() => Math.max(0, gardenToday.value.goalMinutes - gardenToday.value.growthMinutes))
const focusSettings = computed(() => store.clock.focusSettings)
const isPomodoroCycle = computed(() => activeSession.value?.phase === 'focus' && activeSession.value.profileId === 'pomodoro')
const currentPomodoroRound = computed(() => Math.min(focusSettings.value.focusesBeforeLongBreak, store.clock.cycleFocusCount + 1))
const nextBreakLabel = computed(() => currentPomodoroRound.value >= focusSettings.value.focusesBeforeLongBreak
  ? `长休息 ${durationText(focusSettings.value.longBreakSeconds)}`
  : `短休息 ${durationText(focusSettings.value.shortBreakSeconds)}`)
const pendingFocusTask = computed(() => {
  const taskId = pendingBreak.value?.taskId || (activeSession.value?.phase !== 'focus' ? activeSession.value?.nextTaskId : null)
  return openTasks.value.find(task => task.id === taskId) || null
})
const nextFocusTaskTitle = computed(() => pendingFocusTask.value?.title || selectedTask.value?.title || currentTask.value?.title || '不关联任务')
const currentPlanMode = computed(() => {
  if (activeSession.value) return `${currentProfile.value?.name || '专注中'} · ${durationText(activeSession.value.durationSeconds)}`
  if (pendingBreak.value) return `${pendingBreak.value.phase === 'long-break' ? '长休息' : '短休息'} · ${durationText(pendingBreak.value.durationSeconds)}`
  return selectedProfile.value?.name || '准备开始'
})
function setGardenGoal(event) { store.updateFocusGardenSettings({ dailyGoalMinutes: Number(event.target.value) }) }
function start() { store.startFocus(selectedProfile.value?.id, selectedTaskId.value, selectedProfileId.value === 'free-focus' ? selectedDurationSeconds.value : undefined) }
function finish(result) { store.finishFocus(result, finishNote.value); finishNote.value = '' }
function skipPendingBreak() {
  const taskId = pendingBreak.value?.taskId
  if (!store.skipPendingBreak()) return
  selectedTaskId.value = openTasks.value.some(task => task.id === taskId) ? taskId : null
}
function toggleCurrentTaskPicker() {
  currentTaskPickerOpen.value = !currentTaskPickerOpen.value
  if (currentTaskPickerOpen.value) {
    currentTaskSearchQuery.value = ''
    nextTick(() => currentTaskSearchInput.value?.focus())
  }
}
function setCurrentTask(taskId) {
  store.updateFocusTask(taskId)
  currentTaskPickerOpen.value = false
}
function requestEndFocus() { endConfirmOpen.value = true }
function confirmEndFocus() {
  endConfirmOpen.value = false
  finish('abandoned')
}
function adjustTime(minutes) { return store.adjustFocusDuration(minutes * 60) }
async function openDesktopController() {
  try {
    const opened = await openFocusController()
    if (!opened) store.showNotice('当前环境暂不支持桌面专注控制器', 'info')
  } catch (error) {
    console.error('[ClockWorkspace] 打开桌面专注控制器失败:', error)
    store.showNotice('桌面专注控制器打开失败', 'error')
  }
}
function setFreeDuration(minutes) { freeDurationMinutes.value = minutes }
function confirmFreeDuration() { freeDurationMinutes.value = Math.max(1, Math.min(480, Math.round(Number(freeDurationMinutes.value) || 15))); freeDurationEditing.value = false }
function positionFreeDurationEditor() {
  const anchor = freeDurationEditor.value
  if (!anchor || typeof window === 'undefined') return
  const rect = anchor.getBoundingClientRect()
  const editorWidth = Math.min(280, window.innerWidth - 48)
  const margin = 24
  const left = Math.max(margin, Math.min(window.innerWidth - editorWidth - margin, rect.left + rect.width / 2 - editorWidth / 2))
  freeDurationEditorStyle.value = {
    '--free-time-editor-left': `${Math.round(left)}px`,
    '--free-time-editor-top': `${Math.round(rect.bottom + 13)}px`
  }
}
function toggleFreeDurationEditor() {
  freeDurationEditing.value = !freeDurationEditing.value
  if (freeDurationEditing.value) nextTick(positionFreeDurationEditor)
}
function positionGardenPreview() {
  const anchor = gardenPreviewAnchor.value
  if (!anchor || typeof window === 'undefined') return
  const rect = anchor.getBoundingClientRect()
  const width = Math.min(240, window.innerWidth - 32)
  const estimatedHeight = 330
  const margin = 16
  const left = Math.max(margin, Math.min(window.innerWidth - width - margin, rect.left + rect.width / 2 - width / 2))
  const top = Math.max(margin, rect.top - estimatedHeight - 12)
  gardenPreviewStyle.value = {
    '--garden-preview-left': `${Math.round(left)}px`,
    '--garden-preview-top': `${Math.round(top)}px`
  }
}
function showGardenPreview() {
  gardenPreviewOpen.value = true
  nextTick(positionGardenPreview)
}
function hideGardenPreview() { gardenPreviewOpen.value = false }
function closeFreeDurationEditor(event) {
  if (!freeDurationEditing.value) return
  if (freeDurationEditor.value?.contains(event.target)) return
  if (event.target?.closest?.('.clock-free-time__editor')) return
  freeDurationEditing.value = false
}
function closeCurrentTaskPicker(event) {
  if (!currentTaskPickerOpen.value || currentTaskPicker.value?.contains(event.target)) return
  currentTaskPickerOpen.value = false
}
function closeTaskPickerOnOutside(event) {
  if (!taskPickerOpen.value || taskPicker.value?.contains(event.target)) return
  taskPickerOpen.value = false
}
function toggleTaskPicker() {
  taskPickerOpen.value = !taskPickerOpen.value
  if (taskPickerOpen.value) {
    taskSearchQuery.value = ''
    pickerScope.value = 'suggested'
    keyboardIndex.value = 0
    nextTick(() => taskSearchInput.value?.focus())
  }
}
function selectPickerScope(scope) {
  pickerScope.value = scope
  expandedPickerGroupIds.value = new Set()
  taskSearchQuery.value = ''
  keyboardIndex.value = 0
  nextTick(() => taskSearchInput.value?.focus())
}
function selectSidebar(id) {
  sidebarId.value = id
  pickerScope.value = 'list'
  viewMode.value = 'group'
  expandedPickerGroupIds.value = new Set()
  taskSearchQuery.value = ''
  keyboardIndex.value = 0
  nextTick(() => taskSearchInput.value?.focus())
}
function isPickerGroupExpanded(id) { return expandedPickerGroupIds.value.has(id) }
function togglePickerGroup(id) {
  const next = new Set(expandedPickerGroupIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedPickerGroupIds.value = next
}
function isListGroupCollapsed(key) { return collapsedListGroupKeys.value.has(key) }
function toggleListGroup(key) {
  const next = new Set(collapsedListGroupKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedListGroupKeys.value = next
}
function groupTaskCount(group) { return group.lists.reduce((count, list) => count + list.taskCount, 0) }
function chooseTask(taskId) {
  selectedTaskId.value = taskId
  taskPickerOpen.value = false
}
function applyFocusTaskDraft() {
  const taskId = store.consumeFocusTaskDraft()
  if (taskId) selectedTaskId.value = taskId
}
function handleSearchHit(hit) {
  if (hit.kind === 'task') chooseTask(hit.id)
  else if (hit.kind === 'list') selectSidebar(hit.target)
  else if (hit.kind === 'group') {
    const firstList = store.lists.find(list => list.groupId === hit.id)
    if (firstList) selectSidebar(firstList.id)
  }
}
function confirmAndStart() {
  start()
  closeTaskPicker()
}
function listNameOf(listId) { return store.lists.find(list => list.id === listId)?.name || '收集箱' }
function listColorOf(listId) { return store.lists.find(list => list.id === listId)?.color || '#9aa3b7' }
watch(taskSearchQuery, () => { keyboardIndex.value = 0 })
watch(sidebarId, () => { keyboardIndex.value = 0 })
watch(() => store.focusTaskDraftId, (taskId) => {
  if (taskId) applyFocusTaskDraft()
}, { immediate: true })
watch(() => pendingBreak.value?.taskId, (taskId) => {
  if (taskId && openTasks.value.some(task => task.id === taskId)) selectedTaskId.value = taskId
}, { immediate: true })
function formatClock(seconds) { const value = Math.max(0, Math.floor(seconds || 0)); return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
function formatDuration(seconds) { const value = Math.max(0, Math.floor(seconds || 0)); const hours = Math.floor(value / 3600); const minutes = Math.floor((value % 3600) / 60); const rest = value % 60; return hours > 0 ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}` }
function formatTime(date) { return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
function durationText(seconds) { if (seconds === null || seconds === undefined) return '自由计时'; const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时` : `${minutes} 分钟` }
function closeTaskPicker() { taskPickerOpen.value = false }
function syncVisualClock() {
  visualClockNow.value = Date.now()
  visualClockFrame = window.requestAnimationFrame(syncVisualClock)
}
onMounted(() => {
  window.addEventListener('pointerdown', closeFreeDurationEditor)
  window.addEventListener('pointerdown', closeCurrentTaskPicker)
  window.addEventListener('pointerdown', closeTaskPickerOnOutside)
  window.addEventListener('resize', positionFreeDurationEditor)
  window.addEventListener('resize', positionGardenPreview)
  visualClockFrame = window.requestAnimationFrame(syncVisualClock)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', closeFreeDurationEditor)
  window.removeEventListener('pointerdown', closeCurrentTaskPicker)
  window.removeEventListener('pointerdown', closeTaskPickerOnOutside)
  window.removeEventListener('resize', positionFreeDurationEditor)
  window.removeEventListener('resize', positionGardenPreview)
  if (visualClockFrame) window.cancelAnimationFrame(visualClockFrame)
})
</script>
