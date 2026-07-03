<template>
  <Teleport to="body">
    <div v-if="show" class="format-menu" :style="menuStyle" @click.stop>
      <div class="format-group">
        <button class="format-item" @click="insertHeading(1)">
          <span class="format-label">H1</span>
          <span class="format-name">一级标题</span>
        </button>
        <button class="format-item" @click="insertHeading(2)">
          <span class="format-label">H2</span>
          <span class="format-name">二级标题</span>
        </button>
        <button class="format-item" @click="insertHeading(3)">
          <span class="format-label">H3</span>
          <span class="format-name">三级标题</span>
        </button>
      </div>
      <div class="format-separator"></div>
      <div class="format-group">
        <button class="format-item" @click="insertBulletList">
          <span class="format-icon">☰</span>
          <span class="format-name">无序列表</span>
        </button>
        <button class="format-item" @click="insertOrderedList">
          <span class="format-icon">≡</span>
          <span class="format-name">有序列表</span>
        </button>
        <button class="format-item" @click="insertTaskList">
          <span class="format-icon">☑</span>
          <span class="format-name">检查项</span>
        </button>
      </div>
      <div class="format-separator"></div>
      <div class="format-group">
        <button class="format-item" @click="insertBlockquote">
          <span class="format-icon">❝</span>
          <span class="format-name">引用</span>
        </button>
        <button class="format-item" @click="insertHorizontalRule">
          <span class="format-icon">—</span>
          <span class="format-name">水平分割线</span>
        </button>
      </div>
      <div class="format-separator"></div>
      <div class="format-group">
        <button class="format-item" @click="insertImage">
          <span class="format-icon">🖼️</span>
          <span class="format-name">图片</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  editor: Object,
  position: { type: Object, default: () => ({ x: 0, y: 0 }) }
})

const emit = defineEmits(['close', 'insertImage'])

const menuStyle = computed(() => ({
  left: props.position.x + 'px',
  top: props.position.y + 'px'
}))

function insertHeading(level) {
  props.editor?.chain().focus().toggleHeading({ level }).run()
  emit('close')
}

function insertBulletList() {
  props.editor?.chain().focus().toggleBulletList().run()
  emit('close')
}

function insertOrderedList() {
  props.editor?.chain().focus().toggleOrderedList().run()
  emit('close')
}

function insertTaskList() {
  props.editor?.chain().focus().toggleTaskList().run()
  emit('close')
}

function insertBlockquote() {
  props.editor?.chain().focus().toggleBlockquote().run()
  emit('close')
}

function insertHorizontalRule() {
  props.editor?.chain().focus().setHorizontalRule().run()
  emit('close')
}

function insertImage() {
  emit('insertImage')
  emit('close')
}
</script>
