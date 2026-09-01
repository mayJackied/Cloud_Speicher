import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initApiMode } from '@/composables/useApiMode'
import { useLocaleStore } from '@/stores/locale'
import './assets/styles/fonts.css'
import './assets/styles/archive.css'
import './style.scss'

initApiMode()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
useLocaleStore(pinia).hydrate()
app.use(router)
app.use(ElementPlus)
app.mount('#app')
