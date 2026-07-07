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
            <component :is="section.icon" :size="17" />
            <span>
              <strong>{{ section.label }}</strong>
              <small>{{ section.description }}</small>
            </span>
          </button>
        </nav>

        <div class="settings-content">
          <section v-if="activeSection === 'appearance'" class="settings-section">
            <div class="settings-section__head">
              <h3>外观</h3>
              <p>调整配色、信息密度和界面显示方式。</p>
            </div>

            <div class="settings-block">
              <h4>配色</h4>
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
                  <span class="theme-card__text">
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
              <h4>模式</h4>
              <label class="switch-row setting-row">
                <span class="setting-row__icon">
                  <Moon :size="17" />
                </span>
                <span class="setting-row__body">
                  <strong>深色模式</strong>
                  <small>切换深色 / 浅色界面</small>
                </span>
                <input
                  class="toggle-input"
                  type="checkbox"
                  :checked="store.settings.darkMode"
                  @change="store.updateSettings({ darkMode: $event.target.checked })"
                />
                <span class="toggle-control" aria-hidden="true"></span>
              </label>
            </div>

            <div class="settings-block">
              <h4>信息密度</h4>
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
              <h4>界面</h4>
              <label class="switch-row setting-row">
                <span class="setting-row__body">
                  <strong>默认显示详情面板</strong>
                  <small>选中任务后可以直接编辑属性和备注</small>
                </span>
                <input
                  class="toggle-input"
                  type="checkbox"
                  :checked="store.settings.detailOpen"
                  @change="store.updateSettings({ detailOpen: $event.target.checked })"
                />
                <span class="toggle-control" aria-hidden="true"></span>
              </label>
              <label class="switch-row setting-row">
                <span class="setting-row__body">
                  <strong>显示已完成分组</strong>
                  <small>在普通列表下折叠或展开已完成任务</small>
                </span>
                <input
                  class="toggle-input"
                  type="checkbox"
                  :checked="store.settings.completedVisible"
                  @change="store.updateSettings({ completedVisible: $event.target.checked })"
                />
                <span class="toggle-control" aria-hidden="true"></span>
              </label>
            </div>
          </section>

          <section v-else-if="activeSection === 'behavior'" class="settings-section">
            <div class="settings-section__head">
              <h3>行为</h3>
              <p>设置应用启动后的默认位置和常用流程。</p>
            </div>

            <div class="settings-block">
              <h4>启动页</h4>
              <label class="field setting-field">
                <span class="setting-row__icon"><PanelTop :size="16" /></span>
                <span class="setting-row__body">
                  <strong>打开应用默认进入</strong>
                  <small>选择每次启动后先显示的视图</small>
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
              <h4>垃圾桶</h4>
              <label class="field setting-field">
                <span class="setting-row__icon"><Trash2 :size="16" /></span>
                <span class="setting-row__body">
                  <strong>保留时间</strong>
                  <small>删除后的任务会在本机保留多久</small>
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
              <h4>音效</h4>
              <div class="sound-settings">
                <label class="switch-row setting-row sound-master">
                  <span class="setting-row__icon">
                    <Volume2 :size="17" />
                  </span>
                  <span class="setting-row__body">
                    <strong>启用音效</strong>
                    <small>操作时播放提示音</small>
                  </span>
                  <input
                    class="toggle-input"
                    type="checkbox"
                    :checked="store.settings.soundEnabled"
                    @change="store.updateSettings({ soundEnabled: $event.target.checked })"
                  />
                  <span class="toggle-control" aria-hidden="true"></span>
                </label>

                <div class="sound-categories" :class="{ disabled: !store.settings.soundEnabled }">
                  <label class="sound-item">
                    <span class="sound-item-icon">
                      <CheckSquare :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>任务操作</strong>
                      <small>完成、添加、删除任务</small>
                    </span>
                    <input
                      class="toggle-input"
                      type="checkbox"
                      :checked="store.settings.soundTaskEnabled"
                      :disabled="!store.settings.soundEnabled"
                      @change="store.updateSettings({ soundTaskEnabled: $event.target.checked })"
                    />
                    <span class="toggle-control toggle-control--sm" aria-hidden="true"></span>
                  </label>

                  <label class="sound-item">
                    <span class="sound-item-icon">
                      <Tag :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>清单操作</strong>
                      <small>添加、删除清单</small>
                    </span>
                    <input
                      class="toggle-input"
                      type="checkbox"
                      :checked="store.settings.soundListEnabled"
                      :disabled="!store.settings.soundEnabled"
                      @change="store.updateSettings({ soundListEnabled: $event.target.checked })"
                    />
                    <span class="toggle-control toggle-control--sm" aria-hidden="true"></span>
                  </label>

                  <label class="sound-item">
                    <span class="sound-item-icon">
                      <Folder :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>分组操作</strong>
                      <small>添加、删除分组</small>
                    </span>
                    <input
                      class="toggle-input"
                      type="checkbox"
                      :checked="store.settings.soundGroupEnabled"
                      :disabled="!store.settings.soundEnabled"
                      @change="store.updateSettings({ soundGroupEnabled: $event.target.checked })"
                    />
                    <span class="toggle-control toggle-control--sm" aria-hidden="true"></span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeSection === 'data'" class="settings-section">
            <div class="settings-section__head">
              <h3>本地数据</h3>
              <p>当前 MVP 以本地自动保存为主，后续导入导出可以放在这里。</p>
            </div>

            <div class="status-card">
              <Database :size="18" />
              <span>
                <strong>{{ store.isSaving ? '正在保存' : '本地自动保存' }}</strong>
                <small>{{ store.saveError || '数据保存在本机，暂不启用账号和同步。' }}</small>
              </span>
            </div>
          </section>

          <section v-else class="settings-section">
            <div class="settings-section__head">
              <h3>关于</h3>
              <p>易简清单是本地优先的个人任务管理工具。</p>
            </div>

            <div class="about-card">
              <img :src="appIcon" alt="" />
              <div>
                <strong>易简清单</strong>
                <small>版本 1.0.0</small>
              </div>
            </div>
          </section>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Check, Database, Info, PanelTop, Palette, SlidersHorizontal, Trash2, X, Volume2, CheckSquare, Folder, Tag, Moon } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import appIcon from '@/assets/app-icon.svg'

const store = useTaskStore()
const activeSection = ref('appearance')

const sections = [
  { id: 'appearance', label: '外观', description: '主题与布局', icon: Palette },
  { id: 'behavior', label: '行为', description: '启动与清理', icon: SlidersHorizontal },
  { id: 'data', label: '数据', description: '本地保存', icon: Database },
  { id: 'about', label: '关于', description: '版本信息', icon: Info }
]

const themes = [
  { id: 'mint', label: '青绿', description: '默认低饱和', swatch: 'linear-gradient(135deg, #287f77 0%, #69bdb5 52%, #dff4ef 100%)' },
  { id: 'blue', label: '海蓝', description: '更清爽', swatch: 'linear-gradient(135deg, #346fd8 0%, #76a6df 52%, #e7f0ff 100%)' },
  { id: 'violet', label: '紫罗兰', description: '轻微个性', swatch: 'linear-gradient(135deg, #6d5bd7 0%, #988be0 52%, #eeeaff 100%)' },
  { id: 'graphite', label: '石墨', description: '低彩度', swatch: 'linear-gradient(135deg, #475569 0%, #8491a2 52%, #eef2f7 100%)' }
]
</script>
