<script setup lang="ts">
import {
  isDirty, LANGUAGES, NAME_MAX, timezoneOptions, toChanges, WEEK_STARTS,
  type Language, type Profile, type ProfileChanges,
} from '../domain/profile'

// PR-02: edit name, language, time zone, day start and week start. The email is read-only.
const props = defineProps<{
  profile: Profile
  saving: boolean
  // Field name to the text shown under that field
  errors: Record<string, string>
  // The same day written in each language, shown under the language choice
  samples: Record<Language, string>
}>()
const emit = defineEmits<{ save: [changes: ProfileChanges] }>()

const { t } = useI18n()
const form = reactive<ProfileChanges>(toChanges(props.profile))
const dirty = computed(() => isDirty(props.profile, form))
const zones = computed(() => timezoneOptions(props.profile.timezone))

// Saved (or loaded again): the form shows what is stored
watch(() => props.profile, (next) => Object.assign(form, toChanges(next)))

function discard(): void {
  Object.assign(form, toChanges(props.profile))
}

const field = 'h-11 w-full rounded-lg border bg-white px-3 text-base text-slate-900'
const border = (name: string) => (props.errors[name] ? 'border-rose-400' : 'border-line')
</script>

<template>
  <form class="rounded-2xl border border-line bg-white p-5" novalidate @submit.prevent="emit('save', { ...form })">
    <h2 class="text-sm font-bold text-slate-900">{{ t('profile.details') }}</h2>

    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label for="profile-name" class="mb-1 block text-sm font-medium text-slate-900">{{ t('profile.fullName') }}</label>
        <input
          id="profile-name"
          v-model="form.name"
          type="text"
          autocomplete="name"
          :maxlength="NAME_MAX + 20"
          :class="[field, border('name')]"
          :aria-invalid="errors.name ? 'true' : undefined"
          :aria-describedby="errors.name ? 'profile-name-error' : undefined"
        >
        <p v-if="errors.name" id="profile-name-error" role="alert" class="mt-1 text-sm text-rose-700">{{ errors.name }}</p>
      </div>

      <div>
        <label for="profile-email" class="mb-1 block text-sm font-medium text-slate-900">{{ t('profile.email') }}</label>
        <input id="profile-email" :value="profile.email" type="email" readonly aria-describedby="profile-email-hint" :class="[field, 'border-line bg-slate-50 text-slate-600']">
        <p id="profile-email-hint" class="mt-1 text-xs text-slate-600">{{ t('profile.emailHint') }}</p>
      </div>
    </div>

    <fieldset class="mt-4">
      <legend class="mb-1 text-sm font-medium text-slate-900">{{ t('profile.language') }}</legend>
      <div class="grid gap-2 sm:grid-cols-2">
        <label
          v-for="language in LANGUAGES"
          :key="language"
          class="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2"
          :class="form.language === language ? 'border-brand bg-emerald-50' : 'border-line'"
        >
          <input v-model="form.language" type="radio" name="profile-language" :value="language" class="mt-1 size-4 accent-brand">
          <span>
            <span class="block text-sm font-medium text-slate-900">{{ t(`profile.languages.${language}`) }}</span>
            <span class="block text-xs text-slate-600">{{ samples[language] }}</span>
          </span>
        </label>
      </div>
      <p v-if="errors.language" role="alert" class="mt-1 text-sm text-rose-700">{{ errors.language }}</p>
    </fieldset>

    <div class="mt-4">
      <label for="profile-timezone" class="mb-1 block text-sm font-medium text-slate-900">{{ t('profile.timezone') }}</label>
      <select id="profile-timezone" v-model="form.timezone" :class="[field, border('timezone')]" :aria-invalid="errors.timezone ? 'true' : undefined">
        <option v-for="zone in zones" :key="zone" :value="zone">{{ zone.replaceAll('_', ' ') }}</option>
      </select>
      <p v-if="errors.timezone" role="alert" class="mt-1 text-sm text-rose-700">{{ errors.timezone }}</p>
    </div>

    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label for="profile-day-start" class="mb-1 block text-sm font-medium text-slate-900">{{ t('profile.dayStart') }}</label>
        <input id="profile-day-start" v-model="form.dayStart" type="time" :class="[field, border('dayStart')]" :aria-invalid="errors.dayStart ? 'true' : undefined">
        <p v-if="errors.dayStart" role="alert" class="mt-1 text-sm text-rose-700">{{ errors.dayStart }}</p>
      </div>
      <div>
        <label for="profile-week-start" class="mb-1 block text-sm font-medium text-slate-900">{{ t('profile.weekStart') }}</label>
        <select id="profile-week-start" v-model="form.weekStart" :class="[field, border('weekStart')]" :aria-invalid="errors.weekStart ? 'true' : undefined">
          <option v-for="day in WEEK_STARTS" :key="day" :value="day">{{ t(`profile.weekStarts.${day}`) }}</option>
        </select>
        <p v-if="errors.weekStart" role="alert" class="mt-1 text-sm text-rose-700">{{ errors.weekStart }}</p>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-xs text-slate-600">{{ t('profile.appliesNote') }}</p>
      <div class="flex gap-3">
        <button
          type="button"
          :disabled="!dirty || saving"
          class="min-h-11 rounded-lg border border-line px-4 text-sm font-medium text-slate-800 disabled:opacity-50"
          @click="discard"
        >
          {{ t('profile.discard') }}
        </button>
        <button
          type="submit"
          :disabled="!dirty || saving"
          class="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {{ saving ? t('profile.saving') : t('profile.save') }}
        </button>
      </div>
    </div>
  </form>
</template>
