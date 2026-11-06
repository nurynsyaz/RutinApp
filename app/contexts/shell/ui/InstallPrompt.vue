<script setup lang="ts">
import { IOS_HINT_KEY, shouldShowIosHint } from '../application/install-hint'

// SH-02: asks to install the app where the browser supports it, and on iPhone and iPad (Safari) shows
// how to add it to the Home Screen. Both can be closed with "Not now" and then stay closed on this device.
const { t } = useI18n()
const { $pwa } = useNuxtApp()

const iosHidden = ref(false)
const iosHint = ref(false)

onMounted(() => {
  let hidden = false
  try {
    hidden = localStorage.getItem(IOS_HINT_KEY) === 'true'
  }
  catch {
    // storage blocked: the hint shows each visit
  }
  iosHidden.value = hidden
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  iosHint.value = shouldShowIosHint({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, standalone, hidden })
})

function closeIosHint(): void {
  iosHint.value = false
  try {
    localStorage.setItem(IOS_HINT_KEY, 'true')
  }
  catch {
    // storage blocked: it shows again next visit
  }
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-4 bottom-20 z-40 sm:inset-x-auto sm:bottom-4 sm:left-22 sm:w-96 lg:left-66">
    <section
      v-if="$pwa?.showInstallPrompt"
      role="region"
      aria-labelledby="install-title"
      data-testid="install-prompt"
      class="pointer-events-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
    >
      <h2 id="install-title" class="text-sm font-semibold text-slate-900">
        <span class="sm:hidden">{{ t('shell.install.titlePhone') }}</span>
        <span class="hidden sm:inline">{{ t('shell.install.title') }}</span>
      </h2>
      <p class="mt-1 text-sm text-slate-600">{{ t('shell.install.body') }}</p>
      <div class="mt-3 flex gap-2">
        <button type="button" class="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white" @click="$pwa?.install()">
          {{ t('shell.install.cta') }}
        </button>
        <button type="button" class="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold text-slate-900" @click="$pwa?.cancelInstall()">
          {{ t('shell.install.later') }}
        </button>
      </div>
    </section>

    <section
      v-else-if="iosHint && !iosHidden"
      role="region"
      aria-labelledby="ios-hint-title"
      data-testid="ios-hint"
      class="pointer-events-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
    >
      <h2 id="ios-hint-title" class="text-sm font-semibold text-slate-900">{{ t('shell.install.ios.title') }}</h2>
      <ol class="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>{{ t('shell.install.ios.step1') }}</li>
        <li>{{ t('shell.install.ios.step2') }}</li>
      </ol>
      <button type="button" class="mt-3 min-h-11 rounded-lg border border-line px-4 text-sm font-semibold text-slate-900" @click="closeIosHint">
        {{ t('shell.install.later') }}
      </button>
    </section>
  </div>
</template>
