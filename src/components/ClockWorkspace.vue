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

          <Teleport to=".app">
            <div v-if="freeDurationEditing" class="clock-free-time__overlay" @click.self="freeDurationEditing = false">
              <div class="clock-free-time__editor" role="dialog" aria-label="设定本次倒计时" @click.stop>
                <p>设定本次倒计时</p>
                <div class="clock-free-time__presets"><button v-for="minutes in [15, 25, 45, 60]" :key="minutes" type="button" @click="setFreeDuration(minutes)">{{ minutes }} 分钟</button></div>
                <label>自定义 <input v-model.number="freeDurationMinutes" type="number" min="1" max="480" /> 分钟</label>
                <div><button class="clock-free-time__confirm" type="button" @click="confirmFreeDuration">使用此时长</button><button type="button" @click="freeDurationEditing = false">取消</button></div>
              </div>
            </div>
          </Teleport>

          <section class="clock-stage__garden-companion" aria-label="今日花成长">
            <div class="clock-stage__garden-art">
              <FocusStageArtwork :species-id="gardenToday.speciesId" :stage="gardenToday.stage" motion="static" />
            </div>
            <div class="clock-stage__garden-copy">
              <div class="clock-stage__garden-heading">
                <span><Leaf :size="12" /> 今日花</span>
                <strong>{{ gardenStageName }}</strong>
              </div>
              <p><b>{{ gardenToday.growthMinutes }} / {{ gardenToday.goalMinutes }}</b> 分钟 · 专注会让它继续长大</p>
              <div class="clock-stage__garden-progress" role="progressbar" :aria-valuenow="gardenProgress" aria-valuemin="0" aria-valuemax="100" aria-label="今日花成长进度">
                <i :style="{ width: `${gardenProgress}%` }" />
              </div>
              <div class="clock-stage__garden-stages" aria-label="成长阶段">
                <i
                  v-for="(stage, index) in FOCUS_GARDEN_STAGES"
                  :key="stage.id"
                  :class="{ reached: index <= gardenStageIndex, current: index === gardenStageIndex }"
                  :title="stage.name"
                />
              </div>
            </div>
          </section>

          <div v-if="activeSession" class="clock-stage__actions">
            <button v-if="activeSession.status === 'running'" class="clock-button clock-button--primary" type="button" @click="store.pauseFocus"><Pause :size="18" fill="currentColor" />暂停专注</button>
            <button v-else class="clock-button clock-button--primary" type="button" @click="store.resumeFocus"><Play :size="18" fill="currentColor" />继续</button>
            <button class="clock-button clock-button--secondary" type="button" @click="finish(activeSession.phase === 'focus' ? 'completed' : 'completed')"><Check :size="18" />{{ activeSession.phase === 'focus' ? '完成本轮' : '完成休息' }}</button>
            <template v-if="canAdjustTime"><button class="clock-button clock-button--adjust" type="button" @click.stop="adjustTime(-5)"><Minus :size="16" />缩短 5 分钟</button><button class="clock-button clock-button--adjust" type="button" @click.stop="adjustTime(5)"><Plus :size="16" />延长 5 分钟</button></template>
            <button v-if="activeSession.phase === 'focus'" class="clock-button clock-button--quiet" type="button" @click="finish('abandoned')">结束</button>
          </div>
          <div v-else-if="pendingBreak" class="clock-stage__actions">
            <button class="clock-button clock-button--primary" type="button" @click="store.startPendingBreak"><Coffee :size="18" />开始{{ pendingBreak.phase === 'long-break' ? '长休息' : '短休息' }}</button>
            <button class="clock-button clock-button--quiet" type="button" title="跳过本次休息，回到专注类型选择" @click="store.skipPendingBreak">跳过休息，选择下一轮</button>
          </div>
        <button v-else class="clock-button clock-button--primary clock-button--start" type="button" @click="start"><Play :size="20" fill="currentColor" />开始专注</button>
      </section>

      <aside class="clock-side" aria-label="本次专注设置">
        <section class="clock-side-card clock-side-card--modes">
          <header><span class="clock-side-card__icon"><Target :size="19" /></span><h2>专注方式</h2></header>
          <template v-if="!activeSession && !pendingBreak">
            <div class="clock-mode-picker">
              <button v-for="profile in primaryFocusProfiles" :key="profile.id" type="button" :class="{ active: selectedProfileId === profile.id }" @click="selectedProfileId = profile.id">
                <component :is="profile.id === 'pomodoro' ? Timer : profile.id === 'deep-work' ? Focus : Clock3" :size="24" /><strong>{{ profile.name }}</strong><small>{{ profile.id === 'free-focus' ? '不设上限' : durationText(profile.durationSeconds) }}</small>
              </button>
            </div>
          </template>
          <p v-else class="clock-side-card__current-mode">{{ currentProfile?.name || '专注中' }} · {{ durationText(activeSession?.durationSeconds) }}</p>
        </section>

        <section class="clock-side-card">
          <header><span class="clock-side-card__icon"><ListChecks :size="19" /></span><h2>本次专注</h2></header>
          <template v-if="!activeSession && !pendingBreak">
            <div ref="taskPicker" class="clock-task-picker">
              <span class="clock-task-picker__label">这段时间要推进什么？</span>
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
              <Teleport to="body">
                <Transition name="clock-task-picker">
                  <div v-if="taskPickerOpen" class="clock-task-picker__overlay" @click="closeTaskPicker">
                    <div class="clock-task-picker__panel" role="dialog" aria-modal="true" aria-label="选择要专注的任务" @click.stop>
                      <header class="clock-task-picker__hero">
                        <div class="clock-task-picker__hero-text">
                          <h3>选择专注任务</h3>
                        </div>
                        <div class="clock-task-picker__hero-actions">
                          <div class="clock-task-picker__search">
                            <Search :size="14" />
                            <input
                              ref="taskSearchInput"
                              v-model="taskSearchQuery"
                              type="text"
                              placeholder="搜索任务…"
                              @keydown="onPickerKeydown"
                            />
                            <kbd v-if="!taskSearchQuery" class="clock-task-picker__search-hint">/</kbd>
                          </div>
                          <button class="clock-task-picker__close" type="button" @click="taskPickerOpen = false" aria-label="关闭任务选择器"><X :size="18" /></button>
                        </div>
                      </header>

                      <div class="clock-task-picker__body">
                        <nav class="clock-task-picker__sidebar" aria-label="清单导航">
                          <button type="button" :class="['clock-task-picker__nav-item', { active: sidebarId === 'all' }]" @click="selectSidebar('all')">
                            <LayoutGrid :size="14" /><span>全部</span><small>{{ openTasks.length }}</small>
                          </button>
                          <button type="button" :class="['clock-task-picker__nav-item', { active: sidebarId === 'recent' }]" @click="selectSidebar('recent')">
                            <History :size="14" /><span>最近使用</span><small>{{ recentTaskCount }}</small>
                          </button>
                          <p class="clock-task-picker__nav-label">我的清单</p>
                          <div class="clock-task-picker__tree">
                            <section v-for="group in listGroups" :key="group.key" class="clock-task-picker__tree-branch">
                              <button
                                type="button"
                                class="clock-task-picker__tree-group"
                                :aria-expanded="!isListGroupCollapsed(group.key)"
                                @click="toggleListGroup(group.key)"
                              >
                                <ChevronDown :size="13" :class="{ collapsed: isListGroupCollapsed(group.key) }" />
                                <span>{{ group.name || '未分组' }}</span>
                                <small>{{ groupTaskCount(group) }}</small>
                              </button>
                              <div v-show="!isListGroupCollapsed(group.key)" class="clock-task-picker__tree-children">
                                <button
                                  v-for="list in group.lists"
                                  :key="list.id"
                                  type="button"
                                  :class="['clock-task-picker__nav-item', 'clock-task-picker__nav-item--list', { active: sidebarId === list.id }]"
                                  @click="selectSidebar(list.id)"
                                >
                                  <span class="clock-task-picker__list-dot" :style="{ background: list.color }" />
                                  <span>{{ list.name }}</span>
                                  <small>{{ list.taskCount }}</small>
                                </button>
                              </div>
                            </section>
                          </div>
                        </nav>

                        <div class="clock-task-picker__tasks" :class="{ 'is-grouped': useGroupedView, 'is-searching': taskSearchQuery.trim() }">
                          <template v-if="taskSearchQuery.trim()">
                            <p class="clock-task-picker__tasks-header">搜索结果 · {{ searchResults.length }} 项</p>
                            <button
                              v-for="(hit, index) in searchResults"
                              :key="hit.key"
                              type="button"
                              :class="['clock-task-picker__task', { active: hit.kind === 'task' && selectedTaskId === hit.id, focused: index === keyboardIndex }]"
                              @click="handleSearchHit(hit)"
                              @mouseenter="keyboardIndex = index"
                            >
                              <span class="clock-task-picker__task-icon">
                                <span v-if="hit.kind === 'list'" class="clock-task-picker__list-dot" :style="{ background: hit.color }" />
                                <Folder v-else-if="hit.kind === 'group'" :size="15" />
                                <ListTodo v-else :size="15" />
                              </span>
                              <span>
                                <strong>{{ hit.title }}</strong>
                                <small v-if="hit.subtitle">{{ hit.subtitle }}</small>
                              </span>
                              <ChevronRight v-if="hit.kind !== 'task'" :size="14" />
                              <Check v-else-if="selectedTaskId === hit.id" :size="16" />
                            </button>
                            <p v-if="!searchResults.length" class="clock-task-picker__empty">没找到「{{ taskSearchQuery }}」相关结果</p>
                          </template>

                          <template v-else>
                            <div class="clock-task-picker__tasks-header">
                              <span class="clock-task-picker__tasks-title">{{ sidebarTitle }} · {{ sidebarTasks.length }} 项</span>
                              <div v-if="canToggleView" class="clock-task-picker__view-toggle" role="tablist">
                                <button type="button" :class="{ active: viewMode === 'list' }" :aria-pressed="viewMode === 'list'" @click="viewMode = 'list'">
                                  <AlignLeft :size="13" />列表
                                </button>
                                <button type="button" :class="{ active: viewMode === 'group' }" :aria-pressed="viewMode === 'group'" @click="viewMode = 'group'">
                                  <LayoutGrid :size="13" />分组
                                </button>
                              </div>
                            </div>

                            <template v-if="useGroupedView">
                              <template v-for="(group, gIndex) in groupedTasks" :key="group.id">
                                <div
                                  class="clock-task-picker__tasks-group"
                                  :class="[group.isUngrouped ? 'clock-task-picker__tasks-group--ungrouped' : `task-group--color-${group.color}`]"
                                >
                                  <span class="clock-task-picker__tasks-group-emoji" v-if="group.emoji">{{ group.emoji }}</span>
                                  <span v-else class="clock-task-picker__tasks-group-dot" />
                                  <span class="clock-task-picker__tasks-group-name">{{ group.name }}</span>
                                  <small>{{ group.tasks.length }} 项</small>
                                </div>
                                <button
                                  v-for="(task, tIndex) in group.tasks"
                                  :key="task.id"
                                  type="button"
                                  :class="['clock-task-picker__task', `task-group--color-${groupColorOf(task)}`, { active: selectedTaskId === task.id, focused: flatGroupedIndex(gIndex, tIndex) === keyboardIndex, pinned: task.pinned, important: task.important }]"
                                  :style="{ '--task-list-color': listColorOf(task.listId) }"
                                  @click="chooseTask(task.id)"
                                  @mouseenter="keyboardIndex = flatGroupedIndex(gIndex, tIndex)"
                                >
                                  <span class="clock-task-picker__task-icon">
                                    <span class="clock-task-picker__list-dot" />
                                  </span>
                                  <span>
                                    <strong>{{ task.title }}</strong>
                                    <small class="clock-task-picker__task-meta">
                                      <span><i class="clock-task-picker__list-dot" :style="{ background: listColorOf(task.listId) }" />{{ listNameOf(task.listId) }}</span>
                                      <span v-if="task.dueDate" :class="{ overdue: isOverdue(task.dueDate) }"><Calendar :size="11" />{{ formatDueLabel(task.dueDate) }}</span>
                                      <span v-if="task.priority"><Flag :size="10" />{{ priorityLabel(task.priority) }}</span>
                                      <span v-if="task.important"><Star :size="10" />重要</span>
                                      <span v-if="task.pinned"><Pin :size="10" />置顶</span>
                                      <span v-for="(tag, tagIndex) in task.tags.slice(0, 2)" :key="`${tag}-${tagIndex}`" class="clock-task-picker__task-label"><Tag :size="10" />{{ tag }}</span>
                                      <span v-if="!task.dueDate && !task.priority && !task.important && !task.pinned && !task.tags.length" class="clock-task-picker__task-status"><i />待处理</span>
                                    </small>
                                  </span>
                                  <span class="clock-task-picker__task-tags">
                                    <Pin v-if="task.pinned" :size="13" class="clock-task-picker__task-tag clock-task-picker__task-tag--pinned" />
                                    <Star v-if="task.important" :size="13" class="clock-task-picker__task-tag clock-task-picker__task-tag--important" />
                                    <Check v-if="selectedTaskId === task.id" :size="16" class="clock-task-picker__task-tag clock-task-picker__task-tag--check" />
                                  </span>
                                </button>
                              </template>
                            </template>

                            <template v-else>
                              <button
                                v-for="(task, index) in sidebarTasks"
                                :key="task.id"
                                type="button"
                                :class="['clock-task-picker__task', { active: selectedTaskId === task.id, focused: index === keyboardIndex, pinned: task.pinned, important: task.important }]"
                                :style="{ '--task-list-color': listColorOf(task.listId) }"
                                @click="chooseTask(task.id)"
                                @mouseenter="keyboardIndex = index"
                              >
                                <span class="clock-task-picker__task-icon">
                                  <span class="clock-task-picker__list-dot" :style="{ background: listColorOf(task.listId) }" />
                                </span>
                                  <span>
                                    <strong>{{ task.title }}</strong>
                                    <small class="clock-task-picker__task-meta">
                                      <span v-if="showListName(task)"><i class="clock-task-picker__list-dot" :style="{ background: listColorOf(task.listId) }" />{{ listNameOf(task.listId) }}</span>
                                      <span v-if="task.dueDate" :class="{ overdue: isOverdue(task.dueDate) }"><Calendar :size="11" />{{ formatDueLabel(task.dueDate) }}</span>
                                      <span v-if="task.priority"><Flag :size="10" />{{ priorityLabel(task.priority) }}</span>
                                      <span v-if="task.important"><Star :size="10" />重要</span>
                                      <span v-if="task.pinned"><Pin :size="10" />置顶</span>
                                      <span v-for="(tag, tagIndex) in task.tags.slice(0, 2)" :key="`${tag}-${tagIndex}`" class="clock-task-picker__task-label"><Tag :size="10" />{{ tag }}</span>
                                      <span v-if="!task.dueDate && !task.priority && !task.important && !task.pinned && !task.tags.length" class="clock-task-picker__task-status"><i />待处理</span>
                                    </small>
                                </span>
                                <span class="clock-task-picker__task-tags">
                                  <Pin v-if="task.pinned" :size="13" class="clock-task-picker__task-tag clock-task-picker__task-tag--pinned" />
                                  <Star v-if="task.important" :size="13" class="clock-task-picker__task-tag clock-task-picker__task-tag--important" />
                                  <Check v-if="selectedTaskId === task.id" :size="16" class="clock-task-picker__task-tag clock-task-picker__task-tag--check" />
                                </span>
                              </button>
                            </template>

                            <p v-if="!sidebarTasks.length" class="clock-task-picker__empty">{{ sidebarEmptyText }}</p>
                          </template>
                        </div>
                      </div>

                      <footer class="clock-task-picker__footer">
                        <div class="clock-task-picker__selection" :class="{ 'is-empty': !selectedTask }" aria-live="polite">
                          <span class="clock-task-picker__selection-icon">
                            <ListTodo v-if="!selectedTask" :size="15" />
                            <span v-else class="clock-task-picker__list-dot clock-task-picker__list-dot--lg" :style="{ background: listColorOf(selectedTask.listId) }" />
                          </span>
                          <span>
                            <small>{{ selectedTask ? '已选择' : '尚未选择任务' }}</small>
                            <strong>{{ selectedTask ? selectedTask.title : '暂不关联任务' }}</strong>
                          </span>
                        </div>
                        <button v-if="selectedTask" type="button" class="clock-task-picker__selection-clear" title="移除本次专注的任务关联" @click="chooseTask(null)">
                          <X :size="15" />取消关联
                        </button>
                        <button
                          type="button"
                          class="clock-task-picker__footer-cta"
                          @click="confirmAndStart"
                        >
                          <Play :size="16" fill="currentColor" />{{ ctaLabel }}
                        </button>
                      </footer>
                    </div>
                  </div>
                </Transition>
              </Teleport>
            </div>
          </template>
          <template v-else>
            <p class="clock-setup__task">{{ currentTaskTitle }}</p>
            <label v-if="activeSession?.phase === 'focus'" class="clock-task-picker"><span>结束备注（可选）</span><input v-model="finishNote" maxlength="240" placeholder="例如：已完成初稿" /></label>
          </template>
        </section>

        <section class="clock-side-card clock-side-card--stats">
          <header><span class="clock-side-card__icon"><BarChart3 :size="19" /></span><span class="clock-side-card__heading"><h2>今日状态</h2><small>当前投入与今日成长</small></span><button class="clock-side-card__history-link" type="button" @click="store.setClockView('history')">回顾 <ChevronDown :size="14" /></button></header>
          <div class="clock-today clock-today--garden">
            <div><span>今日有效专注</span><strong>{{ gardenToday.growthMinutes }} / {{ gardenToday.goalMinutes }} 分钟</strong><small>{{ gardenStageName }} · {{ todayCompletedCount }} 次完成</small></div>
            <FocusStageArtwork :species-id="gardenToday.speciesId" :stage="gardenToday.stage" motion="static" />
          </div>
          <div class="clock-garden-progress" role="progressbar" :aria-valuenow="gardenProgress" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: `${gardenProgress}%` }" /></div>
          <div class="clock-stat-grid"><div><span>今日总计</span><strong>{{ durationText(todaySeconds) }}</strong></div><div><span>完成轮次</span><strong>{{ todayCompletedCount }} 轮</strong></div><div><span>中断</span><strong>{{ todayInterruptedCount }} 次</strong></div></div>
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
import { AlignLeft, BarChart3, Calendar, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Coffee, Flag, Folder, Focus, History, LayoutGrid, Leaf, ListChecks, ListTodo, Minus, Pause, PictureInPicture2, Pin, Play, Plus, Search, Sparkles, Star, Tag, Target, Timer, X } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { openFocusController } from '@/services/platform'
import RhythmWorkspace from './RhythmWorkspace.vue'
import FocusHistoryWorkspace from './FocusHistoryWorkspace.vue'
import FocusAchievementWorkspace from './FocusAchievementWorkspace.vue'
import { FOCUS_GARDEN_STAGES } from '@/utils/focusGarden.mjs'

const FocusStageArtwork = defineAsyncComponent(() => import('./FocusStageArtwork.vue'))
const store = useTaskStore()
const selectedProfileId = ref('pomodoro')
const selectedTaskId = ref(null)
const freeDurationMinutes = ref(15)
const freeDurationEditing = ref(false)
const freeDurationEditor = ref(null)
const finishNote = ref('')
const taskPicker = ref(null)
const taskPickerOpen = ref(false)
const taskSearchQuery = ref('')
const sidebarId = ref('all')
const viewMode = ref('list')
const keyboardIndex = ref(0)
const taskSearchInput = ref(null)
const collapsedListGroupKeys = ref(new Set())
const visualClockNow = ref(Date.now())
let visualClockFrame = null
const activeSession = computed(() => store.activeFocusSession)
const pendingBreak = computed(() => store.focusPendingBreak)
const gardenToday = computed(() => store.focusGardenToday)
const gardenStageName = computed(() => FOCUS_GARDEN_STAGES.find(item => item.id === gardenToday.value.stage)?.name || '种子')
const gardenStageIndex = computed(() => Math.max(0, FOCUS_GARDEN_STAGES.findIndex(item => item.id === gardenToday.value.stage)))
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
const sidebarTasks = computed(() => {
  if (sidebarId.value === 'all') {
    return openTasks.value
      .slice()
      .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (Number(b.important) - Number(a.important)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(decorateTask)
  }
  if (sidebarId.value === 'recent') {
    const listIds = new Set(recentLists.value.map(list => list.id))
    return openTasks.value
      .filter(task => listIds.has(task.listId))
      .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(decorateTask)
  }
  return openTasks.value
    .filter(task => task.listId === sidebarId.value)
    .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(decorateTask)
})
const sidebarTitle = computed(() => {
  if (sidebarId.value === 'all') return '全部任务'
  if (sidebarId.value === 'recent') return '最近使用'
  return store.lists.find(list => list.id === sidebarId.value)?.name || '清单'
})
const sidebarEmptyText = computed(() => {
  if (sidebarId.value === 'recent') return '最近还没有专注过任务，去「全部」挑一个吧'
  return '这个清单下还没有任务'
})
const heroSubtitle = computed(() => {
  if (taskSearchQuery.value.trim()) return `搜索「${taskSearchQuery.value.trim()}」的结果`
  if (selectedTask.value) return `当前已选：${selectedTask.value.title}`
  return '从左侧分组浏览，或直接搜索'
})
const groupedTasks = computed(() => {
  if (sidebarId.value === 'all' || sidebarId.value === 'recent') {
    const tasksByList = new Map()
    sidebarTasks.value.forEach(task => {
      if (!tasksByList.has(task.listId)) tasksByList.set(task.listId, [])
      tasksByList.get(task.listId).push(task)
    })
    return [...tasksByList.entries()].map(([listId, tasks]) => ({
      id: `list:${listId}`,
      name: listNameOf(listId),
      emoji: '',
      color: 'auto',
      customColor: '',
      tasks,
      isUngrouped: false
    }))
  }
  const listId = sidebarId.value
  const listTasks = openTasks.value.filter(task => task.listId === listId)
  const groups = store.taskGroups
    .filter(group => group.listId === listId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const result = groups.map(group => {
    const tasks = listTasks
      .filter(task => task.taskGroupId === group.id)
      .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (Number(b.important) - Number(a.important)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(decorateTask)
    return { ...group, tasks }
  })
  const ungroupedTasks = listTasks
    .filter(task => !task.taskGroupId)
    .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (Number(b.important) - Number(a.important)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(decorateTask)
  if (ungroupedTasks.length) {
    result.push({ id: '__ungrouped__', name: '未分组', emoji: '', color: 'auto', customColor: '', tasks: ungroupedTasks, isUngrouped: true })
  }
  return result.filter(group => group.tasks.length)
})
const groupedTasksTotal = computed(() => groupedTasks.value.reduce((sum, group) => sum + group.tasks.length, 0))
const canToggleView = computed(() => Boolean(sidebarId.value))
const useGroupedView = computed(() => canToggleView.value && viewMode.value === 'group')
function flatGroupedIndex(gIndex, tIndex) {
  let i = 0
  for (let g = 0; g < gIndex; g++) i += groupedTasks.value[g].tasks.length
  return i + tIndex
}
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
const stageDetail = computed(() => activeSession.value ? (activeSession.value.phase === 'focus' ? currentTaskTitle.value : '暂时离开屏幕，回来再继续。') : pendingBreak.value ? '刚完成一段专注，给自己一点恢复时间。' : selectedProfileId.value === 'free-focus' && selectedDurationSeconds.value ? `自由设定 ${durationText(selectedDurationSeconds.value)}，点击时间可修改。` : selectedProfile.value?.description || '')
const headline = computed(() => activeSession.value ? (activeSession.value.phase === 'focus' ? '保持在这件事上' : '让大脑真正休息') : pendingBreak.value ? '先恢复，再继续' : '从一件小事开始')
const todayHistory = computed(() => store.focusHistory.filter(item => new Date(item.finishedAt).toDateString() === new Date().toDateString()))
const todaySeconds = computed(() => todayHistory.value.filter(item => item.phase === 'focus').reduce((total, item) => total + item.elapsedSeconds, 0))
const todayCompletedCount = computed(() => todayHistory.value.filter(item => item.phase === 'focus' && item.result === 'completed').length)
const todayInterruptedCount = computed(() => todayHistory.value.filter(item => item.phase === 'focus' && item.result !== 'completed').length)
function setGardenGoal(event) { store.updateFocusGardenSettings({ dailyGoalMinutes: Number(event.target.value) }) }
function start() { store.startFocus(selectedProfile.value?.id, selectedTaskId.value, selectedProfileId.value === 'free-focus' ? selectedDurationSeconds.value : undefined) }
function finish(result) { store.finishFocus(result, finishNote.value); finishNote.value = '' }
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
function toggleFreeDurationEditor() { freeDurationEditing.value = !freeDurationEditing.value }
function closeFreeDurationEditor(event) {
  if (!freeDurationEditing.value) return
  if (freeDurationEditor.value?.contains(event.target)) return
  if (event.target?.closest?.('.clock-free-time__editor')) return
  freeDurationEditing.value = false
}
function toggleTaskPicker() {
  taskPickerOpen.value = !taskPickerOpen.value
  if (taskPickerOpen.value) {
    taskSearchQuery.value = ''
    sidebarId.value = 'all'
    viewMode.value = 'list'
    keyboardIndex.value = 0
    nextTick(() => taskSearchInput.value?.focus())
  }
}
function selectSidebar(id) {
  sidebarId.value = id
  taskSearchQuery.value = ''
  viewMode.value = id === 'all' || id === 'recent' ? 'list' : 'group'
  keyboardIndex.value = 0
  nextTick(() => taskSearchInput.value?.focus())
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
function groupColorOf(task) {
  if (!task.taskGroupId) return 'auto'
  const group = store.taskGroups.find(g => g.id === task.taskGroupId)
  return group?.color || 'auto'
}
function showListName(task) { return sidebarId.value === 'all' || sidebarId.value === 'recent' }
function onPickerKeydown(event) {
  const items = taskSearchQuery.value.trim()
    ? searchResults.value
    : (useGroupedView.value
        ? groupedTasks.value.flatMap(group => group.tasks)
        : sidebarTasks.value)
  if (!items.length) {
    if (event.key === 'Escape') { event.preventDefault(); taskPickerOpen.value = false }
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    keyboardIndex.value = (keyboardIndex.value + 1) % items.length
    scrollFocusedIntoView()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    keyboardIndex.value = (keyboardIndex.value - 1 + items.length) % items.length
    scrollFocusedIntoView()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (taskSearchQuery.value.trim()) handleSearchHit(items[keyboardIndex.value])
    else chooseTask(items[keyboardIndex.value].id)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    taskPickerOpen.value = false
  }
}
function scrollFocusedIntoView() {
  nextTick(() => {
    const target = taskPicker.value?.querySelector('.clock-task-picker__task.focused, .clock-task-picker__task.is-focused')
    if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'nearest' })
  })
}
watch(taskSearchQuery, () => { keyboardIndex.value = 0 })
watch(sidebarId, () => { keyboardIndex.value = 0 })
function formatClock(seconds) { const value = Math.max(0, Math.floor(seconds || 0)); return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
function formatTime(date) { return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
function durationText(seconds) { if (seconds === null || seconds === undefined) return '自由计时'; const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时` : `${minutes} 分钟` }
function closeTaskPicker() { taskPickerOpen.value = false }
function syncVisualClock() {
  visualClockNow.value = Date.now()
  visualClockFrame = window.requestAnimationFrame(syncVisualClock)
}
watch(taskPickerOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})
onMounted(() => {
  window.addEventListener('pointerdown', closeFreeDurationEditor)
  visualClockFrame = window.requestAnimationFrame(syncVisualClock)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', closeFreeDurationEditor)
  if (visualClockFrame) window.cancelAnimationFrame(visualClockFrame)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>
