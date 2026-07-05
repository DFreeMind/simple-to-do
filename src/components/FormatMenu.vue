<template>
    <div v-if="show" class="format-menu" :style="menuStyle" role="menu" @click.stop>
      <button class="format-item" role="menuitem" type="button" @click="insertHeading(1)">
        <Heading1 :size="16" />
        <span>一级标题</span>
      </button>
      <button class="format-item" role="menuitem" type="button" @click="insertHeading(2)">
        <Heading2 :size="16" />
        <span>二级标题</span>
      </button>
      <button class="format-item" role="menuitem" type="button" @click="insertHeading(3)">
        <Heading3 :size="16" />
        <span>三级标题</span>
      </button>
      <div class="context-separator"></div>
      <button class="format-item" role="menuitem" type="button" @click="insertBulletList">
        <List :size="16" />
        <span>无序列表</span>
      </button>
      <button class="format-item" role="menuitem" type="button" @click="insertOrderedList">
        <ListOrdered :size="16" />
        <span>有序列表</span>
      </button>
      <button class="format-item" role="menuitem" type="button" @click="insertTaskList">
        <ListChecks :size="16" />
        <span>待办块</span>
      </button>
      <div class="context-separator"></div>
      <button class="format-item" role="menuitem" type="button" @click="insertBlockquote">
        <Quote :size="16" />
        <span>引用</span>
      </button>
      <button class="format-item" role="menuitem" type="button" @click="insertHorizontalRule">
        <Minus :size="16" />
        <span>分割线</span>
      </button>
      <button class="format-item" role="menuitem" type="button" @click="insertImage">
        <ImagePlus :size="16" />
        <span>图片</span>
      </button>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote
} from 'lucide-vue-next'

const props = defineProps({
  show: Boolean,
  editor: Object,
  position: { type: Object, default: () => ({ x: 0, y: 0 }) }
})

const emit = defineEmits(['close', 'insertImage'])

const menuStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`
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
