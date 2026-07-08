<template>
  <div class="rich-editor">
    <editor-content :editor="editor" class="editor-content" />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { importImageData, resolveHtmlImages } from '@/services/platform'

const AttachmentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-attachment-src': {
        default: null,
        parseHTML: element => element.getAttribute('data-attachment-src'),
        renderHTML: attributes => {
          const attachmentSrc = attributes['data-attachment-src']
          return attachmentSrc ? { 'data-attachment-src': attachmentSrc } : {}
        },
      },
    }
  },
})

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '开始输入...' }
})

const emit = defineEmits(['update:modelValue'])

/**
 * 将 Blob 转为 data URL
 */
function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

/**
 * 处理图片：保存到文件存储，返回相对路径
 */
async function handleImageBlob(blob) {
  const dataUrl = await blobToDataUrl(blob)
  try {
    const attachment = await importImageData(dataUrl)
    if (attachment) {
      const attachmentSrc = 'attachments/' + attachment.relativePath
      return { src: dataUrl, 'data-attachment-src': attachmentSrc }
    }
  } catch (error) {
    console.error('[RichTextEditor] 图片保存失败:', error)
  }
  // 降级：返回 base64 data URL
  return { src: dataUrl }
}

function serializeEditorHtml(html) {
  if (!html) return ''
  const container = document.createElement('div')
  container.innerHTML = html
  container.querySelectorAll('img[data-attachment-src]').forEach((img) => {
    const attachmentSrc = img.getAttribute('data-attachment-src')
    if (attachmentSrc) img.setAttribute('src', attachmentSrc)
  })
  return container.innerHTML
}

async function resolveEditorHtml(html) {
  if (!html || (!html.includes('attachments/') && !html.includes('src="images/'))) return html
  return await resolveHtmlImages(html)
}

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      horizontalRule: false,
    }),
    AttachmentImage.configure({
      inline: true,
      allowBase64: true,
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    HorizontalRule,
  ],
  editorProps: {
    attributes: {
      class: 'editor-inner',
    },
    handlePaste: (view, event) => {
      const items = event.clipboardData?.items
      if (!items) return false

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const blob = item.getAsFile()
          if (!blob) continue

          handleImageBlob(blob).then((imageAttrs) => {
            editor.value.chain().focus().setImage(imageAttrs).run()
          })
          return true
        }
      }
      return false
    },
    handleDrop: (view, event) => {
      const files = event.dataTransfer?.files
      if (!files?.length) return false

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          event.preventDefault()
          handleImageBlob(file).then((imageAttrs) => {
            editor.value.chain().focus().setImage(imageAttrs).run()
          })
          return true
        }
      }
      return false
    },
  },
  onUpdate: ({ editor: e }) => {
    emit('update:modelValue', serializeEditorHtml(e.getHTML()))
  },
})

// 加载时解析相对路径为 data URL
onMounted(async () => {
  const resolved = await resolveEditorHtml(props.modelValue)
  if (editor.value && resolved !== props.modelValue) {
    editor.value.commands.setContent(resolved, false)
  }
})

// 监听外部内容变化
watch(() => props.modelValue, async (val) => {
  if (editor.value && val !== serializeEditorHtml(editor.value.getHTML())) {
    const resolved = await resolveEditorHtml(val)
    editor.value.commands.setContent(resolved, false)
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// 暴露 editor 给父组件
defineExpose({ editor })
</script>
