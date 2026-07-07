<template>
  <Teleport to="body">
    <div v-if="visible" class="input-overlay" @click.self="cancel">
      <div class="input-dialog" @click.stop>
        <button class="input-close" type="button" @click="cancel">
          <X :size="18" />
        </button>

        <div class="input-header" :class="`input-header--${type}`">
          <div class="input-icon-wrapper">
            <div class="input-icon" :class="`input-icon--${type}`">
              <Pencil v-if="type === 'edit'" :size="28" />
              <FolderInput v-else-if="type === 'move'" :size="28" />
              <AlertTriangle v-else :size="28" />
            </div>
          </div>
        </div>

        <div class="input-body">
          <h3>{{ title }}</h3>
          <p v-if="message" class="input-description">{{ message }}</p>

          <div class="input-field-wrapper">
            <input
              ref="inputEl"
              v-model="inputValue"
              type="text"
              :placeholder="placeholder"
              class="input-field"
              @keydown.enter="confirm"
              @keydown.esc="cancel"
            />
          </div>
        </div>

        <div class="input-footer">
          <button class="input-btn input-btn--cancel" type="button" @click="cancel">
            {{ cancelText }}
          </button>
          <button
            class="input-btn"
            :class="`input-btn--${type}`"
            type="button"
            :disabled="!inputValue.trim()"
            @click="confirm"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { X, Pencil, FolderInput, AlertTriangle } from 'lucide-vue-next'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '输入内容' },
  message: { type: String, default: '' },
  placeholder: { type: String, default: '请输入...' },
  defaultValue: { type: String, default: '' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  type: { type: String, default: 'edit' } // edit, move, danger
})

const emit = defineEmits(['confirm', 'cancel'])

const inputEl = ref(null)
const inputValue = ref(props.defaultValue)

// 监听 visible 变化，重置输入值并聚焦
watch(() => props.visible, (visible) => {
  if (visible) {
    inputValue.value = props.defaultValue
    nextTick(() => {
      inputEl.value?.focus()
      inputEl.value?.select()
    })
  }
})

function confirm() {
  if (inputValue.value.trim()) {
    emit('confirm', inputValue.value.trim())
  }
}

function cancel() {
  emit('cancel')
}
</script>

<style lang="scss" scoped>
.input-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay, rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(4px);
}

.input-dialog {
  position: relative;
  width: 400px;
  background: var(--surface-raised, #fff);
  color: var(--text, #111827);
  border: 1px solid var(--border, transparent);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-elevated, 0 25px 80px rgba(0, 0, 0, 0.25));
  overflow: hidden;
}

.input-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-sm, 8px);
  background: var(--surface-muted, rgba(0, 0, 0, 0.05));
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--accent-tint, rgba(0, 0, 0, 0.1));
    color: var(--text, #6b7280);
  }
}

.input-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;

  &--edit {
    background: linear-gradient(180deg, var(--info-soft, #f0f9ff) 0%, var(--surface-raised, #fff) 100%);
  }

  &--move {
    background: linear-gradient(180deg, var(--success-soft, #f0fdf4) 0%, var(--surface-raised, #fff) 100%);
  }

  &--danger {
    background: linear-gradient(180deg, var(--danger-soft, #fff5f5) 0%, var(--surface-raised, #fff) 100%);
  }
}

.input-icon-wrapper {
  position: relative;
  z-index: 1;
}

.input-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &--edit {
    background: var(--surface-raised, #fff);
    color: var(--info, #3b82f6);
    box-shadow: 0 8px 32px color-mix(in srgb, var(--info, #3b82f6) 24%, transparent);
  }

  &--move {
    background: var(--surface-raised, #fff);
    color: var(--success, #10b981);
    box-shadow: 0 8px 32px color-mix(in srgb, var(--success, #10b981) 24%, transparent);
  }

  &--danger {
    background: var(--surface-raised, #fff);
    color: var(--danger, #ef4444);
    box-shadow: 0 8px 32px color-mix(in srgb, var(--danger, #ef4444) 24%, transparent);
  }
}

.input-body {
  padding: 0 32px 24px;
  text-align: center;

  h3 {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text, #111827);
  }

  .input-description {
    margin: 0 0 16px;
    font-size: 14px;
    color: var(--text-muted, #6b7280);
    line-height: 1.5;
  }
}

.input-field-wrapper {
  margin: 0;
}

.input-field {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  font-size: 15px;
  color: var(--text, #111827);
  background: var(--surface, #f9fafb);
  transition: all 0.2s ease;
  outline: none;

  &:focus {
    border-color: var(--accent, #3b82f6);
    background: var(--surface-raised, #fff);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent, #3b82f6) 14%, transparent);
  }

  &::placeholder {
    color: var(--text-subtle, #9ca3af);
  }
}

.input-footer {
  display: flex;
  gap: 12px;
  padding: 0 32px 32px;
}

.input-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border: 0;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &--cancel {
    background: var(--surface-muted, #f3f4f6);
    color: var(--text, #374151);
    border: 1px solid var(--border, #e5e7eb);

    &:hover {
      background: var(--accent-tint, #e5e7eb);
    }
  }

  &--edit {
    background: var(--info, #3b82f6);
    color: var(--on-info, #fff);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--info, #2563eb) 34%, transparent);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px color-mix(in srgb, var(--info, #2563eb) 40%, transparent);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--move {
    background: var(--success, #10b981);
    color: var(--on-success, #fff);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--success, #059669) 34%, transparent);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px color-mix(in srgb, var(--success, #059669) 40%, transparent);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--danger {
    background: var(--danger, #ef4444);
    color: var(--on-danger, #fff);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--danger, #dc2626) 34%, transparent);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px color-mix(in srgb, var(--danger, #dc2626) 40%, transparent);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
