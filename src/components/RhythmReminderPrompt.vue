<template>
  <Teleport to="body">
    <Transition name="rhythm-prompt">
      <div
        v-if="reminder"
        class="rhythm-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rhythm-prompt-title"
        aria-describedby="rhythm-prompt-description"
        @keydown.esc.stop="$emit('dismiss')"
      >
        <section class="rhythm-prompt__card">
          <button class="rhythm-prompt__close" type="button" aria-label="关闭节律提醒" @click="$emit('dismiss')">
            <X :size="19" />
          </button>
          <span class="rhythm-prompt__icon" aria-hidden="true"><BellRing :size="38" /></span>
          <p class="rhythm-prompt__eyebrow">该停一下了</p>
          <h2 id="rhythm-prompt-title">{{ reminder.title }}</h2>
          <p id="rhythm-prompt-description">{{ reminder.message || '该给自己一点短暂的调整时间了。' }}</p>
          <div class="rhythm-prompt__actions">
            <button ref="primaryAction" class="rhythm-prompt__primary" type="button" @click="$emit('complete')">
              <Check :size="17" />完成这次
            </button>
            <button type="button" @click="$emit('snooze')">5 分钟后</button>
            <button class="rhythm-prompt__skip" type="button" @click="$emit('skip')">今天跳过</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { BellRing, Check, X } from 'lucide-vue-next'

const props = defineProps({
  reminder: { type: Object, default: null }
})

defineEmits(['complete', 'snooze', 'skip', 'dismiss'])

const primaryAction = ref(null)

watch(() => props.reminder?.id, async id => {
  if (!id) return
  await nextTick()
  primaryAction.value?.focus()
})
</script>

<style scoped>
.rhythm-prompt {
  position: fixed;
  z-index: var(--z-reminder);
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(20, 36, 32, .34);
  backdrop-filter: blur(5px);
}

.rhythm-prompt__card {
  position: relative;
  width: min(390px, calc(100vw - 48px));
  padding: 34px 32px 28px;
  border: 1px solid rgba(116, 171, 158, .38);
  border-radius: 22px;
  background: radial-gradient(circle at 12% 0, #d7f2eb, transparent 34%), #fff;
  box-shadow: 0 28px 80px rgba(25, 58, 50, .24);
  text-align: center;
}

.rhythm-prompt__close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 9px;
  color: #61756f;
  background: transparent;
}

.rhythm-prompt__close:hover { color: #176f64; background: #e8f4f1; }
.rhythm-prompt__icon {
  display: grid;
  width: 74px;
  height: 74px;
  place-items: center;
  margin: 0 auto 20px;
  border-radius: 50%;
  color: #238f80;
  background: #e0f4ef;
  box-shadow: 0 0 0 9px rgba(224, 244, 239, .55);
}

.rhythm-prompt__eyebrow { margin: 0 0 7px; color: #238f80; font-size: 12px; font-weight: 750; }
.rhythm-prompt h2 { margin: 0; color: #19302b; font-size: 24px; letter-spacing: -.035em; }
.rhythm-prompt__card > p:last-of-type { margin: 12px auto 0; color: #61756f; font-size: 14px; line-height: 1.65; }
.rhythm-prompt__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 26px; }
.rhythm-prompt__actions button {
  min-height: 42px;
  border: 1px solid #d5e5e1;
  border-radius: 11px;
  color: #4a625c;
  background: #fff;
  font-size: 13px;
  font-weight: 700;
}
.rhythm-prompt__actions .rhythm-prompt__primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-color: #238f80;
  color: #fff;
  background: #238f80;
}
.rhythm-prompt__actions .rhythm-prompt__skip { grid-column: 1 / -1; min-height: 32px; border: 0; color: #748681; background: transparent; }
.rhythm-prompt__actions button:hover { border-color: #9fcfc5; color: #176f64; }
.rhythm-prompt__actions .rhythm-prompt__primary:hover { color: #fff; background: #176f64; }
.rhythm-prompt-enter-active, .rhythm-prompt-leave-active { transition: opacity .18s ease; }
.rhythm-prompt-enter-active .rhythm-prompt__card, .rhythm-prompt-leave-active .rhythm-prompt__card { transition: transform .18s ease, opacity .18s ease; }
.rhythm-prompt-enter-from, .rhythm-prompt-leave-to { opacity: 0; }
.rhythm-prompt-enter-from .rhythm-prompt__card, .rhythm-prompt-leave-to .rhythm-prompt__card { opacity: 0; transform: translateY(8px) scale(.98); }
</style>
