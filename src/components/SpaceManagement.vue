<template>
  <section class="profile-section profile-section--first space-management">
    <div class="profile-section__head"><h3>空间管理</h3><p>本地优先</p></div>
    <div class="data-feature-strip">
      <div class="data-feature"><Database :size="18" /><span><strong>{{ store.isSaving ? '正在保存' : '本地自动保存' }}</strong><small>{{ store.saveError || '任务、资料和附件保存在当前设备。' }}</small></span></div>
      <div class="data-feature"><ShieldCheck :size="18" /><span><strong>本地个人空间</strong><small>不会上传到云端。</small></span></div>
    </div>
    <div class="settings-block">
      <div class="settings-block__title"><h4>垃圾桶</h4><span>{{ store.settings.trashRetentionDays }} 天</span></div>
      <label class="setting-select-card"><span class="setting-select-card__icon"><Trash2 :size="17" /></span><span class="setting-select-card__copy"><strong>保留时间</strong><small>到期的删除项会在本机自动清理</small></span><select :value="store.settings.trashRetentionDays" @change="store.updateSettings({ trashRetentionDays: Number($event.target.value) })"><option v-for="day in retentionDays" :key="day" :value="day">{{ day }} 天</option></select></label>
    </div>
    <div class="settings-block settings-block--maintenance storage-manager">
      <div class="settings-block__title"><h4>附件维护</h4><span>{{ report ? `${report.orphanAttachments.length} 项可清理` : '按需扫描' }}</span></div>
      <p class="storage-manager__hint">扫描只检查本机附件；任务和回收站中的引用都会保留。</p>
      <div class="storage-manager__toolbar"><span><strong>本机附件</strong><small>检查未引用附件和清理站</small></span><button class="small-btn" type="button" :disabled="loading" @click="scan">{{ loading ? '扫描中…' : '扫描' }}</button></div>
      <template v-if="report">
        <div class="storage-stats"><span>附件 {{ bytes(report.attachmentBytes) }}</span><span>可清理 {{ bytes(report.orphanBytes) }}</span><span>清理站 {{ bytes(report.quarantinedBytes) }}</span></div>
        <div v-if="report.orphanAttachments.length" class="storage-result"><div class="storage-result__head"><span><strong>未引用附件</strong><small>{{ report.orphanAttachments.length }} 项</small></span><button class="small-btn" type="button" :disabled="acting" @click="quarantineAll">移入清理站</button></div><div class="storage-item-list"><article v-for="item in report.orphanAttachments" :key="item.id" class="storage-item"><button v-if="item.isImage && previews[item.relativePath]" class="storage-item__preview" type="button" title="查看大图" @click="openPreview(item)"><img :src="previews[item.relativePath]" alt="" /></button><span v-else class="storage-item__file"><Database :size="16" /></span><span><strong>{{ item.name }}</strong><small>{{ bytes(item.sizeBytes) }} · {{ item.relativePath }}</small></span><button class="text-btn" type="button" :disabled="acting" @click="quarantine(item)">清理</button></article></div></div>
        <p v-else class="storage-manager__empty">没有发现未引用附件。</p>
        <div v-if="report.quarantinedAttachments.length" class="storage-result storage-result--quarantine"><div class="storage-result__head"><span><strong>清理站</strong><small>{{ report.quarantinedAttachments.length }} 项 · 可恢复</small></span><span class="storage-result__actions"><button class="text-btn" type="button" :disabled="acting" @click="restoreAll">全部恢复</button><button class="text-btn danger" type="button" :disabled="acting" @click="purgeAll">永久删除</button></span></div><div class="storage-item-list"><article v-for="item in report.quarantinedAttachments" :key="item.id" class="storage-item"><span class="storage-item__file"><Database :size="16" /></span><span><strong>{{ item.name }}</strong><small>{{ bytes(item.sizeBytes) }} · {{ item.relativePath }}</small></span><span class="storage-item__actions"><button class="text-btn" type="button" :disabled="acting" @click="restore(item)">恢复</button><button class="text-btn danger" type="button" :disabled="acting" @click="purge(item)">删除</button></span></article></div></div>
      </template>
    </div>
  </section>
  <ImageLightbox :visible="previewOpen" :images="previewImages" :start-index="previewIndex" @close="previewOpen = false" />
</template>

<script setup>
import { ref } from 'vue'
import { Database, ShieldCheck, Trash2 } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { purgeQuarantinedAttachments, quarantineOrphanAttachments, readAttachment, restoreQuarantinedAttachments, scanStorageHealth } from '@/services/platform'
import ImageLightbox from './ImageLightbox.vue'
const store = useTaskStore()
const report = ref(null); const loading = ref(false); const acting = ref(false); const previews = ref({}); const previewOpen = ref(false); const previewImages = ref([]); const previewIndex = ref(0)
const retentionDays = [7, 30, 60, 90, 180, 365]
const bytes = (value = 0) => value < 1024 ? `${value} B` : value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(1)} MB`
async function scan () { loading.value = true; try { report.value = await scanStorageHealth(); previews.value = {}; await hydratePreviews(report.value.orphanAttachments) } catch (error) { store.showNotice(error?.message || '扫描本机存储失败', 'error') } finally { loading.value = false } }
async function run (action, text) { if (!report.value) return; acting.value = true; try { const result = await action(); store.showNotice(`${text} ${result.affectedCount} 项，${bytes(result.affectedBytes)}`, 'success'); await scan() } catch (error) { store.showNotice(error?.message || '操作失败', 'error') } finally { acting.value = false } }
const quarantine = item => run(() => quarantineOrphanAttachments([item.relativePath]), '已移入清理站')
const quarantineAll = () => run(() => quarantineOrphanAttachments(report.value.orphanAttachments.map(item => item.relativePath)), '已移入清理站')
const restore = item => run(() => restoreQuarantinedAttachments([item.id]), '已恢复')
const restoreAll = () => run(() => restoreQuarantinedAttachments(report.value.quarantinedAttachments.map(item => item.id)), '已恢复')
const purge = item => { if (window.confirm(`永久删除“${item.name}”？此操作无法恢复。`)) return run(() => purgeQuarantinedAttachments([item.id]), '已永久删除') }
const purgeAll = () => { if (window.confirm('永久删除清理站中的所有附件？此操作无法恢复。')) return run(() => purgeQuarantinedAttachments(report.value.quarantinedAttachments.map(item => item.id)), '已永久删除') }
async function hydratePreviews(items) { const pairs = await Promise.all(items.filter(item => item.isImage).map(async item => [item.relativePath, await readAttachment(item.relativePath).catch(() => '')])); previews.value = Object.fromEntries(pairs.filter(([, url]) => url)) }
function openPreview(item) { const images = report.value.orphanAttachments.filter(candidate => candidate.isImage).map(candidate => previews.value[candidate.relativePath]).filter(Boolean); previewIndex.value = images.indexOf(previews.value[item.relativePath]); previewImages.value = images; previewOpen.value = true }
</script>
