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
            <div class="profile-person-card__visual"><div ref="avatarPickerAnchor" class="profile-avatar-picker-anchor"><button class="profile-avatar-button" type="button" :disabled="uploading" title="更换头像" aria-label="更换头像" @click="avatarPickerOpen = !avatarPickerOpen"><img v-if="avatarSrc" class="profile-avatar profile-avatar--hero" :src="avatarSrc" alt="当前头像" /><span v-else class="profile-avatar profile-avatar--hero">{{ avatarLetter }}</span><span class="profile-avatar-button__mask">{{ uploading ? '保存中' : '更换' }}</span></button><div v-if="avatarPickerOpen" class="profile-avatar-picker"><header><strong>选择头像</strong><button class="text-btn" type="button" :disabled="uploading" @click="chooseAvatar">上传本地头像</button></header><div class="profile-avatar-options"><button v-for="avatar in builtInAvatars" :key="avatar.id" type="button" :disabled="uploading" :class="{ active: selectedBuiltInId === avatar.id }" :title="`${avatar.label}（悬停预览）`" @mouseenter="showAvatarPreview(avatar, $event)" @mouseleave="hideAvatarPreview" @focus="showAvatarPreview(avatar, $event)" @blur="hideAvatarPreview" @click="selectBuiltIn(avatar.id)"><img :src="avatar.src" :alt="avatar.label" /></button></div></div></div><span class="profile-person-card__device"><HardDrive :size="12" />本机</span></div>
            <div class="profile-person-card__copy"><p>你的个人空间</p><label class="profile-name-input"><span class="sr-only">昵称</span><input v-model="nickname" maxlength="24" aria-label="昵称" @blur="saveNickname" @keydown.enter.prevent="saveNickname" /></label><div class="profile-person-card__badges"><span><i></i>本地资料</span><span>仅此设备</span></div></div>
            <div class="profile-person-card__art" aria-hidden="true"><i></i><span><HardDrive :size="20" /></span><b></b><em></em></div>
          </section>
          <div class="profile-section__head profile-overview-head"><h3>使用概览</h3><p>你的节奏</p></div>
          <div class="profile-overview-grid">
            <article><span class="profile-overview-grid__icon"><ListTodo :size="16" /></span><span><small>未完成</small><strong>{{ activeTaskCount }}</strong></span></article>
            <article><span class="profile-overview-grid__icon"><Folder :size="16" /></span><span><small>我的清单</small><strong>{{ store.lists.length }}</strong></span></article>
            <article><span class="profile-overview-grid__icon"><CheckCircle2 :size="16" /></span><span><small>已完成</small><strong>{{ completedTaskCount }}</strong></span></article>
          </div>
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
        <section v-else-if="activeSection === 'security'" class="profile-section profile-section--first profile-section--capabilities">
          <div class="profile-section__head"><h3>数据与安全</h3><p>本地优先</p></div>
          <div class="data-backup-toolbar">
            <span><strong>本机恢复点</strong><small>包含任务、附件和头像；恢复前会自动创建安全点</small></span>
            <span class="data-backup-toolbar__actions"><button class="text-btn" type="button" :disabled="backupWorking" @click="openBackupLocation">打开位置</button><button class="small-btn" type="button" :disabled="backupWorking" @click="createBackup">{{ backupWorking ? '处理中…' : '创建恢复点' }}</button></span>
          </div>
          <p v-if="backupLocation" class="data-backup-location" :title="backupLocation">恢复点保存于：<code>{{ backupLocation }}</code></p>
          <p v-if="backupError" class="profile-editor__error">{{ backupError }}</p>
          <div v-if="backups.length" class="data-backup-list">
            <article v-for="backup in backups" :key="backup.id" class="data-backup-item">
              <span class="profile-capability__icon">备</span>
              <span><strong>{{ backupLabel(backup) }}</strong><small>{{ formatBytes(backup.sizeBytes) }}</small></span>
              <span class="data-backup-item__actions"><button class="text-btn" type="button" :disabled="backupWorking" @click="openBackup(backup)">打开</button><button class="text-btn" type="button" :disabled="backupWorking" @click="requestRestore(backup)">恢复</button><button class="text-btn data-backup-item__delete" type="button" :disabled="backupWorking" @click="requestDelete(backup)">删除</button></span>
            </article>
          </div>
          <p v-else class="profile-capability__empty">还没有恢复点。建议在大批量整理或安装更新前创建一个。</p>
          <div v-if="pendingRestore" class="data-backup-confirm">
            <strong>恢复到 {{ formatBackupDate(pendingRestore.createdAt) }}？</strong>
            <small>当前数据将先保存为新的“恢复前安全点”，然后重新加载此恢复点。</small>
            <span><button class="text-btn" type="button" :disabled="backupWorking" @click="pendingRestore = null">取消</button><button class="small-btn" type="button" :disabled="backupWorking" @click="restoreBackup">确认恢复</button></span>
          </div>
          <div class="profile-capability-list">
            <article class="profile-capability"><span class="profile-capability__icon">安</span><div><strong>当前设备</strong><small>数据仅保存在本机；不会上传到服务器</small></div><span class="profile-capability__status is-safe">仅此设备</span></article>
          </div>
        </section>
        </div>
      </div>
    </aside>
    <ConfirmDialog
      :visible="Boolean(pendingDelete)"
      title="删除此恢复点？"
      :message="pendingDelete ? `将永久删除 ${formatBackupDate(pendingDelete.createdAt)} 的恢复点，无法撤销；不会影响当前正在使用的数据。` : ''"
      :tag="pendingDelete ? backupLabel(pendingDelete) : ''"
      :details="deleteBackupDetails"
      confirm-text="确认删除"
      cancel-text="取消"
      type="danger"
      @confirm="deleteBackup"
      @cancel="pendingDelete = null"
    />
    <Teleport to="body">
      <div v-if="avatarPreview" class="profile-avatar-preview" :style="{ left: `${avatarPreview.left}px`, top: `${avatarPreview.top}px` }" role="tooltip">
        <img :src="avatarPreview.avatar.src" :alt="`${avatarPreview.avatar.label}预览`" />
        <span class="profile-avatar-preview__label">{{ avatarPreview.avatar.label }}</span>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CheckCircle2, Folder, HardDrive, ListTodo, RefreshCw, ShieldCheck, UserRound, X } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { cleanupProfileAvatars, createDataBackup, deleteDataBackup, getDataBackupLocation, importProfileAvatar, listDataBackups, openDataBackup, openDataBackupLocation, readProfileAvatar, restoreDataBackup, selectImage } from '@/services/platform'
import SpaceManagement from './SpaceManagement.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import shiba from '@/assets/avatars/shiba.png'
import cat from '@/assets/avatars/cat.png'
import robot from '@/assets/avatars/crane.png'
import crane from '@/assets/avatars/red-panda.png'
import frog from '@/assets/avatars/otter.png'
import redPanda from '@/assets/avatars/astronaut.png'
import astronaut from '@/assets/avatars/robot.png'
import turtle from '@/assets/avatars/turtle.png'
import cloud from '@/assets/avatars/cloud.png'
import moon from '@/assets/avatars/frog.png'
import koi from '@/assets/avatars/koi.png'
import spaceBlob from '@/assets/avatars/space-blob.png'
import chameleon from '@/assets/avatars/chameleon.png'
import cassette from '@/assets/avatars/cassette.png'
import axolotl from '@/assets/avatars/axolotl.png'
import mushroom from '@/assets/avatars/mushroom.png'
import jellyfish from '@/assets/avatars/jellyfish.png'
import fox from '@/assets/avatars/fox.png'
import foxPilot from '@/assets/avatars/fox-pilot.png'
import teaDragon from '@/assets/avatars/tea-dragon.png'
import starRaccoon from '@/assets/avatars/star-raccoon.png'
import cloudPup from '@/assets/avatars/cloud-pup.png'
import capybara from '@/assets/avatars/capybara.png'
import octopusDj from '@/assets/avatars/octopus-dj.png'
import penguinPost from '@/assets/avatars/penguin-post.png'
import alienGardener from '@/assets/avatars/alien-gardener.png'
import snailLibrarian from '@/assets/avatars/snail-librarian.png'
import lemonRobot from '@/assets/avatars/lemon-robot.png'

defineEmits(['close'])
const store = useTaskStore()
const nickname = ref(store.profile.nickname)
const avatarUrl = ref('')
const avatarPickerOpen = ref(false)
const avatarPickerAnchor = ref(null)
const avatarPreview = ref(null)
const builtInAvatars = [
  { id: 'shiba', label: '柴犬', src: shiba }, { id: 'cat', label: '黑白猫', src: cat }, { id: 'crane', label: '纸鹤', src: crane }, { id: 'red-panda', label: '小熊猫', src: redPanda }, { id: 'otter', label: '青蛙', src: frog }, { id: 'astronaut', label: '太空人', src: astronaut }, { id: 'robot', label: '小机器人', src: robot }, { id: 'turtle', label: '海龟', src: turtle }, { id: 'cloud', label: '云朵', src: cloud }, { id: 'frog', label: '月亮', src: moon }, { id: 'koi', label: '锦鲤', src: koi }, { id: 'space-blob', label: '太空团子', src: spaceBlob }, { id: 'chameleon', label: '变色龙', src: chameleon }, { id: 'cassette', label: '随身听', src: cassette }, { id: 'axolotl', label: '六角恐龙', src: axolotl }, { id: 'mushroom', label: '蘑菇屋', src: mushroom }, { id: 'jellyfish', label: '水母', src: jellyfish }, { id: 'fox', label: '小狐狸', src: fox },
  { id: 'fox-pilot', label: '飞行小狐狸', src: foxPilot }, { id: 'tea-dragon', label: '茶杯小龙', src: teaDragon }, { id: 'star-raccoon', label: '星空浣熊', src: starRaccoon }, { id: 'cloud-pup', label: '云朵小狗', src: cloudPup }, { id: 'capybara', label: '水豚咖啡师', src: capybara }, { id: 'octopus-dj', label: '章鱼 DJ', src: octopusDj }, { id: 'penguin-post', label: '企鹅邮差', src: penguinPost }, { id: 'alien-gardener', label: '外星园丁', src: alienGardener }, { id: 'snail-librarian', label: '蜗牛图书管理员', src: snailLibrarian }, { id: 'lemon-robot', label: '柠檬滑轮机器人', src: lemonRobot }
]
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
const completedTaskCount = computed(() => store.tasks.filter(task => task.completed && !task.deleted).length)
const backups = ref([])
const backupWorking = ref(false)
const backupError = ref('')
const pendingRestore = ref(null)
const pendingDelete = ref(null)
const backupLocation = ref('')
const deleteBackupDetails = computed(() => pendingDelete.value ? [
  { label: '恢复点大小', value: formatBytes(pendingDelete.value.sizeBytes), type: 'danger' },
  { label: '包含内容', value: '任务、附件和头像', type: 'info' }
] : [])
let nicknameTimer = null

onMounted(() => { loadAvatar(); loadBackups(); loadBackupLocation(); document.addEventListener('pointerdown', closeAvatarPickerOnOutside) })
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
  if (avatarPickerOpen.value && !avatarPickerAnchor.value?.contains(event.target)) {
    avatarPickerOpen.value = false
    hideAvatarPreview()
  }
}

function showAvatarPreview(avatar, event) {
  const rect = event.currentTarget?.getBoundingClientRect()
  if (!rect) return
  const width = 148
  const height = 148
  const margin = 12
  const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin))
  const preferredTop = rect.bottom + 10
  const top = preferredTop + height <= window.innerHeight - margin
    ? preferredTop
    : Math.max(margin, rect.top - height - 10)
  avatarPreview.value = { avatar, left, top }
}

function hideAvatarPreview() {
  avatarPreview.value = null
}

function formatBytes(value = 0) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function formatBackupDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '未知时间' : date.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
}

function backupLabel(backup) {
  const kind = backup.reason === 'manual' ? '手动恢复点' : '恢复前安全点'
  const date = new Date(backup.createdAt)
  if (Number.isNaN(date.getTime())) return kind
  const now = new Date()
  const isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  const day = isToday ? '今天' : `${date.getMonth() + 1}月${date.getDate()}日`
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${kind} · ${day} ${time}`
}

async function loadBackups() {
  try {
    backups.value = await listDataBackups()
  } catch (error) {
    backupError.value = error?.message || '读取恢复点失败'
  }
}

async function loadBackupLocation() {
  try {
    backupLocation.value = await getDataBackupLocation()
  } catch (error) {
    backupError.value = error?.message || '读取恢复点目录失败'
  }
}

async function openBackupLocation() {
  backupError.value = ''
  try {
    await openDataBackupLocation()
  } catch (error) {
    backupError.value = error?.message || '打开恢复点目录失败'
  }
}

async function openBackup(backup) {
  backupError.value = ''
  try {
    await openDataBackup(backup.id)
  } catch (error) {
    backupError.value = error?.message || '打开本机恢复点失败'
  }
}

async function createBackup() {
  backupWorking.value = true
  backupError.value = ''
  try {
    const backup = await createDataBackup()
    backups.value = [backup, ...backups.value]
    store.showNotice('已创建本机恢复点', 'success')
  } catch (error) {
    backupError.value = error?.message || '创建恢复点失败'
  } finally { backupWorking.value = false }
}

function requestRestore(backup) {
  pendingRestore.value = backup
  pendingDelete.value = null
  backupError.value = ''
}

function requestDelete(backup) {
  pendingDelete.value = backup
  pendingRestore.value = null
  backupError.value = ''
}

async function restoreBackup() {
  if (!pendingRestore.value) return
  backupWorking.value = true
  backupError.value = ''
  try {
    await restoreDataBackup(pendingRestore.value.id)
    await store.loadData()
    pendingRestore.value = null
    await loadBackups()
    store.showNotice('已恢复本机数据，并创建了恢复前安全点', 'success')
  } catch (error) {
    backupError.value = error?.message || '恢复本机数据失败'
  } finally { backupWorking.value = false }
}

async function deleteBackup() {
  if (!pendingDelete.value) return
  const backup = pendingDelete.value
  pendingDelete.value = null
  backupWorking.value = true
  backupError.value = ''
  try {
    await deleteDataBackup(backup.id)
    backups.value = backups.value.filter(item => item.id !== backup.id)
    store.showNotice('已删除本机恢复点', 'success')
  } catch (error) {
    backupError.value = error?.message || '删除本机恢复点失败'
  } finally { backupWorking.value = false }
}

async function persistAvatar(avatarRelativePath, avatarSha256) {
  store.updateProfile({ avatarRelativePath, avatarSha256, avatarUpdatedAt: new Date().toISOString() })
  await store.saveData()
  try {
    await cleanupProfileAvatars(avatarRelativePath)
  } catch (error) {
    store.showNotice('头像已更新，但旧头像清理失败', 'error')
  }
}

async function selectBuiltIn(id) {
  uploading.value = true
  errorMessage.value = ''
  try {
    await persistAvatar(`builtin:${id}`, null)
    avatarUrl.value = ''
    avatarPickerOpen.value = false
    hideAvatarPreview()
    store.showNotice('已切换内置头像', 'success')
  } catch (error) { errorMessage.value = error?.message || '保存头像失败' } finally { uploading.value = false }
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
    await persistAvatar(avatar.relativePath, avatar.sha256)
    await loadAvatar()
    avatarPickerOpen.value = false
    store.showNotice('头像已更新', 'success')
  } catch (error) { errorMessage.value = error?.message || '头像保存失败' } finally { uploading.value = false }
}

</script>
