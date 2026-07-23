<template>
  <Teleport to="body">
    <Transition name="focus-celebration">
      <div v-if="displayCelebration" class="focus-celebration" role="dialog" aria-modal="true" aria-labelledby="focus-celebration-title" @click.self="dismiss">
        <section class="focus-celebration__card">
          <button class="focus-celebration__close" type="button" aria-label="稍后处理休息" @click="dismiss"><X :size="20" /></button>
          <header class="focus-celebration__header">
            <span class="focus-celebration__brand"><CircleCheck :size="22" /></span>
            <span>易简清单 · 专注时刻</span>
          </header>
          <div class="focus-celebration__copy">
            <p class="focus-celebration__eyebrow">这一轮，完成得很稳</p>
            <h2 id="focus-celebration-title">{{ displayCelebration.pendingBreak ? '给大脑留一点空白吧' : '你的专注已记下' }}</h2>
            <p class="focus-celebration__duration">完成 {{ durationText(displayCelebration.elapsedSeconds) }} 专注{{ displayCelebration.pendingBreak ? `，建议休息 ${durationText(displayCelebration.breakSeconds)}` : '，继续保持这个节奏' }}。</p>
          </div>
          <div v-if="displayCelebration.reward" class="focus-celebration__reward">
            <FocusRewardBadge :reward="displayCelebration.reward" size="md" />
            <span>收获 {{ rewardName }}</span>
          </div>
          <p v-if="displayCelebration.pendingBreak" class="focus-celebration__tip"><Coffee :size="16" />离开屏幕，喝口水，看看远处。</p>
          <div class="focus-celebration__actions">
            <button v-if="displayCelebration.pendingBreak" class="focus-celebration__primary" type="button" @click="startBreak">开始休息</button>
            <button v-else class="focus-celebration__primary" type="button" @click="dismiss">收下这份专注</button>
            <button v-if="displayCelebration.pendingBreak" class="focus-celebration__secondary" type="button" @click="dismiss">稍后再说</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CircleCheck, Coffee, X } from 'lucide-vue-next'
import { listen } from '@tauri-apps/api/event'
import FocusRewardBadge from './FocusRewardBadge.vue'
import { handleFocusReminderAction } from '@/services/platform'

const props = defineProps({
  celebration: { type: Object, default: null }
})

const emit = defineEmits(['dismiss', 'start-break'])
const nativeCelebration = ref(null)
const isNativeReminderWindow = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('focus-reminder')
let unlistenReminder
const displayCelebration = computed(() => nativeCelebration.value || props.celebration)

const rewardName = computed(() => ({
  blueberry: '蓝莓', strawberry: '草莓', tomato: '番茄', watermelon: '西瓜', pumpkin: '南瓜'
}[displayCelebration.value?.reward] || '蓝莓'))

async function dismiss() {
  if (isNativeReminderWindow) {
    nativeCelebration.value = null
    await handleFocusReminderAction('dismiss')
    return
  }
  emit('dismiss')
}

async function startBreak() {
  if (isNativeReminderWindow) {
    nativeCelebration.value = null
    await handleFocusReminderAction('start-break')
    return
  }
  emit('start-break')
}

onMounted(async () => {
  if (!isNativeReminderWindow) return
  unlistenReminder = await listen('focus-reminder:show', event => { nativeCelebration.value = event.payload })
})

onBeforeUnmount(() => unlistenReminder?.())

function durationText(seconds) {
  const minutes = Math.max(1, Math.round((Number(seconds) || 0) / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ''}` : `${minutes} 分钟`
}
</script>
