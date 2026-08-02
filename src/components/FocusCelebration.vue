<template>
  <Teleport to="body">
    <Transition name="focus-celebration">
      <div v-if="celebration" class="focus-celebration" role="dialog" aria-modal="true" aria-labelledby="focus-celebration-title" aria-describedby="focus-celebration-description" @click.self="dismiss" @keydown.esc.stop="dismiss" @keydown.tab="trapFocus">
        <section ref="dialogCard" class="focus-celebration__card" role="document">
          <span class="focus-celebration__glow focus-celebration__glow--top" aria-hidden="true"></span>
          <span class="focus-celebration__glow focus-celebration__glow--bottom" aria-hidden="true"></span>
          <button class="focus-celebration__close" type="button" aria-label="关闭专注完成提示" @click="dismiss"><X :size="20" /></button>

          <div class="focus-celebration__hero" aria-hidden="true">
            <span class="focus-celebration__halo"></span>
            <span class="focus-celebration__orbit"></span>
            <span class="focus-celebration__check"><CircleCheck :size="43" :stroke-width="1.8" /></span>
            <Sparkles class="focus-celebration__sparkle focus-celebration__sparkle--one" :size="18" />
            <Sparkles class="focus-celebration__sparkle focus-celebration__sparkle--two" :size="13" />
          </div>

          <div class="focus-celebration__copy">
            <div class="focus-celebration__kicker">
              <p class="focus-celebration__eyebrow"><span></span>专注完成</p>
              <span class="focus-celebration__saved"><Check :size="13" :stroke-width="2.2" />已记录</span>
            </div>
            <h2 id="focus-celebration-title">重要的事，又向前了一步</h2>
            <p class="focus-celebration__metric">
              <strong>{{ durationParts.value }}</strong>
              <span>{{ durationParts.unit }}</span>
            </p>
            <p id="focus-celebration-description" class="focus-celebration__duration">这一轮专注，已经安静地收进你的历程</p>
          </div>

          <div v-if="celebration.taskTitle || celebration.gardenGrowth?.day" class="focus-celebration__summary">
            <div v-if="celebration.taskTitle" class="focus-celebration__task">
              <span><ListChecks :size="15" />本轮推进</span>
              <strong>{{ celebration.taskTitle }}</strong>
            </div>

            <div v-if="celebration.gardenGrowth?.day" class="focus-celebration__reward focus-celebration__reward--plant">
              <span class="focus-celebration__reward-icon"><FocusStageArtwork :species-id="celebration.gardenGrowth.day.speciesId" :stage="celebration.gardenGrowth.day.stage" motion="static" /></span>
              <span><small>今日花成长</small><strong>{{ gardenStageName }}</strong></span>
            </div>
          </div>

          <div v-if="unlockedSpecies.length" class="focus-celebration__unlock" role="status">
            <span class="focus-celebration__unlock-shine" aria-hidden="true"></span>
            <span class="focus-celebration__unlock-plant" aria-hidden="true">
              <FocusStageArtwork :species-id="unlockedSpecies[0].id" stage="bloom" motion="static" />
            </span>
            <span class="focus-celebration__unlock-copy">
              <small>新花种解锁</small>
              <strong>{{ unlockedSpecies.map(item => item.name).join('、') }}</strong>
              <span>已收进花种图鉴</span>
            </span>
            <span class="focus-celebration__unlock-stamp" aria-hidden="true">已收藏</span>
          </div>

          <p v-if="celebration.pendingBreak" class="focus-celebration__tip">
            <span><Coffee :size="18" /></span>
            <span><strong>给自己 {{ durationText(celebration.breakSeconds) }} 空白</strong><small>起身喝水，看看远处，让注意力慢慢回满。</small></span>
          </p>

          <div class="focus-celebration__actions">
            <button v-if="celebration.pendingBreak" ref="primaryAction" class="focus-celebration__primary" type="button" @click="$emit('start-break')"><Coffee :size="17" />开始休息</button>
            <button v-else ref="primaryAction" class="focus-celebration__primary" type="button" @click="$emit('dismiss')"><Check :size="17" />收下这次专注</button>
            <button v-if="celebration.pendingBreak" class="focus-celebration__secondary" type="button" @click="$emit('dismiss')">稍后休息</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue'
import { Check, CircleCheck, Coffee, ListChecks, Sparkles, X } from 'lucide-vue-next'
import { FOCUS_GARDEN_SPECIES, FOCUS_GARDEN_STAGES } from '@/utils/focusGarden.mjs'

const FocusStageArtwork = defineAsyncComponent(() => import('./FocusStageArtwork.vue'))
const props = defineProps({
  celebration: { type: Object, default: null }
})

const emit = defineEmits(['dismiss', 'start-break'])
const primaryAction = ref(null)
const dialogCard = ref(null)

const gardenStageName = computed(() => FOCUS_GARDEN_STAGES.find(item => item.id === props.celebration?.gardenGrowth?.day?.stage)?.name || '正在生长')
const unlockedSpecies = computed(() => {
  const ids = new Set(props.celebration?.gardenGrowth?.unlockedSpeciesIds || [])
  return FOCUS_GARDEN_SPECIES.filter(item => ids.has(item.id))
})

const durationParts = computed(() => {
  const minutes = Math.max(1, Math.round((Number(props.celebration?.elapsedSeconds) || 0) / 60))
  if (minutes >= 60 && minutes % 60 === 0) return { value: minutes / 60, unit: '小时' }
  return { value: minutes, unit: '分钟' }
})

watch(() => props.celebration?.id, async (id) => {
  if (!id) return
  await nextTick()
  primaryAction.value?.focus()
})

function dismiss() {
  emit('dismiss')
}

function trapFocus(event) {
  const controls = [...(dialogCard.value?.querySelectorAll('button:not(:disabled)') || [])]
  if (!controls.length) return
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function durationText(seconds) {
  const minutes = Math.max(1, Math.round((Number(seconds) || 0) / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ''}` : `${minutes} 分钟`
}
</script>
