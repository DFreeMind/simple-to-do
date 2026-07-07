import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/styles.scss'
import { setSoundEnabled } from '@/utils/sound'

const app = createApp(App)

// 全局错误捕获，输出到 console 便于排查白屏问题
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err.message, err.stack)
  console.error('[Component]', instance?.$options?.name || instance?.type?.name || 'unknown')
  console.error('[Info]', info)
}

window.addEventListener('error', (e) => {
  console.error('[Window Error]', e.message, e.filename, e.lineno, e.colno, e.error)
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason)
})

app.use(createPinia())

// 初始化音效设置
// 注意：实际的音效开关状态会在 store 加载时根据用户设置更新
setSoundEnabled(true)

app.mount('#app')
