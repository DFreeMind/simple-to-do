<template>
  <div
    class="task-group-header"
    :class="{ 'is-system': !group.id }"
    :data-group-id="group.id"
  >
    <div class="task-group-header__main">
      <button
        class="task-group-header__toggle"
        type="button"
        :title="group.collapsed ? '展开分组' : '折叠分组'"
        @click="toggleCollapse"
      >
        <ChevronDown :size="16" :class="{ rotated: group.collapsed }" />
      </button>
      <span v-if="group.emoji" class="task-group-header__emoji">{{ group.emoji }}</span>
      <span class="task-group-header__name" @dblclick="startRename">{{ group.name }}</span>
      <span class="task-group-header__count">{{ group.tasks?.length || 0 }}</span>
    </div>
    <div class="task-group-header__actions">
      <button class="task-group-header__add" type="button" @click.stop="$emit('addTask', group.id, $event)">
        添加任务
      </button>
      <button
        class="task-group-header__menu"
        type="button"
        title="分组操作"
        @click.stop="showMenu"
      >
        <MoreHorizontal :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ChevronDown, MoreHorizontal } from 'lucide-vue-next'

const props = defineProps({
  group: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['toggle', 'rename', 'menu', 'addTask'])

function toggleCollapse() {
  emit('toggle', props.group.id)
}

function startRename() {
  emit('rename', props.group.id)
}

function showMenu(e) {
  emit('menu', { groupId: props.group.id, event: e })
}
</script>

<style>
.task-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px;
  user-select: none;
}

.task-group-header__main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.task-group-header__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--accent-strong);
  cursor: pointer;
  transition: all 0.15s ease;
}

.task-group-header__toggle:hover {
  background: rgba(0, 0, 0, 0.04);
}

.task-group-header__toggle svg {
  transition: transform 0.2s ease;
}

.task-group-header__toggle svg.rotated {
  transform: rotate(-90deg);
}

.task-group-header__emoji {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.task-group-header__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-strong);
  cursor: default;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-group-header__name:hover {
  cursor: text;
}

.task-group-header__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.05);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.task-group-header__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.task-group-header:hover .task-group-header__actions {
  opacity: 1;
}

.task-group-header__add {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.task-group-header__add:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.task-group-header__menu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.task-group-header__menu:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
