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
      <button class="app-rail__button" :class="{ active: store.settings.activeModule === 'tasks' }" type="button" title="清单" aria-label="清单" :aria-current="store.settings.activeModule === 'tasks' ? 'page' : undefined" @click="selectModule('tasks')"><ListChecks :size="20" /></button>
      <button class="app-rail__button" :class="{ active: store.settings.activeModule === 'clock' }" type="button" title="时钟" aria-label="时钟" :aria-current="store.settings.activeModule === 'clock' ? 'page' : undefined" @click="selectModule('clock')"><AlarmClock :size="20" /></button>
    </nav>

    <template v-if="store.settings.sidebarCollapsed">
      <div class="app-rail__divider app-rail__divider--quick"></div>

      <nav v-if="store.settings.activeModule === 'tasks'" class="app-rail__quick" aria-label="清单快捷操作">
        <button class="app-rail__button" type="button" title="展开清单栏" aria-label="展开清单栏" @click="store.updateSettings({ sidebarCollapsed: false })"><PanelLeft :size="20" /></button>
        <button class="app-rail__button" :class="{ active: store.currentView === 'search' }" type="button" title="搜索（Ctrl/Cmd + K）" aria-label="搜索" @click="openSearch"><Search :size="20" /></button>
        <button v-for="item in taskQuickViews" :key="item.id" class="app-rail__button app-rail__button--badge" :class="{ active: store.currentView === item.id }" type="button" :title="item.label" :aria-label="item.label" @click="store.setView(item.id)"><component :is="item.icon" :size="20" /><span v-if="store.listTaskCounts[item.id]" class="app-rail__badge">{{ store.listTaskCounts[item.id] }}</span></button>

        <div class="app-rail__quick-divider"></div>
        <div class="app-rail__list-anchor">
          <button class="app-rail__button" :class="{ active: isCurrentViewList }" type="button" title="我的清单" aria-label="我的清单" @click.stop="listsFlyout = !listsFlyout"><Folder :size="20" /></button>
          <div v-if="listsFlyout" class="app-rail__list-flyout" @click.stop>
            <template v-for="group in store.groupedLists" :key="group.id">
              <p v-if="group.id !== 'ungrouped'" class="app-rail__list-group">{{ group.name }}</p>
              <button v-for="list in group.lists" :key="list.id" type="button" :class="{ active: store.currentView === list.id }" @click="selectList(list.id)"><i :style="{ background: list.color }"></i><span>{{ list.name }}</span><b v-if="store.listTaskCounts[list.id]">{{ store.listTaskCounts[list.id] }}</b></button>
            </template>
          </div>
        </div>
        <button class="app-rail__button app-rail__button--badge" :class="{ active: store.currentView === 'completed' }" type="button" title="已完成" aria-label="已完成" @click="store.setView('completed')"><CheckCircle2 :size="20" /><span v-if="store.listTaskCounts.completed" class="app-rail__badge">{{ store.listTaskCounts.completed }}</span></button>
        <button class="app-rail__button app-rail__button--badge" :class="{ active: store.currentView === 'trash' }" type="button" title="垃圾桶" aria-label="垃圾桶" @click="store.setView('trash')"><Trash2 :size="20" /><span v-if="store.listTaskCounts.trash" class="app-rail__badge">{{ store.listTaskCounts.trash }}</span></button>
      </nav>

      <nav v-else class="app-rail__quick" aria-label="时钟快捷操作">
        <button class="app-rail__button" type="button" title="展开时钟栏" aria-label="展开时钟栏" @click="store.updateSettings({ sidebarCollapsed: false })"><PanelLeft :size="20" /></button>
      </nav>
    </template>

    <div class="app-rail__spacer"></div>

    <div class="app-rail__footer">
      <button class="app-rail__button" type="button" title="使用指南" aria-label="使用指南" @click="store.openHelpCenter"><Compass :size="20" /></button>
      <button class="app-rail__button" type="button" title="设置" aria-label="设置" @click="store.openSettings"><Settings :size="20" /></button>
    </div>

    <ProfilePanel v-if="profilePanelOpen" @close="profilePanelOpen = false" />
  </aside>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { AlarmClock, CalendarCheck, CheckCircle2, Compass, Folder, Inbox, ListChecks, PanelLeft, Search, Settings, Star, Trash2 } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { readProfileAvatar } from '@/services/platform'
import ProfilePanel from './ProfilePanel.vue'

const store = useTaskStore()
const profilePanelOpen = ref(false)
const profileAvatarUrl = ref('')
const listsFlyout = ref(false)
const profileInitial = computed(() => Array.from(store.profile.nickname?.trim() || '易')[0] || '易')
const taskQuickViews = [
  { id: 'today', label: '今日', icon: CalendarCheck },
  { id: 'inbox', label: '收集箱', icon: Inbox },
  { id: 'planned', label: '计划', icon: ListChecks },
  { id: 'important', label: '重要', icon: Star }
]
const isCurrentViewList = computed(() => store.lists.some(list => list.id === store.currentView))
const builtInAvatarModules = import.meta.glob('@/assets/avatars/*.png', { eager: true, import: 'default' })
const profileAvatarSrc = computed(() => {
  if (profileAvatarUrl.value) return profileAvatarUrl.value
  const id = store.profile.avatarRelativePath?.startsWith('builtin:') ? store.profile.avatarRelativePath.slice(8) : ''
  return Object.entries(builtInAvatarModules).find(([path]) => path.endsWith(`/${id}.png`))?.[1] || ''
})

async function loadProfileAvatar() {
  if (store.profile.avatarRelativePath?.startsWith('builtin:') || !store.profile.avatarRelativePath) { profileAvatarUrl.value = ''; return }
  try { profileAvatarUrl.value = await readProfileAvatar(store.profile.avatarRelativePath) || '' } catch { profileAvatarUrl.value = '' }
}

function selectModule(module) {
  listsFlyout.value = false
  store.setActiveModule(module)
}

function openSearch() {
  store.setSearch(store.searchQuery)
  nextTick(() => window.dispatchEvent(new Event('task-list:focus-search')))
}

function selectList(id) {
  store.setView(id)
  listsFlyout.value = false
}

watch(() => store.profile.avatarRelativePath, loadProfileAvatar, { immediate: true })
watch(() => store.settings.sidebarCollapsed, (collapsed) => { if (!collapsed) listsFlyout.value = false })
</script>
