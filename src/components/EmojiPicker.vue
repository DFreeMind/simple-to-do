<template>
  <Teleport to="body">
    <section v-if="visible" ref="rootRef" class="emoji-picker-popover" :style="pickerStyle" @click.stop>
      <header class="emoji-picker-popover__header">
        <div>
          <strong>选择图标</strong>
          <span>点击选择表情</span>
        </div>
        <button type="button" title="关闭" aria-label="关闭 Emoji 选择器" @click="emit('update:visible', false)">×</button>
      </header>
      <div class="emoji-picker-popover__search">
        <div class="search-wrapper">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索表情..."
            class="emoji-search-input"
          />
        </div>
      </div>
      <div class="emoji-picker-popover__content">
        <div v-for="category in emojiCategories" :key="category.name" class="emoji-category">
          <div class="category-title">{{ category.name }}</div>
          <div class="emoji-grid">
            <button
              v-for="emoji in category.emojis"
              :key="emoji"
              type="button"
              class="emoji-item"
              :class="{ 'is-selected': modelValue === emoji }"
              @click="selectEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
      <footer class="emoji-picker-popover__footer">
        <div v-if="modelValue" class="selected-preview">
          <span class="selected-emoji">{{ modelValue }}</span>
          <button type="button" @click="clear">移除</button>
        </div>
        <span v-else class="hint-text">选择一个图标</span>
      </footer>
    </section>
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modelValue: { type: String, default: '' },
  anchorEl: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'update:visible'])

const PICKER_WIDTH = 340
const PICKER_HEIGHT = 420
const GAP = 8
const searchQuery = ref('')

// 分类emoji列表
const emojiCategories = [
  {
    name: '😀 表情',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴']
  },
  {
    name: '👋 手势',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪']
  },
  {
    name: '❤️ 爱心',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  },
  {
    name: '🎉 庆祝',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🎂', '🍰', '🧁', '🎄', '🎃', '🎗️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎯']
  },
  {
    name: '🐶 动物',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄']
  },
  {
    name: '🌸 自然',
    emojis: ['🌸', '🌺', '🌻', '🌹', '🌷', '🌱', '🌿', '🍀', '🍁', '🍂', '🌲', '🌳', '🌴', '🌵', '🌾', '☘️', '🎍', '🎋', '🎑', '💐', '🍄', '🌰']
  },
  {
    name: '☀️ 天气',
    emojis: ['☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌩️', '🌪️', '🌫️', '🌬️', '💨', '❄️', '☃️', '⛄', '🌙', '⭐', '🌟', '💫', '✨', '🔥', '💧']
  },
  {
    name: '🍔 食物',
    emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍕', '🍔', '🍟', '🌮', '🌯', '🥗', '🍣', '🍜', '🍝', '🍛', '🍚']
  },
  {
    name: '⚽ 活动',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🥊', '🎯', '⛳', '🎮', '🎲', '🧩', '🎭', '🎨', '🎪', '🎤', '🎧', '🎵', '🎶', '🎸', '🎹', '🥁']
  },
  {
    name: '🚗 交通',
    emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🚲', '🛴', '✈️', '🚀', '🛸', '🚢', '⛴️', '🚂', '🚇']
  },
  {
    name: '💡 物品',
    emojis: ['📱', '💻', '⌨️', '🖥️', '🖨️', '📷', '📹', '🎥', '📞', '☎️', '📺', '📻', '🔋', '🔌', '💡', '🔦', '📡', '🔑', '🗝️', '🔒', '🔓', '📦', '📫', '📮', '✏️', '🖊️', '📚', '📖', '📰', '🏷️']
  }
]

const filteredEmojis = computed(() => {
  if (!searchQuery.value.trim()) return emojiCategories
  const query = searchQuery.value.toLowerCase()
  // 简单搜索：返回所有分类（emoji没有中文描述）
  return emojiCategories
})

const pickerStyle = computed(() => {
  if (!props.anchorEl) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

  const rect = props.anchorEl.getBoundingClientRect()
  const pad = 12
  const btnWidth = rect.width
  const btnHeight = rect.height

  // 计算选择器位置：优先显示在按钮下方，居中对齐
  let x = rect.left + btnWidth / 2 - PICKER_WIDTH / 2
  let y = rect.bottom + GAP

  // 检查下方空间是否足够
  const spaceBelow = window.innerHeight - rect.bottom - GAP
  const spaceAbove = rect.top - GAP

  // 如果下方空间不够，尝试显示在上方
  if (spaceBelow < PICKER_HEIGHT && spaceAbove >= PICKER_HEIGHT) {
    y = rect.top - PICKER_HEIGHT - GAP
  }
  // 如果上下都不够，保持在下方但调整位置
  else if (spaceBelow < PICKER_HEIGHT) {
    y = Math.max(pad, window.innerHeight - PICKER_HEIGHT - pad)
  }

  // 检查左右边界，确保不超出屏幕
  if (x + PICKER_WIDTH > window.innerWidth - pad) {
    x = window.innerWidth - PICKER_WIDTH - pad
  }
  if (x < pad) {
    x = pad
  }

  return { left: `${x}px`, top: `${y}px` }
})

function selectEmoji(emoji) {
  emit('update:modelValue', emoji)
  emit('update:visible', false)
}

function clear() {
  emit('update:modelValue', '')
  emit('update:visible', false)
}
</script>

<style scoped>
.emoji-picker-popover {
  position: fixed;
  z-index: 1200;
  overflow: hidden;
  width: 340px;
  border: 1px solid #e2e8e6;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 25px 80px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(226, 232, 230, 0.48);
  animation: emoji-pop 0.16s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.emoji-picker-popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(226, 232, 230, 0.6);

  div { display: grid; gap: 2px; }
  strong {
    font-size: 15px;
    font-weight: 600;
    color: #17211f;
    letter-spacing: -0.01em;
  }
  span { font-size: 12px; color: #6b7280; }
  button {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: transparent;
    color: #9ca3af;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }
  button:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #6b7280;
  }
}

.emoji-picker-popover__search {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(226, 232, 230, 0.6);
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #9ca3af;
  pointer-events: none;
}

.emoji-search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  border: 1px solid #e2e8e6;
  border-radius: 8px;
  background: #f8faf9;
  color: #17211f;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: #2f9e7c;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(47, 158, 124, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
}

.emoji-picker-popover__content {
  height: 280px;
  overflow-y: auto;
  padding: 8px 12px;

  /* 美化滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
}

.emoji-category {
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.category-title {
  padding: 8px 4px 6px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 0.02em;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.emoji-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    background: #f3f4f6;
    transform: scale(1.15);
  }

  &:active {
    transform: scale(0.95);
  }

  &.is-selected {
    background: rgba(47, 158, 124, 0.1);
    box-shadow: inset 0 0 0 2px #2f9e7c;
  }
}

.emoji-picker-popover__footer {
  min-height: 44px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(226, 232, 230, 0.6);
  background: #fafbfc;
}

.selected-preview {
  display: flex;
  align-items: center;
  gap: 8px;

  .selected-emoji {
    font-size: 24px;
    line-height: 1;
  }

  button {
    padding: 4px 10px;
    border-radius: 6px;
    background: transparent;
    color: #ef4444;
    font-size: 12px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: rgba(239, 68, 68, 0.1);
    }
  }
}

.hint-text {
  font-size: 12px;
  color: #9ca3af;
}

@keyframes emoji-pop {
  from { opacity: 0; transform: translateY(-4px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
