<template>
  <aside class="app-rail" aria-label="应用模块">
    <button
      class="app-rail__profile"
      type="button"
      :title="`${store.profile.nickname} · 个人资料`"
      :aria-label="`${store.profile.nickname}，打开个人资料`"
      @click="profilePanelOpen = true"
    >
      <img v-if="profileAvatarSrc" :src="profileAvatarSrc" alt="" />
      <span v-else>{{ profileInitial }}</span>
    </button>

    <div class="app-rail__divider"></div>

    <nav class="app-rail__modules" aria-label="模块切换">
      <button
        class="app-rail__button"
        :class="{ active: store.settings.activeModule === 'tasks' }"
        type="button"
        title="清单"
        aria-label="清单"
        :aria-current="store.settings.activeModule === 'tasks' ? 'page' : undefined"
        @click="selectModule('tasks')"
      >
        <ListChecks :size="20" />
      </button>
      <button
        class="app-rail__button"
        :class="{ active: store.settings.activeModule === 'clock' }"
        type="button"
        title="时钟"
        aria-label="时钟"
        :aria-current="store.settings.activeModule === 'clock' ? 'page' : undefined"
        @click="selectModule('clock')"
      >
        <AlarmClock :size="20" />
      </button>
    </nav>

    <div class="app-rail__spacer"></div>

    <button class="app-rail__button" type="button" title="设置" aria-label="设置" @click="store.openSettings">
      <Settings :size="20" />
    </button>

    <ProfilePanel v-if="profilePanelOpen" @close="profilePanelOpen = false" />
  </aside>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { AlarmClock, ListChecks, Settings } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { readProfileAvatar } from '@/services/platform'
import ProfilePanel from './ProfilePanel.vue'

const store = useTaskStore()
const profilePanelOpen = ref(false)
const profileAvatarUrl = ref('')
const profileInitial = computed(() => Array.from(store.profile.nickname?.trim() || '易')[0] || '易')
const builtInAvatarModules = import.meta.glob('@/assets/avatars/*.png', { eager: true, import: 'default' })
const profileAvatarSrc = computed(() => {
  if (profileAvatarUrl.value) return profileAvatarUrl.value
  const id = store.profile.avatarRelativePath?.startsWith('builtin:') ? store.profile.avatarRelativePath.slice(8) : ''
  return Object.entries(builtInAvatarModules).find(([path]) => path.endsWith(`/${id}.png`))?.[1] || ''
})

async function loadProfileAvatar() {
  if (store.profile.avatarRelativePath?.startsWith('builtin:') || !store.profile.avatarRelativePath) {
    profileAvatarUrl.value = ''
    return
  }
  try { profileAvatarUrl.value = await readProfileAvatar(store.profile.avatarRelativePath) || '' } catch { profileAvatarUrl.value = '' }
}

function selectModule(module) {
  store.setActiveModule(module)
}

watch(() => store.profile.avatarRelativePath, loadProfileAvatar, { immediate: true })
</script>
