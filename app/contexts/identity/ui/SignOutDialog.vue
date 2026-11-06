<script setup lang="ts">
import { useIdentityStore } from '../application/identity-store'
import { useSignOutDialog } from './use-sign-out-dialog'

// BRD ID-06 and S-11: dialog on desktop, bottom sheet on mobile, with a confirm step.
// `unsynced` is the number of queued offline completions that would be lost (SH-01).
const props = withDefaults(defineProps<{ unsynced?: number }>(), { unsynced: 0 })

const { t } = useI18n()
const identity = useIdentityStore()
const { open, hide } = useSignOutDialog()

const panel = ref<HTMLElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)
const signingOut = ref(false)
let previouslyFocused: HTMLElement | null = null

watch(open, async (isOpen) => {
  if (isOpen) {
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.classList.add('overflow-hidden')
    await nextTick()
    cancelButton.value?.focus()
  }
  else {
    document.body.classList.remove('overflow-hidden')
    previouslyFocused?.focus()
    previouslyFocused = null
  }
})

onBeforeUnmount(() => document.body.classList.remove('overflow-hidden'))

async function confirm() {
  if (signingOut.value) return
  signingOut.value = true
  try {
    await identity.signOut('user')
  }
  finally {
    signingOut.value = false
    hide()
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !signingOut.value) {
    hide()
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  const buttons = Array.from(panel.value.querySelectorAll<HTMLElement>('button:not([disabled])'))
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  }
  else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50" @keydown="onKeydown">
      <div class="absolute inset-0 bg-slate-900/50" aria-hidden="true" @click="signingOut ? undefined : hide()" />

      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-title"
        aria-describedby="signout-body"
        class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-5"
      >
        <span class="mx-auto mb-4 block h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />

        <span class="flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
          <Icon name="lucide:log-out" class="size-5" />
        </span>

        <h2 id="signout-title" class="mt-3 text-lg font-bold text-slate-900">
          {{ t('identity.signOut.confirm.title') }}
        </h2>
        <p id="signout-body" class="mt-1 text-sm text-slate-600">
          <span class="sm:hidden">{{ t('identity.signOut.confirm.bodyPhone') }}</span>
          <span class="hidden sm:inline">{{ t('identity.signOut.confirm.body') }}</span>
        </p>

        <div
          v-if="props.unsynced > 0"
          role="alert"
          class="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <Icon name="lucide:triangle-alert" class="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>{{ t('identity.signOut.confirm.unsyncedTitle', { count: props.unsynced }, props.unsynced) }}</strong>
            {{ t('identity.signOut.confirm.unsyncedBody', { count: props.unsynced }, props.unsynced) }}
          </p>
        </div>

        <div class="mt-5 flex flex-col gap-2 sm:flex-row-reverse sm:justify-start sm:gap-3">
          <button
            type="button"
            class="h-11 rounded-lg bg-danger px-5 text-sm font-semibold text-white disabled:opacity-60"
            :disabled="signingOut"
            @click="confirm"
          >
            {{ t('identity.signOut.cta') }}
          </button>
          <button
            ref="cancelButton"
            type="button"
            class="h-11 rounded-lg border border-line bg-white px-5 text-sm font-semibold text-slate-900 disabled:opacity-60"
            :disabled="signingOut"
            @click="hide()"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
