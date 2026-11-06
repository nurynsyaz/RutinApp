<script setup lang="ts">
// PR-01: avatar, name, email, role, member since and the three numbers
defineProps<{
  avatar?: string
  avatarBusy?: boolean
  initials: string
  name: string
  email: string
  role: string
  joined: string
  streak: number
  weekPercent: number | null
  routines: number
}>()

const emit = defineEmits<{ saveAvatar: [dataUrl: string]; removeAvatar: [] }>()
const { t } = useI18n()
</script>

<template>
  <section class="rounded-2xl border border-line bg-white p-5">
    <div class="flex flex-col items-center text-center">
      <AvatarPicker
        :avatar="avatar"
        :initials="initials"
        :name="name"
        :busy="avatarBusy"
        @save="emit('saveAvatar', $event)"
        @remove="emit('removeAvatar')"
      />
      <h2 class="mt-3 text-lg font-bold text-slate-900" data-testid="profile-name">{{ name }}</h2>
      <p class="text-sm text-slate-600" data-testid="profile-email">{{ email }}</p>
      <p class="mt-2 flex items-center gap-2 text-sm text-slate-700">
        <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold" data-testid="profile-role">{{ role }}</span>
        <span>{{ joined }}</span>
      </p>
    </div>

    <dl class="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
      <div>
        <dd class="text-xl font-bold text-slate-900" data-testid="stat-streak">{{ streak }}</dd>
        <dt class="text-xs text-slate-600">{{ t('profile.stats.streak') }}</dt>
      </div>
      <div>
        <dd class="text-xl font-bold text-slate-900" data-testid="stat-week">{{ weekPercent === null ? '–' : `${weekPercent}%` }}</dd>
        <dt class="text-xs text-slate-600">{{ t('profile.stats.week') }}</dt>
      </div>
      <div>
        <dd class="text-xl font-bold text-slate-900" data-testid="stat-routines">{{ routines }}</dd>
        <dt class="text-xs text-slate-600">{{ t('profile.stats.routines') }}</dt>
      </div>
    </dl>
  </section>
</template>
