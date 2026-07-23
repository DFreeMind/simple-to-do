<template>
  <Teleport to="body">
    <Transition name="focus-celebration">
      <div v-if="celebration" class="focus-celebration" role="dialog" aria-modal="true" aria-labelledby="focus-celebration-title" @click.self="$emit('dismiss')">
        <section class="focus-celebration__card">
          <button class="focus-celebration__close" type="button" aria-label="稍后处理休息" @click="$emit('dismiss')"><X :size="20" /></button>
          <header class="focus-celebration__header">
            <span class="focus-celebration__brand"><CircleCheck :size="22" /></span>
            <span>易简清单 · 专注时刻</span>
          </header>
          <div class="focus-celebration__copy">
            <p class="focus-celebration__eyebrow">这一轮，完成得很稳</p>
            <h2 id="focus-celebration-title">{{ celebration.pendingBreak ? '给大脑留一点空白吧' : '你的专注已记下' }}</h2>
            <p class="focus-celebration__duration">完成 {{ durationText(celebration.elapsedSeconds) }} 专注{{ celebration.pendingBreak ? `，建议休息 ${durationText(celebration.breakSeconds)}` : '，继续保持这个节奏' }}。</p>
          </div>
          <div v-if="celebration.reward" class="focus-celebration__reward">
            <FocusRewardBadge :reward="celebration.reward" size="md" />
            <span>收获 {{ rewardName }}</span>
          </div>
          <p v-if="celebration.pendingBreak" class="focus-celebration__tip"><Coffee :size="16" />离开屏幕，喝口水，看看远处。</p>
          <div class="focus-celebration__actions">
            <button v-if="celebration.pendingBreak" class="focus-celebration__primary" type="button" @click="$emit('start-break')">开始休息</button>
            <button v-else class="focus-celebration__primary" type="button" @click="$emit('dismiss')">收下这份专注</button>
            <button v-if="celebration.pendingBreak" class="focus-celebration__secondary" type="button" @click="$emit('dismiss')">稍后再说</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { CircleCheck, Coffee, X } from 'lucide-vue-next'
import FocusRewardBadge from './FocusRewardBadge.vue'

const props = defineProps({
  celebration: { type: Object, default: null }
})

defineEmits(['dismiss', 'start-break'])

const rewardName = computed(() => ({
  blueberry: '蓝莓', strawberry: '草莓', tomato: '番茄', watermelon: '西瓜', pumpkin: '南瓜'
}[props.celebration?.reward] || '蓝莓'))

function durationText(seconds) {
  const minutes = Math.max(1, Math.round((Number(seconds) || 0) / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ''}` : `${minutes} 分钟`
}
</script>
