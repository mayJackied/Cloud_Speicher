<template>
  <ArchiveFrame>
    <div class="set">
      <aside class="set__nav">
        <p class="arc-kicker">ARCHIVAL_CLOUD</p>
        <button type="button" :class="{ 'is-on': tab === 'about' }" @click="tab = 'about'">
          {{ t('settings.about') }}
        </button>
        <button type="button" :class="{ 'is-on': tab === 'language' }" @click="tab = 'language'">
          {{ t('settings.language') }}
        </button>
        <button type="button" :class="{ 'is-on': tab === 'display' }" @click="tab = 'display'">
          {{ t('settings.display') }}
        </button>
        <button type="button" :class="{ 'is-on': tab === 'connection' }" @click="tab = 'connection'">
          {{ t('settings.connection') }}
        </button>
        <button type="button" :class="{ 'is-on': tab === 'account' }" @click="tab = 'account'">
          {{ t('settings.account') }}
        </button>
        <router-link class="set__back" to="/drive">{{ t('settings.back') }}</router-link>
      </aside>

      <main class="set__main">
        <h1>{{ t('settings.title') }}</h1>

        <section v-if="tab === 'about'">
          <p class="set__lead">{{ t('settings.aboutLead') }}</p>
          <dl class="set__meta">
            <div>
              <dt>{{ t('settings.product') }}</dt>
              <dd>{{ t('settings.productName') }}</dd>
            </div>
            <div>
              <dt>{{ t('settings.version') }}</dt>
              <dd>0.0.0</dd>
            </div>
            <div>
              <dt>{{ t('settings.encoding') }}</dt>
              <dd>{{ t('settings.encodingValue') }}</dd>
            </div>
            <div>
              <dt>{{ t('settings.stack') }}</dt>
              <dd>{{ t('settings.stackValue') }}</dd>
            </div>
            <div>
              <dt>{{ t('settings.locales') }}</dt>
              <dd>{{ t('settings.localesValue') }}</dd>
            </div>
          </dl>
        </section>

        <section v-else-if="tab === 'language'">
          <p class="set__lead">{{ t('settings.languageHint') }}</p>
          <div class="set__langs">
            <button
              v-for="code in LOCALES"
              :key="code"
              type="button"
              :class="{ 'is-on': locale === code }"
              @click="setLocale(code)"
            >
              {{ t(`lang.${code}`) }}
            </button>
          </div>
        </section>

        <section v-else-if="tab === 'display'">
          <p class="set__lead">{{ t('settings.thumbnailsHint') }}</p>
          <div class="set__langs">
            <button type="button" :class="{ 'is-on': prefs.thumbnails }" @click="prefs.setThumbnails(true)">
              {{ t('settings.thumbnailsOn') }}
            </button>
            <button type="button" :class="{ 'is-on': !prefs.thumbnails }" @click="prefs.setThumbnails(false)">
              {{ t('settings.thumbnailsOff') }}
            </button>
          </div>
        </section>

        <section v-else-if="tab === 'connection'">
          <p class="set__lead">{{ t('settings.connectionHint') }}</p>
          <p class="set__lead">{{ t('drive.sync') }}: {{ syncLabel }} · {{ pillLabel }}</p>
          <div class="set__langs">
            <button type="button" :class="{ 'is-on': apiMode === 'offline' }" @click="setMode('offline')">
              {{ t('settings.connectionOffline') }}
            </button>
            <button type="button" :class="{ 'is-on': apiMode === 'online' }" @click="setMode('online')">
              {{ t('settings.connectionOnline') }}
            </button>
          </div>
        </section>

        <section v-else class="set__danger">
          <p>{{ t('settings.operator') }}: {{ auth.user?.name }} / ID {{ auth.user?.userId }}{{ auth.user?.isAdmin ? ' / ADMIN' : '' }}</p>
          <p class="set__lead">{{ t('settings.deleteLead') }}</p>
          <p>
            <label>
              {{ t('settings.confirmName') }}
              <input v-model="confirmName" autocomplete="off" />
            </label>
          </p>
          <p>
            <button type="button" :disabled="loading" @click="onDelete">{{ t('settings.purge') }}</button>
          </p>
          <p v-if="message" class="set__msg">{{ message }}</p>
        </section>
      </main>
    </div>
  </ArchiveFrame>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import ArchiveFrame from '@/components/drive/ArchiveFrame.vue'
import { deleteUser } from '@/api/auth'
import { useApiLink } from '@/composables/useApiLink'
import { useI18n } from '@/composables/useI18n'
import { LOCALES } from '@/i18n/messages'
import { isResultShape } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import { usePrefsStore } from '@/stores/prefs'
import { ErrorCode, messageForCode } from '@/types/errorCode'

type Tab = 'about' | 'language' | 'display' | 'connection' | 'account'

const auth = useAuthStore()
const prefs = usePrefsStore()
const router = useRouter()
const { t, locale, setLocale } = useI18n()
const { mode: apiMode, setMode, syncLabel, pillLabel } = useApiLink()
const tab = ref<Tab>('about')
const confirmName = ref('')
const loading = ref(false)
const message = ref('')

async function onDelete() {
  const expected = auth.user?.name ?? ''
  if (!expected || confirmName.value.trim() !== expected) {
    message.value = t('settings.confirmMismatch')
    return
  }
  loading.value = true
  message.value = ''
  try {
    const { data } = await deleteUser()
    if (!isResultShape(data)) {
      message.value = messageForCode(ErrorCode.EXCEPTION)
      return
    }
    if (data.code !== ErrorCode.OK) {
      message.value = messageForCode(data.code)
      return
    }
    auth.logout()
    await router.push({ name: 'login' })
  } catch (error) {
    if (isAxiosError(error) && error.response && isResultShape(error.response.data)) {
      message.value = messageForCode(error.response.data.code)
      return
    }
    message.value = t('auth.offline')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.set {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: 13.5rem minmax(0, 1fr);
  min-height: 100vh;
}

.set__nav {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.4rem 1.1rem 1.4rem 1.5rem;
  border-right: 1px solid var(--arc-line);
}

.set__nav button,
.set__back {
  padding: 0.35rem 0;
  border: 0;
  background: none;
  color: rgb(235 244 246 / 62%);
  font: inherit;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.set__nav button.is-on {
  color: var(--arc-lime);
}

.set__back {
  margin-top: auto;
  color: var(--arc-chem);
}

.set__main {
  padding: 1.4rem 1.6rem 2rem;
}

.set__main h1 {
  margin: 0 0 1.1rem;
  font-family: var(--arc-display);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.set__lead {
  max-width: 40rem;
  color: rgb(235 244 246 / 72%);
  line-height: 1.55;
}

.set__meta {
  display: grid;
  gap: 0.75rem;
  margin: 1.25rem 0 0;
  max-width: 40rem;
}

.set__meta div {
  display: grid;
  grid-template-columns: 8rem 1fr;
  gap: 0.6rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--arc-line);
  font-size: 12px;
  letter-spacing: 0.06em;
}

.set__meta dt {
  color: rgb(235 244 246 / 42%);
}

.set__meta dd {
  margin: 0;
}

.set__langs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.set__langs button {
  padding: 0.55rem 0.9rem;
  border: 1px solid var(--arc-line);
  background: transparent;
  color: var(--arc-ink);
  font: inherit;
  letter-spacing: 0.1em;
  cursor: pointer;
}

.set__langs button.is-on,
.set__langs button:hover {
  border-color: var(--arc-lime);
  color: var(--arc-lime);
}

.set__danger input {
  display: block;
  width: min(22rem, 100%);
  margin-top: 0.35rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--arc-line);
  border-radius: 0;
  background: #081923;
  color: var(--arc-ink);
  font: inherit;
}

.set__danger > p > button {
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--arc-line);
  background: transparent;
  color: var(--arc-ink);
  font: inherit;
  cursor: pointer;
}

.set__msg {
  color: var(--arc-chem);
}

@media (max-width: 1023px) {
  .set {
    grid-template-columns: 1fr;
  }

  .set__nav {
    flex-direction: row;
    flex-wrap: wrap;
    border-right: 0;
    border-bottom: 1px solid var(--arc-line);
  }

  .set__back {
    margin-top: 0;
  }
}
</style>
