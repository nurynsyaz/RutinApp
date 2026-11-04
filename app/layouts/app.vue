<script setup lang="ts">
import { useCan } from '~/contexts/identity/ui/use-can'

const { t } = useI18n()
const can = useCan()

const items = computed(() => {
  const list = [
    { to: '/today', label: t('nav.today'), icon: 'lucide:calendar-check' },
    { to: '/week', label: t('nav.week'), icon: 'lucide:calendar-days' },
    { to: '/files', label: t('nav.files'), icon: 'lucide:paperclip' },
    { to: '/profile', label: t('nav.profile'), icon: 'lucide:user' },
  ]
  if (can('admin:users:read')) {
    list.push({ to: '/admin/users', label: t('nav.users'), icon: 'lucide:users' })
  }
  return list
})
</script>

<template>
  <div class="min-h-screen bg-surface sm:pl-[72px] lg:pl-[248px]">
    <nav
      class="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:inset-y-0 sm:right-auto sm:w-[72px] sm:flex-col sm:justify-start sm:gap-1 sm:border-r sm:border-t-0 sm:p-2 lg:w-[248px]"
    >
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs text-slate-600 sm:flex-row lg:justify-start lg:gap-3 lg:text-sm"
        active-class="text-brand font-semibold"
      >
        <Icon :name="item.icon" class="size-5 shrink-0" />
        <span class="sm:sr-only lg:not-sr-only">{{ item.label }}</span>
      </NuxtLink>
    </nav>
    <main class="p-4 pb-24 sm:pb-4">
      <slot />
    </main>
  </div>
</template>
