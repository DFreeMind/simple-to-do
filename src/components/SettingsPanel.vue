<template>
  <div v-if="store.settingsOpen" class="settings-layer" @keydown.esc.stop="store.closeSettings" @keydown.tab="trapSettingsFocus">
    <button class="settings-scrim" type="button" aria-label="关闭设置" @click="store.closeSettings"></button>
    <aside ref="settingsPanel" class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabindex="-1">
      <header class="settings-panel__header">
        <div>
          <p class="eyebrow">偏好设置</p>
          <h2 id="settings-title">设置</h2>
        </div>
        <span class="settings-save-status" :class="{ error: store.saveError }" aria-live="polite">
          <Check v-if="!store.isSaving && !store.saveError" :size="14" />
          {{ store.saveError ? '保存失败' : store.isSaving ? '正在保存…' : '已自动保存' }}
        </span>
        <button class="icon-btn" type="button" aria-label="关闭设置" @click="store.closeSettings">
          <X :size="18" />
        </button>
      </header>

      <div class="settings-layout">
        <nav class="settings-nav" aria-label="设置分类" @keydown="handleSectionKeydown">
          <button
            v-for="section in sections"
            :key="section.id"
            class="settings-nav__item"
            :class="{ active: activeSection === section.id }"
            :aria-current="activeSection === section.id ? 'page' : undefined"
            :title="section.summary"
            :data-settings-section="section.id"
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
            <span
              v-if="section.id === 'about' && updateBadgeVisible"
              class="settings-nav__badge"
              title="发现可用更新"
              aria-label="发现可用更新"
            ></span>
          </button>
        </nav>

        <div class="settings-content">
          <section v-if="activeSection === 'appearance'" class="settings-section">
            <div class="settings-section__head settings-section__head--accent">
              <span class="settings-section__icon"><Palette :size="20" /></span>
              <div>
                <h3>外观与显示</h3>
                <p>调整配色、信息密度、面板和任务展示方式。</p>
              </div>
            </div>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>配色</h4>
                <span>{{ currentThemeLabel }}</span>
              </div>
              <div class="theme-grid" role="radiogroup" aria-label="应用配色" @keydown="handleThemeKeydown">
                <button
                  v-for="theme in themes"
                  :key="theme.id"
                  class="theme-card"
                  :class="{ active: store.settings.theme === theme.id }"
                  type="button"
                  role="radio"
                  :aria-checked="store.settings.theme === theme.id"
                  :tabindex="store.settings.theme === theme.id ? 0 : -1"
                  :data-theme-id="theme.id"
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
                  <strong>默认展开任务侧栏</strong>
                  <small>关闭后只显示图标，为任务列表留出更多空间</small>
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
              <div class="detail-display-setting">
                <div class="settings-block__title">
                  <h4>详情展开方式</h4>
                  <span>{{ detailDisplayModeLabel }}</span>
                </div>
                <div class="detail-display-mode-grid" role="radiogroup" aria-label="任务详情展开方式" @keydown="handleDetailDisplayModeKeydown">
                  <button
                    class="detail-display-mode-card"
                    type="button"
                    role="radio"
                    :aria-checked="store.settings.detailDisplayMode === 'window'"
                    :class="{ active: store.settings.detailDisplayMode === 'window' }"
                    :tabindex="store.settings.detailDisplayMode === 'window' ? 0 : -1"
                  data-detail-display-mode="window"
                  @click="store.updateSettings({ detailDisplayMode: 'window' })"
                  >
                    <span class="detail-display-mode-card__preview" aria-hidden="true">
                      <span class="detail-preview-caption">打开详情后</span>
                      <span class="detail-preview-app detail-preview-app--wide">
                        <span class="detail-preview-titlebar">窗口变宽</span>
                        <span class="detail-preview-sidebar"></span><span class="detail-preview-list"><i></i><b></b><em></em><strong>任务列表宽度不变</strong></span><span class="detail-preview-detail"><i></i><b></b><strong>详情</strong></span>
                      </span>
                    </span>
                    <span><strong>窗口变宽（推荐）</strong><small>打开详情时，应用窗口自动加宽；任务列表不被挤压</small></span>
                    <span v-if="store.settings.detailDisplayMode === 'window'" class="detail-display-mode-card__selected"><Check :size="14" />当前使用</span>
                  </button>
                  <button
                    class="detail-display-mode-card"
                    type="button"
                    role="radio"
                    :aria-checked="store.settings.detailDisplayMode === 'in-app'"
                    :class="{ active: store.settings.detailDisplayMode === 'in-app' }"
                    :tabindex="store.settings.detailDisplayMode === 'in-app' ? 0 : -1"
                  data-detail-display-mode="in-app"
                  @click="store.updateSettings({ detailDisplayMode: 'in-app' })"
                  >
                    <span class="detail-display-mode-card__preview" aria-hidden="true">
                      <span class="detail-preview-caption">打开详情后</span>
                      <span class="detail-preview-app detail-preview-app--fixed">
                        <span class="detail-preview-titlebar">窗口大小不变</span>
                        <span class="detail-preview-sidebar"></span><span class="detail-preview-list"><i></i><b></b><em></em><strong>任务列表变窄</strong></span><span class="detail-preview-detail"><i></i><b></b><strong>详情</strong></span>
                      </span>
                    </span>
                    <span><strong>窗口大小不变</strong><small>详情在当前窗口右侧打开；任务列表会变窄</small></span>
                    <span v-if="store.settings.detailDisplayMode === 'in-app'" class="detail-display-mode-card__selected"><Check :size="14" />当前使用</span>
                  </button>
                </div>
                <p class="setting-help">{{ detailDisplayModeDescription }}</p>
              </div>
            </div>
            <div class="settings-subsection-heading">
              <span><CheckSquare :size="16" /></span>
              <div><h4>任务与清单</h4><p>控制已完成任务在列表和分组中的呈现方式。</p></div>
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

          <section v-else-if="activeSection === 'focus'" class="settings-section">
            <div class="settings-section__head settings-section__head--accent">
              <span class="settings-section__icon"><Timer :size="20" /></span>
              <div><h3>专注与节律</h3><p>设置桌面控制器、番茄节奏和每轮休息安排。</p></div>
            </div>
            <div class="settings-block">
              <div class="settings-block__title"><h4>桌面专注控制器</h4><span>{{ focusControllerStyleLabel }}</span></div>
              <div class="focus-controller-style-grid" role="radiogroup" aria-label="桌面专注控制器形态" @keydown="handleFocusStyleKeydown">
                <button
                  v-for="style in focusControllerStyles"
                  :key="style.id"
                  class="focus-controller-style-card"
                  :class="[`focus-controller-style-card--${style.id}`, { active: store.settings.focusControllerStyle === style.id }]"
                  type="button"
                  role="radio"
                  :aria-checked="store.settings.focusControllerStyle === style.id"
                  :tabindex="store.settings.focusControllerStyle === style.id ? 0 : -1"
                  :data-focus-style="style.id"
                  @click="store.updateSettings({ focusControllerStyle: style.id })"
                >
                  <span class="focus-controller-style-card__preview" aria-hidden="true"><i></i><b></b><em></em></span>
                  <span><strong>{{ style.label }}</strong><small>{{ style.description }}</small></span>
                  <Check v-if="store.settings.focusControllerStyle === style.id" :size="15" />
                </button>
              </div>
              <label class="switch-row focus-controller-top-setting">
                <span><Pin :size="17" /><span><strong>控制器保持在最前面</strong><small>独立于专注完成提醒；仍可在控制器内随时切换。</small></span></span>
                <input type="checkbox" :checked="store.settings.focusControllerAlwaysOnTop" @change="store.updateSettings({ focusControllerAlwaysOnTop: $event.target.checked })" />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
              <label class="switch-row focus-controller-top-setting">
                <span><Waves :size="17" /><span><strong>节律控制器保持在最前面</strong><small>一个窗口聚合所有已开启节律；关闭控制器不会暂停提醒。</small></span></span>
                <input type="checkbox" :checked="store.settings.rhythmControllerAlwaysOnTop" @change="store.updateSettings({ rhythmControllerAlwaysOnTop: $event.target.checked })" />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
            </div>
            <div class="settings-block">
              <div class="settings-block__title"><h4>番茄轮次</h4><span>每 {{ store.clock.focusSettings.focusesBeforeLongBreak }} 轮长休息</span></div>
              <label class="setting-select-card"><span class="setting-select-card__icon"><Timer :size="17" /></span><span class="setting-select-card__copy"><strong>完成几轮后长休息</strong><small>每完成一轮专注先短休息；达到设定轮数后改为一次长休息，并重新从第 1 轮开始。</small></span><select :value="store.clock.focusSettings.focusesBeforeLongBreak" @change="store.updateFocusSettings({ focusesBeforeLongBreak: Number($event.target.value) })"><option v-for="count in [2, 3, 4, 5, 6, 8]" :key="count" :value="count">{{ count }} 轮</option></select></label>
            </div>
            <div class="settings-block">
              <div class="settings-block__title"><h4>休息时长</h4><span>{{ Math.round(store.clock.focusSettings.shortBreakSeconds / 60) }} / {{ Math.round(store.clock.focusSettings.longBreakSeconds / 60) }} 分钟</span></div>
              <div class="focus-break-settings"><label class="focus-break-setting"><span><strong>短休息</strong><small>普通轮次结束后</small></span><select :value="store.clock.focusSettings.shortBreakSeconds / 60" @change="store.updateFocusSettings({ shortBreakSeconds: Number($event.target.value) * 60 })"><option v-for="minutes in [3, 5, 10, 15]" :key="minutes" :value="minutes">{{ minutes }} 分钟</option></select></label><label class="focus-break-setting"><span><strong>长休息</strong><small>完成一个轮次周期后</small></span><select :value="store.clock.focusSettings.longBreakSeconds / 60" @change="store.updateFocusSettings({ longBreakSeconds: Number($event.target.value) * 60 })"><option v-for="minutes in [10, 15, 20, 30]" :key="minutes" :value="minutes">{{ minutes }} 分钟</option></select></label></div>
            </div>
            <div class="settings-block"><label class="switch-row"><span><strong>自动开始休息</strong><small>完成专注后立即开始对应的短休息或长休息。</small></span><input type="checkbox" :checked="store.clock.focusSettings.autoStartBreaks" @change="store.updateFocusSettings({ autoStartBreaks: $event.target.checked })" /><span class="switch-control" aria-hidden="true"></span></label></div>
          </section>

          <section v-else-if="activeSection === 'app-behavior'" class="settings-section">
            <div class="settings-section__head settings-section__head--accent">
              <span class="settings-section__icon"><SlidersHorizontal :size="20" /></span>
              <div>
                <h3>通用</h3>
                <p>设置启动方式、日常引导和关闭窗口后的行为。</p>
              </div>
            </div>

            <div class="preference-categories">
              <section class="preference-category preference-category--experience" aria-labelledby="preference-startup-title">
                <header class="preference-category__head">
                  <span class="preference-category__icon"><PanelTop :size="18" /></span>
                  <span>
                    <h4 id="preference-startup-title">启动、提示与窗口</h4>
                    <p>决定打开应用后的落点、日常提示和关闭窗口后的去向。</p>
                  </span>
                  <strong>{{ startViewLabel }} · {{ dailyGuidanceSummary }}</strong>
                </header>
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
                <h4>启动提示</h4>
                <span>{{ dailyGuidanceSummary }}</span>
              </div>
              <label class="switch-row">
                <span>
                  <strong>启动时显示提示</strong>
                  <small>按任务状态给出本地提示；每次启动自动换一组表达，不会读取或上传数据</small>
                </span>
                <input
                  type="checkbox"
                  :checked="store.settings.dailyGuidanceEnabled"
                  @change="store.updateSettings({ dailyGuidanceEnabled: $event.target.checked })"
                />
                <span class="switch-control" aria-hidden="true"></span>
              </label>
              <label class="setting-select-card" :class="{ disabled: !store.settings.dailyGuidanceEnabled }">
                <span class="setting-select-card__icon"><Info :size="17" /></span>
                <span class="setting-select-card__copy">
                  <strong>提示风格</strong>
                  <small>轻松、务实或鼓励；每次启动自动换一组表达</small>
                </span>
                <select
                  :value="store.settings.dailyGuidanceStyle"
                  :disabled="!store.settings.dailyGuidanceEnabled"
                  @change="store.updateSettings({ dailyGuidanceStyle: $event.target.value })"
                >
                  <option value="calm">轻松</option>
                  <option value="practical">务实</option>
                  <option value="encouraging">鼓励</option>
                </select>
              </label>
            </div>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>关闭窗口</h4>
                <span>{{ store.settings.windowCloseBehavior === 'hide' ? '保留在后台' : '直接退出' }}</span>
              </div>
              <label class="setting-select-card">
                <span class="setting-select-card__icon"><PanelTop :size="17" /></span>
                <span class="setting-select-card__copy">
                  <strong>点击窗口关闭按钮时</strong>
                  <small>保留在后台时，Windows 可从通知区域图标恢复；macOS 可从 Dock 或菜单栏恢复。</small>
                </span>
                <select
                  :value="store.settings.windowCloseBehavior"
                  @change="store.updateSettings({ windowCloseBehavior: $event.target.value })"
                >
                  <option value="hide">最小化到后台</option>
                  <option value="quit">直接退出应用</option>
                </select>
              </label>
            </div>
              </section>
            </div>
          </section>

          <section v-else-if="activeSection === 'notifications'" class="settings-section">
            <div class="settings-section__head settings-section__head--accent">
              <span class="settings-section__icon"><Bell :size="20" /></span>
              <div>
                <h3>通知与声音</h3>
                <p>设置到期提醒、系统权限和操作声音。</p>
              </div>
            </div>

            <div class="preference-categories">
              <section class="preference-category preference-category--reminder" aria-labelledby="preference-reminder-title">
                <header class="preference-category__head">
                  <span class="preference-category__icon"><Bell :size="18" /></span>
                  <span>
                    <h4 id="preference-reminder-title">系统提醒</h4>
                    <p>管理到期通知、提醒声音和系统权限测试。</p>
                  </span>
                  <strong>{{ reminderSummary }}</strong>
                </header>
            <div class="settings-block">
              <div class="sound-settings">
                <label class="switch-row sound-master">
                  <span class="sound-label">
                    <Bell :size="18" class="sound-icon" />
                    <span>
                      <strong>任务与节律提醒</strong>
                      <small>任务到期和节律提醒通过系统通知中心送达</small>
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    :checked="store.settings.reminderNotificationsEnabled"
                    @change="store.updateSettings({ reminderNotificationsEnabled: $event.target.checked })"
                  />
                  <span class="switch-control" aria-hidden="true"></span>
                </label>

                <p v-if="!store.settings.reminderNotificationsEnabled && !store.settings.focusCompletionNotificationsEnabled" class="setting-summary">后台提醒已关闭；应用内的专注完成反馈仍会保留。</p>
                <div class="sound-categories sound-categories--two">
                  <label class="sound-item">
                    <span class="sound-item-icon">
                      <Timer :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>专注完成提醒</strong>
                      <small>后台时显示可拖动完成弹窗，失败则用系统通知兜底</small>
                    </span>
                    <input
                      type="checkbox"
                      :checked="store.settings.focusCompletionNotificationsEnabled"
                      @change="store.updateSettings({ focusCompletionNotificationsEnabled: $event.target.checked })"
                    />
                    <span class="switch-control" aria-hidden="true"></span>
                  </label>

                  <label class="sound-item" :class="{ disabled: !store.settings.reminderNotificationsEnabled }">
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

                  <label class="sound-item" :class="{ disabled: !store.settings.focusCompletionNotificationsEnabled }">
                    <span class="sound-item-icon">
                      <Volume2 :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>专注提醒声音</strong>
                      <small>弹窗播放完成音，系统通知兜底时跟随系统</small>
                    </span>
                    <input
                      type="checkbox"
                      :checked="store.settings.focusCompletionSoundEnabled"
                      :disabled="!store.settings.focusCompletionNotificationsEnabled"
                      @change="store.updateSettings({ focusCompletionSoundEnabled: $event.target.checked })"
                    />
                    <span class="switch-control" aria-hidden="true"></span>
                  </label>

                  <label class="sound-item" :class="{ disabled: !store.settings.focusCompletionNotificationsEnabled }">
                    <span class="sound-item-icon">
                      <Pin :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>提醒窗保持在最前面</strong>
                      <small>默认置顶以免错过；仍可拖动位置，也可随时关闭</small>
                    </span>
                    <input
                      type="checkbox"
                      :checked="store.settings.focusReminderAlwaysOnTop"
                      :disabled="!store.settings.focusCompletionNotificationsEnabled"
                      @change="store.updateSettings({ focusReminderAlwaysOnTop: $event.target.checked })"
                    />
                    <span class="switch-control" aria-hidden="true"></span>
                  </label>

                  <button
                    class="setting-action-card"
                    type="button"
                    :disabled="!store.settings.focusCompletionNotificationsEnabled"
                    @click="store.testFocusCompletionNotification"
                  >
                    <Timer :size="16" />
                    <span>
                      <strong>测试专注完成提醒</strong>
                      <small>预览后台完成弹窗与提醒声音</small>
                    </span>
                  </button>

                  <button class="setting-action-card" type="button" @click="openNotificationSettings">
                    <ExternalLink :size="16" />
                    <span>
                      <strong>打开系统通知设置</strong>
                      <small>被系统关闭时在这里重新允许</small>
                    </span>
                  </button>
                </div>
              </div>
            </div>
              </section>

              <section class="preference-category preference-category--feedback" aria-labelledby="preference-sound-title">
                <header class="preference-category__head">
                  <span class="preference-category__icon"><Volume2 :size="18" /></span>
                  <span>
                    <h4 id="preference-sound-title">操作音效</h4>
                    <p>配置操作反馈，并试听每一种提示声音。</p>
                  </span>
                  <strong>{{ soundSummary }}</strong>
                </header>
            <div class="settings-block">
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

                <div v-if="store.settings.soundEnabled" class="sound-preview-row">
                  <span><strong>试听与语义</strong><small>只为有结果的操作发声；删除使用低调的短提示</small></span>
                  <div class="sound-preview-grid">
                    <button class="small-btn" type="button" :disabled="!store.settings.soundEnabled || !store.settings.soundTaskEnabled" @click="store.previewSound('complete')"><Check :size="14" />完成铃音</button>
                    <button class="small-btn" type="button" :disabled="!store.settings.soundEnabled || !store.settings.soundTaskEnabled" @click="store.previewSound('restore')"><Folder :size="14" />新增与恢复</button>
                    <button class="small-btn" type="button" :disabled="!store.settings.soundEnabled || !store.settings.soundTaskEnabled" @click="store.previewSound('chime')"><Tag :size="14" />标记与日期</button>
                    <button class="small-btn" type="button" :disabled="!store.settings.soundEnabled || !store.settings.soundTaskEnabled" @click="store.previewSound('delete')"><Trash2 :size="14" />删除与清空</button>
                    <button class="small-btn" type="button" :disabled="!store.settings.soundEnabled || !store.settings.soundDragEnabled" @click="store.previewSound('drag')"><SlidersHorizontal :size="14" />排序指示线</button>
                  </div>
                </div>

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
                      <small>新增、恢复、重命名</small>
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
                      <small>新增与重命名</small>
                    </span>
                    <input
                      type="checkbox"
                      :checked="store.settings.soundGroupEnabled"
                      :disabled="!store.settings.soundEnabled"
                      @change="store.updateSettings({ soundGroupEnabled: $event.target.checked })"
                    />
                    <span class="switch-control" aria-hidden="true"></span>
                  </label>

                  <label class="sound-item">
                    <span class="sound-item-icon">
                      <SlidersHorizontal :size="16" />
                    </span>
                    <span class="sound-item-content">
                      <strong>拖动排序</strong>
                      <small>排序指示线位置变化时反馈</small>
                    </span>
                    <input
                      type="checkbox"
                      :checked="store.settings.soundDragEnabled"
                      :disabled="!store.settings.soundEnabled"
                      @change="store.updateSettings({ soundDragEnabled: $event.target.checked })"
                    />
                    <span class="switch-control" aria-hidden="true"></span>
                  </label>
                </div>
              </div>
            </div>
              </section>
            </div>
          </section>

          <section v-else class="settings-section about-section">
            <header class="about-hero">
              <img :src="appIcon" alt="" />
              <div class="about-card__identity">
                <p class="eyebrow">本地优先 · 桌面任务管理</p>
                <h3>易简清单</h3>
                <p>记录、安排并完成每一个下一步。</p>
                <div class="about-hero__meta"><span>v{{ version }}</span><span>Tauri 桌面应用</span></div>
              </div>
              <button class="about-hero__guide" type="button" @click="store.openHelpCenter">
                <Compass :size="17" />
                <span>使用指南</span>
              </button>
            </header>

            <section class="release-notes" aria-labelledby="release-notes-title">
              <div class="release-notes__head">
                <div>
                  <p class="eyebrow">本次更新</p>
                  <h4 id="release-notes-title">v{{ version }} 带来了什么</h4>
                </div>
                <span>当前稳定版</span>
              </div>
              <ul class="release-notes__list">
                <li v-for="item in currentReleaseHighlights" :key="item">
                  <Check :size="15" aria-hidden="true" />
                  <span>{{ item }}</span>
                </li>
              </ul>
              <details class="release-history">
                <summary>查看历史版本更新</summary>
                <div class="release-history__list">
                  <article v-for="release in releaseHistory" :key="release.version">
                    <strong>v{{ release.version }}</strong>
                    <p>{{ release.summary }}</p>
                  </article>
                </div>
              </details>
            </section>

            <div class="settings-block">
              <div class="settings-block__title">
                <h4>应用更新</h4>
                <span>{{ updateStatusText }}</span>
              </div>
              <article class="update-card" :class="`update-card--${updateState}`">
                <div class="update-card__head">
                  <span class="update-card__icon">
                    <Download v-if="['available', 'downloading', 'verifying', 'installing', 'restarting'].includes(updateState)" :size="18" />
                    <Check v-else-if="['upToDate', 'installed'].includes(updateState)" :size="18" />
                    <Info v-else :size="18" />
                  </span>
                  <span class="update-card__copy">
                    <strong>{{ updateTitle }}</strong>
                    <small>{{ updateDescription }}</small>
                  </span>
                </div>
                <div v-if="updateState === 'available'" class="update-card__release">
                  <div class="update-card__release-head">
                    <span>更新说明</span>
                    <strong>v{{ updaterState.update?.version }}</strong>
                  </div>
                  <div class="update-card__notes" aria-label="更新内容">
                    <template v-for="(block, index) in updateNoteBlocks" :key="`${block.type}-${index}`">
                      <h5 v-if="block.type === 'heading'">{{ block.text }}</h5>
                      <ul v-else-if="block.type === 'list'">
                        <li v-for="(item, itemIndex) in block.items" :key="`${index}-${itemIndex}`">{{ item }}</li>
                      </ul>
                      <p v-else>{{ block.text }}</p>
                    </template>
                  </div>
                </div>
                <div v-if="updateState === 'downloading'" class="update-card__progress" aria-label="更新下载进度">
                  <span :style="{ width: `${updateProgressPercent}%` }"></span>
                </div>
                <div v-if="updateState !== 'development'" class="update-card__actions">
                  <template v-if="updateState === 'available'">
                    <button
                      class="small-btn update-card__action"
                      type="button"
                      :disabled="updateActionDisabled"
                      @click="installUpdate"
                    >
                      下载并安装
                    </button>
                    <button
                      class="text-btn"
                      type="button"
                      :disabled="updateActionDisabled"
                      @click="skipUpdateVersion"
                    >
                      跳过此版本
                    </button>
                  </template>
                  <template v-else-if="updateState === 'installed'">
                    <button class="small-btn update-card__action" type="button" @click="restartUpdate">
                      立即重新启动
                    </button>
                  </template>
                  <button
                    v-else-if="!['installing', 'restarting'].includes(updateState)"
                    class="small-btn update-card__action"
                    type="button"
                    :disabled="updateActionDisabled"
                    @click="runUpdateAction"
                  >
                    {{ updateActionText }}
                  </button>
                </div>
              </article>
              <label class="setting-select-card">
                <span class="setting-select-card__icon"><Globe :size="17" /></span>
                <span class="setting-select-card__copy">
                  <strong>更新源</strong>
                  <small>默认自动选择可用更新源（自建服务器优先，GitHub 兜底）；GitHub 访问不稳定时可手动指定。</small>
                </span>
                <select :value="store.settings.updateSource" @change="store.updateSettings({ updateSource: $event.target.value })">
                  <option value="auto">自动（自建优先）</option>
                  <option value="self">自建服务器</option>
                  <option value="github">GitHub</option>
                </select>
              </label>
            </div>
          </section>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Bell, Check, CheckSquare, Compass, Download, ExternalLink, Folder, Globe, Info, PanelTop, Palette, Pin, SlidersHorizontal, Tag, Timer, Trash2, Volume2, Waves, X } from 'lucide-vue-next'
import { checkForUpdates as checkForUpdatesService, installUpdate as installUpdateService, restartUpdateApplication, skipCurrentUpdate, updaterState, updateNotes as resolveUpdateNotes } from '@/services/updater'
import { currentReleaseHighlights, releaseHistory } from '@/data/releases'
import { useTaskStore } from '@/stores/task'
import { openReleasePage as openReleasePageInBrowser, openSystemNotificationSettings } from '@/services/platform'
import { parseUpdateNotes } from '@/utils/updateNotes'
import appIcon from '@/assets/app-icon.svg'

const version = __APP_VERSION__

const store = useTaskStore()
const activeSection = ref('appearance')
const settingsPanel = ref(null)
let settingsTrigger = null
const isDevelopment = import.meta.env.DEV
const updateState = computed(() => updaterState.status)

async function openNotificationSettings() {
  const opened = await openSystemNotificationSettings()
  if (!opened) store.showNotice('当前平台无法直接打开通知设置', 'error')
}

const sections = [
  { id: 'appearance', label: '外观与显示', summary: '主题、界面与任务', icon: Palette },
  { id: 'focus', label: '专注与节律', summary: '控制器、番茄与休息', icon: Timer },
  { id: 'notifications', label: '通知与声音', summary: '提醒、权限与声音', icon: Bell },
  { id: 'app-behavior', label: '通用', summary: '启动、提示与窗口', icon: SlidersHorizontal },
  { id: 'about', label: '关于与更新', summary: '版本、指南与更新', icon: Info }
]

const themes = [
  { id: 'mint', label: '青绿', description: '默认清爽', swatch: 'linear-gradient(135deg, #2f8f86 0%, #8ed6cb 58%, #f3fbf9 100%)' },
  { id: 'blue', label: '海蓝', description: '冷静专注', swatch: 'linear-gradient(135deg, #346fd8 0%, #8db7ff 58%, #f4f8ff 100%)' },
  { id: 'violet', label: '紫罗兰', description: '柔和醒目', swatch: 'linear-gradient(135deg, #6d5bd7 0%, #b0a7ff 58%, #f8f6ff 100%)' },
  { id: 'graphite', label: '石墨', description: '克制低调', swatch: 'linear-gradient(135deg, #475569 0%, #9aa7b8 58%, #f7f9fc 100%)' },
  { id: 'amber', label: '琥珀橙', description: '温暖专注', swatch: 'linear-gradient(135deg, #b97822 0%, #edbe79 58%, #fffaf3 100%)' },
  { id: 'coral', label: '珊瑚红', description: '亲和轻快', swatch: 'linear-gradient(135deg, #c85e63 0%, #ec9ea2 58%, #fff8f8 100%)' }
]

const focusControllerStyles = [
  { id: 'orbit', label: '轨道表盘', description: '圆形进度，专注感更强' },
  { id: 'island', label: '专注岛', description: '紧凑常驻，按需展开' },
  { id: 'classic', label: '经典卡片', description: '所有操作始终可见' }
]

const detailDisplayModes = [
  { id: 'window' },
  { id: 'in-app' }
]

const focusableSelector = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

watch(() => store.settingsOpen, async (open) => {
  if (open) {
    settingsTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    settingsPanel.value?.querySelector(`[data-settings-section="${activeSection.value}"]`)?.focus()
    return
  }
  await nextTick()
  settingsTrigger?.focus?.()
  settingsTrigger = null
})

function trapSettingsFocus(event) {
  const focusable = [...(settingsPanel.value?.querySelectorAll(focusableSelector) || [])]
    .filter(element => element.getClientRects().length > 0)
  if (!focusable.length) {
    event.preventDefault()
    settingsPanel.value?.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function handleSectionKeydown(event) {
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!keys.includes(event.key)) return
  const buttons = [...settingsPanel.value.querySelectorAll('[data-settings-section]')]
  const currentIndex = buttons.indexOf(event.target.closest('[data-settings-section]'))
  if (currentIndex < 0) return
  event.preventDefault()
  const delta = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? buttons.length - 1
      : (currentIndex + delta + buttons.length) % buttons.length
  activeSection.value = buttons[nextIndex].dataset.settingsSection
  nextTick(() => buttons[nextIndex].focus())
}

function handleRadioKeydown(event, items, currentId, dataAttribute, update) {
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!keys.includes(event.key)) return
  event.preventDefault()
  const currentIndex = Math.max(0, items.findIndex(item => item.id === currentId))
  const delta = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? items.length - 1
      : (currentIndex + delta + items.length) % items.length
  const nextId = items[nextIndex].id
  update(nextId)
  nextTick(() => settingsPanel.value?.querySelector(`[${dataAttribute}="${nextId}"]`)?.focus())
}

function handleThemeKeydown(event) {
  handleRadioKeydown(event, themes, store.settings.theme, 'data-theme-id', theme => store.updateSettings({ theme }))
}

function handleFocusStyleKeydown(event) {
  handleRadioKeydown(event, focusControllerStyles, store.settings.focusControllerStyle, 'data-focus-style', focusControllerStyle => store.updateSettings({ focusControllerStyle }))
}

function handleDetailDisplayModeKeydown(event) {
  handleRadioKeydown(event, detailDisplayModes, store.settings.detailDisplayMode, 'data-detail-display-mode', detailDisplayMode => store.updateSettings({ detailDisplayMode }))
}

const startViewLabels = {
  today: '今日',
  inbox: '收集箱',
  planned: '计划',
  important: '重要'
}

const currentThemeLabel = computed(() => themes.find((theme) => theme.id === store.settings.theme)?.label || '青绿')
const focusControllerStyleLabel = computed(() => focusControllerStyles.find((style) => style.id === store.settings.focusControllerStyle)?.label || '轨道表盘')
const startViewLabel = computed(() => startViewLabels[store.settings.startView] || '今日')
const enabledInterfaceCount = computed(() => Number(!store.settings.sidebarCollapsed) + Number(store.settings.detailOpen))
const detailDisplayModeLabel = computed(() => store.settings.detailDisplayMode === 'in-app' ? '窗口大小不变' : '窗口变宽')
const detailDisplayModeDescription = computed(() => store.settings.detailDisplayMode === 'in-app'
  ? '详情占用当前窗口空间，窗口大小和位置保持不变。'
  : '打开详情时自动扩大应用窗口；空间不足时会自动保持窗口大小不变。')
const completedDisplaySummary = computed(() => {
  const listVisible = store.settings.completedVisible ? '列表显示' : '列表隐藏'
  const groupMode = store.settings.groupCompletedDisplayMode === 'in-group' ? '分组保留' : '集中到底部'
  return `${listVisible} · ${groupMode}`
})
const enabledSoundCount = computed(() => [
  store.settings.soundTaskEnabled,
  store.settings.soundListEnabled,
  store.settings.soundGroupEnabled,
  store.settings.soundDragEnabled
].filter(Boolean).length)
const soundSummary = computed(() => store.settings.soundEnabled ? `${enabledSoundCount.value}/4 已启用` : '已关闭')
const reminderSummary = computed(() => {
  const enabled = Number(store.settings.reminderNotificationsEnabled) + Number(store.settings.focusCompletionNotificationsEnabled)
  if (!enabled) return '已关闭'
  return enabled === 2 ? '两类提醒已开启' : '一类提醒已开启'
})
const dailyGuidanceSummary = computed(() => {
  if (!store.settings.dailyGuidanceEnabled) return '已关闭'
  return ({ calm: '轻松', practical: '务实', encouraging: '鼓励' }[store.settings.dailyGuidanceStyle] || '务实')
})
const updateStatusText = computed(() => ({
  development: '开发环境',
  idle: '手动检查',
  checking: '正在检查',
  upToDate: '已是最新',
  available: `可更新至 ${updaterState.update?.version || ''}`,
  skipped: '已跳过',
  downloading: '正在下载',
  verifying: '正在校验',
  installing: '正在安装',
  installed: '已安装',
  restarting: '正在重启',
  error: '自动更新不可用',
  unsupported: '平台不支持'
}[updateState.value] || '手动检查'))
const updateTitle = computed(() => ({
  development: '开发环境不检查在线更新',
  idle: '检查稳定版本',
  checking: '正在检查更新',
  upToDate: `已是最新版本 · v${version}`,
  available: '发现可用更新',
  skipped: `已跳过 v${updaterState.update?.version || ''}`,
  downloading: '正在下载更新',
  verifying: '正在校验更新签名',
  installing: '正在替换应用',
  installed: '更新已安装',
  restarting: '正在重新启动',
  error: '自动更新暂不可用',
  unsupported: '当前平台暂不支持自动更新'
}[updateState.value] || '检查稳定版本'))
const updateDescription = computed(() => {
  if (updateState.value === 'development') return 'npm run dev 不会请求更新服务；请使用正式签名安装包验证更新。'
  if (updateState.value === 'available') return '更新包已通过签名验证，下载完成后将自动完成安装。'
  if (updateState.value === 'skipped') return '本次更新已跳过；新版本发布后或重新检查时会再次提示。'
  if (updateState.value === 'downloading') return updateProgressText.value
  if (updateState.value === 'verifying') return '下载完成，正在校验更新包的签名。'
  if (updateState.value === 'installing') return '正在替换应用。macOS 可能会弹出管理员授权窗口。'
  if (updateState.value === 'installed') return updaterState.error || '更新已安装完成，请重新启动应用以使用新版本。'
  if (updateState.value === 'restarting') return '更新已安装，正在关闭并重新打开应用。'
  if (updateState.value === 'error' || updateState.value === 'unsupported') return updaterState.error
  if (updateState.value === 'upToDate') return '当前已安装最新的稳定版本。'
  return '从自建服务器或 GitHub Release 检查经过签名验证的稳定版本。'
})
const updateActionText = computed(() => ({
  development: '开发模式不检查',
  checking: '正在检查…',
  downloading: updateProgressText.value,
  verifying: '正在校验签名…',
  installing: '正在完成安装…',
  installed: '立即重新启动',
  restarting: '正在重新启动…',
  upToDate: '重新检查',
  error: '重试检查',
  skipped: '重新检查',
  unsupported: '打开下载页',
  idle: '检查更新'
}[updateState.value] || '检查更新'))
const updateActionDisabled = computed(() => isDevelopment || ['checking', 'downloading', 'verifying', 'installing', 'restarting'].includes(updateState.value))
const updateBadgeVisible = computed(() => updateState.value === 'available')
const updateProgressText = computed(() => {
  const { downloaded, total } = updaterState.progress
  if (!total) return '正在下载…'
  return `正在下载 ${Math.min(100, Math.round(downloaded / total * 100))}%`
})
const updateProgressPercent = computed(() => {
  const { downloaded, total } = updaterState.progress
  return total ? Math.min(100, Math.round(downloaded / total * 100)) : 0
})
const updateNotes = computed(() => resolveUpdateNotes())
const updateNoteBlocks = computed(() => parseUpdateNotes(updateNotes.value))
async function checkForUpdates() {
  await checkForUpdatesService({
    skippedVersion: store.settings.skippedUpdateVersion,
    source: store.settings.updateSource
  })
}

async function runUpdateAction() {
  if (updateState.value === 'unsupported') {
    try {
      await openReleasePageInBrowser()
    } catch (error) {
      updaterState.error = error?.message || '无法打开下载页，请稍后重试。'
    }
    return
  }
  await checkForUpdates()
}

function skipUpdateVersion() {
  const skipped = skipCurrentUpdate()
  if (skipped) store.updateSettings({ skippedUpdateVersion: skipped })
}

async function installUpdate() {
  await installUpdateService()
}

async function restartUpdate() {
  await restartUpdateApplication()
}

</script>
