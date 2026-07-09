import { createApp } from 'vue'
import { createPinia } from 'pinia'
import WidgetRoot from './components/widget/WidgetRoot.vue'

const app = createApp(WidgetRoot)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
