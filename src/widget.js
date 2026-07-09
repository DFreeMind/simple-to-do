import { createApp } from 'vue'
import { createPinia } from 'pinia'

function log(message, detail) {
  const text = `[WidgetBoot] ${message}`
  if (detail) {
    console.log(text, detail)
  } else {
    console.log(text)
  }
  const status = document.querySelector('[data-boot-status]')
  if (status) status.textContent = message
}

function showFatal(error) {
  const message = error?.stack || error?.message || String(error)
  console.error('[WidgetBoot] fatal', error)
  document.body.innerHTML = `
    <div class="boot-fatal">
      <strong>小组件启动失败</strong>
      <span>请把下面错误发给开发排查。</span>
      <pre>${escapeHtml(message)}</pre>
    </div>
  `
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

window.addEventListener('error', (event) => {
  showFatal(event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  showFatal(event.reason || 'Unhandled promise rejection')
})

try {
  log('正在加载组件...')
  const { default: WidgetRoot } = await import('./components/widget/WidgetRoot.vue')
  log('正在挂载界面...')
  const app = createApp(WidgetRoot)
  const pinia = createPinia()

  app.config.errorHandler = (error, instance, info) => {
    console.error('[WidgetVueError]', info, error, instance)
    showFatal(error)
  }

  app.use(pinia)
  app.mount('#app')
  log('小组件已启动')
} catch (error) {
  showFatal(error)
}
