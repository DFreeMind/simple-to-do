<template>
  <main @keydown.esc="$emit('dismiss')">
    <slot :start-window-drag="startWindowDrag" />
  </main>
</template>

<script setup>
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

defineEmits(['dismiss'])

function startWindowDrag(event) {
  if (event.button !== 0) return
  getCurrentWebviewWindow().startDragging()
    .catch(error => console.warn('[NativeReminderWindow] 拖动提醒窗口失败:', error))
}
</script>
