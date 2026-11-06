<script setup lang="ts">
import { useCan } from '~/contexts/identity/ui/use-can'
import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'

const { t } = useI18n()
const can = useCan()
const schedule = useScheduleStore()

const items = computed(() => {
  const list = [
    { to: '/today', label: t('nav.today'), icon: 'lucide:sun' },
    { to: '/week', label: t('nav.week'), icon: 'lucide:calendar' },
    { to: '/files', label: t('nav.files'), icon: 'lucide:folder' },
    { to: '/profile', label: t('nav.profile'), icon: 'lucide:user' },
  ]
  if (can('admin:users:read')) {
    list.push({ to: '/admin/users', label: t('nav.users'), icon: 'lucide:users' })
  }
  return list
})
</script>

<template>
  <div class="min-h-screen bg-surface sm:pl-18 lg:pl-62">
    <aside
      class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] sm:inset-y-0 sm:right-auto sm:flex sm:w-18 sm:flex-col sm:border-r sm:border-t-0 lg:w-62"
    >
      <div class="hidden items-center justify-center gap-2 px-4 py-4 sm:flex lg:justify-start">
        <span class="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
          <BrandMark class="size-5" />
        </span>
        <span class="hidden text-lg font-bold text-slate-900 lg:inline">{{ t('app.name') }}</span>
      </div>

      <nav
        :aria-label="t('nav.label')"
        class="flex justify-around sm:flex-1 sm:flex-col sm:justify-start sm:gap-1 sm:p-2"
      >
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs text-slate-600 sm:flex-row sm:justify-center lg:justify-start lg:gap-3 lg:text-sm"
          active-class="text-brand font-semibold sm:bg-emerald-50"
        >
          <Icon :name="item.icon" class="size-5 shrink-0" />
          <span class="sm:sr-only lg:not-sr-only">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <AccountBlock class="hidden lg:flex" />
    </aside>

    <OfflineBanner :pending="schedule.pending" />

    <main class="p-4 pb-24 sm:pb-4">
      <slot />
    </main>

    <SignOutDialog :unsynced="schedule.pending" />
  </div>
</template>
