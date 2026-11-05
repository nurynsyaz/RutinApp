<script setup lang="ts">
import { useScheduleStore } from '../application/schedule-store'
import { isValidDate } from '../domain/dates'
import type { Routine, RoutineInput } from '../domain/routine'
import { emptyRoutineInput, formErrors, inputOf } from '../domain/routine-form'
import { trapTab } from './focus-trap'
import { DURATION_OPTIONS, REMINDER_OPTIONS } from './field-options'

// S-06: the routine form. A side drawer from tablet up, a full-screen sheet on mobile.
// It checks the form and shows the overlap warning (SC-04). The page saves it.
// Give it a `routine` to edit one (SC-05), leave it out to make a new one (SC-03).
const props = defineProps<{ date: string; routine?: Routine; saving?: boolean }>()
const emit = defineEmits<{ submit: [input: RoutineInput]; delete: []; close: [] }>()

const { t, te } = useI18n()
const schedule = useScheduleStore()

const form = ref<RoutineInput>(props.routine ? inputOf(props.routine) : emptyRoutineInput(props.date))
const submitted = ref(false)
const panel = ref<HTMLElement | null>(null)
const titleField = ref<HTMLInputElement | null>(null)

// Errors show after the first Save, then update while the person fixes the form
const errors = computed(() => (submitted.value ? formErrors(form.value) : {}))
const errorText = (reason?: string) => (reason ? (te(`errors.${reason}`) ? t(`errors.${reason}`) : t('errors.UNKNOWN')) : '')

// SC-04: the day the warning is checked on. A one-time routine uses its own date, the others the day being viewed.
const checkDate = computed(() => (form.value.repeat.kind === 'once' && isValidDate(form.value.repeat.date) ? form.value.repeat.date : props.date))
const clashes = computed(() => schedule.clashesWith(form.value, checkDate.value, props.routine?.id))
const clashTitles = computed(() => clashes.value.map((routine) => routine.title).join(', '))

const reminderLabel = (minutes: number) =>
  minutes === 0
    ? t('scheduling.fields.reminderNone')
    : minutes === 1440
      ? t('scheduling.fields.reminderDay')
      : t('scheduling.fields.reminderBefore', { n: minutes })
const minutesLabel = (minutes: number) => t('scheduling.fields.minutes', { n: minutes })

function save(): void {
  submitted.value = true
  if (Object.keys(formErrors(form.value)).length > 0) return
  emit('submit', { ...form.value, title: form.value.title.trim() })
}

// Esc closes. Tab stays inside the panel while it is open.
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  trapTab(event, panel.value)
}

onMounted(() => titleField.value?.focus())
</script>

<template>
  <div class="fixed inset-0 z-40 flex sm:justify-end sm:bg-slate-900/40" @keydown="onKeydown">
    <div class="absolute inset-0 hidden sm:block" aria-hidden="true" @click="emit('close')" />

    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-title"
      class="relative flex h-full w-full flex-col bg-white shadow-xl sm:w-md"
    >
      <header class="flex items-center justify-between border-b border-line px-4 py-3">
        <h1 id="editor-title" class="text-lg font-bold text-slate-900">{{ routine ? t('scheduling.editor.editTitle') : t('scheduling.editor.newTitle') }}</h1>
        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-lg text-slate-600"
          :aria-label="t('scheduling.editor.close')"
          :title="t('scheduling.editor.close')"
          @click="emit('close')"
        >
          <Icon name="lucide:x" class="size-5" />
        </button>
      </header>

      <form id="routine-form" class="flex-1 space-y-5 overflow-y-auto px-4 py-5" novalidate @submit.prevent="save">
        <div>
          <label for="routine-title" class="mb-1 block text-sm font-medium text-slate-900">{{ t('scheduling.field.title') }}</label>
          <input
            id="routine-title"
            ref="titleField"
            v-model="form.title"
            type="text"
            maxlength="80"
            autocomplete="off"
            :aria-invalid="Boolean(errors.title)"
            :aria-describedby="errors.title ? 'routine-title-error' : undefined"
            class="h-11 w-full rounded-lg border bg-white px-3 text-base text-slate-900"
            :class="errors.title ? 'border-danger' : 'border-line'"
          >
          <p v-if="errors.title" id="routine-title-error" class="mt-1 text-sm text-danger">{{ errorText(errors.title) }}</p>
        </div>

        <CategoryPicker id="routine-category" v-model="form.category" :error="errors.category" />
        <p v-if="errors.category" id="routine-category-error" class="-mt-3 text-sm text-danger">{{ errorText(errors.category) }}</p>

        <div class="grid grid-cols-2 items-start gap-3">
          <div>
            <TimeField id="routine-start" v-model="form.start" :label="t('scheduling.field.start')" :error="errors.start" />
            <p v-if="errors.start" id="routine-start-error" class="mt-1 text-sm text-danger">{{ errorText(errors.start) }}</p>
          </div>
          <div>
            <NumberSelect
              id="routine-duration"
              v-model="form.durationMin"
              :label="t('scheduling.field.duration')"
              :options="DURATION_OPTIONS"
              :format="minutesLabel"
              :error="errors.durationMin"
            />
            <p v-if="errors.durationMin" class="mt-1 text-sm text-danger">{{ errorText(errors.durationMin) }}</p>
          </div>
        </div>

        <p
          v-if="clashes.length > 0"
          role="status"
          class="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          <Icon name="lucide:triangle-alert" class="mt-0.5 size-4 shrink-0" />
          {{ t('scheduling.overlap.warning', { titles: clashTitles }) }}
        </p>

        <div>
          <RepeatPicker id="routine-repeat" v-model="form.repeat" :date="date" :error="errors.repeat" />
          <p v-if="errors.repeat" id="routine-repeat-error" class="mt-1 text-sm text-danger">{{ errorText(errors.repeat) }}</p>
        </div>

        <div>
          <NumberSelect
            id="routine-reminder"
            v-model="form.reminderMin"
            :label="t('scheduling.field.reminder')"
            :options="REMINDER_OPTIONS"
            :format="reminderLabel"
            :error="errors.reminderMin"
          />
          <p v-if="errors.reminderMin" class="mt-1 text-sm text-danger">{{ errorText(errors.reminderMin) }}</p>
        </div>

        <div>
          <div class="mb-1 flex items-baseline justify-between">
            <label for="routine-notes" class="text-sm font-medium text-slate-900">{{ t('scheduling.field.notes') }}</label>
            <span class="font-mono text-xs text-slate-500">{{ t('scheduling.editor.notesCount', { n: form.notes.length }) }}</span>
          </div>
          <textarea
            id="routine-notes"
            v-model="form.notes"
            rows="4"
            :aria-invalid="Boolean(errors.notes)"
            :aria-describedby="errors.notes ? 'routine-notes-error' : undefined"
            class="w-full rounded-lg border bg-white px-3 py-2 text-base text-slate-900"
            :class="errors.notes ? 'border-danger' : 'border-line'"
          />
          <p v-if="errors.notes" id="routine-notes-error" class="mt-1 text-sm text-danger">{{ errorText(errors.notes) }}</p>
        </div>

      </form>

      <footer class="flex gap-3 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          v-if="routine"
          type="button"
          :disabled="saving"
          class="min-h-11 rounded-lg border border-danger px-3 text-sm font-medium text-danger disabled:opacity-60"
          @click="emit('delete')"
        >
          {{ t('common.delete') }}
        </button>
        <button type="button" class="min-h-11 flex-1 rounded-lg border border-line px-4 text-sm font-medium text-slate-800" @click="emit('close')">
          {{ t('common.cancel') }}
        </button>
        <button
          type="submit"
          form="routine-form"
          :disabled="saving"
          class="min-h-11 flex-1 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {{ saving ? t('scheduling.editor.saving') : t('scheduling.editor.save') }}
        </button>
      </footer>
    </div>
  </div>
</template>
