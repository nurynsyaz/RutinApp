<script setup lang="ts">
import { AVATAR_MAX_BYTES, checkAvatar } from '../domain/avatar'

// PR-03: the photo on the Profile screen, with Change photo (and Remove photo once there is one).
// A picked file is checked first, then cropped in a dialog, and only then sent up as `save`.
defineProps<{ avatar?: string; initials: string; name: string; busy?: boolean }>()
const emit = defineEmits<{ save: [dataUrl: string]; remove: [] }>()

const { t, te } = useI18n()

const input = ref<HTMLInputElement | null>(null)
const picked = ref<File | null>(null)
const problem = ref('')

const reasonText = (reason: string): string => (te(`errors.${reason}`) ? t(`errors.${reason}`) : t('errors.UNKNOWN'))

function onPick(event: Event): void {
  const element = event.target as HTMLInputElement
  const file = element.files?.[0]
  element.value = ''
  if (!file) return
  const checked = checkAvatar({ name: file.name, mime: file.type, size: file.size })
  if (!checked.ok) {
    problem.value = reasonText(checked.error.reason)
    return
  }
  problem.value = ''
  picked.value = file
}

function onCropped(dataUrl: string): void {
  picked.value = null
  emit('save', dataUrl)
}

function onFailed(): void {
  picked.value = null
  problem.value = reasonText('AVATAR_UNREADABLE')
}
</script>

<template>
  <div class="flex flex-col items-center">
    <img
      v-if="avatar"
      :src="avatar"
      :alt="t('profile.avatar.alt', { name })"
      width="80"
      height="80"
      class="size-20 rounded-full object-cover"
      data-testid="profile-avatar-image"
    >
    <span
      v-else
      class="flex size-20 items-center justify-center rounded-full bg-check text-2xl font-bold text-brand"
      aria-hidden="true"
      data-testid="profile-avatar-initials"
    >
      {{ initials }}
    </span>

    <input
      ref="input"
      type="file"
      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      data-testid="avatar-input"
      @change="onPick"
    >
    <div class="mt-1 flex items-center gap-1">
      <button
        type="button"
        :disabled="busy"
        class="min-h-11 rounded-lg px-3 text-sm font-medium text-brand underline disabled:opacity-60"
        @click="input?.click()"
      >
        {{ t('profile.avatar.change') }}
      </button>
      <button
        v-if="avatar"
        type="button"
        :disabled="busy"
        class="min-h-11 rounded-lg px-3 text-sm font-medium text-slate-700 underline disabled:opacity-60"
        @click="emit('remove')"
      >
        {{ t('profile.avatar.remove') }}
      </button>
    </div>
    <p class="text-xs text-slate-600">{{ t('profile.avatar.hint', { max: AVATAR_MAX_BYTES / (1024 * 1024) }) }}</p>
    <p v-if="problem" role="alert" class="mt-1 text-sm text-danger" data-testid="avatar-problem">{{ problem }}</p>

    <AvatarCropDialog v-if="picked" :file="picked" @confirm="onCropped" @cancel="picked = null" @failed="onFailed" />
  </div>
</template>
