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
            :aria-current="activeSection === section.id ? 'page' : undefined"
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
              <label class="switch-row theme-background-option">
                <span>
                  <strong>背景色随主题变化</strong>
                  <small>为侧栏、任务区和详情区应用当前主题的低饱和搭配色</small>
                </span>
                <input
                  type="checkbox"
                  :checked="store.settings.themeBackgrounds"
                  @change="store.updateSettings({ themeBackgrounds: $event.target.checked })"
                />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
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
                <span>{{ enabledInterfaceCount }}/2 已启用</span>
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
            </div>
          </section>

          <section v-else-if="activeSection === 'task-display'" class="settings-section">
            <div class="settings-section__head settings-section__head--accent">
              <span class="settings-section__icon"><CheckSquare :size="20" /></span>
              <div>
                <h3>任务显示</h3>
                <p>统一设置已完成任务在列表和分组中的展示方式。</p>
              </div>
            </div>

            <div class="settings-block completed-display-settings">
              <div class="settings-block__title">
                <h4>已完成任务</h4>
                <span>{{ completedDisplaySummary }}</span>
              </div>
              <label class="switch-row">
                <span>
                  <strong>列表模式显示已完成任务</strong>
                  <small>在普通列表底部折叠或展开已完成任务</small>
                </span>
                <input
                  type="checkbox"
                  :checked="store.settings.completedVisible"
                  @change="store.updateSettings({ completedVisible: $event.target.checked })"
                />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
              <label class="switch-row">
                <span>
                  <strong>分组模式下保留已完成任务</strong>
                  <small>完成后留在原分组底部；关闭后集中显示在列表底部</small>
                </span>
                <input
                  type="checkbox"
                  :checked="store.settings.groupCompletedDisplayMode === 'in-group'"
                  @change="store.updateSettings({ groupCompletedDisplayMode: $event.target.checked ? 'in-group' : 'separate-section' })"
                />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
              <label class="switch-row" :class="{ disabled: store.settings.groupCompletedDisplayMode !== 'in-group' }" :aria-disabled="store.settings.groupCompletedDisplayMode !== 'in-group'">
                <span>
                  <strong>默认显示已完成任务</strong>
                  <small v-if="store.settings.groupCompletedDisplayMode === 'in-group'">进入分组模式时默认展开已完成任务，可在任务列表中临时切换</small>
                  <small v-else>需先开启“保留在分组”</small>
                </span>
                <input
                  type="checkbox"
                  :checked="store.settings.groupCompletedVisibleByDefault"
                  :disabled="store.settings.groupCompletedDisplayMode !== 'in-group'"
                  @change="store.updateSettings({ groupCompletedVisibleByDefault: $event.target.checked })"
                />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
              <label class="switch-row">
                <span>
                  <strong>显示完成用时</strong>
                  <small>在已完成的主任务和子任务旁显示从创建到完成的时长</small>
                </span>
                <input
                  type="checkbox"
                  :checked="store.settings.showCompletionDuration"
                  @change="store.updateSettings({ showCompletionDuration: $event.target.checked })"
                />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
            </div>
          </section>

          <section v-else-if="activeSection === 'preferences'" class="settings-section">
            <div class="settings-section__head settings-section__head--accent">
              <span class="settings-section__icon"><SlidersHorizontal :size="20" /></span>
              <div>
                <h3>偏好与提醒</h3>
                <p>设置启动页、系统提醒和操作反馈。</p>
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

                <p v-if="!store.settings.reminderNotificationsEnabled" class="setting-summary">通知已关闭；重新开启后会保留当前的声音偏好。</p>
                <div v-else class="sound-categories sound-categories--two">
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

                  <button class="setting-action-card" type="button" @click="store.testReminderNotification">
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

                <p v-if="!store.settings.soundEnabled" class="setting-summary">音效已关闭；重新开启后会保留各类操作的开关状态。</p>
                <div v-else class="sound-categories">
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
                <h3>数据与维护</h3>
                <p>管理本机保存、垃圾桶保留期和附件维护操作。</p>
              </div>
            </div>

            <div class="data-feature-strip">
              <div class="data-feature">
                <Database :size="18" />
                <span>
                  <strong>{{ store.isSaving ? '正在保存' : '本地自动保存' }}</strong>
                  <small>{{ store.saveError || '数据保存在本机，无需手动保存。' }}</small>
                </span>
              </div>
              <div class="data-feature">
                <ShieldCheck :size="18" />
                <span>
                  <strong>本地优先</strong>
                  <small>数据仅保存在当前设备。</small>
                </span>
              </div>
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
                  <small>到期的删除项会在本机自动清理</small>
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

            <div class="settings-block settings-block--maintenance storage-manager">
              <div class="settings-block__title">
                <h4>存储清理</h4>
                <span>维护操作 · {{ storageSummary }}</span>
              </div>
              <p class="storage-manager__hint">扫描只检查本机附件。备注图片、任务附件和回收站中的引用都会保留，不会自动删除。</p>
              <div class="storage-manager__toolbar">
                <span><strong>本机附件</strong><small>查看未引用附件、失效引用和清理站</small></span>
                <button class="small-btn" type="button" :disabled="storageLoading" @click="scanStorage">{{ storageLoading ? '扫描中…' : '扫描' }}</button>
              </div>

              <template v-if="storageReport">
                <div class="storage-stats">
                  <span>附件 {{ formatBytes(storageReport.attachmentBytes) }}</span>
                  <span>可清理 {{ formatBytes(storageReport.orphanBytes) }}</span>
                  <span>清理站 {{ formatBytes(storageReport.quarantinedBytes) }}</span>
                </div>

                <div v-if="storageReport.orphanAttachments.length" class="storage-result">
                  <div class="storage-result__head">
                    <span><strong>未引用附件</strong><small>{{ storageReport.orphanAttachments.length }} 项 · {{ formatBytes(storageReport.orphanBytes) }}</small></span>
                    <span class="storage-result__actions"><button v-if="storageReport.orphanAttachments.length > inlineLimit" class="text-btn" type="button" @click="openStorageBrowser('orphan')">查看全部</button><button class="small-btn" type="button" :disabled="storageAction" @click="quarantineAll">移入清理站</button></span>
                  </div>
                  <section v-for="group in inlineOrphanGroups" :key="group.id" class="storage-type-group">
                    <p v-if="orphanGroups.length > 1" class="storage-type-group__title">{{ group.label }} · {{ group.items.length }} 项</p>
                    <div class="storage-item-list">
                      <article v-for="item in group.items" :key="item.id" class="storage-item">
                        <button v-if="item.isImage && previews[item.relativePath]" class="storage-item__preview" type="button" title="查看大图" @click="openPreview(item)"><img :src="previews[item.relativePath]" alt="" /></button>
                        <span v-else class="storage-item__file"><Database :size="16" /></span>
                        <span><strong :title="item.relativePath">{{ item.name }}</strong><small :title="item.relativePath">{{ formatBytes(item.sizeBytes) }} · {{ item.relativePath }}</small></span>
                        <button class="text-btn" type="button" :disabled="storageAction" @click="quarantineItem(item)">清理</button>
                      </article>
                    </div>
                  </section>
                </div>
                <p v-else class="storage-manager__empty">没有发现未引用附件。</p>

                <div v-if="storageReport.missingReferences.length" class="storage-warning">
                  发现 {{ storageReport.missingReferences.length }} 个失效引用：原数据仍保留，暂不会自动移除。
                </div>

                <div v-if="storageReport.quarantinedAttachments.length" class="storage-result storage-result--quarantine">
                  <div class="storage-result__head">
                    <span><strong>清理站</strong><small>{{ storageReport.quarantinedAttachments.length }} 项 · {{ formatBytes(storageReport.quarantinedBytes) }} · 可恢复</small></span>
                    <span class="storage-result__actions"><button v-if="storageReport.quarantinedAttachments.length > inlineLimit" class="text-btn" type="button" @click="openStorageBrowser('quarantine')">查看全部</button><button class="text-btn" type="button" :disabled="storageAction" @click="restoreAll">全部恢复</button><button class="text-btn danger" type="button" :disabled="storageAction" @click="requestPurge(storageReport.quarantinedAttachments)">永久删除</button></span>
                  </div>
                  <p class="storage-manager__hint storage-result__note">这是一个可恢复的暂存区。恢复后文件回到附件目录；若仍无引用，下次扫描仍会显示为可清理项。</p>
                  <section v-for="group in inlineQuarantinedGroups" :key="group.id" class="storage-type-group">
                    <p v-if="quarantinedGroups.length > 1" class="storage-type-group__title">{{ group.label }} · {{ group.items.length }} 项</p>
                    <div class="storage-item-list">
                      <article v-for="item in group.items" :key="item.id" class="storage-item">
                        <button v-if="item.isImage && quarantinedPreviews[item.id]" class="storage-item__preview" type="button" title="查看大图" @click="openQuarantinedPreview(item)"><img :src="quarantinedPreviews[item.id]" alt="" /></button>
                        <span v-else class="storage-item__file"><Database :size="16" /></span>
                        <span><strong :title="item.relativePath">{{ item.name }}</strong><small :title="item.relativePath">{{ formatBytes(item.sizeBytes) }} · {{ item.relativePath }}</small></span>
                        <span class="storage-item__actions"><button class="text-btn" type="button" :disabled="storageAction" @click="restoreItem(item)">恢复</button><button class="text-btn danger" type="button" :disabled="storageAction" @click="requestPurge([item])">删除</button></span>
                      </article>
                    </div>
                  </section>
                </div>
              </template>
            </div>
            <ImageLightbox :visible="previewOpen" :images="previewImages" :start-index="previewIndex" @close="previewOpen = false" />
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
              <button class="settings-help-link" type="button" @click="store.openHelpCenter">
                <Compass :size="17" />
                <span><strong>打开使用指南</strong><small>快速开始、功能说明、常见问题与更新内容</small></span>
              </button>
            </div>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>应用更新</h4>
                <span>{{ updateStatusText }}</span>
              </div>
              <p class="setting-summary">检查 GitHub Release 中经过签名验证的稳定版本。下载完成后会启动安装程序更新应用。</p>
              <div v-if="updateState === 'available'" class="storage-result">
                <div class="storage-result__head">
                  <span><strong>发现新版本 {{ availableUpdate?.version }}</strong><small>{{ updateNotes }}</small></span>
                  <button class="small-btn" type="button" :disabled="updateState === 'downloading' || updateState === 'installing'" @click="installUpdate">
                    {{ updateState === 'downloading' ? updateProgressText : '下载并安装' }}
                  </button>
                </div>
              </div>
              <p v-else-if="updateState === 'error'" class="storage-warning">{{ updateError }}</p>
              <button class="small-btn" type="button" :disabled="updateState === 'checking' || updateState === 'downloading' || updateState === 'installing'" @click="checkForUpdates">
                {{ updateState === 'checking' ? '检查中…' : '检查更新' }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </aside>
  </div>
  <Teleport to="body">
    <div v-if="storageBrowserOpen" class="storage-browser-layer" role="dialog" aria-modal="true" aria-label="清理附件">
      <button class="storage-browser-layer__scrim" type="button" aria-label="关闭" @click="closeStorageBrowser"></button>
      <section class="storage-browser">
        <header><div><h2>清理附件</h2><small>检查未引用附件，恢复或清理暂存文件。</small></div><button class="icon-btn" type="button" aria-label="关闭" @click="closeStorageBrowser"><X :size="18" /></button></header>
        <div class="storage-browser__toolbar"><div class="storage-browser__tabs"><button :class="{ active: storageBrowserTab === 'orphan' }" type="button" @click="setStorageBrowserTab('orphan')">未引用 {{ storageReport?.orphanAttachments.length || 0 }}</button><button :class="{ active: storageBrowserTab === 'quarantine' }" type="button" @click="setStorageBrowserTab('quarantine')">清理站 {{ storageReport?.quarantinedAttachments.length || 0 }}</button></div><div class="segmented storage-browser__filter"><button type="button" :class="{ active: storageFilter === 'all' }" @click="setStorageFilter('all')">全部</button><button type="button" :class="{ active: storageFilter === 'image' }" @click="setStorageFilter('image')">图片</button><button type="button" :class="{ active: storageFilter === 'file' }" @click="setStorageFilter('file')">文件</button></div><span class="storage-browser__count">{{ browserItems.length }} 项</span><span class="storage-browser__actions"><button v-if="storageBrowserTab === 'orphan'" class="small-btn" type="button" :disabled="storageAction || !browserItems.length" @click="quarantineAll">全部移入</button><template v-else><button class="text-btn" type="button" :disabled="storageAction || !browserItems.length" @click="restoreAll">全部恢复</button><button class="text-btn danger storage-browser__purge" type="button" :disabled="storageAction || !browserItems.length" @click="requestPurge(storageReport?.quarantinedAttachments || [])">清空清理站</button></template></span></div>
        <div class="storage-browser__list">
          <article v-for="item in browserPageItems" :key="item.id" class="storage-item">
            <button v-if="item.isImage && browserPreview(item)" class="storage-item__preview" type="button" @click="openBrowserPreview(item)"><img :src="browserPreview(item)" alt="" /></button><span v-else class="storage-item__file"><Database :size="16" /></span>
            <span><strong :title="item.relativePath">{{ item.name }}</strong><small :title="item.relativePath">{{ formatBytes(item.sizeBytes) }} · {{ item.relativePath }}</small></span>
            <span class="storage-item__actions"><button v-if="storageBrowserTab === 'quarantine'" class="text-btn" type="button" @click="restoreItem(item)">恢复</button><button v-if="storageBrowserTab === 'orphan'" class="text-btn" type="button" @click="quarantineItem(item)">清理</button><button v-else class="text-btn danger" type="button" @click="requestPurge([item])">删除</button></span>
          </article>
        </div>
        <footer v-if="browserPageCount > 1" class="storage-browser__pagination"><button class="text-btn" type="button" :disabled="storageBrowserPage === 0" @click="changeBrowserPage(-1)">上一页</button><span>{{ storageBrowserPage + 1 }} / {{ browserPageCount }}</span><button class="text-btn" type="button" :disabled="storageBrowserPage + 1 >= browserPageCount" @click="changeBrowserPage(1)">下一页</button></footer>
      </section>
    </div>
  </Teleport>
  <Teleport to="body">
    <div v-if="pendingPurgeIds.length" class="storage-delete-dialog-layer" role="presentation">
      <button class="storage-delete-dialog-layer__scrim" type="button" aria-label="取消永久删除" @click="pendingPurgeIds = []"></button>
      <section class="storage-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="storage-delete-title">
        <span class="storage-delete-dialog__icon"><Trash2 :size="22" /></span>
        <div><h2 id="storage-delete-title">永久删除 {{ pendingPurgeIds.length }} 项文件？</h2><p>文件将从本机彻底移除，且无法恢复。</p></div>
        <div class="storage-delete-dialog__targets"><strong>将删除</strong><ul><li v-for="item in purgeTargets" :key="item.id"><span>{{ item.name }}</span><small>{{ item.relativePath }}</small></li></ul><small v-if="pendingPurgeIds.length > purgeTargets.length">另有 {{ pendingPurgeIds.length - purgeTargets.length }} 项文件</small></div>
        <footer><button class="small-btn" type="button" @click="pendingPurgeIds = []">取消</button><button class="small-btn danger" type="button" :disabled="storageAction" @click="confirmPurge">永久删除</button></footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Bell, Check, Compass, Database, Info, PanelTop, Palette, ShieldCheck, SlidersHorizontal, Trash2, X, Volume2, CheckSquare, Folder, Tag } from 'lucide-vue-next'
import { check } from '@tauri-apps/plugin-updater'
import { useTaskStore } from '@/stores/task'
import { purgeQuarantinedAttachments, quarantineOrphanAttachments, readAttachment, readQuarantinedAttachment, restoreQuarantinedAttachments, scanStorageHealth } from '@/services/platform'
import ImageLightbox from './ImageLightbox.vue'
import appIcon from '@/assets/app-icon.svg'

const version = __APP_VERSION__

const store = useTaskStore()
const activeSection = ref('appearance')
const storageReport = ref(null)
const storageLoading = ref(false)
const storageAction = ref(false)
const previews = ref({})
const quarantinedPreviews = ref({})
const previewOpen = ref(false)
const previewImages = ref([])
const previewIndex = ref(0)
const pendingPurgeIds = ref([])
const storageBrowserOpen = ref(false)
const storageBrowserTab = ref('orphan')
const storageBrowserPage = ref(0)
const storageFilter = ref('all')
const inlineLimit = 3
const browserPageSize = 40
const updateState = ref('idle')
const availableUpdate = ref(null)
const updateError = ref('')
const updateProgress = ref({ downloaded: 0, total: 0 })

const sections = [
  { id: 'appearance', label: '外观', summary: '主题与布局', icon: Palette },
  { id: 'task-display', label: '任务显示', summary: '完成任务', icon: CheckSquare },
  { id: 'preferences', label: '偏好与提醒', summary: '启动与反馈', icon: SlidersHorizontal },
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
const enabledInterfaceCount = computed(() => Number(!store.settings.sidebarCollapsed) + Number(store.settings.detailOpen))
const completedDisplaySummary = computed(() => {
  const listVisible = store.settings.completedVisible ? '列表显示' : '列表隐藏'
  const groupMode = store.settings.groupCompletedDisplayMode === 'in-group' ? '分组保留' : '集中到底部'
  return `${listVisible} · ${groupMode}`
})
const enabledSoundCount = computed(() => [
  store.settings.soundTaskEnabled,
  store.settings.soundListEnabled,
  store.settings.soundGroupEnabled
].filter(Boolean).length)
const soundSummary = computed(() => store.settings.soundEnabled ? `${enabledSoundCount.value}/3 已启用` : '已关闭')
const reminderSummary = computed(() => store.settings.reminderNotificationsEnabled ? (store.settings.reminderSoundEnabled ? '通知和声音' : '仅通知') : '已关闭')
const storageSummary = computed(() => storageReport.value ? `${storageReport.value.orphanAttachments.length} 项可清理` : '按需扫描')
const updateStatusText = computed(() => ({
  idle: '手动检查',
  checking: '正在检查',
  upToDate: '已是最新',
  available: `可更新至 ${availableUpdate.value?.version || ''}`,
  downloading: '正在下载',
  installing: '正在安装',
  error: '检查失败'
}[updateState.value] || '手动检查'))
const updateProgressText = computed(() => {
  const { downloaded, total } = updateProgress.value
  if (!total) return '正在下载…'
  return `正在下载 ${Math.min(100, Math.round(downloaded / total * 100))}%`
})
const updateNotes = computed(() => availableUpdate.value?.body?.trim() || '本次更新已准备就绪。')
const orphanGroups = computed(() => {
  const items = storageReport.value?.orphanAttachments || []
  const images = items.filter(item => item.isImage)
  const files = items.filter(item => !item.isImage)
  const groups = []
  if (images.length) groups.push({ id: 'images', label: '图片', items: images })
  if (files.length) groups.push({ id: 'files', label: '文件', items: files })
  return groups
})
const quarantinedGroups = computed(() => groupAttachments(storageReport.value?.quarantinedAttachments || []))
const inlineOrphanGroups = computed(() => groupAttachments((storageReport.value?.orphanAttachments || []).slice(0, inlineLimit)))
const inlineQuarantinedGroups = computed(() => groupAttachments((storageReport.value?.quarantinedAttachments || []).slice(0, inlineLimit)))
const browserItems = computed(() => {
  const items = storageBrowserTab.value === 'orphan' ? (storageReport.value?.orphanAttachments || []) : (storageReport.value?.quarantinedAttachments || [])
  return storageFilter.value === 'all' ? items : items.filter(item => storageFilter.value === 'image' ? item.isImage : !item.isImage)
})
const browserPageCount = computed(() => Math.max(1, Math.ceil(browserItems.value.length / browserPageSize)))
const browserPageItems = computed(() => browserItems.value.slice(storageBrowserPage.value * browserPageSize, (storageBrowserPage.value + 1) * browserPageSize))
const purgeTargets = computed(() => (storageReport.value?.quarantinedAttachments || []).filter(item => pendingPurgeIds.value.includes(item.id)).slice(0, 3))

function groupAttachments(items) {
  const images = items.filter(item => item.isImage)
  const files = items.filter(item => !item.isImage)
  const groups = []
  if (images.length) groups.push({ id: 'images', label: '图片', items: images })
  if (files.length) groups.push({ id: 'files', label: '文件', items: files })
  return groups
}

function formatBytes(value = 0) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '未知时间' : date.toLocaleDateString('zh-CN')
}

async function checkForUpdates() {
  updateState.value = 'checking'
  updateError.value = ''
  availableUpdate.value = null
  try {
    const update = await check({ timeout: 10000 })
    if (!update) {
      updateState.value = 'upToDate'
      return
    }
    availableUpdate.value = update
    updateState.value = 'available'
  } catch (error) {
    updateState.value = 'error'
    updateError.value = error?.message || '暂时无法检查更新，请检查网络后重试。'
  }
}

async function installUpdate() {
  if (!availableUpdate.value) return
  updateState.value = 'downloading'
  updateError.value = ''
  updateProgress.value = { downloaded: 0, total: 0 }
  try {
    await availableUpdate.value.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        updateProgress.value = { downloaded: 0, total: event.data.contentLength || 0 }
      } else if (event.event === 'Progress') {
        updateProgress.value = { ...updateProgress.value, downloaded: updateProgress.value.downloaded + event.data.chunkLength }
      } else if (event.event === 'Finished') {
        updateState.value = 'installing'
      }
    })
  } catch (error) {
    updateState.value = 'error'
    updateError.value = error?.message || '更新下载或安装失败，请稍后重试。'
  }
}

async function scanStorage() {
  storageLoading.value = true
  try {
    const report = await scanStorageHealth()
    storageReport.value = report
    previews.value = {}
    quarantinedPreviews.value = {}
    await hydrateVisiblePreviews(report.orphanAttachments.slice(0, inlineLimit), 'orphan')
    await hydrateVisiblePreviews(report.quarantinedAttachments.slice(0, inlineLimit), 'quarantine')
    pendingPurgeIds.value = []
  } catch (error) {
    store.showNotice(error?.message || '扫描本机存储失败', 'error')
  } finally { storageLoading.value = false }
}

async function runStorageAction(action, successText) {
  if (!storageReport.value) return
  storageAction.value = true
  try {
    const result = await action()
    store.showNotice(`${successText} ${result.affectedCount} 项，${formatBytes(result.affectedBytes)}`, 'success')
    await scanStorage()
  } catch (error) {
    store.showNotice(error?.message || '操作失败', 'error')
  } finally { storageAction.value = false }
}

function quarantineAll() { return runStorageAction(() => quarantineOrphanAttachments(storageReport.value.orphanAttachments.map(item => item.relativePath)), '已移入清理站') }
function quarantineItem(item) { return runStorageAction(() => quarantineOrphanAttachments([item.relativePath]), '已移入清理站') }
function restoreAll() { return runStorageAction(() => restoreQuarantinedAttachments(storageReport.value.quarantinedAttachments.map(item => item.id)), '已恢复') }
function restoreItem(item) { return runStorageAction(() => restoreQuarantinedAttachments([item.id]), '已恢复') }
function requestPurge(items) { pendingPurgeIds.value = items.map(item => item.id) }
function confirmPurge() { return runStorageAction(() => purgeQuarantinedAttachments(pendingPurgeIds.value), '已永久删除') }
function openPreview(item) {
  const images = (storageReport.value?.orphanAttachments || []).filter(candidate => candidate.isImage).map(candidate => previews.value[candidate.relativePath]).filter(Boolean)
  previewIndex.value = images.indexOf(previews.value[item.relativePath])
  previewImages.value = images
  previewOpen.value = true
}
function openQuarantinedPreview(item) {
  const images = (storageReport.value?.quarantinedAttachments || []).filter(candidate => candidate.isImage).map(candidate => quarantinedPreviews.value[candidate.id]).filter(Boolean)
  previewIndex.value = images.indexOf(quarantinedPreviews.value[item.id])
  previewImages.value = images
  previewOpen.value = true
}
async function hydrateVisiblePreviews(items, kind) {
  const pairs = await Promise.all(items.filter(item => item.isImage).map(async (item) => [kind === 'orphan' ? item.relativePath : item.id, kind === 'orphan' ? await readAttachment(item.relativePath) : await readQuarantinedAttachment(item.id)]))
  const target = kind === 'orphan' ? previews : quarantinedPreviews
  target.value = { ...target.value, ...Object.fromEntries(pairs.filter(([, url]) => url)) }
}
async function openStorageBrowser(tab) { storageBrowserTab.value = tab; storageFilter.value = 'all'; storageBrowserPage.value = 0; storageBrowserOpen.value = true; await hydrateVisiblePreviews(browserPageItems.value, tab) }
function closeStorageBrowser() { pendingPurgeIds.value = []; storageBrowserOpen.value = false }
async function setStorageBrowserTab(tab) { storageBrowserTab.value = tab; storageBrowserPage.value = 0; await hydrateVisiblePreviews(browserPageItems.value, tab) }
async function setStorageFilter(filter) { storageFilter.value = filter; storageBrowserPage.value = 0; await hydrateVisiblePreviews(browserPageItems.value, storageBrowserTab.value) }
async function changeBrowserPage(delta) { storageBrowserPage.value = Math.max(0, Math.min(browserPageCount.value - 1, storageBrowserPage.value + delta)); await hydrateVisiblePreviews(browserPageItems.value, storageBrowserTab.value) }
function browserPreview(item) { return storageBrowserTab.value === 'orphan' ? previews.value[item.relativePath] : quarantinedPreviews.value[item.id] }
function openBrowserPreview(item) { storageBrowserTab.value === 'orphan' ? openPreview(item) : openQuarantinedPreview(item) }
</script>
