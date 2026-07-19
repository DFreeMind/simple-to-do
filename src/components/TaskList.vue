<template>
  <main class="task-list">
    <header class="task-list__header">
      <div v-if="store.currentList" ref="listSwitcherRef" class="list-switcher" @click.stop>
        <button class="list-switcher__trigger" type="button" :aria-expanded="listSwitcherOpen" @click="toggleListSwitcher"><span>{{ store.currentList.name }}</span><ChevronDown :size="18" /></button>
        <div class="list-switcher__stats-area" @mouseenter="listSummaryOpen = true" @mouseleave="listSummaryOpen = false"><div class="list-switcher__stats" aria-label="清单统计"><span><Folder :size="14" />{{ listStats.groups }}</span><span><CheckCircle2 :size="14" />{{ listStats.completed }}/{{ listStats.total }}</span><span><ListChecks :size="14" />{{ listStats.completedSubtasks }}/{{ listStats.subtasks }}</span></div><div v-if="listSummaryOpen && !listSwitcherOpen" class="list-switcher__summary"><div class="list-switcher__summary-grid"><div class="list-switcher__summary-metric"><i><Folder :size="15" /></i><span><small>分组</small><b>{{ listStats.groups }}</b></span></div><div class="list-switcher__summary-metric"><i><CheckCircle2 :size="15" /></i><span><small>任务</small><b>{{ listStats.completed }}<em>/{{ listStats.total }}</em></b></span></div><div class="list-switcher__summary-metric"><i><ListChecks :size="15" /></i><span><small>子任务</small><b>{{ listStats.completedSubtasks }}<em>/{{ listStats.subtasks }}</em></b></span></div></div><footer :class="{ 'is-overdue': listStats.overdue }"><AlertCircle v-if="listStats.overdue" :size="16" /><CheckCircle2 v-else :size="16" />{{ listStats.overdue ? `${listStats.overdue} 项任务已逾期` : '进度正常，没有逾期任务' }}</footer></div></div>
        <div v-if="listSwitcherOpen" class="list-switcher__menu"><template v-for="group in store.groupedLists" :key="group.id"><p class="list-switcher__group-label">{{ group.name }}</p><button v-for="list in group.lists" :key="list.id" type="button" :class="{ active: list.id === store.currentList.id }" @click="switchList(list.id)"><i :style="{ background: list.color }"></i><span>{{ list.name }}</span><Check v-if="list.id === store.currentList.id" :size="15" /></button></template></div>
      </div>
      <div v-else class="task-list__title"><p class="eyebrow">{{ viewMeta.eyebrow }}</p><h1>{{ viewMeta.title }}</h1></div>
      <div class="header-actions">
        <ViewModeToggle v-if="showTaskActions && !['planned', 'completed', 'trash'].includes(store.currentView)" v-model="viewMode" />
        <button
          v-if="showTaskActions && !isSearchView && isGroupCompletedInGroups && store.completedTasks.length"
          class="icon-btn header-actions__compact-secondary"
          type="button"
          :title="allGroupCompletedVisible ? '已显示所有完成任务，点击全部隐藏' : '已隐藏部分或全部完成任务，点击全部显示'"
          :aria-label="allGroupCompletedVisible ? '全部隐藏完成任务' : '全部显示完成任务'"
          @click="toggleAllGroupCompletedVisibility"
        >
          <Eye v-if="allGroupCompletedVisible" :size="18" />
          <EyeOff v-else :size="18" />
        </button>
        <div v-if="showTaskActions && !isSearchView && viewMode === 'group' && !['planned', 'completed', 'trash'].includes(store.currentView)" class="header-actions__secondary">
          <button class="icon-btn" type="button" title="新建分组" aria-label="新建分组" @click="addGroup">
            <Plus :size="18" />
          </button>
          <button
            v-if="store.currentListGroups.length"
            class="icon-btn"
            type="button"
            :title="allGroupsExpanded ? '折叠全部分组' : '展开全部分组'"
            :aria-label="allGroupsExpanded ? '折叠全部分组' : '展开全部分组'"
            @click="toggleAllGroups"
          >
            <ChevronsDown v-if="!allGroupsExpanded" :size="18" />
            <ChevronsUp v-else :size="18" />
          </button>
        </div>
        <div v-if="showTaskActions && !isSearchView" class="header-actions__more">
          <button class="icon-btn" type="button" title="更多操作" aria-label="更多操作" @click.stop="toggleHeaderMoreMenu">
            <MoreHorizontal :size="18" />
          </button>
          <div v-if="headerMoreOpen" class="sort-menu header-actions__more-menu" @click.stop>
            <button v-if="isGroupCompletedInGroups && store.completedTasks.length" class="sort-menu__item" type="button" @click="toggleAllGroupCompletedFromHeaderMenu"><Eye v-if="allGroupCompletedVisible" :size="15" /><EyeOff v-else :size="15" /><span>{{ allGroupCompletedVisible ? '隐藏所有完成任务' : '显示所有完成任务' }}</span></button>
            <div v-if="isGroupCompletedInGroups && store.completedTasks.length" class="sort-menu__separator"></div>
            <div class="sort-menu__title">排序方式</div>
            <template v-for="option in sortOptions" :key="`compact-${option.value}`">
              <div v-if="option.secondary" class="sort-menu__separator"></div>
              <button class="sort-menu__item" :class="{ active: store.sortBy === option.value }" type="button" @click="selectSortFromHeaderMenu(option.value)">
                <span class="sort-menu__copy"><strong>{{ option.label }}</strong><small v-if="option.description">{{ option.description }}</small></span><Check v-if="store.sortBy === option.value" :size="15" />
              </button>
            </template>
            <template v-if="viewMode === 'group' && !['planned', 'completed', 'trash'].includes(store.currentView)">
              <div class="sort-menu__separator"></div>
              <button class="sort-menu__item" type="button" @click="addGroupFromHeaderMenu"><Plus :size="15" /><span>新建分组</span></button>
              <button v-if="store.currentListGroups.length" class="sort-menu__item" type="button" @click="toggleAllGroupsFromHeaderMenu"><ChevronsDown v-if="!allGroupsExpanded" :size="15" /><ChevronsUp v-else :size="15" /><span>{{ allGroupsExpanded ? '折叠全部分组' : '展开全部分组' }}</span></button>
            </template>
          </div>
        </div>
        <div v-if="store.currentList" class="sort-select">
          <button
            class="icon-btn"
            :class="{ active: store.isListTaskFilterActive || filterMenuOpen }"
            type="button"
            :title="`筛选：${listFilterLabel}`"
            :aria-label="`筛选当前清单：${listFilterLabel}`"
            @click.stop="toggleFilterMenu"
          >
            <Funnel :size="18" />
          </button>
          <div v-if="filterMenuOpen" class="sort-menu filter-menu" @click.stop>
            <div class="filter-menu__header">
              <span>筛选任务</span>
              <button v-if="store.isListTaskFilterActive" type="button" @click="resetListFilters">重置</button>
            </div>
            <div v-for="section in listFilterSections" :key="section.key" class="filter-menu__row">
              <span class="filter-menu__label">{{ section.compactLabel }}</span>
              <div class="filter-menu__options" :class="`filter-menu__options--${section.key}`">
                <button
                  v-for="option in section.options"
                  :key="option.value"
                  class="filter-menu__option"
                  :class="{ active: store.listTaskFilters[section.key] === option.value }"
                  type="button"
                  :title="option.label"
                  :aria-pressed="store.listTaskFilters[section.key] === option.value"
                  @click="selectListFilter(section.key, option.value)"
                >{{ option.compactLabel || option.label }}</button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="showTaskActions" class="sort-select header-actions__compact-secondary">
          <button
            class="icon-btn"
            :class="{ active: store.sortBy !== 'default' || sortMenuOpen }"
            type="button"
            :title="`排序：${sortLabel}`"
            :aria-label="`排序：${sortLabel}`"
            @click.stop="toggleSortMenu"
          >
            <ArrowUpDown :size="18" />
          </button>
          <div v-if="sortMenuOpen" class="sort-menu" @click.stop>
            <div class="sort-menu__title">排序方式</div>
            <template v-for="option in sortOptions" :key="option.value">
              <div v-if="option.secondary" class="sort-menu__separator"></div>
              <button
                class="sort-menu__item"
                :class="{ active: store.sortBy === option.value }"
                type="button"
                @click="selectSort(option.value)"
              >
                <span class="sort-menu__copy">
                  <strong>{{ option.label }}</strong>
                  <small v-if="option.description">{{ option.description }}</small>
                </span>
                <Check v-if="store.sortBy === option.value" :size="15" />
              </button>
            </template>
          </div>
        </div>
        <button
          class="icon-btn"
          type="button"
          :title="store.settings.detailOpen ? '隐藏详情' : '显示详情'"
          :aria-label="store.settings.detailOpen ? '隐藏详情' : '显示详情'"
          @click="store.updateSettings({ detailOpen: !store.settings.detailOpen })"
        >
          <PanelRight :size="18" />
        </button>
      </div>
    </header>

    <section v-if="store.currentView === 'search'" class="search-panel">
      <Search :size="18" />
      <input
        ref="searchInput"
        :value="store.searchQuery"
        type="search"
        placeholder="输入关键词搜索标题、备注或标签"
        aria-label="搜索任务"
        @input="store.setSearch($event.target.value)"
      />
    </section>
    <section v-else-if="store.canQuickAddTask" class="quick-add">
      <div class="quick-add__row">
        <Plus :size="19" />
        <input
          ref="quickInput"
          v-model="newTaskTitle"
          :placeholder="quickPlaceholder"
          aria-label="快速添加任务"
          @keydown.enter="addTask"
        />
        <button class="primary-btn" type="button" :disabled="!newTaskTitle.trim()" @click="addTask">添加</button>
      </div>
      <div v-if="quickParseChips.length" class="quick-add__chips" aria-label="快速添加解析结果">
        <span v-for="chip in quickParseChips" :key="`${chip.type}:${chip.label}`" class="quick-chip" :class="`quick-chip--${chip.type}`">
          <component :is="chip.icon" :size="13" />
          {{ chip.label }}
        </span>
      </div>
    </section>

    <section v-else class="readonly-hint">
      <Info :size="18" />
      <span>{{ readonlyHint }}</span>
    </section>

    <section
      ref="contentRef"
      class="task-list__content"
      :class="{ 'task-list__content--empty': isEmpty, 'is-scrolling': isScrolling }"
      @mousedown="handleMouseDown"
      @scroll.passive="onContentScroll"
    >
      <template v-if="store.currentView === 'planned' && store.plannedSections.length">
        <div v-for="section in store.plannedSections" :key="section.id" class="task-section">
          <h2>{{ section.label }}</h2>
          <TaskItem
            v-for="task in section.tasks"
            :key="task.id"
            :task="task"
            :draggable="store.canDragTasks"
            :is-dragging="taskDrag.draggingId.value === task.id"
            :is-drop-target="taskDrag.dragOverId.value === task.id"
            :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
          />
        </div>
      </template>

      <template v-else-if="store.currentView === 'trash'">
        <div v-if="store.listTrash.length" class="task-section">
          <h2>已删除清单</h2>
          <article v-for="list in store.listTrash" :key="list.id" class="trash-list-card">
            <div class="trash-list-card__icon">
              <Folder :size="18" />
            </div>
            <div class="trash-list-card__body">
              <strong>{{ list.name }}</strong>
              <span>{{ list.taskCount || 0 }} 个任务 · {{ formatTrashDate(list.deletedAt) }}</span>
            </div>
            <div class="task-actions task-actions--visible">
              <button class="ghost-icon" type="button" title="恢复清单" aria-label="恢复清单" @click.stop="store.restoreList(list.id)">
                <RotateCcw :size="16" />
              </button>
              <button class="ghost-icon danger" type="button" title="永久删除清单" aria-label="永久删除清单" @click.stop="deleteListForever(list)">
                <Trash2 :size="16" />
              </button>
            </div>
          </article>
        </div>
        <TaskItem v-for="task in store.visibleTrashTasks" :key="task.id" :task="task" is-trash />
      </template>

      <template v-else-if="isSearchView">
        <div v-if="viewMode === 'list'" class="search-result-list">
          <div v-if="searchResultCount" class="search-result-summary">
            <span>找到 {{ searchResultCount }} 个结果</span>
            <span>连续列表</span>
          </div>
          <TaskItem
            v-for="task in store.filteredTasks"
            :key="task.id"
            :task="task"
            :search-query="store.searchQuery"
          />
        </div>

        <div v-else class="search-result-groups">
          <div v-if="searchResultCount" class="search-result-summary">
            <span>找到 {{ searchResultCount }} 个结果</span>
            <span>按清单分组</span>
          </div>
          <section v-for="group in searchResultGroups" :key="group.id" class="search-result-group">
            <button
              class="search-result-group__header"
              type="button"
              :aria-expanded="!isSearchGroupCollapsed(group.id)"
              :title="isSearchGroupCollapsed(group.id) ? '展开清单结果' : '折叠清单结果'"
              @click="toggleSearchGroup(group.id)"
            >
              <span class="search-result-group__accent" :style="{ backgroundColor: group.color }"></span>
              <Folder :size="16" />
              <span class="search-result-group__copy">
                <strong>{{ group.name }}</strong>
                <small>清单 · {{ group.tasks.length }} 个结果</small>
              </span>
              <ChevronDown :size="16" :class="{ rotated: isSearchGroupCollapsed(group.id) }" />
            </button>
            <div v-show="!isSearchGroupCollapsed(group.id)" class="search-result-group__items">
              <TaskItem
                v-for="task in group.tasks"
                :key="task.id"
                :task="task"
                :search-query="store.searchQuery"
                hide-list-meta
              />
            </div>
          </section>
        </div>
      </template>

      <template v-else>
        <!-- 列表模式 -->
        <template v-if="viewMode === 'list'">
          <template v-if="store.pinnedTasks.length">
            <div class="pinned-section">
              <div class="task-group-header is-system pinned-header">
                <div class="task-group-header__main">
                  <button class="task-group-header__toggle" type="button" :title="pinnedVisible ? '折叠置顶' : '展开置顶'" @click="pinnedVisible = !pinnedVisible">
                  <ChevronDown :size="16" :class="{ rotated: !pinnedVisible }" />
                  </button>
                  <span class="task-group-header__emoji">📌</span>
                  <span class="task-group-header__name">置顶</span>
                  <span class="task-group-header__count">{{ store.pinnedTasks.length }}</span>
                </div>
              </div>
              <TaskItem
                v-if="pinnedVisible"
                v-for="task in store.pinnedTasks"
                :key="task.id"
                :task="task"
                :draggable="store.canDragTasks"
                :is-dragging="taskDrag.draggingId.value === task.id"
                :is-drop-target="taskDrag.dragOverId.value === task.id"
                :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
              />
            </div>
          </template>

          <TaskItem
            v-for="task in store.unpinnedTasks"
            :key="task.id"
            :task="task"
            :draggable="store.canDragTasks"
            :is-dragging="taskDrag.draggingId.value === task.id"
            :is-drop-target="taskDrag.dragOverId.value === task.id"
            :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
          />
        </template>

        <!-- 分组模式 -->
        <template v-else>
          <template v-if="store.pinnedTasks.length">
            <div class="pinned-section">
              <div class="task-group-header is-system pinned-header">
                <div class="task-group-header__main">
                  <button class="task-group-header__toggle" type="button" :title="pinnedVisible ? '折叠置顶' : '展开置顶'" @click="pinnedVisible = !pinnedVisible">
                  <ChevronDown :size="16" :class="{ rotated: !pinnedVisible }" />
                  </button>
                  <span class="task-group-header__emoji">📌</span>
                  <span class="task-group-header__name">置顶</span>
                  <span class="task-group-header__count">{{ store.pinnedTasks.length }}</span>
                </div>
              </div>
              <TaskItem
                v-if="pinnedVisible"
                v-for="task in store.pinnedTasks"
                :key="task.id"
                :task="task"
                :draggable="store.canDragTasks"
                :is-dragging="taskDrag.draggingId.value === task.id"
                :is-drop-target="taskDrag.dragOverId.value === task.id"
                :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
              />
            </div>
          </template>

          <div v-for="group in store.groupedTasks" :key="group.id || 'ungrouped'" class="task-group" :class="[getGroupToneClass(group), { 'is-dragging': groupDrag.draggingId.value === group.id, 'is-drop-target': groupDrag.dragOverId.value === group.id, [`drop-${groupDrag.dropPosition.value}`]: groupDrag.dragOverId.value === group.id }]" :style="getGroupToneStyle(group)">
            <TaskGroupHeader
              :group="{ ...group, collapsed: isGroupCollapsed(group.id), completedVisible: isGroupCompletedVisible(group.id), canToggleCompleted: isGroupCompletedInGroups }"
              @mousedown="handleGroupMouseDown($event, group.id)"
              @toggle="toggleGroupCollapse"
              @toggleCompleted="toggleGroupCompletedVisibility"
              @addTask="addGroupTask"
              @menu="showGroupMenu"
            />
            <template v-if="!isGroupCollapsed(group.id)">
              <TaskItem
                v-for="task in group.openTasks"
                :key="task.id"
                :task="task"
                :draggable="store.canDragTasks"
                :is-dragging="taskDrag.draggingId.value === task.id"
                :is-drop-target="taskDrag.dragOverId.value === task.id"
                :drop-position="taskDrag.dragOverId.value === task.id ? taskDrag.dropPosition.value : ''"
              />
              <TaskItem
                v-if="isGroupCompletedInGroups && isGroupCompletedVisible(group.id)"
                v-for="task in group.completedTasks"
                :key="task.id"
                :task="task"
              />
            </template>
          </div>
        </template>

        <!-- 分组右键菜单 -->
        <div
          v-if="groupMenu.visible"
          ref="groupMenuRef"
          class="context-menu"
          :style="groupMenuStyle"
          role="menu"
          tabindex="-1"
          @click.stop
          @keydown.esc="closeGroupMenu"
        >
          <button class="context-item" role="menuitem" type="button" @click="renameGroup">
            <Pencil :size="15" /> 重命名
          </button>
          <button class="context-item context-item--danger" role="menuitem" type="button" @click="deleteGroup">
            <Trash2 :size="15" /> 删除分组
          </button>
        </div>

        <!-- 分组添加任务弹出框 -->
        <div
          v-if="activeGroupAddId"
          class="group-add-popup-overlay"
          @click="cancelGroupAdd"
        >
          <div class="group-add-popup" :style="groupAddPopupStyle" @click.stop>
            <div class="group-add-popup__row">
              <Plus :size="19" />
              <input
                ref="groupAddInputRef"
                v-model="groupAddTitle"
                type="text"
                placeholder="添加任务，可输入'明天 18点''每周''#标签'"
                aria-label="快速添加任务"
                @keydown.enter="submitGroupAdd"
                @keydown.escape="cancelGroupAdd"
              />
              <button class="primary-btn" type="button" :disabled="!groupAddTitle.trim()" @click="submitGroupAdd">添加</button>
            </div>
          </div>
        </div>

        <div v-if="store.completedTasks.length && !isGroupCompletedInGroups" class="completed-section">
          <div class="task-group-header is-system completed-header">
            <div class="task-group-header__main">
              <button
                class="task-group-header__toggle"
                type="button"
                :title="shouldShowCompletedTasks ? '折叠已完成' : '展开已完成'"
                @click="toggleCompleted"
              >
                <ChevronDown :size="16" :class="{ rotated: !shouldShowCompletedTasks }" />
              </button>
              <span class="task-group-header__emoji">🎉</span>
              <span class="task-group-header__name">已完成</span>
              <span class="task-group-header__count">{{ store.completedTasks.length }}</span>
            </div>
          </div>
          <TaskItem
            v-if="shouldShowCompletedTasks"
            v-for="task in store.completedTasks"
            :key="task.id"
            :task="task"
          />
        </div>
      </template>

      <div v-if="isEmpty" class="empty-state">
        <div class="empty-state__icon">
          <CheckCheck :size="28" />
        </div>
        <h2>{{ emptyTitle }}</h2>
        <p>{{ emptyText }}</p>
      </div>
    </section>

    <div
      v-show="scrollIndicator.visible"
      class="task-list__scroll-indicator"
      :class="{ 'is-visible': isScrolling }"
      :style="{ top: `${scrollIndicator.top}px`, height: `${scrollIndicator.height}px` }"
      aria-hidden="true"
    ></div>

    <ConfirmDialog
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :type="confirmDialog.type"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.visible = false"
    />

    <InputDialog
      :visible="inputDialog.visible"
      :title="inputDialog.title"
      :message="inputDialog.message"
      :placeholder="inputDialog.placeholder"
      :default-value="inputDialog.defaultValue"
      :confirm-text="inputDialog.confirmText"
      :type="inputDialog.type"
      @confirm="inputDialog.onConfirm"
      @cancel="inputDialog.visible = false"
    />

    <!-- 分组创建/重命名弹窗 -->
    <Teleport to="body">
      <div v-if="groupDialog.visible" class="input-overlay" role="dialog" aria-modal="true" :aria-label="groupDialog.title" @keydown.esc.stop="handleGroupDialogKeydown" @click.self="closeGroupDialog">
        <div class="input-dialog group-dialog" @click.stop>
          <div class="group-dialog__header">
            <h3 class="group-dialog__title">{{ groupDialog.title }}</h3>
            <button class="group-dialog__close" type="button" title="关闭" @click="closeGroupDialog">
              <X :size="16" />
            </button>
          </div>
          <div class="input-body group-dialog__body">
            <div class="group-dialog__name-row">
              <button ref="emojiButtonRef" type="button" class="group-dialog__emoji-trigger" title="选择 Emoji" @click.stop="toggleEmojiPicker">
                <span v-if="groupDialog.emoji">{{ groupDialog.emoji }}</span>
                <Smile v-else :size="18" />
              </button>
              <div class="input-field-wrapper group-dialog__name-field">
                <input
                  ref="groupDialogInput"
                  v-model="groupDialog.name"
                  type="text"
                  placeholder="分组名称，例如：工作"
                  class="input-field"
                  maxlength="20"
                  @keydown.enter="confirmGroupDialog"
                />
                <span class="group-dialog__char-count">{{ groupDialog.name.length }}/20</span>
              </div>
            </div>

            <div class="group-dialog__section">
              <div class="group-dialog__color-header">
                <div>
                  <span class="group-dialog__color-label">分组强调色</span>
                  <small class="group-dialog__color-hint">仅用于标题标识，不影响任务阅读</small>
                </div>
                <label class="group-dialog__auto-toggle" :class="{ active: groupDialog.color === 'auto' }">
                  <input type="checkbox" :checked="groupDialog.color === 'auto'" @change="toggleAutoColor" />
                  <span class="group-dialog__auto-toggle-track">
                    <span class="group-dialog__auto-toggle-thumb"></span>
                  </span>
                  <span class="group-dialog__auto-toggle-label">自动配色</span>
                </label>
              </div>
              <div class="group-dialog__color-grid">
                <button
                  v-for="preset in mergedColorPresets"
                  :key="preset.id"
                  type="button"
                  class="group-dialog__color-swatch"
                  :class="{ active: groupDialog.color === preset.id, 'is-auto': preset.id === 'auto' }"
                  :title="preset.label"
                  :aria-label="preset.label"
                  :style="preset.id !== 'auto' ? { '--swatch-color': preset.color } : {}"
                  @click="selectPresetColor(preset)"
                >
                  <span v-if="preset.id === 'auto'" class="group-dialog__auto-icon">✦</span>
                  <svg v-else-if="groupDialog.color === preset.id" class="group-dialog__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
              </div>
              <div class="group-dialog__custom-input">
                <div class="group-dialog__custom-color-control">
                  <button
                    ref="customColorPreview"
                    type="button"
                    class="group-dialog__color-preview"
                    :style="{ '--preview-color': groupDialog.customColor }"
                    aria-label="打开自定义颜色选择器"
                    :aria-expanded="customColorPickerOpen"
                    @click.stop="toggleCustomColorPicker"
                  ></button>
                </div>
                <input v-model="groupDialog.customColor" class="group-dialog__hex-field" type="text" maxlength="7" placeholder="#000000" aria-label="十六进制颜色" @change="syncCustomColor" />
                <button type="button" class="group-dialog__clear" @click="clearCustomColor">清空</button>
              </div>
            </div>
          </div>
          <div class="group-dialog__footer">
            <button class="group-dialog__btn group-dialog__btn--cancel" type="button" @click="closeGroupDialog">
              取消
            </button>
            <button
              class="group-dialog__btn group-dialog__btn--confirm"
              type="button"
              :disabled="!groupDialog.name.trim()"
              @click="confirmGroupDialog"
            >
              {{ groupDialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="customColorPickerOpen" class="group-dialog__color-picker-popover" :style="customColorPickerStyle" @click.stop>
        <ColorPicker v-model="groupDialog.customColor" @update:model-value="selectCustomColor" />
      </div>
    </Teleport>

    <EmojiPicker
      v-model="groupDialog.emoji"
      :visible="groupDialog.showEmoji"
      :anchor-el="emojiButtonEl"
      @update:visible="groupDialog.showEmoji = $event"
    />
  </main>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  ArrowUpDown,
  AlertCircle,
  CalendarClock,
  Funnel,
  FolderInput,
  Pencil,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Flag,
  Folder,
  Eye,
  EyeOff,
  Info,
  ListChecks,
  MoreHorizontal,
  PanelRight,
  Plus,
  Repeat2,
  RotateCcw,
  Search,
  Smile,
  Tags,
  Trash2,
  X
} from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'
import { useDragSort } from '@/composables/useDragSort'
import { getTodayGuidance, getViewEmptyMessage } from '@/utils/dailyMessages'
import TaskItem from './TaskItem.vue'
import TaskGroupHeader from './TaskGroupHeader.vue'
import EmojiPicker from './EmojiPicker.vue'
import ViewModeToggle from './ViewModeToggle.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import InputDialog from './InputDialog.vue'
import ColorPicker from './ColorPicker.vue'

const store = useTaskStore()
const newTaskTitle = ref('')
const quickInput = ref(null)
const searchInput = ref(null)
const searchViewMode = ref('list')
const sortMenuOpen = ref(false)
const filterMenuOpen = ref(false)
const headerMoreOpen = ref(false)
const listSwitcherOpen = ref(false)
const listSummaryOpen = ref(false)
const listSwitcherRef = ref(null)
const pinnedVisible = ref(true)
const groupCompletedVisibility = reactive({})
const groupCollapseState = reactive({})
const searchGroupCollapseState = reactive({})
const contentRef = ref(null)
const isScrolling = ref(false)
const scrollIndicator = reactive({ visible: false, top: 0, height: 0 })
let scrollTimer = null
const groupMenu = reactive({ visible: false, x: 0, y: 0, groupId: null })
const groupMenuRef = ref(null)
const groupDialog = reactive({
  visible: false,
  title: '新建分组',
  name: '',
  emoji: '',
  color: 'auto',
  customColor: '#5b8def',
  showEmoji: false,
  confirmText: '创建',
  editingGroupId: null
})
const groupDialogInput = ref(null)
const emojiButtonRef = ref(null)
const customColorPickerOpen = ref(false)
const customColorPreview = ref(null)
const customColorPickerPosition = reactive({ top: 0, left: 0 })
const emojiButtonEl = computed(() => emojiButtonRef.value?.$el || emojiButtonRef.value)
const customColorPickerStyle = computed(() => ({
  top: `${customColorPickerPosition.top}px`,
  left: `${customColorPickerPosition.left}px`
}))
// 预设 ID 必须与 TaskGroup 的可持久化颜色 ID 保持一致，
// 否则 store 在保存时会将未知值回退为“自动配色”。
const mergedColorPresets = [
  { id: 'auto', label: '自动配色', color: '' },
  { id: 'accent', label: '主题色', color: 'var(--accent)' },
  { id: 'blue', label: '海蓝', color: '#4A90D9' },
  { id: 'violet', label: '紫罗兰', color: '#8B6FD8' },
  { id: 'amber', label: '琥珀', color: '#E3A43A' },
  { id: 'rose', label: '玫瑰', color: '#D46F8C' },
  { id: 'green', label: '绿色', color: '#4EAA70' },
  { id: 'cyan', label: '青蓝', color: '#38AFC2' },
  { id: 'coral', label: '珊瑚', color: '#DE7D69' },
  { id: 'indigo', label: '靛蓝', color: '#6275C9' },
  { id: 'teal', label: '松绿', color: '#3D9A7D' },
  { id: 'brick', label: '砖红', color: '#C9685A' }
]
const activeGroupAddId = ref(null)
const activeGroupAddGroupId = ref(null)
const groupAddTitle = ref('')
const groupAddInputRef = ref(null)
const groupAddPopupPos = reactive({ x: 0, y: 0 })
const groupAddPopupStyle = computed(() => {
  const w = 420
  const h = 52
  const pad = 12
  let x = groupAddPopupPos.x
  let y = groupAddPopupPos.y
  if (x + w > window.innerWidth - pad) x = window.innerWidth - w - pad
  if (y + h > window.innerHeight - pad) y = window.innerHeight - h - pad
  if (x < pad) x = pad
  if (y < pad) y = pad
  return { left: `${x}px`, top: `${y}px` }
})
const groupMenuStyle = computed(() => {
  const menuW = 140
  const menuH = 80
  const pad = 8
  let x = groupMenu.x
  let y = groupMenu.y
  if (x + menuW > window.innerWidth - pad) x = window.innerWidth - menuW - pad
  if (y + menuH > window.innerHeight - pad) y = window.innerHeight - menuH - pad
  if (x < pad) x = pad
  if (y < pad) y = pad
  return { left: `${x}px`, top: `${y}px` }
})
const confirmDialog = reactive({
  visible: false,
  title: '',
  message: '',
  confirmText: '确定',
  type: 'danger',
  onConfirm: () => {}
})
const inputDialog = reactive({
  visible: false,
  title: '',
  message: '',
  placeholder: '',
  defaultValue: '',
  confirmText: '保存',
  type: 'edit',
  onConfirm: () => {}
})
const sortOptions = [
  { value: 'default', label: '智能排序（推荐）', description: '重要、置顶和截止日期优先' },
  { value: 'date', label: '截止日期近' },
  { value: 'dateDesc', label: '截止日期远' },
  { value: 'priority', label: '重要优先' },
  { value: 'createdDesc', label: '最近创建', secondary: true },
  { value: 'name', label: '按名称' }
]

const taskDrag = useDragSort({
  scrollContainerSelector: '.task-list__content',
  onDragStart: () => store.playDragStartSound(),
  onDragOver: () => store.playDragOverSound(),
  onDragEnd: () => store.playDragEndSound(),
  onDrop(sourceId, targetId, position, groupId) {
    // 如果是分组模式且有目标分组，移动任务到分组
    if (viewMode.value === 'group' && groupId !== undefined) {
      store.moveTaskToGroup(sourceId, groupId)
    }

    // 如果是拖到分组头部（__group__前缀），只移动分组，不重排序
    if (targetId.startsWith('__group__')) return

    // Find which scope the tasks belong to
    if (store.currentView === 'planned') {
      const section = store.plannedSections.find(s => s.tasks.some(t => t.id === sourceId || t.id === targetId))
      if (section) {
        store.reorderTask(sourceId, targetId, section.tasks.map(t => t.id), position)
      }
    } else {
      store.reorderTask(sourceId, targetId, store.uncompletedTasks.map(t => t.id), position)
    }
  },
  getItemEl(target) {
    const article = target.closest?.('.task-item')
    if (!article) return null
    const taskId = article.dataset.taskId
    return taskId ? { id: taskId, el: article } : null
  },
  findItemAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      // 检查是否拖到了分组头部区域
      const groupHeader = el.closest?.('.task-group-header')
      if (groupHeader) {
        const groupId = groupHeader.dataset.groupId
        if (groupId) {
          // 返回分组ID作为目标
          return { id: '__group__' + groupId, position: 'after', groupId }
        }
      }

      const article = el.closest?.('.task-item')
      if (!article) continue
      const taskId = article.dataset.taskId
      if (!taskId) continue
      // Determine position: top half = before, bottom half = after
      const rect = article.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const position = y < midY ? 'before' : 'after'

      // 查找任务所属的分组
      const groupEl = article.closest('.task-group')
      const groupId = groupEl?.querySelector('.task-group-header')?.dataset.groupId || null

      return { id: taskId, position, groupId }
    }
    return null
  }
})

const groupDrag = useDragSort({
  scrollContainerSelector: '.task-list__content',
  onDragStart: () => store.playDragStartSound(),
  onDragOver: () => store.playDragOverSound(),
  onDragEnd: () => store.playDragEndSound(),
  onDrop(sourceId, targetId, position) {
    store.reorderTaskGroup(sourceId, targetId, position)
  },
  getItemEl(target) {
    const header = target.closest?.('.task-group-header:not(.is-system)')
    const groupId = header?.dataset.groupId
    return groupId ? { id: groupId, el: header } : null
  },
  findItemAtPoint(x, y) {
    const group = document.elementsFromPoint(x, y)
      .map(el => el.closest?.('.task-group'))
      .find(Boolean)
    const header = group?.querySelector('.task-group-header:not(.is-system)')
    const groupId = header?.dataset.groupId
    if (!groupId) return null
    const rect = group.getBoundingClientRect()
    return { id: groupId, position: y < rect.top + rect.height / 2 ? 'before' : 'after' }
  }
})

function handleMouseDown(e) {
  if (!store.canDragTasks) return
  if (isDragIgnored(e.target)) return
  const article = e.target.closest('.task-item')
  if (!article) return
  const taskId = article.dataset.taskId
  if (taskId) taskDrag.startDrag(e, taskId)
}

function handleGroupMouseDown(e, groupId) {
  if (isDragIgnored(e.target)) return
  groupDrag.startDrag(e, groupId)
}

function isDragIgnored(target) {
  return Boolean(target.closest?.('button, input, textarea, select, a, .context-menu'))
}

function getGroupToneClass(group) {
  if (!group.id) return 'task-group--ungrouped'
  if (group.color === 'custom') return 'task-group--custom'
  if (group.color && group.color !== 'auto') return `task-group--color-${group.color}`
  return 'task-group--auto'
}

const autoGroupPalettes = [
  '#2f8f86', '#4a7fd1', '#7a62c8', '#c8862f',
  '#c35d7b', '#4b9a68', '#3f99ab', '#8b7c38'
]

function getGroupToneStyle(group) {
  if (!group?.id) return {}
  if (group.color === 'custom' && isValidHexColor(group.customColor)) {
    return {
      '--group-accent': group.customColor,
      '--group-header-surface': hexToRgba(group.customColor, 0.08)
    }
  }
  if (group.color && group.color !== 'auto') return {}
  const groupId = `${group.name || ''}${group.id}`
  let hash = 0
  for (const char of groupId) hash = ((hash << 5) - hash) + char.charCodeAt(0)
  const accent = autoGroupPalettes[Math.abs(hash) % autoGroupPalettes.length]
  return { '--group-accent': accent, '--group-header-surface': hexToRgba(accent, 0.08) }
}

function isValidHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || '')
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function updateScrollIndicator(element = contentRef.value) {
  if (!element) return
  const { clientHeight, scrollHeight, scrollTop, offsetTop } = element
  const hasOverflow = scrollHeight > clientHeight + 1
  scrollIndicator.visible = hasOverflow
  if (!hasOverflow) return
  const height = Math.max(32, Math.round((clientHeight * clientHeight) / scrollHeight))
  const maxTop = Math.max(0, clientHeight - height)
  const progress = (scrollHeight - clientHeight) > 0 ? scrollTop / (scrollHeight - clientHeight) : 0
  scrollIndicator.height = height
  scrollIndicator.top = offsetTop + Math.round(maxTop * progress)
}

function onContentScroll(event) {
  updateScrollIndicator(event?.currentTarget)
  isScrolling.value = true
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    isScrolling.value = false
  }, 850)
}

const todayOpenTaskCount = computed(() => store.activeTasks.filter(task => !task.completed && (store.isInMyDay(task) || store.getPlanBucket(task) === 'today')).length)
const overdueTaskCount = computed(() => store.activeTasks.filter(task => !task.completed && store.getPlanBucket(task) === 'overdue').length)
const dailyGuidance = computed(() => getTodayGuidance({
  style: store.settings.dailyGuidanceStyle,
  openCount: todayOpenTaskCount.value,
  overdueCount: overdueTaskCount.value
}))
const contextualEmptyMessage = computed(() => getViewEmptyMessage({
  view: store.currentList && store.listTaskFilters.date === 'overdue'
    ? 'overdue'
    : store.currentList && store.isListTaskFilterActive
      ? 'filtered'
      : store.currentList
        ? 'list'
        : store.currentView,
  style: store.settings.dailyGuidanceStyle
}))

const viewMeta = computed(() => {
  const system = {
    today: { title: '今日', eyebrow: store.settings.dailyGuidanceEnabled ? dailyGuidance.value.eyebrow : '聚焦今天真正要推进的事' },
    inbox: { title: '收集箱', eyebrow: '先记录，再整理' },
    planned: { title: '计划', eyebrow: '按时间推进任务' },
    important: { title: '重要', eyebrow: '需要优先处理的任务' },
    completed: { title: '已完成', eyebrow: '回顾和清理已经完成的事项' },
    trash: { title: '垃圾桶', eyebrow: '恢复或永久删除任务' },
    search: { title: '搜索', eyebrow: '查找任务、标签和备注' }
  }
  if (system[store.currentView]) return system[store.currentView]
  return {
    title: store.currentList?.name || '清单',
    eyebrow: '当前清单'
  }
})

const listStats = computed(() => {
  const tasks = store.tasks.filter(task => task.listId === store.currentList?.id && !task.deleted)
  const subtasks = tasks.flatMap(task => task.subtasks || [])
  const now = Date.now()
  return {
    groups: store.currentListGroups.length,
    total: tasks.length,
    active: tasks.filter(task => !task.completed).length,
    completed: tasks.filter(task => task.completed).length,
    subtasks: subtasks.length,
    completedSubtasks: subtasks.filter(task => task.completed).length,
    overdue: tasks.filter(task => !task.completed && task.dueDate && new Date(task.dueDate).getTime() < now).length
  }
})

function switchList(id) {
  store.setView(id)
  listSwitcherOpen.value = false
}

function toggleListSwitcher() {
  listSwitcherOpen.value = !listSwitcherOpen.value
  listSummaryOpen.value = false
}

function closeListSwitcher() {
  listSwitcherOpen.value = false
  listSummaryOpen.value = false
}

const sortLabel = computed(() => {
  return sortOptions.find(option => option.value === store.sortBy)?.label || '智能排序'
})
const listFilterSections = [
  {
    key: 'status',
    label: '完成状态',
    compactLabel: '状态',
    options: [
      { value: 'all', label: '全部状态', compactLabel: '全部' },
      { value: 'open', label: '未完成', description: '只显示待处理任务' },
      { value: 'done', label: '已完成', description: '只显示完成记录' }
    ]
  },
  {
    key: 'date',
    label: '日期',
    compactLabel: '日期',
    options: [
      { value: 'all', label: '全部日期', compactLabel: '全部' },
      { value: 'overdue', label: '已逾期', compactLabel: '逾期' },
      { value: 'today', label: '今天到期', compactLabel: '今天' },
      { value: 'future', label: '未来到期', compactLabel: '未来' },
      { value: 'none', label: '未设日期', compactLabel: '无日期' }
    ]
  },
  {
    key: 'priority',
    label: '优先级',
    compactLabel: '优先级',
    options: [
      { value: 'all', label: '全部优先级', compactLabel: '全部' },
      { value: '3', label: '高优先级', compactLabel: '高' },
      { value: '2', label: '中优先级', compactLabel: '中' },
      { value: '1', label: '低优先级', compactLabel: '低' }
    ]
  }
]
const listFilterLabel = computed(() => store.isListTaskFilterActive ? '已筛选' : '全部任务')

const showTaskActions = computed(() => true)
const isSearchView = computed(() => store.currentView === 'search')

const quickPlaceholder = computed(() => {
  if (store.currentView === 'today') return '添加到今日，例如：明天 9点 写周报 #工作'
  if (store.currentView === 'important') return '添加重要任务'
  return '添加任务，可输入"明天 18点""每周""#标签"'
})

const quickParseChips = computed(() => {
  const input = newTaskTitle.value.trim()
  if (!input) return []
  const chips = []
  const tagMatches = [...input.matchAll(/#([\p{L}\p{N}_-]+)/gu)]

  if (/(今天|今日)/.test(input)) chips.push({ type: 'date', label: '今天', icon: CalendarClock })
  else if (/明天/.test(input)) chips.push({ type: 'date', label: '明天', icon: CalendarClock })
  else if (/后天/.test(input)) chips.push({ type: 'date', label: '后天', icon: CalendarClock })
  else if (/(下周|下星期)/.test(input)) chips.push({ type: 'date', label: '下周', icon: CalendarClock })
  else if (store.currentView === 'today') chips.push({ type: 'date', label: '今天', icon: CalendarClock })

  const timeMatch = input.match(/(?:^|\s)(\d{1,2})[:：点](\d{2})?/)
  if (timeMatch) chips.push({ type: 'date', label: `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}`, icon: CalendarClock })

  if (/每天|每日/.test(input)) chips.push({ type: 'repeat', label: '每天重复', icon: Repeat2 })
  else if (/每周|每星期/.test(input)) chips.push({ type: 'repeat', label: '每周重复', icon: Repeat2 })
  else if (/每月/.test(input)) chips.push({ type: 'repeat', label: '每月重复', icon: Repeat2 })

  if (/重要|高优先级/.test(input) || store.currentView === 'important') chips.push({ type: 'priority', label: '重要', icon: Flag })
  for (const match of tagMatches.slice(0, 3)) {
    chips.push({ type: 'tag', label: `#${match[1]}`, icon: Tags })
  }
  return chips.slice(0, 5)
})

const readonlyHint = computed(() => {
  const map = {
    planned: '计划视图按截止日期自动汇总，请在今日、收集箱或清单中添加任务。',
    completed: '已完成视图用于回顾和清理任务。',
    trash: '垃圾桶中的任务可以恢复或永久删除。'
  }
  return map[store.currentView] || ''
})

const isEmpty = computed(() => {
  if (store.currentView === 'trash') return store.visibleTrashTasks.length === 0 && store.listTrash.length === 0
  if (store.currentView === 'planned') return store.plannedSections.length === 0
  return store.filteredTasks.length === 0
})

const viewMode = computed({
  get: () => isSearchView.value ? searchViewMode.value : store.currentViewMode,
  set: (mode) => {
    if (isSearchView.value) {
      searchViewMode.value = mode
      return
    }
    store.setViewMode(store.currentView, mode)
  }
})
const isGroupCompletedInGroups = computed(() => {
  return !isSearchView.value && viewMode.value === 'group' &&
    (store.settings.groupCompletedDisplayMode === 'in-group' || forceCompletedFilterVisibility.value)
})
const forceCompletedFilterVisibility = computed(() => {
  return Boolean(store.currentList && store.listTaskFilters.status === 'done')
})
const shouldShowCompletedTasks = computed(() => {
  return store.settings.completedVisible || forceCompletedFilterVisibility.value
})
const searchResultGroups = computed(() => {
  const listOrder = new Map(store.lists.map((list, index) => [list.id, index]))
  const groups = new Map()

  store.filteredTasks.forEach(task => {
    const list = store.lists.find(item => item.id === task.listId)
    const id = list?.id || task.listId || 'unknown'
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        name: list?.name || '未归属清单',
        color: list?.color || 'var(--text-subtle)',
        order: listOrder.get(id) ?? Number.MAX_SAFE_INTEGER,
        tasks: []
      })
    }
    groups.get(id).tasks.push(task)
  })

  return [...groups.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'zh-CN'))
})
const searchResultCount = computed(() => store.filteredTasks.length)
const allGroupCompletedVisible = computed(() => {
  const groups = store.groupedTasks.filter(group => group.completedCount)
  return groups.length > 0 && groups.every(group => isGroupCompletedVisible(group.id))
})

function getGroupCompletedVisibilityKey(groupId) {
  // 切换清单时保留各清单自己的显示选择；未分组任务也必须按清单隔离。
  const listId = store.currentList?.id || store.currentView
  return `${listId}:${groupId || '__ungrouped__'}`
}

function isGroupCompletedVisible(groupId) {
  if (forceCompletedFilterVisibility.value) return true
  const key = getGroupCompletedVisibilityKey(groupId)
  return groupCompletedVisibility[key] ?? store.settings.groupCompletedVisibleByDefault
}

function toggleGroupCompletedVisibility(groupId) {
  const key = getGroupCompletedVisibilityKey(groupId)
  groupCompletedVisibility[key] = !isGroupCompletedVisible(groupId)
}

function toggleAllGroupCompletedVisibility() {
  const nextVisible = !allGroupCompletedVisible.value
  store.groupedTasks
    .filter(group => group.completedCount)
    .forEach(group => {
      groupCompletedVisibility[getGroupCompletedVisibilityKey(group.id)] = nextVisible
    })
}

function toggleGroupCollapse(groupId) {
  if (groupId) {
    store.setTaskGroupCollapsed(groupId, !isGroupCollapsed(groupId))
    return
  }
  groupCollapseState.__ungrouped__ = !groupCollapseState.__ungrouped__
}

function isGroupCollapsed(groupId) {
  if (!groupId) return !!groupCollapseState.__ungrouped__
  return !!store.currentListGroups.find(group => group.id === groupId)?.collapsed
}

const allGroupsExpanded = computed(() => {
  const allKeys = store.groupedTasks.map(g => g.id || '__ungrouped__')
  return allKeys.length > 0 && allKeys.every(key => !isGroupCollapsed(key === '__ungrouped__' ? null : key))
})

function toggleAllGroups() {
  const allExpanded = allGroupsExpanded.value
  const allKeys = store.groupedTasks.map(g => g.id || '__ungrouped__')
  allKeys.forEach(key => {
    if (key === '__ungrouped__') groupCollapseState.__ungrouped__ = allExpanded
    else store.setTaskGroupCollapsed(key, allExpanded)
  })
}

const emptyTitle = computed(() => {
  if (store.currentList && store.listTaskFilters.date === 'overdue') return store.settings.dailyGuidanceEnabled ? (contextualEmptyMessage.value?.title || '没有逾期任务') : '没有逾期任务'
  if (store.currentList && store.isListTaskFilterActive) return store.settings.dailyGuidanceEnabled ? (contextualEmptyMessage.value?.title || '没有符合筛选条件的任务') : '没有符合筛选条件的任务'
  if (store.currentView === 'today' && store.settings.dailyGuidanceEnabled) return dailyGuidance.value.title
  if (store.settings.dailyGuidanceEnabled && contextualEmptyMessage.value?.title) return contextualEmptyMessage.value.title
  const map = {
    today: '今天很清爽',
    inbox: '收集箱为空',
    planned: '还没有计划任务',
    important: '没有重要任务',
    completed: '还没有完成记录',
    trash: '垃圾桶为空',
    search: '没有搜索结果'
  }
  return map[store.currentView] || '这个清单还没有任务'
})

const emptyText = computed(() => {
  if (store.currentList && store.listTaskFilters.date === 'overdue') return store.settings.dailyGuidanceEnabled ? (contextualEmptyMessage.value?.text || '当前清单中没有已过截止日期且未完成的任务。') : '当前清单中没有已过截止日期且未完成的任务。'
  if (store.currentList && store.isListTaskFilterActive) return store.settings.dailyGuidanceEnabled ? (contextualEmptyMessage.value?.text || '调整筛选条件，或添加一条任务。') : '调整筛选条件，或添加一条任务。'
  if (store.currentView === 'today' && store.settings.dailyGuidanceEnabled) return dailyGuidance.value.text
  if (store.settings.dailyGuidanceEnabled && contextualEmptyMessage.value?.text) return contextualEmptyMessage.value.text
  const map = {
    today: '添加一个今日任务，或从建议中挑选今天要推进的事项。',
    inbox: '把临时想法先放在这里，之后再安排日期或清单。',
    planned: '给任务设置截止日期后，它们会出现在这里。',
    important: '给任务点亮重要标记后，它们会集中到这里。',
    completed: '完成任务后可以在这里回看。',
    trash: '删除后的任务会先进入垃圾桶。',
    search: '换个关键词试试，支持标题、备注和标签。'
  }
  return map[store.currentView] || '使用上方输入框添加第一条任务。'
})

function addTask() {
  const title = newTaskTitle.value.trim()
  if (!title) return
  store.addTask(title)
  newTaskTitle.value = ''
  nextTick(() => quickInput.value?.focus())
}

function addGroupTask(groupId, event) {
  const key = groupId || '__ungrouped__'
  // 点击同一个分组的添加按钮则关闭
  if (activeGroupAddId.value === key) {
    cancelGroupAdd()
    return
  }
  // 定位弹出框到按钮附近
  if (event) {
    const rect = event.target.getBoundingClientRect()
    groupAddPopupPos.x = rect.left
    groupAddPopupPos.y = rect.bottom + 6
  }
  activeGroupAddId.value = key
  activeGroupAddGroupId.value = groupId
  groupAddTitle.value = ''
  nextTick(() => groupAddInputRef.value?.focus())
}

function submitGroupAdd() {
  const title = groupAddTitle.value.trim()
  if (!title) return
  const task = store.addTask(title)
  if (task && activeGroupAddGroupId.value) {
    store.moveTaskToGroup(task.id, activeGroupAddGroupId.value)
  }
  groupAddTitle.value = ''
  nextTick(() => groupAddInputRef.value?.focus())
}

function cancelGroupAdd() {
  activeGroupAddId.value = null
  activeGroupAddGroupId.value = null
  groupAddTitle.value = ''
}

function showGroupMenu({ groupId, event }) {
  closeHeaderTransientMenus()
  groupMenu.groupId = groupId
  groupMenu.x = event.clientX
  groupMenu.y = event.clientY
  groupMenu.visible = true
  nextTick(() => {
    document.addEventListener('click', closeGroupMenu, { once: true })
  })
}

function closeGroupMenu() {
  groupMenu.visible = false
  groupMenu.groupId = null
}

function renameGroup() {
  const groupId = groupMenu.groupId
  closeGroupMenu()
  if (!groupId) return
  const group = store.currentListGroups.find(g => g.id === groupId)
  if (!group) return
  groupDialog.title = '重命名分组'
  groupDialog.name = group.name
  groupDialog.emoji = group.emoji || ''
  groupDialog.color = group.color || 'auto'
  groupDialog.customColor = group.customColor || '#5b8def'
  groupDialog.showEmoji = false
  customColorPickerOpen.value = false
  groupDialog.confirmText = '保存'
  groupDialog.editingGroupId = groupId
  groupDialog.visible = true
  nextTick(() => groupDialogInput.value?.focus())
}

function closeGroupDialog() {
  groupDialog.visible = false
  groupDialog.showEmoji = false
  customColorPickerOpen.value = false
  groupDialog.editingGroupId = null
}

function isSearchGroupCollapsed(groupId) {
  return Boolean(searchGroupCollapseState[groupId])
}

function toggleSearchGroup(groupId) {
  searchGroupCollapseState[groupId] = !isSearchGroupCollapsed(groupId)
}

function toggleCustomColorPicker() {
  if (customColorPickerOpen.value) {
    customColorPickerOpen.value = false
    return
  }
  const rect = customColorPreview.value?.getBoundingClientRect()
  if (!rect) return
  const pickerWidth = 302
  groupDialog.showEmoji = false
  customColorPickerPosition.top = rect.bottom + 8
  customColorPickerPosition.left = Math.max(12, Math.min(rect.left, window.innerWidth - pickerWidth - 12))
  customColorPickerOpen.value = true
}

function closeCustomColorPicker() {
  customColorPickerOpen.value = false
}

function toggleEmojiPicker() {
  groupDialog.showEmoji = !groupDialog.showEmoji
  if (groupDialog.showEmoji) {
    closeCustomColorPicker()
    nextTick(() => groupDialogInput.value?.focus())
  }
}

function handleGroupDialogKeydown(event) {
  if (event.key === 'Escape') {
    if (customColorPickerOpen.value) {
      closeCustomColorPicker()
    } else if (groupDialog.showEmoji) {
      groupDialog.showEmoji = false
    } else {
      closeGroupDialog()
    }
  }
}

function deleteGroup() {
  const groupId = groupMenu.groupId
  closeGroupMenu()
  if (!groupId) return
  const group = store.currentListGroups.find(g => g.id === groupId)
  if (!group) return
  const taskCount = store.groupedTasks.find(g => g.id === groupId)?.totalCount || 0
  confirmDialog.title = '删除分组'
  confirmDialog.message = taskCount > 0
    ? `分组"${group.name}"下有 ${taskCount} 个任务，删除后任务将移至"未分组"。确定删除？`
    : `确定删除分组"${group.name}"？`
  confirmDialog.confirmText = '删除'
  confirmDialog.type = 'danger'
  confirmDialog.onConfirm = () => {
    // 把分组内的任务移到未分组
    const tasks = store.groupedTasks.find(g => g.id === groupId)?.tasks || []
    tasks.forEach(t => store.moveTaskToGroup(t.id, null))
    store.deleteTaskGroup(groupId)
    store.showNotice(`已删除分组"${group.name}"`, 'success')
    confirmDialog.visible = false
  }
  confirmDialog.visible = true
}

function addGroup() {
  groupDialog.title = '新建分组'
  groupDialog.name = ''
  groupDialog.emoji = ''
  groupDialog.color = 'auto'
  groupDialog.customColor = '#5b8def'
  groupDialog.showEmoji = false
  customColorPickerOpen.value = false
  groupDialog.confirmText = '创建'
  groupDialog.editingGroupId = null
  groupDialog.visible = true
  nextTick(() => groupDialogInput.value?.focus())
}

function confirmGroupDialog() {
  const name = groupDialog.name.trim()
  if (!name) return
  if (groupDialog.editingGroupId) {
    store.renameTaskGroup(groupDialog.editingGroupId, name, groupDialog.emoji, groupDialog.color, groupDialog.customColor)
  } else {
    store.addTaskGroup(name, store.currentView, groupDialog.emoji, groupDialog.color, groupDialog.customColor)
  }
  closeGroupDialog()
}

function setCustomColor(color) {
  groupDialog.customColor = color
  groupDialog.color = 'custom'
}

function selectPresetColor(preset) {
  if (preset.id === 'auto') {
    groupDialog.color = 'auto'
  } else {
    groupDialog.color = preset.id
    groupDialog.customColor = preset.color
  }
}

function toggleAutoColor() {
  groupDialog.color = groupDialog.color === 'auto' ? 'blue-gray' : 'auto'
}

function clearCustomColor() {
  groupDialog.customColor = '#5b8def'
  groupDialog.color = 'auto'
  customColorPickerOpen.value = false
}

function selectCustomColor() {
  if (!isValidHexColor(groupDialog.customColor)) groupDialog.customColor = '#5b8def'
  groupDialog.color = 'custom'
}

function syncCustomColor() {
  const normalized = groupDialog.customColor.trim()
  groupDialog.customColor = isValidHexColor(normalized) ? normalized.toUpperCase() : '#5b8def'
  groupDialog.color = 'custom'
}

function selectSort(value) {
  store.setSort(value)
  sortMenuOpen.value = false
}

function selectSortFromHeaderMenu(value) {
  selectSort(value)
  headerMoreOpen.value = false
}

function selectListFilter(key, value) {
  store.setListTaskFilters({ [key]: value })
}

function resetListFilters() {
  store.setListTaskFilters({ status: 'all', date: 'all', priority: 'all' })
}

function closeHeaderTransientMenus() {
  sortMenuOpen.value = false
  filterMenuOpen.value = false
  headerMoreOpen.value = false
  window.dispatchEvent(new Event('task-list:close-transient-menus'))
}

function toggleSortMenu() {
  const willOpen = !sortMenuOpen.value
  closeHeaderTransientMenus()
  if (willOpen) {
    closeGroupMenu()
    sortMenuOpen.value = true
  }
}

function toggleFilterMenu() {
  const willOpen = !filterMenuOpen.value
  closeHeaderTransientMenus()
  if (willOpen) {
    closeGroupMenu()
    filterMenuOpen.value = true
  }
}

function toggleHeaderMoreMenu() {
  const willOpen = !headerMoreOpen.value
  closeHeaderTransientMenus()
  if (willOpen) {
    closeGroupMenu()
    headerMoreOpen.value = true
  }
}

function addGroupFromHeaderMenu() {
  headerMoreOpen.value = false
  addGroup()
}

function toggleAllGroupCompletedFromHeaderMenu() {
  headerMoreOpen.value = false
  toggleAllGroupCompletedVisibility()
}

function toggleAllGroupsFromHeaderMenu() {
  headerMoreOpen.value = false
  toggleAllGroups()
}

function closeSortMenu() {
  sortMenuOpen.value = false
}

function closeFilterMenu() {
  filterMenuOpen.value = false
}

function closeHeaderMoreMenu() {
  headerMoreOpen.value = false
}

function handleSortKeydown(event) {
  if (event.key !== 'Escape') return
  if (listSwitcherOpen.value) {
    closeListSwitcher()
  } else if (sortMenuOpen.value || filterMenuOpen.value || headerMoreOpen.value) {
    closeHeaderTransientMenus()
  } else if (groupMenu.visible) {
    closeGroupMenu()
  }
}

function focusSearchInput() {
  nextTick(() => searchInput.value?.focus())
}

function focusQuickAdd() {
  nextTick(() => quickInput.value?.focus())
}

onMounted(() => {
  window.addEventListener('click', closeListSwitcher)
  window.addEventListener('click', closeSortMenu)
  window.addEventListener('click', closeFilterMenu)
  window.addEventListener('click', closeHeaderMoreMenu)
  window.addEventListener('click', closeCustomColorPicker)
  window.addEventListener('keydown', handleSortKeydown)
  window.addEventListener('keydown', handleGroupDialogKeydown)
  window.addEventListener('task-list:focus-search', focusSearchInput)
  window.addEventListener('task-list:focus-quick-add', focusQuickAdd)
  nextTick(() => updateScrollIndicator())
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeListSwitcher)
  window.removeEventListener('click', closeSortMenu)
  window.removeEventListener('click', closeFilterMenu)
  window.removeEventListener('click', closeHeaderMoreMenu)
  window.removeEventListener('click', closeCustomColorPicker)
  window.removeEventListener('keydown', handleSortKeydown)
  window.removeEventListener('keydown', handleGroupDialogKeydown)
  window.removeEventListener('task-list:focus-search', focusSearchInput)
  window.removeEventListener('task-list:focus-quick-add', focusQuickAdd)
  if (scrollTimer) clearTimeout(scrollTimer)
})

function toggleCompleted() {
  store.updateSettings({ completedVisible: !store.settings.completedVisible })
}

function formatTrashDate(value) {
  if (!value) return '删除时间未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '删除时间未知'
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function deleteListForever(list) {
  confirmDialog.title = '永久删除清单'
  confirmDialog.message = `永久删除清单"${list.name}"及其任务？此操作不可撤销。`
  confirmDialog.confirmText = '永久删除'
  confirmDialog.type = 'danger'
  confirmDialog.onConfirm = () => {
    store.permanentDeleteList(list.id)
    confirmDialog.visible = false
  }
  confirmDialog.visible = true
}
</script>
