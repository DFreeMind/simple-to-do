<template>
  <NativeReminderWindowShell
    v-slot="{ startWindowDrag }"
    class="rhythm-controller-window"
    :class="{ expanded }"
    @dismiss="close"
  >
    <section v-if="controller && primaryItem" class="rhythm-dock" :class="{ expanded }" :style="dockStyle">
      <header class="rhythm-dock__bar" @pointerdown="startWindowDrag">
        <span class="rhythm-dock__pulse" :class="toneClass(primaryItem)">
          <component :is="reminderIcon(primaryItem)" :size="18" />
        </span>
        <span class="rhythm-dock__primary">
          <small><i :class="`is-${primaryItem.state}`"></i>{{ primaryStatus }}</small>
          <strong>{{ primaryItem.title }}</strong>
        </span>
        <span class="rhythm-dock__timing"><strong class="rhythm-dock__time">{{ displayTime(primaryItem) }}</strong><small>{{ primaryTimeLabel }}</small></span>
        <span class="rhythm-dock__count">{{ controller.pendingCount ? `${controller.pendingCount} 项待处理` : `${controller.runningCount} 项运行` }}</span>
        <span class="rhythm-dock__quick" @pointerdown.stop>
          <button type="button" :aria-label="expanded ? '收起节律控制器' : '展开节律控制器'" :aria-expanded="expanded" @click="toggleExpanded">
            <ChevronDown v-if="!expanded" :size="17" /><ChevronUp v-else :size="17" />
          </button>
        </span>
      </header>

      <template v-if="expanded">
        <div class="rhythm-dock__toolbar" @pointerdown="startWindowDrag">
          <span class="rhythm-dock__heading"><i><Waves :size="15" /></i><strong>节律控制器</strong><small>{{ controller.pendingCount ? `${controller.pendingCount} 项待处理` : `${controller.runningCount} 项正在运行` }}</small></span>
          <span class="rhythm-dock__tools" @pointerdown.stop>
            <button type="button" :class="{ active: controller.globalPaused }" @click="perform(null, controller.globalPaused ? 'resume-all' : 'pause-all')">
              <Play v-if="controller.globalPaused" :size="14" fill="currentColor" /><Pause v-else :size="14" />{{ controller.globalPaused ? '全部继续' : '全部暂停' }}
            </button>
            <button type="button" :class="{ active: controller.alwaysOnTop }" :aria-label="controller.alwaysOnTop ? '取消窗口置顶' : '置顶窗口'" @click="toggleAlwaysOnTop">
              <Pin v-if="controller.alwaysOnTop" :size="14" fill="currentColor" /><PinOff v-else :size="14" />
            </button>
            <button type="button" aria-label="收起节律控制器" aria-expanded="true" @click="toggleExpanded"><ChevronUp :size="15" /></button>
            <button type="button" aria-label="关闭节律控制器" @click="close"><X :size="15" /></button>
          </span>
        </div>

        <div class="rhythm-dock__items" aria-live="polite">
          <article v-for="item in visibleItems" :key="item.id" class="rhythm-dock-item" :class="[toneClass(item), `is-${item.state}`]" :style="{ '--rhythm-progress': `${progressPercent(item)}%` }">
            <div class="rhythm-dock-item__identity">
              <span><component :is="reminderIcon(item)" :size="17" /></span>
              <div class="rhythm-dock-item__copy"><strong>{{ item.title }}</strong><small>{{ itemStatus(item) }} · {{ item.triggerLabel }}</small></div>
              <div class="rhythm-dock-item__time"><b>{{ displayTime(item) }}</b><small>{{ item.state === 'due' ? '等待处理' : item.triggerType === 'active-duration' ? '距提醒' : '剩余' }}</small></div>
            </div>
            <div class="rhythm-dock-item__progress" aria-hidden="true"><i /></div>
            <div v-if="item.state === 'due'" class="rhythm-dock-item__due-actions">
              <button class="primary" type="button" @click="perform(item.id, 'complete')"><Check :size="13" />{{ item.triggerType === 'active-duration' ? '我已活动' : '完成' }}</button>
              <button type="button" @click="perform(item.id, 'snooze')"><Clock3 :size="13" />延后 5 分</button>
              <button type="button" @click="perform(item.id, 'skip')">今天跳过</button>
            </div>
            <div v-else-if="item.state !== 'waiting'" class="rhythm-dock-item__actions">
              <button v-if="item.triggerType !== 'fixed-time'" type="button" aria-label="本轮提前 5 分钟" @click="perform(item.id, 'subtract-five')"><Minus :size="13" />5</button>
              <button v-if="item.triggerType !== 'fixed-time'" type="button" aria-label="本轮延后 5 分钟" @click="perform(item.id, 'add-five')"><Plus :size="13" />5</button>
              <button type="button" @click="perform(item.id, item.pausedIndividually ? 'resume' : 'pause')">
                <Play v-if="item.pausedIndividually" :size="13" fill="currentColor" />
                <Pause v-else :size="13" />{{ item.pausedIndividually ? '继续' : '暂停' }}
              </button>
            </div>
          </article>
        </div>

        <footer class="rhythm-dock__footer">
          <span v-if="controller.items.length > 3">还有 {{ controller.items.length - 3 }} 项节律</span><span v-else>关闭控制器不会暂停节律</span>
          <button type="button" @click="perform(null, 'open-app')">打开节律工作台<ArrowUpRight :size="14" /></button>
        </footer>
      </template>
    </section>
  </NativeReminderWindowShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { Accessibility, ArrowUpRight, Bell, Check, ChevronDown, ChevronUp, Clock3, Droplets, Eye, Minus, Pause, Pin, PinOff, Play, Plus, Sparkles, Waves, Wind, X } from 'lucide-vue-next'
import NativeReminderWindowShell from './NativeReminderWindowShell.vue'
import {
  getRhythmControllerPayload,
  handleRhythmControllerAction,
  markRhythmControllerReady,
  setRhythmControllerAlwaysOnTop,
  setRhythmControllerExpanded
} from '@/services/platform'
import { formatRhythmControllerTime, getRhythmControllerLiveSeconds, rhythmControllerProgress } from '@/utils/rhythmController.mjs'

const controller = ref(null)
const expanded = ref(false)
const now = ref(Date.now())
const busy = ref(false)
let unlistenRefresh
let unlistenCollapse
let timer

const primaryItem = computed(() => controller.value?.items?.[0] || null)
const visibleItems = computed(() => controller.value?.items?.slice(0, 3) || [])
const expandedDockHeight = computed(() => `${220 + Math.max(0, visibleItems.value.length - 1) * 96}px`)
const dockStyle = computed(() => ({
  '--rhythm-dock-height': expanded.value ? expandedDockHeight.value : undefined,
  '--rhythm-item-tone': toneColor(primaryItem.value)
}))
const primaryStatus = computed(() => itemStatus(primaryItem.value))
const primaryTimeLabel = computed(() => {
  const item = primaryItem.value
  if (!item) return ''
  if (item.state === 'due') return '等待处理'
  if (item.state === 'waiting') return '等待中'
  if (item.state === 'paused') return '已暂停'
  return item.triggerType === 'active-duration' ? '距提醒' : '剩余时间'
})

function liveSeconds(item) {
  return getRhythmControllerLiveSeconds(item, now.value, controller.value?.syncedAt)
}
function displayTime(item) {
  if (item?.state === 'due') return '待处理'
  if (item?.state === 'waiting') return '等待中'
  if (item?.state === 'paused') return '已暂停'
  return formatRhythmControllerTime(liveSeconds(item))
}
function progressPercent(item) { return Math.round(rhythmControllerProgress(item, liveSeconds(item)) * 100) }
function itemStatus(item) {
  if (!item) return ''
  if (item.state === 'due') return '现在需要处理'
  if (item.state === 'waiting') return '等待前一项处理'
  if (item.state === 'paused') return item.pausedIndividually ? '本项已暂停' : '节律已暂停'
  if (item.state === 'outside-schedule') return '下一工作时段'
  if (item.triggerType === 'fixed-time') return '下一固定提醒'
  return '正在计时'
}
function reminderIcon(item) {
  return { eye: Eye, droplets: Droplets, accessibility: Accessibility, sparkles: Sparkles, wind: Wind }[item?.icon] || Bell
}
function toneClass(item) { return `tone-${item?.color || 'cyan'}` }
function toneColor(item) {
  return { blue: '#397bc7', amber: '#bf7a21', violet: '#765ccc', rose: '#bd5874', green: '#4d8a59', cyan: '#2f8f86' }[item?.color] || '#2f8f86'
}

async function loadController() {
  const payload = await getRhythmControllerPayload()
  if (!payload) return
  controller.value = payload
  busy.value = false
  await markRhythmControllerReady(payload.revision)
}
async function perform(reminderId, action) {
  if (!controller.value || busy.value) return
  busy.value = true
  try { await handleRhythmControllerAction(reminderId, action) }
  catch (error) { console.error('[RhythmControllerWindow] 执行节律操作失败:', error) }
  window.setTimeout(() => { busy.value = false }, 450)
}
async function toggleExpanded() {
  const next = !expanded.value
  if (await setRhythmControllerExpanded(next)) expanded.value = next
}
async function toggleAlwaysOnTop() {
  const next = controller.value?.alwaysOnTop === false
  await setRhythmControllerAlwaysOnTop(next)
  controller.value = { ...controller.value, alwaysOnTop: next }
}
function close() { expanded.value = false; return perform(null, 'close') }

onMounted(async () => {
  document.documentElement.classList.add('rhythm-controller-native')
  document.body.classList.add('rhythm-controller-native')
  unlistenRefresh = await listen('rhythm-controller:refresh', loadController)
  unlistenCollapse = await listen('rhythm-controller:collapse', () => { expanded.value = false })
  timer = window.setInterval(() => { now.value = Date.now() }, 250)
  await loadController()
})
onBeforeUnmount(() => {
  document.documentElement.classList.remove('rhythm-controller-native')
  document.body.classList.remove('rhythm-controller-native')
  unlistenRefresh?.()
  unlistenCollapse?.()
  if (timer) window.clearInterval(timer)
})
</script>

<style scoped>
:global(html.rhythm-controller-native),:global(body.rhythm-controller-native),:global(body.rhythm-controller-native #app),:global(body.rhythm-controller-native #app>main){background:transparent!important;box-shadow:none!important}.rhythm-controller-window{display:grid;width:100vw;height:100vh;place-items:center;overflow:hidden;color:#17211f;background:transparent;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}.rhythm-dock{width:382px;height:78px;margin:4px;overflow:hidden;border:1px solid rgba(41,105,94,.16);border-radius:27px;background:rgba(255,255,255,.98);box-shadow:0 14px 34px rgba(31,82,72,.18);user-select:none}.rhythm-dock.expanded{display:grid;width:382px;height:var(--rhythm-dock-height);grid-template-rows:46px minmax(0,1fr) 38px;border-radius:24px}.rhythm-dock__bar{display:grid;height:76px;grid-template-columns:44px minmax(0,1fr) auto auto auto;align-items:center;gap:10px;padding:0 11px 0 14px}.expanded>.rhythm-dock__bar{display:none}.rhythm-dock__pulse{display:grid;width:42px;height:42px;place-items:center;border-radius:14px;color:#238f80;background:#e5f5f2}.rhythm-dock__primary{display:grid;min-width:0;gap:2px}.rhythm-dock__primary small{color:#667873;font-size:10px}.rhythm-dock__primary strong{overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.rhythm-dock__time{font-size:20px;font-variant-numeric:tabular-nums;letter-spacing:-.035em}.rhythm-dock__count{padding:4px 7px;border-radius:999px;color:#517069;background:#edf6f3;font-size:9px;font-weight:700;white-space:nowrap}.rhythm-dock__quick button,.rhythm-dock__tools button,.rhythm-dock-item button,.rhythm-dock__footer button{cursor:pointer}.rhythm-dock__quick button{display:grid;width:30px;height:30px;place-items:center;border-radius:10px;color:#49635d;background:#f4f8f7}.rhythm-dock__toolbar{display:flex;align-items:center;justify-content:space-between;padding:7px 10px 5px 14px;border-bottom:1px solid #edf2f0}.rhythm-dock__toolbar>span:first-child{display:flex;align-items:center;gap:7px;color:#1f6f68;font-size:12px}.rhythm-dock__tools{display:flex;align-items:center;gap:3px}.rhythm-dock__tools button{display:inline-flex;min-height:28px;align-items:center;gap:4px;padding:0 8px;border-radius:8px;color:#58706a;background:#f4f8f7;font-size:9px;font-weight:700}.rhythm-dock__tools button.active{color:#1f6f68;background:#e5f5f2}.rhythm-dock__tools button:not(:first-child){width:28px;padding:0;justify-content:center}.rhythm-dock__items{display:grid;align-content:start;gap:7px;padding:8px 10px;overflow:auto;scrollbar-width:none}.rhythm-dock__items::-webkit-scrollbar{display:none}.rhythm-dock-item{display:grid;gap:6px;padding:9px 10px;border:1px solid #e4ece9;border-radius:13px;background:#fbfdfc}.rhythm-dock-item.is-due{border-color:#e8bd8a;background:#fffaf2}.rhythm-dock-item.is-paused{opacity:.72}.rhythm-dock-item__identity{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:8px}.rhythm-dock-item__identity>span{display:grid;width:29px;height:29px;place-items:center;border-radius:9px;color:#238f80;background:#e8f5f2}.rhythm-dock-item__identity>div{display:grid;min-width:0;gap:1px}.rhythm-dock-item__identity strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.rhythm-dock-item__identity small{overflow:hidden;color:#6a7b76;font-size:8.5px;text-overflow:ellipsis;white-space:nowrap}.rhythm-dock-item__identity b{font-size:14px;font-variant-numeric:tabular-nums}.rhythm-dock-item__progress{height:3px;overflow:hidden;border-radius:99px;background:#e8efed}.rhythm-dock-item__progress i{display:block;height:100%;border-radius:inherit;background:#2f8f86}.rhythm-dock-item__actions,.rhythm-dock-item__due-actions{display:flex;justify-content:flex-end;gap:4px}.rhythm-dock-item button{display:inline-flex;min-height:25px;align-items:center;justify-content:center;gap:3px;padding:0 8px;border:1px solid #dae5e2;border-radius:7px;color:#536b65;background:#fff;font-size:8.5px;font-weight:700}.rhythm-dock-item button:hover{color:#1f6f68;background:#edf7f4}.rhythm-dock-item button.primary{border-color:#2f8f86;color:#fff;background:#2f8f86}.rhythm-dock__footer{display:flex;align-items:center;justify-content:space-between;padding:0 11px 5px 14px;border-top:1px solid #edf2f0;color:#72827e;font-size:8.5px}.rhythm-dock__footer button{display:inline-flex;align-items:center;gap:4px;color:#1f6f68;background:transparent;font-size:9px;font-weight:750}.tone-blue .rhythm-dock-item__identity>span,.rhythm-dock__pulse.tone-blue{color:#347ad0;background:#e8f1fd}.tone-amber .rhythm-dock-item__identity>span,.rhythm-dock__pulse.tone-amber{color:#b87720;background:#fff3df}.tone-violet .rhythm-dock-item__identity>span,.rhythm-dock__pulse.tone-violet{color:#7558c9;background:#f0ebff}.tone-rose .rhythm-dock-item__identity>span,.rhythm-dock__pulse.tone-rose{color:#bd5874;background:#fcecf1}.tone-green .rhythm-dock-item__identity>span,.rhythm-dock__pulse.tone-green{color:#4d8a59;background:#eaf5eb}.rhythm-controller-window button:focus-visible{outline:3px solid rgba(47,143,134,.28);outline-offset:1px}@media(prefers-reduced-motion:reduce){.rhythm-dock,.rhythm-dock *{transition:none!important}}

/* 展开态以状态和倒计时为主，操作只在需要时靠近对应节律。 */
.rhythm-dock.expanded {
  border-color: rgba(31, 111, 104, .18);
  background: linear-gradient(155deg, #f8fffd 0%, #ffffff 48%, #f5fbfa 100%);
  box-shadow: 0 18px 42px rgba(19, 79, 69, .20), 0 3px 10px rgba(19, 79, 69, .08);
}
.rhythm-dock__toolbar { min-height: 46px; padding: 7px 9px 6px 12px; border-bottom-color: rgba(33, 111, 99, .10); }
.rhythm-dock__heading { min-width: 0; }
.rhythm-dock__heading i { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 8px; color: #167d70; background: #ddf4ef; }
.rhythm-dock__heading strong { color: #204b45; font-size: 12px; letter-spacing: -.01em; }
.rhythm-dock__heading small { overflow: hidden; max-width: 96px; padding: 3px 6px; border-radius: 999px; color: #4f746d; background: #eff8f5; font-size: 8px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.rhythm-dock__tools { gap: 4px; }
.rhythm-dock__tools button { min-height: 30px; border: 1px solid transparent; border-radius: 9px; color: #52706a; background: transparent; transition: background .18s ease, border-color .18s ease, color .18s ease, transform .18s ease; }
.rhythm-dock__tools button:first-child { padding: 0 9px; color: #176d62; background: #e4f5f0; }
.rhythm-dock__tools button.active { border-color: #b7ded5; color: #176d62; background: #d8f0ea; }
.rhythm-dock__tools button:hover, .rhythm-dock__quick button:hover { border-color: rgba(31, 111, 104, .16); color: #176d62; background: #edf8f5; transform: translateY(-1px); }
.rhythm-dock__items { gap: 8px; padding: 8px 10px 7px; }
.rhythm-dock-item { position: relative; gap: 7px; padding: 10px; overflow: hidden; border-color: rgba(37, 99, 88, .12); border-radius: 14px; background: rgba(255, 255, 255, .84); box-shadow: 0 2px 8px rgba(37, 99, 88, .045); }
.rhythm-dock-item::before { position: absolute; inset: 0 auto 0 0; width: 3px; border-radius: 3px; background: var(--rhythm-item-tone, #2f8f86); content: ''; }
.rhythm-dock-item:hover { border-color: rgba(31, 111, 104, .28); background: #fff; box-shadow: 0 7px 16px rgba(31, 111, 104, .08); }
.rhythm-dock-item.is-due { border-color: #e8c48e; background: #fffaf2; }
.rhythm-dock-item.is-due::before { background: #c9852a; }
.rhythm-dock-item__identity { grid-template-columns: 32px minmax(0, 1fr) auto; gap: 9px; }
.rhythm-dock-item__identity > span { width: 32px; height: 32px; border-radius: 10px; }
.rhythm-dock-item__copy { gap: 2px !important; }
.rhythm-dock-item__identity strong { color: #243d38; font-size: 11.5px; letter-spacing: -.01em; }
.rhythm-dock-item__identity small { color: #71837e; font-size: 8.5px; }
.rhythm-dock-item__time { justify-items: end; gap: 1px !important; }
.rhythm-dock-item__time b { color: #1f554d; font-size: 15px; letter-spacing: -.035em; }
.rhythm-dock-item__time small { color: #8a9a96; font-size: 7.5px; font-weight: 700; letter-spacing: .03em; }
.rhythm-dock-item__progress { height: 4px; background: #e7f0ed; }
.rhythm-dock-item__progress i { width: var(--rhythm-progress); background: var(--rhythm-item-tone, #2f8f86); box-shadow: 0 1px 4px rgba(31, 111, 104, .22); }
.rhythm-dock-item__actions, .rhythm-dock-item__due-actions { justify-content: flex-start; gap: 5px; }
.rhythm-dock-item button { min-height: 27px; padding: 0 9px; border-color: #dce9e5; border-radius: 8px; color: #55716b; background: #fbfefd; font-size: 9px; transition: background .18s ease, border-color .18s ease, color .18s ease, transform .18s ease; }
.rhythm-dock-item button:hover { border-color: #9bcfc3; color: #176d62; background: #edf8f5; transform: translateY(-1px); }
.rhythm-dock-item button.primary { border-color: #258878; background: #258878; box-shadow: 0 3px 7px rgba(37, 136, 120, .18); }
.rhythm-dock__footer { padding: 0 11px 5px 13px; border-top-color: rgba(33, 111, 99, .10); color: #7e918c; }
.rhythm-dock__footer button { padding: 4px 3px; border-radius: 6px; }
.rhythm-dock__footer button:hover { color: #14685d; background: #eaf7f3; }
.tone-blue { --rhythm-item-tone: #397bc7; }.tone-amber { --rhythm-item-tone: #bf7a21; }.tone-violet { --rhythm-item-tone: #765ccc; }.tone-rose { --rhythm-item-tone: #bd5874; }.tone-green { --rhythm-item-tone: #4d8a59; }
@media (prefers-reduced-motion: reduce) { .rhythm-dock * { transition: none !important; } }

/* 紧凑态只呈现一个当前节律，但保留状态、时间与队列三个可扫读层次。 */
.rhythm-dock:not(.expanded) { position: relative; border-color: rgba(30, 106, 93, .20); border-radius: 23px; background: linear-gradient(118deg, #f6fffc 0%, #ffffff 45%, #f8fcfb 100%); box-shadow: 0 12px 30px rgba(24, 79, 68, .16), 0 2px 7px rgba(24, 79, 68, .07); }
.rhythm-dock:not(.expanded)::before { position: absolute; top: 13px; bottom: 13px; left: 0; width: 3px; border-radius: 0 4px 4px 0; background: var(--rhythm-item-tone, #2f8f86); content: ''; }
.rhythm-dock:not(.expanded) .rhythm-dock__bar { grid-template-columns: 43px minmax(0, 1fr) auto auto 31px; gap: 9px; padding: 0 10px 0 15px; }
.rhythm-dock:not(.expanded) .rhythm-dock__pulse { width: 40px; height: 40px; border-radius: 13px; box-shadow: inset 0 0 0 1px rgba(35, 143, 128, .10); }
.rhythm-dock:not(.expanded) .rhythm-dock__primary { gap: 3px; }.rhythm-dock:not(.expanded) .rhythm-dock__primary small { display: inline-flex; align-items: center; gap: 5px; color: #60756f; font-size: 9px; font-weight: 650; }.rhythm-dock:not(.expanded) .rhythm-dock__primary small i { width: 6px; height: 6px; border-radius: 50%; background: #2f8f86; box-shadow: 0 0 0 3px rgba(47, 143, 134, .10); }.rhythm-dock:not(.expanded) .rhythm-dock__primary small i.is-due { background: #c9852a; box-shadow: 0 0 0 3px rgba(201, 133, 42, .11); }.rhythm-dock:not(.expanded) .rhythm-dock__primary small i.is-paused, .rhythm-dock:not(.expanded) .rhythm-dock__primary small i.is-waiting { background: #8a9b96; box-shadow: none; }.rhythm-dock:not(.expanded) .rhythm-dock__primary strong { color: #203d37; font-size: 13px; letter-spacing: -.01em; }
.rhythm-dock__timing { display: grid; justify-items: end; gap: 1px; min-width: 52px; }.rhythm-dock:not(.expanded) .rhythm-dock__time { color: #1c4f47; font-size: 20px; line-height: 1; }.rhythm-dock__timing small { color: #84938f; font-size: 7.5px; font-weight: 700; letter-spacing: .04em; white-space: nowrap; }.rhythm-dock:not(.expanded) .rhythm-dock__count { padding: 4px 7px; border: 1px solid rgba(47, 143, 134, .10); color: #477068; background: #eff8f5; font-size: 8.5px; }
.rhythm-dock:not(.expanded) .rhythm-dock__quick button { width: 31px; height: 31px; border: 1px solid rgba(42, 111, 99, .10); border-radius: 10px; color: #41665f; background: #fff; transition: border-color .18s ease, color .18s ease, background .18s ease, transform .18s ease; }
.rhythm-dock:not(.expanded) .rhythm-dock__quick button:hover { border-color: rgba(31, 111, 104, .25); color: #176d62; background: #edf8f5; transform: translateY(-1px); }

.rhythm-dock.expanded .rhythm-dock-item.is-running { border-color: rgba(47, 143, 134, .19); }.rhythm-dock.expanded .rhythm-dock-item.is-waiting { background: #f9fbfa; }.rhythm-dock.expanded .rhythm-dock-item__actions button:last-child { margin-left: auto; }.rhythm-dock.expanded .rhythm-dock-item__due-actions button.primary { min-width: 84px; }.rhythm-dock.expanded .rhythm-dock__footer { background: rgba(246, 252, 250, .72); }

/* 控制器窗口仅预留极窄的透明圆角空间，外阴影会被窗口边界裁切成脏边。 */
.rhythm-dock,
.rhythm-dock.expanded,
.rhythm-dock:not(.expanded) {
  box-shadow: none;
}
</style>
