<script setup lang="ts">
import { useIdentityStore } from '~/contexts/identity/application/identity-store'
import { initialsOf } from '~/contexts/identity/ui/initials'
import { useProfileStore } from '~/contexts/profile/application/profile-store'
import type { ProfileChanges } from '~/contexts/profile/domain/profile'
import { formatDayTitle } from '~/contexts/scheduling/ui/format'
import { useShellStore } from '~/contexts/shell/application/shell-store'

definePageMeta({ layout: 'app' })

const { t, te, locale, loadLocaleMessages } = useI18n()
const identity = useIdentityStore()
const profile = useProfileStore()
const shell = useShellStore()
const stats = useProfileStats()
useHead({ title: () => t('nav.profile') })

const errors = ref<Record<string, string>>({})

// PR-01: "Joined Aug 2026"
const joined = computed(() => {
  const since = profile.profile?.memberSince
  if (!since) return ''
  const text = new Intl.DateTimeFormat(locale.value === 'ms' ? 'ms-MY' : 'en-MY', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${since}T00:00:00Z`))
  return t('profile.joined', { date: text })
})

// The language choice shows the same day in both languages
const sampleDate = '2026-11-03'
const samples = { en: formatDayTitle(sampleDate, 'en'), ms: formatDayTitle(sampleDate, 'ms') }

const reasonText = (reason: string): string => (te(`errors.${reason}`) ? t(`errors.${reason}`) : t('errors.UNKNOWN'))

async function save(changes: ProfileChanges): Promise<void> {
  errors.value = {}
  const result = await profile.save(changes)
  if (result.ok) {
    // The language may have just changed, so the toast is written in the saved language
    await loadLocaleMessages(result.value.language)
    shell.notify({ kind: 'success', title: t('profile.saved', {}, { locale: result.value.language }) })
    return
  }
  if (result.error.field) errors.value = { [result.error.field]: reasonText(result.error.reason) }
  else shell.notify({ kind: 'error', title: t('profile.saveFailed'), body: reasonText(result.error.reason) })
}

// PR-03: the photo is cropped in the editor dialog, then saved here
async function saveAvatar(dataUrl: string): Promise<void> {
  const result = await profile.setAvatar(dataUrl)
  if (result.ok) shell.notify({ kind: 'success', title: t('profile.avatar.saved') })
  else shell.notify({ kind: 'error', title: t('profile.avatar.saveFailed'), body: reasonText(result.error.reason) })
}

async function removeAvatar(): Promise<void> {
  const result = await profile.setAvatar(null)
  if (result.ok) shell.notify({ kind: 'success', title: t('profile.avatar.removed') })
  else shell.notify({ kind: 'error', title: t('profile.avatar.saveFailed'), body: reasonText(result.error.reason) })
}

function retry(): void {
  if (identity.user) void profile.load(identity.user.id)
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <header>
      <h1 class="text-2xl font-bold text-slate-900">{{ t('nav.profile') }}</h1>
      <p class="mt-1 text-sm text-slate-600">{{ t('profile.subtitle') }}</p>
    </header>

    <p v-if="profile.status === 'idle' || (profile.status === 'loading' && !profile.profile)" role="status" class="mt-6 text-sm text-slate-600">
      {{ t('profile.loading') }}
    </p>

    <div v-else-if="!profile.profile" role="alert" class="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <p>{{ t('profile.loadFailed') }}</p>
      <button type="button" class="mt-2 min-h-11 rounded-lg border border-rose-300 px-4 font-medium" @click="retry">{{ t('common.retry') }}</button>
    </div>

    <div v-else class="mt-6 grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div class="space-y-4">
        <ProfileHeader
          :avatar="profile.profile.avatar"
          :avatar-busy="profile.savingAvatar"
          :initials="initialsOf(profile.profile.name)"
          :name="profile.profile.name"
          :email="profile.profile.email"
          :role="t(`profile.roles.${profile.profile.role}`)"
          :joined="joined"
          :streak="stats.streak"
          :week-percent="stats.weekPercent"
          :routines="stats.routines"
          @save-avatar="saveAvatar"
          @remove-avatar="removeAvatar"
        />
        <SessionCard />
      </div>
      <ProfileForm :profile="profile.profile" :saving="profile.saving" :errors="errors" :samples="samples" @save="save" />
    </div>
  </div>
</template>
