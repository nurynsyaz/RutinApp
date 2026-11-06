<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const showcase = computed(() => route.meta.showcase === true)

const sample = computed(() => [
  { time: '06:30', label: t('shell.brand.sample.morningRun'), done: true, tone: 'bg-emerald-100 text-emerald-900' },
  { time: '08:30', label: t('shell.brand.sample.deepWork'), done: true, tone: 'bg-indigo-100 text-indigo-900' },
  { time: '10:00', label: t('shell.brand.sample.standup'), done: false, tone: 'bg-indigo-100 text-indigo-900' },
  { time: '22:00', label: t('shell.brand.sample.readPages'), done: false, tone: 'bg-amber-100 text-amber-900' },
])
</script>

<template>
  <div class="min-h-screen bg-surface lg:flex">
    <aside class="hidden bg-brand-deep px-10 py-10 text-white lg:flex lg:w-1/3 lg:flex-col">
      <div class="flex items-center gap-3">
        <span class="flex size-8 items-center justify-center rounded-lg bg-white text-brand">
          <BrandMark class="size-5" />
        </span>
        <span class="text-lg font-bold">{{ t('app.name') }}</span>
      </div>

      <div class="flex flex-1 flex-col justify-center">
        <h2 class="max-w-[12ch] text-4xl font-bold leading-tight">{{ t('shell.brand.tagline') }}</h2>
        <p class="mt-4 max-w-[34ch] text-base text-emerald-50">{{ t('shell.brand.subtitle') }}</p>

        <ul
          v-if="showcase"
          class="mt-8 space-y-2 rounded-2xl border border-white/15 bg-white/5 p-4"
          aria-hidden="true"
        >
          <li v-for="item in sample" :key="item.time" class="flex items-center gap-3">
            <span class="w-11 font-mono text-xs text-emerald-100">{{ item.time }}</span>
            <span class="flex flex-1 items-center justify-between rounded-md px-3 py-1.5 text-sm font-semibold" :class="item.tone">
              {{ item.label }}
              <Icon v-if="item.done" name="lucide:check" class="size-4" />
            </span>
          </li>
        </ul>
      </div>

      <p class="text-sm text-emerald-100">{{ t('shell.brand.demoNote') }}</p>
    </aside>

    <div class="flex min-h-screen flex-1 flex-col">
      <OfflineBanner />

      <header
        class="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:border-0 lg:bg-transparent lg:px-10 lg:pt-6"
      >
        <div class="flex items-center gap-2 lg:invisible">
          <span class="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
            <BrandMark class="size-5" />
          </span>
          <span class="text-lg font-bold text-slate-900">{{ t('app.name') }}</span>
        </div>
        <LanguageToggle />
      </header>

      <main class="flex flex-1 justify-center px-4 py-6 lg:items-center lg:py-10">
        <div class="w-full max-w-sm">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
