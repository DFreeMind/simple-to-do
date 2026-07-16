import { ref, onUnmounted } from 'vue'

/**
 * Cross-platform drag-and-drop composable using mouse events.
 * Works in Tauri/WebView where native HTML5 drag events are unreliable.
 *
 * @param {Object} options
 * @param {Function} options.onDrop(sourceId, targetId, position) - called when item is dropped; position is 'before' or 'after'
 * @param {Function} options.getItemEl(target) - walk up from event target to find draggable item, returns { id, el } or null
 * @param {Function} options.findItemAtPoint(x, y) - find target item at screen coordinates, returns { id, position } or null
 * @param {String} [options.scrollContainerSelector] - CSS selector for the scrollable container (auto-scrolls near edges)
 * @param {Function} [options.onDragStart] - called when drag starts
 * @param {Function} [options.onDragOver] - called when dragging over a target (throttled)
 * @param {Function} [options.onDragEnd] - called when drag ends
 */
export function useDragSort({ onDrop, getItemEl, findItemAtPoint, scrollContainerSelector, onDragStart, onDragOver, onDragEnd }) {
  const draggingId = ref('')
  const dragOverId = ref('')
  const dropPosition = ref('') // 'before' or 'after'
  let targetGroupId = undefined
  let ghostEl = null
  let pendingItem = null
  let pendingItemId = ''
  let startX = 0
  let startY = 0
  let offsetX = 0
  let offsetY = 0
  let lastMoveTime = 0
  let scrollRaf = null
  let suppressNextClick = false
  let lastDragOverSoundTime = 0
  let lastDragOverSoundTargetId = ''
  const DRAG_OVER_SOUND_INTERVAL_MS = 110

  const DRAG_THRESHOLD = 5 // px before a press becomes a drag
  const EDGE_THRESHOLD = 60 // px from edge to trigger auto-scroll
  const SCROLL_SPEED = 8   // px per frame
  const THROTTLE_MS = 16   // ~60fps

  function startDrag(event, itemId) {
    if (event.button !== 0) return // left click only

    const item = getItemEl(event.target)
    if (!item) return
    event.preventDefault()

    pendingItem = item
    pendingItemId = itemId
    startX = event.clientX
    startY = event.clientY

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function activateDrag(event) {
    if (!pendingItem || !pendingItemId) return
    event.preventDefault()
    window.getSelection?.().removeAllRanges()
    suppressNextClick = true
    document.addEventListener('click', suppressClick, true)
    draggingId.value = pendingItemId
    lastDragOverSoundTime = 0
    lastDragOverSoundTargetId = ''

    // Calculate offset from item top-left to mouse position
    const rect = pendingItem.el.getBoundingClientRect()
    offsetX = startX - rect.left
    offsetY = startY - rect.top

    // Create ghost element
    ghostEl = pendingItem.el.cloneNode(true)
    const appRoot = document.querySelector('.app') || document.body
    const appStyle = getComputedStyle(appRoot)
    const ghostBg = appStyle.getPropertyValue('--surface').trim() || '#ffffff'
    const ghostBorder = appStyle.getPropertyValue('--accent').trim() || '#2f8f86'

    // Remove classes that affect appearance, keep structural ones
    ghostEl.classList.remove('is-dragging', 'drop-target-before', 'drop-target-after', 'selected', 'no-drag-handle')
    ghostEl.classList.add('drag-ghost')
    ghostEl.style.position = 'fixed'
    ghostEl.style.zIndex = '9999'
    ghostEl.style.pointerEvents = 'none'
    ghostEl.style.opacity = '1'
    ghostEl.style.width = rect.width + 'px'
    ghostEl.style.left = (event.clientX - offsetX) + 'px'
    ghostEl.style.top = (event.clientY - offsetY) + 'px'
    ghostEl.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)'
    ghostEl.style.border = `1.5px solid ${ghostBorder}`
    ghostEl.style.borderRadius = 'var(--radius-md)'
    ghostEl.style.background = ghostBg
    ghostEl.style.backgroundColor = ghostBg
    ghostEl.style.transform = 'scale(1.02)'
    appRoot.appendChild(ghostEl)

    // 播放拖动开始音效
    if (onDragStart) onDragStart()
  }

  function onMouseMove(e) {
    if (pendingItem) {
      e.preventDefault()
    }

    if (!ghostEl) {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return
      activateDrag(e)
    }
    if (!ghostEl) return
    e.preventDefault()

    // Throttle to ~60fps
    const now = Date.now()
    if (now - lastMoveTime < THROTTLE_MS) return
    lastMoveTime = now

    ghostEl.style.left = (e.clientX - offsetX) + 'px'
    ghostEl.style.top = (e.clientY - offsetY) + 'px'

    // Auto-scroll near edges
    autoScroll(e.clientY)

    // Detect drop target
    // Temporarily hide ghost so elementFromPoint finds the element beneath
    ghostEl.style.pointerEvents = 'none'
    const result = findItemAtPoint(e.clientX, e.clientY)
    ghostEl.style.pointerEvents = ''

    if (result && result.id !== draggingId.value) {
      dragOverId.value = result.id
      dropPosition.value = result.position || 'after'
      targetGroupId = result.groupId
      // 刚经过新目标时立即反馈；停留或掠过多个指示线时再以稳定节奏继续提示。
      const enteredNewTarget = result.id !== lastDragOverSoundTargetId
      if (onDragOver && (enteredNewTarget || now - lastDragOverSoundTime >= DRAG_OVER_SOUND_INTERVAL_MS)) {
        onDragOver()
        lastDragOverSoundTime = now
      }
      lastDragOverSoundTargetId = result.id
    } else {
      dragOverId.value = ''
      dropPosition.value = ''
      targetGroupId = undefined
      lastDragOverSoundTargetId = ''
    }
  }

  function autoScroll(mouseY) {
    if (scrollRaf) cancelAnimationFrame(scrollRaf)

    const container = scrollContainerSelector
      ? document.querySelector(scrollContainerSelector)
      : ghostEl?.closest('.task-list__content, .group-list, .subtask-list')

    if (!container || container.scrollHeight <= container.clientHeight) return

    const rect = container.getBoundingClientRect()
    const distFromTop = mouseY - rect.top
    const distFromBottom = rect.bottom - mouseY

    let scrollDelta = 0
    if (distFromTop < EDGE_THRESHOLD && distFromTop > 0) {
      // Near top → scroll up
      const ratio = 1 - distFromTop / EDGE_THRESHOLD
      scrollDelta = -SCROLL_SPEED * ratio
    } else if (distFromBottom < EDGE_THRESHOLD && distFromBottom > 0) {
      // Near bottom → scroll down
      const ratio = 1 - distFromBottom / EDGE_THRESHOLD
      scrollDelta = SCROLL_SPEED * ratio
    }

    if (scrollDelta !== 0) {
      scrollRaf = requestAnimationFrame(() => {
        container.scrollTop += scrollDelta
        scrollRaf = null
      })
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf)
      scrollRaf = null
    }

    if (draggingId.value && dragOverId.value) {
      onDrop(draggingId.value, dragOverId.value, dropPosition.value, targetGroupId)
    }

    // 播放拖动结束音效
    if (onDragEnd && draggingId.value) {
      onDragEnd()
    }

    // Cleanup
    if (ghostEl) {
      ghostEl.remove()
      ghostEl = null
    }
    pendingItem = null
    pendingItemId = ''
    draggingId.value = ''
    dragOverId.value = ''
    dropPosition.value = ''
    targetGroupId = undefined
    lastDragOverSoundTime = 0
    lastDragOverSoundTargetId = ''
  }

  function suppressClick(event) {
    document.removeEventListener('click', suppressClick, true)
    if (!suppressNextClick) return
    suppressNextClick = false
    event.preventDefault()
    event.stopPropagation()
  }

  function cleanup() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf)
      scrollRaf = null
    }
    if (ghostEl) {
      ghostEl.remove()
      ghostEl = null
    }
    document.removeEventListener('click', suppressClick, true)
    suppressNextClick = false
    pendingItem = null
    pendingItemId = ''
    draggingId.value = ''
    dragOverId.value = ''
    dropPosition.value = ''
    targetGroupId = undefined
    lastDragOverSoundTime = 0
    lastDragOverSoundTargetId = ''
  }

  onUnmounted(cleanup)

  return { draggingId, dragOverId, dropPosition, startDrag, cleanup }
}
