<template>
  <Teleport to="body">
    <Transition name="focus-celebration">
      <div v-if="celebration" class="focus-celebration" role="dialog" aria-modal="true" aria-labelledby="focus-celebration-title" @click.self="$emit('dismiss')">
        <div class="focus-celebration__confetti" aria-hidden="true">
          <i v-for="index in 18" :key="index" :style="{ '--i': index }"></i>
        </div>
        <section class="focus-celebration__card">
          <span class="focus-celebration__sparkles" aria-hidden="true">✦</span>
          <p class="focus-celebration__eyebrow">专注完成</p>
          <h2 id="focus-celebration-title">收获一份专注</h2>
          <div class="focus-celebration__reward">
            <FocusRewardBadge :reward="celebration.reward" size="lg" />
            <div><span>本次收获</span><strong>{{ rewardName }}</strong></div>
          </div>
          <p class="focus-celebration__duration">你专注了 {{ durationText(celebration.elapsedSeconds) }}</p>
          <div class="focus-celebration__actions">
            <button v-if="celebration.pendingBreak" class="focus-celebration__primary" type="button" @click="$emit('start-break')">开始休息</button>
            <button v-else class="focus-celebration__primary" type="button" @click="$emit('dismiss')">收下奖励</button>
            <button v-if="celebration.pendingBreak" class="focus-celebration__secondary" type="button" @click="$emit('dismiss')">稍后休息</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
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
