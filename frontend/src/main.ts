import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setSessionKickHook } from '@/api/client'
import { initApiMode } from '@/composables/useApiMode'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore } from '@/stores/locale'
import './assets/styles/archive.css'
import './style.scss'

initApiMode()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
useLocaleStore(pinia).hydrate()
setSessionKickHook(() => {
  useAuthStore(pinia).logout()
})
app.use(router)
app.mount('#app')
