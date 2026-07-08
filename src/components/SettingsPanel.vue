<template>
  <div v-if="store.settingsOpen" class="settings-layer" role="dialog" aria-modal="true" aria-label="设置">
    <button class="settings-scrim" type="button" aria-label="关闭设置" @click="store.closeSettings"></button>
    <aside class="settings-panel">
      <header class="settings-panel__header">
        <div>
          <p class="eyebrow">偏好设置</p>
          <h2>设置</h2>
        </div>
        <button class="icon-btn" type="button" aria-label="关闭设置" @click="store.closeSettings">
          <X :size="18" />
        </button>
      </header>

      <div class="settings-layout">
        <nav class="settings-nav" aria-label="设置分类">
          <button
            v-for="section in sections"
            :key="section.id"
            class="settings-nav__item"
            :class="{ active: activeSection === section.id }"
            type="button"
            @click="activeSection = section.id"
          >
            <span class="settings-nav__icon">
              <component :is="section.icon" :size="17" />
            </span>
            <span class="settings-nav__copy">
              <strong>{{ section.label }}</strong>
              <small>{{ section.summary }}</small>
            </span>
          </button>
        </nav>

        <div class="settings-content">
          <section v-if="activeSection === 'appearance'" class="settings-section">
            <div class="settings-section__head settings-section__head--accent">
              <span class="settings-section__icon"><Palette :size="20" /></span>
              <div>
                <h3>外观</h3>
                <p>调整配色、信息密度和界面显示方式。</p>
              </div>
            </div>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>配色</h4>
                <span>{{ currentThemeLabel }}</span>
              </div>
              <div class="theme-grid">
                <button
                  v-for="theme in themes"
                  :key="theme.id"
                  class="theme-card"
                  :class="{ active: store.settings.theme === theme.id }"
                  type="button"
                  @click="store.updateSettings({ theme: theme.id })"
                >
                  <span class="theme-swatch" :style="{ background: theme.swatch }"></span>
                  <span class="theme-card__copy">
                    <strong>{{ theme.label }}</strong>
                    <small>{{ theme.description }}</small>
                  </span>
                  <span class="theme-card__check" aria-hidden="true">
                    <Check v-if="store.settings.theme === theme.id" :size="15" />
                  </span>
                </button>
              </div>
            </div>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>信息密度</h4>
                <span>{{ store.settings.density === 'compact' ? '紧凑' : '舒适' }}</span>
              </div>
              <div class="segmented">
                <button
                  type="button"
                  :class="{ active: store.settings.density === 'comfortable' }"
                  @click="store.updateSettings({ density: 'comfortable' })"
                >
                  舒适
                </button>
                <button
                  type="button"
                  :class="{ active: store.settings.density === 'compact' }"
                  @click="store.updateSettings({ density: 'compact' })"
                >
                  紧凑
                </button>
              </div>
            </div>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>界面</h4>
                <span>{{ enabledInterfaceCount }}/3 已启用</span>
              </div>
              <label class="switch-row">
                <span>
                  <strong>侧栏显示导航栏</strong>
                  <small>折叠后只显示图标，任务列表获得更多空间</small>
                </span>
                <input
                  type="checkbox"
                  :checked="!store.settings.sidebarCollapsed"
                  @change="store.updateSettings({ sidebarCollapsed: !$event.target.checked })"
                />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
              <label class="switch-row">
                <span>
                  <strong>默认显示详情面板</strong>
                  <small>选中任务后可以直接编辑属性和备注</small>
                </span>
                <input
                  type="checkbox"
                  :checked="store.settings.detailOpen"
                  @change="store.updateSettings({ detailOpen: $event.target.checked })"
                />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
              <label class="switch-row">
                <span>
                  <strong>显示已完成分组</strong>
                  <small>在普通列表下折叠或展开已完成任务</small>
                </span>
                <input
                  type="checkbox"
                  :checked="store.settings.completedVisible"
                  @change="store.updateSettings({ completedVisible: $event.target.checked })"
                />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
            </div>
          </section>

          <section v-else-if="activeSection === 'behavior'" class="settings-section">
            <div class="settings-section__head settings-section__head--accent">
              <span class="settings-section__icon"><SlidersHorizontal :size="20" /></span>
              <div>
                <h3>行为</h3>
                <p>设置应用启动后的默认位置和常用流程。</p>
              </div>
            </div>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>启动页</h4>
                <span>{{ startViewLabel }}</span>
              </div>
              <label class="setting-select-card">
                <span class="setting-select-card__icon"><PanelTop :size="17" /></span>
                <span class="setting-select-card__copy">
                  <strong>打开应用默认进入</strong>
                  <small>选择启动后最先展示的任务视图</small>
                </span>
                <select :value="store.settings.startView" @change="store.updateSettings({ startView: $event.target.value })">
                  <option value="today">今日</option>
                  <option value="inbox">收集箱</option>
                  <option value="planned">计划</option>
                  <option value="important">重要</option>
                </select>
              </label>
            </div>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>垃圾桶</h4>
                <span>{{ store.settings.trashRetentionDays }} 天</span>
              </div>
              <label class="setting-select-card">
                <span class="setting-select-card__icon"><Trash2 :size="17" /></span>
                <span class="setting-select-card__copy">
                  <strong>保留时间</strong>
                  <small>过期删除项会在本地自动清理</small>
                </span>
                <select :value="store.settings.trashRetentionDays" @change="store.updateSettings({ trashRetentionDays: Number($event.target.value) })">
                  <option :value="7">7 天</option>
                  <option :value="30">30 天</option>
                  <option :value="60">60 天</option>
                  <option :value="90">90 天</option>
                  <option :value="180">180 天</option>
                  <option :value="365">365 天</option>
                </select>
              </label>
            </div>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>提醒</h4>
                <span>{{ reminderSummary }}</span>
              </div>
              <div class="sound-settings">
                <label class="switch-row sound-master">
                  <span class="sound-label">
                    <Bell :size="18" class="sound-icon" />
                    <span>
                      <strong>系统提醒通知</strong>
                      <small>到点通过 Windows toast 或 macOS 通知中心提醒</small>
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    :checked="store.settings.reminderNotificationsEnabled"
                    @change="store.updateSettings({ reminderNotificationsEnabled: $event.target.checked })"
                  />
                  <span class="switch-control" aria-hidden="true"></span>
                </label>

                <div class="sound-categories sound-categories--two" :class="{ disabled: !store.settings.reminderNotificationsEnabled }">
                  <label class="sound-item">
                    <span class="sound-item-icon">
                      <Volume2 :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>提醒声音</strong>
                      <small>使用系统通知音</small>
                    </span>
                    <input
                      type="checkbox"
                      :checked="store.settings.reminderSoundEnabled"
                      :disabled="!store.settings.reminderNotificationsEnabled"
                      @change="store.updateSettings({ reminderSoundEnabled: $event.target.checked })"
                    />
                    <span class="switch-control" aria-hidden="true"></span>
                  </label>

                  <button class="setting-action-card" type="button" :disabled="!store.settings.reminderNotificationsEnabled" @click="store.testReminderNotification">
                    <Bell :size="16" />
                    <span>
                      <strong>发送测试提醒</strong>
                      <small>同时检查系统权限</small>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>音效</h4>
                <span>{{ soundSummary }}</span>
              </div>
              <div class="sound-settings">
                <label class="switch-row sound-master">
                  <span class="sound-label">
                    <Volume2 :size="18" class="sound-icon" />
                    <span>
                      <strong>启用音效</strong>
                      <small>操作时播放提示音</small>
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    :checked="store.settings.soundEnabled"
                    @change="store.updateSettings({ soundEnabled: $event.target.checked })"
                  />
                  <span class="switch-control" aria-hidden="true"></span>
                </label>

                <div class="sound-categories" :class="{ disabled: !store.settings.soundEnabled }">
                  <label class="sound-item">
                    <span class="sound-item-icon">
                      <CheckSquare :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>任务操作</strong>
                      <small>任务、日期、附件</small>
                    </span>
                    <input
                      type="checkbox"
                      :checked="store.settings.soundTaskEnabled"
                      :disabled="!store.settings.soundEnabled"
                      @change="store.updateSettings({ soundTaskEnabled: $event.target.checked })"
                    />
                    <span class="switch-control" aria-hidden="true"></span>
                  </label>

                  <label class="sound-item">
                    <span class="sound-item-icon">
                      <Tag :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>清单操作</strong>
                      <small>清单增删</small>
                    </span>
                    <input
                      type="checkbox"
                      :checked="store.settings.soundListEnabled"
                      :disabled="!store.settings.soundEnabled"
                      @change="store.updateSettings({ soundListEnabled: $event.target.checked })"
                    />
                    <span class="switch-control" aria-hidden="true"></span>
                  </label>

                  <label class="sound-item">
                    <span class="sound-item-icon">
                      <Folder :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>分组操作</strong>
                      <small>分组增删</small>
                    </span>
                    <input
                      type="checkbox"
                      :checked="store.settings.soundGroupEnabled"
                      :disabled="!store.settings.soundEnabled"
                      @change="store.updateSettings({ soundGroupEnabled: $event.target.checked })"
                    />
                    <span class="switch-control" aria-hidden="true"></span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeSection === 'data'" class="settings-section">
            <div class="settings-section__head settings-section__head--accent">
              <span class="settings-section__icon"><Database :size="20" /></span>
              <div>
                <h3>本地数据</h3>
                <p>当前 MVP 以本地自动保存为主，后续导入导出可以放在这里。</p>
              </div>
            </div>

            <div class="status-grid">
              <div class="status-card">
                <Database :size="18" />
                <span>
                  <strong>{{ store.isSaving ? '正在保存' : '本地自动保存' }}</strong>
                  <small>{{ store.saveError || '数据保存在本机，暂不启用账号和同步。' }}</small>
                </span>
              </div>
              <div class="status-card">
                <ShieldCheck :size="18" />
                <span>
                  <strong>本地优先</strong>
                  <small>任务、清单和设置只写入当前设备。</small>
                </span>
              </div>
            </div>
          </section>

          <section v-else class="settings-section">
            <div class="settings-section__head settings-section__head--accent">
              <span class="settings-section__icon"><Info :size="20" /></span>
              <div>
                <h3>关于</h3>
                <p>易简清单是本地优先的个人任务管理工具。</p>
              </div>
            </div>

            <div class="about-card">
              <img :src="appIcon" alt="" />
              <div>
                <strong>易简清单</strong>
                <small>版本 {{ version }} · Tauri 本地应用</small>
              </div>
            </div>
          </section>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Bell, Check, Database, Info, PanelTop, Palette, ShieldCheck, SlidersHorizontal, Trash2, X, Volume2, CheckSquare, Folder, Tag } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import appIcon from '@/assets/app-icon.svg'

const version = __APP_VERSION__

const store = useTaskStore()
const activeSection = ref('appearance')

const sections = [
  { id: 'appearance', label: '外观', summary: '主题与布局', icon: Palette },
  { id: 'behavior', label: '行为', summary: '启动与音效', icon: SlidersHorizontal },
  { id: 'data', label: '数据', summary: '保存状态', icon: Database },
  { id: 'about', label: '关于', summary: '版本信息', icon: Info }
]

const themes = [
  { id: 'mint', label: '青绿', description: '默认清爽', swatch: 'linear-gradient(135deg, #2f8f86 0%, #8ed6cb 58%, #f3fbf9 100%)' },
  { id: 'blue', label: '海蓝', description: '冷静专注', swatch: 'linear-gradient(135deg, #346fd8 0%, #8db7ff 58%, #f4f8ff 100%)' },
  { id: 'violet', label: '紫罗兰', description: '柔和醒目', swatch: 'linear-gradient(135deg, #6d5bd7 0%, #b0a7ff 58%, #f8f6ff 100%)' },
  { id: 'graphite', label: '石墨', description: '克制低调', swatch: 'linear-gradient(135deg, #475569 0%, #9aa7b8 58%, #f7f9fc 100%)' }
]

const startViewLabels = {
  today: '今日',
  inbox: '收集箱',
  planned: '计划',
  important: '重要'
}

const currentThemeLabel = computed(() => themes.find((theme) => theme.id === store.settings.theme)?.label || '青绿')
const startViewLabel = computed(() => startViewLabels[store.settings.startView] || '今日')
const enabledInterfaceCount = computed(() => Number(!store.settings.sidebarCollapsed) + Number(store.settings.detailOpen) + Number(store.settings.completedVisible))
const enabledSoundCount = computed(() => [
  store.settings.soundTaskEnabled,
  store.settings.soundListEnabled,
  store.settings.soundGroupEnabled
].filter(Boolean).length)
const soundSummary = computed(() => store.settings.soundEnabled ? `${enabledSoundCount.value}/3 已启用` : '已关闭')
const reminderSummary = computed(() => store.settings.reminderNotificationsEnabled ? (store.settings.reminderSoundEnabled ? '通知和声音' : '仅通知') : '已关闭')
</script>
