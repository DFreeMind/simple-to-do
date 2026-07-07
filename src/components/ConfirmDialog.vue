<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @click.self="cancel">
      <div class="confirm-dialog" @click.stop>
        <button class="confirm-close" type="button" @click="cancel">
          <X :size="18" />
        </button>

        <div class="confirm-header" :class="`confirm-header--${type}`">
          <div class="confirm-icon-wrapper">
            <div class="confirm-icon" :class="`confirm-icon--${type}`">
              <AlertTriangle v-if="type === 'danger'" :size="32" />
              <Info v-else-if="type === 'info'" :size="32" />
              <CheckCircle v-else :size="32" />
            </div>
          </div>
        </div>

        <div class="confirm-body">
          <div v-if="tag" class="confirm-tag" :class="`confirm-tag--${type}`">
            <Folder :size="14" />
            <span>{{ tag }}</span>
          </div>

          <h3>{{ title }}</h3>
          <p class="confirm-description">{{ message }}</p>

          <div v-if="details && details.length" class="confirm-details">
            <div v-for="(detail, index) in details" :key="index" class="detail-item">
              <div class="detail-icon" :class="`detail-icon--${detail.type || 'default'}`">
                <Trash2 v-if="detail.type === 'danger'" :size="16" />
                <Users v-else-if="detail.type === 'info'" :size="16" />
                <Info v-else :size="16" />
              </div>
              <span class="detail-label">{{ detail.label }}：</span>
              <span class="detail-value">{{ detail.value }}</span>
            </div>
          </div>
        </div>

        <div class="confirm-footer">
          <button class="confirm-btn confirm-btn--cancel" type="button" @click="cancel">
            {{ cancelText }}
          </button>
          <button
            class="confirm-btn"
            :class="`confirm-btn--${type}`"
            type="button"
            @click="confirm"
          >
            <Trash2 v-if="type === 'danger'" :size="16" />
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { AlertTriangle, Info, CheckCircle, X, Folder, Trash2, Users } from 'lucide-vue-next'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '确定要执行此操作吗？' },
  tag: { type: String, default: '' },
  details: { type: Array, default: () => [] },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '再想想' },
  type: { type: String, default: 'danger' }
})

const emit = defineEmits(['confirm', 'cancel'])

function confirm() {
  emit('confirm')
}

function cancel() {
  emit('cancel')
}
</script>

<style lang="scss" scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  position: relative;
  width: 460px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.confirm-close {
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
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #6b7280;
  }
}

.confirm-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  position: relative;
  overflow: hidden;

  &--danger {
    background: linear-gradient(180deg, #fff5f5 0%, #ffffff 100%);
  }

  &--info {
    background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);
  }

  &--success {
    background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
  }
}

.confirm-icon-wrapper {
  position: relative;
  z-index: 1;
}

.confirm-icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &--danger {
    background: white;
    color: #ef4444;
    box-shadow: 0 8px 32px rgba(239, 68, 68, 0.2);
  }

  &--info {
    background: white;
    color: #3b82f6;
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
  }

  &--success {
    background: white;
    color: #10b981;
    box-shadow: 0 8px 32px rgba(16, 185, 129, 0.2);
  }
}

.confirm-body {
  padding: 0 32px 24px;
  text-align: center;
}

.confirm-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 16px;

  &--danger {
    background: #fef2f2;
    color: #dc2626;
  }

  &--info {
    background: #eff6ff;
    color: #2563eb;
  }

  &--success {
    background: #f0fdf4;
    color: #059669;
  }
}

.confirm-body h3 {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
}

.confirm-description {
  margin: 0 0 20px;
  font-size: 15px;
  color: #6b7280;
  line-height: 1.6;
}

.confirm-details {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  text-align: left;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;

  &:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
  }
}

.detail-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;

  &--danger {
    background: #fef2f2;
    color: #ef4444;
  }

  &--info {
    background: #eff6ff;
    color: #3b82f6;
  }

  &--default {
    background: #f3f4f6;
    color: #6b7280;
  }
}

.detail-label {
  color: #6b7280;
  font-size: 14px;
}

.detail-value {
  color: #111827;
  font-size: 14px;
  font-weight: 500;
}

.confirm-footer {
  display: flex;
  gap: 12px;
  padding: 0 32px 32px;
}

.confirm-btn {
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
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;

    &:hover {
      background: #e5e7eb;
    }
  }

  &--danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);

    &:hover {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &--info {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &--success {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
  }
}
</style>
