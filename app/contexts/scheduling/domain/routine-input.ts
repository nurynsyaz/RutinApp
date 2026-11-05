import { z } from 'zod'
import { isValidDate } from './dates'
import { CATEGORIES, WEEKDAYS } from './routine'

// SC-03. The messages are reason codes, the UI shows errors.<reason> in the active language.
const titleSchema = z.string().trim().min(1, 'TITLE_INVALID').max(60, 'TITLE_INVALID')

const categorySchema = z.enum(CATEGORIES, { error: 'CATEGORY_INVALID' })

const startSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'START_INVALID')

// 5 to 480 minutes in steps of 5
const durationSchema = z
  .number('DURATION_INVALID')
  .int('DURATION_INVALID')
  .min(5, 'DURATION_INVALID')
  .max(480, 'DURATION_INVALID')
  .refine((value) => value % 5 === 0, 'DURATION_INVALID')

const weekdaySchema = z.number().refine((value) => (WEEKDAYS as readonly number[]).includes(value), 'REPEAT_INVALID')

const repeatSchema = z.discriminatedUnion(
  'kind',
  [
    z.object({ kind: z.literal('once'), date: z.string().refine(isValidDate, 'REPEAT_INVALID') }),
    z.object({ kind: z.literal('daily') }),
    z.object({ kind: z.literal('weekdays') }),
    z.object({
      kind: z.literal('custom'),
      days: z
        .array(weekdaySchema, 'REPEAT_INVALID')
        .min(1, 'REPEAT_INVALID')
        .refine((days) => new Set(days).size === days.length, 'REPEAT_INVALID'),
    }),
  ],
  { error: 'REPEAT_INVALID' },
)

// Not in BRD, my choice: the reminder is a whole number of minutes before the start, 0 means none
const reminderSchema = z
  .number('REMINDER_INVALID')
  .int('REMINDER_INVALID')
  .min(0, 'REMINDER_INVALID')
  .max(1440, 'REMINDER_INVALID')

const notesSchema = z.string().max(500, 'NOTES_TOO_LONG')

export const routineInputSchema = z.object({
  title: titleSchema,
  category: categorySchema,
  start: startSchema,
  durationMin: durationSchema,
  repeat: repeatSchema,
  reminderMin: reminderSchema,
  notes: notesSchema,
})
