<template>
  <div class="profile-layer" role="dialog" aria-modal="true" aria-label="个人资料">
    <button class="profile-layer__scrim" type="button" aria-label="关闭个人资料" @click="$emit('close')" />
    <aside class="profile-panel">
      <header class="profile-panel__header">
        <div class="profile-panel__title"><span class="profile-panel__title-mark"><HardDrive :size="16" /></span><div><strong>个人空间</strong><small><i></i>本地数据</small></div></div>
        <button class="icon-btn profile-panel__close" type="button" aria-label="关闭个人空间" title="关闭" @click="$emit('close')"><X :size="18" /></button>
      </header>
      <div class="profile-layout">
        <nav class="profile-nav" aria-label="个人空间分类">
          <button v-for="section in sections" :key="section.id" class="profile-nav__item" :class="{ active: activeSection === section.id }" type="button" :aria-current="activeSection === section.id ? 'page' : undefined" @click="activeSection = section.id">
            <component :is="section.icon" :size="17" />
            <span><strong>{{ section.label }}</strong><small>{{ section.summary }}</small></span>
          </button>
        </nav>
        <div class="profile-panel__body">
        <section v-if="activeSection === 'profile'" class="profile-section profile-section--first">
          <section class="profile-person-card">
            <div class="profile-person-card__visual"><div ref="avatarPickerAnchor" class="profile-avatar-picker-anchor"><button class="profile-avatar-button" type="button" :disabled="uploading" title="更换头像" aria-label="更换头像" @click="avatarPickerOpen = !avatarPickerOpen"><img v-if="avatarSrc" class="profile-avatar profile-avatar--hero" :src="avatarSrc" alt="当前头像" /><span v-else class="profile-avatar profile-avatar--hero">{{ avatarLetter }}</span><span class="profile-avatar-button__mask">{{ uploading ? '保存中' : '更换' }}</span></button><div v-if="avatarPickerOpen" class="profile-avatar-picker"><header><strong>选择头像</strong><button class="text-btn" type="button" @click="chooseAvatar">上传本地头像</button></header><div class="profile-avatar-options"><button v-for="avatar in builtInAvatars" :key="avatar.id" type="button" :class="{ active: selectedBuiltInId === avatar.id }" :title="avatar.label" @click="selectBuiltIn(avatar.id)"><img :src="avatar.src" :alt="avatar.label" /></button></div></div></div><span class="profile-person-card__device"><HardDrive :size="12" />本机</span></div>
            <div class="profile-person-card__copy"><p>你的个人空间</p><label class="profile-name-input"><span class="sr-only">昵称</span><input v-model="nickname" maxlength="24" aria-label="昵称" @blur="saveNickname" @keydown.enter.prevent="saveNickname" /></label><div class="profile-person-card__badges"><span><i></i>本地资料</span><span>仅此设备</span></div></div>
            <div class="profile-person-card__art" aria-hidden="true"><i></i><span><HardDrive :size="20" /></span><b></b><em></em></div>
          </section>
          <div class="profile-section__head profile-overview-head"><h3>空间概览</h3><p>本地空间</p></div>
          <div class="profile-overview-grid">
            <article><span class="profile-overview-grid__icon"><ListTodo :size="16" /></span><span><small>未完成</small><strong>{{ activeTaskCount }}</strong></span></article>
            <article><span class="profile-overview-grid__icon"><Folder :size="16" /></span><span><small>任务清单</small><strong>{{ store.lists.length }}</strong></span></article>
            <article><span class="profile-overview-grid__icon"><Trash2 :size="16" /></span><span><small>垃圾桶保留</small><strong>{{ store.settings.trashRetentionDays }}<em>天</em></strong></span></article>
          </div>
          <button class="profile-overview-action" type="button" @click="activeSection = 'space'"><span class="profile-overview-action__icon"><HardDrive :size="17" /></span><span><strong>管理本机数据</strong><small>附件维护、清理站和保留策略</small></span><ChevronRight :size="18" /></button>
        </section>
        <p v-if="activeSection === 'profile' && errorMessage" class="profile-editor__error">{{ errorMessage }}</p>
        <SpaceManagement v-else-if="activeSection === 'space'" />
        <section v-else-if="activeSection === 'connection'" class="profile-section profile-section--first profile-section--capabilities">
          <div class="profile-section__head"><h3>连接与协作</h3><p>准备中</p></div>
          <div class="profile-capability-list">
            <article class="profile-capability"><span class="profile-capability__icon">账</span><div><strong>账号与同步</strong><small>连接账号后，在这里管理同步状态、设备和冲突处理</small></div><span>未连接</span></article>
            <article class="profile-capability"><span class="profile-capability__icon">协</span><div><strong>协作空间</strong><small>局域网或云端协作时，在这里切换空间、成员和权限</small></div><span>未加入</span></article>
          </div>
        </section>
        <section v-else class="profile-section profile-section--first profile-section--capabilities">
          <div class="profile-section__head"><h3>数据与安全</h3><p>本地优先</p></div>
          <div class="profile-capability-list">
            <article class="profile-capability"><span class="profile-capability__icon">备</span><div><strong>备份与恢复</strong><small>备份策略、恢复点和数据迁移将统一在这里管理</small></div><span class="profile-capability__status">未配置</span></article>
            <article class="profile-capability"><span class="profile-capability__icon">安</span><div><strong>设备与安全</strong><small>账号接入后，可查看已登录设备并管理本地数据保护</small></div><span class="profile-capability__status is-safe">仅此设备</span></article>
          </div>
        </section>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronRight, Folder, HardDrive, ListTodo, RefreshCw, ShieldCheck, Trash2, UserRound, X } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { importProfileAvatar, readProfileAvatar, selectImage } from '@/services/platform'
import SpaceManagement from './SpaceManagement.vue'
import shiba from '@/assets/avatars/shiba.png'
import cat from '@/assets/avatars/cat.png'
import crane from '@/assets/avatars/crane.png'
import redPanda from '@/assets/avatars/red-panda.png'
import otter from '@/assets/avatars/otter.png'
import astronaut from '@/assets/avatars/astronaut.png'
import robot from '@/assets/avatars/robot.png'
import turtle from '@/assets/avatars/turtle.png'
import cloud from '@/assets/avatars/cloud.png'
import frog from '@/assets/avatars/frog.png'
import koi from '@/assets/avatars/koi.png'
import spaceBlob from '@/assets/avatars/space-blob.png'
import chameleon from '@/assets/avatars/chameleon.png'
import cassette from '@/assets/avatars/cassette.png'
import axolotl from '@/assets/avatars/axolotl.png'
import mushroom from '@/assets/avatars/mushroom.png'
import jellyfish from '@/assets/avatars/jellyfish.png'
import fox from '@/assets/avatars/fox.png'

defineEmits(['close'])
const store = useTaskStore()
const nickname = ref(store.profile.nickname)
const avatarUrl = ref('')
const avatarPickerOpen = ref(false)
const avatarPickerAnchor = ref(null)
const builtInAvatars = [{ id: 'shiba', label: '柴犬', src: shiba }, { id: 'cat', label: '黑白猫', src: cat }, { id: 'crane', label: '纸鹤', src: crane }, { id: 'red-panda', label: '小熊猫', src: redPanda }, { id: 'otter', label: '水獭', src: otter }, { id: 'astronaut', label: '太空人', src: astronaut }, { id: 'robot', label: '小机器人', src: robot }, { id: 'turtle', label: '海龟', src: turtle }, { id: 'cloud', label: '云朵', src: cloud }, { id: 'frog', label: '青蛙', src: frog }, { id: 'koi', label: '锦鲤', src: koi }, { id: 'space-blob', label: '太空团子', src: spaceBlob }, { id: 'chameleon', label: '变色龙', src: chameleon }, { id: 'cassette', label: '随身听', src: cassette }, { id: 'axolotl', label: '六角恐龙', src: axolotl }, { id: 'mushroom', label: '蘑菇屋', src: mushroom }, { id: 'jellyfish', label: '水母', src: jellyfish }, { id: 'fox', label: '小狐狸', src: fox }]
const selectedBuiltInId = computed(() => store.profile.avatarRelativePath?.startsWith('builtin:') ? store.profile.avatarRelativePath.slice(8) : '')
const avatarSrc = computed(() => avatarUrl.value || builtInAvatars.find(item => item.id === selectedBuiltInId.value)?.src || '')
const uploading = ref(false)
const errorMessage = ref('')
const activeSection = ref('profile')
const sections = [
  { id: 'profile', label: '个人资料', summary: '头像与昵称', icon: UserRound },
  { id: 'space', label: '空间管理', summary: '数据与维护', icon: HardDrive },
  { id: 'connection', label: '连接与协作', summary: '同步与成员', icon: RefreshCw },
  { id: 'security', label: '数据与安全', summary: '备份与设备', icon: ShieldCheck }
]
const avatarLetter = computed(() => Array.from(store.profile.nickname?.trim() || '易')[0] || '易')
const activeTaskCount = computed(() => store.tasks.filter(task => !task.completed && !task.deleted).length)
let nicknameTimer = null

onMounted(() => { loadAvatar(); document.addEventListener('pointerdown', closeAvatarPickerOnOutside) })
onBeforeUnmount(() => { if (nicknameTimer) window.clearTimeout(nicknameTimer); document.removeEventListener('pointerdown', closeAvatarPickerOnOutside) })
watch(nickname, () => {
  if (nicknameTimer) window.clearTimeout(nicknameTimer)
  nicknameTimer = window.setTimeout(() => saveNickname(), 550)
})

async function loadAvatar() {
  if (store.profile.avatarRelativePath?.startsWith('builtin:')) { avatarUrl.value = ''; return }
  if (!store.profile.avatarRelativePath) { avatarUrl.value = ''; return }
  try { avatarUrl.value = await readProfileAvatar(store.profile.avatarRelativePath) || '' } catch { avatarUrl.value = '' }
}

function closeAvatarPickerOnOutside(event) {
  if (avatarPickerOpen.value && !avatarPickerAnchor.value?.contains(event.target)) avatarPickerOpen.value = false
}

function selectBuiltIn(id) {
  store.updateProfile({ avatarRelativePath: `builtin:${id}`, avatarSha256: null, avatarUpdatedAt: new Date().toISOString() })
  avatarUrl.value = ''
  avatarPickerOpen.value = false
  store.showNotice('已切换内置头像', 'success')
}

function saveNickname() {
  const value = nickname.value.trim()
  if (!value) { errorMessage.value = '昵称不能为空'; return }
  if (value === store.profile.nickname) { errorMessage.value = ''; return }
  store.updateProfile({ nickname: value })
  nickname.value = value
  errorMessage.value = ''
}

async function chooseAvatar() {
  const path = await selectImage()
  if (!path) return
  uploading.value = true
  errorMessage.value = ''
  try {
    const avatar = await importProfileAvatar(path)
    if (!avatar) throw new Error('当前环境不支持更换头像')
    store.updateProfile({ avatarRelativePath: avatar.relativePath, avatarSha256: avatar.sha256, avatarUpdatedAt: new Date().toISOString() })
    await loadAvatar()
    avatarPickerOpen.value = false
    store.showNotice('头像已更新', 'success')
  } catch (error) { errorMessage.value = error?.message || '头像保存失败' } finally { uploading.value = false }
}

</script>
