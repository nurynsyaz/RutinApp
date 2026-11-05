// Routine model from BRD section 9 (seed example) and SC-03.
export const CATEGORIES = ['health', 'work', 'personal', 'rest'] as const
export type Category = (typeof CATEGORIES)[number]

// Not in BRD, my choice: weekdays are numbered 1 to 7, Monday first (Sunday is 7)
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7]

// SC-03: once, daily, weekdays or custom days. A date is a plain YYYY-MM-DD string.
export type Repeat =
  | { kind: 'once'; date: string }
  | { kind: 'daily' }
  | { kind: 'weekdays' }
  | { kind: 'custom'; days: Weekday[] }

// What the editor form collects (SC-03)
export interface RoutineInput {
  title: string
  category: Category
  start: string // HH:mm
  durationMin: number
  repeat: Repeat
  reminderMin: number // stored only, nothing fires yet
  notes: string
}

// SC-05: "This day only" and "This and following days" need a routine to stop on a day, start on a
// day, or skip single days. Nothing here is typed in the editor, so it is not part of RoutineInput.
// Not in BRD, my choice: how the two choices are stored.
export interface RoutineSpan {
  // First day the routine applies (inclusive). Missing means it has always applied.
  startsOn?: string
  // Last day the routine applies (inclusive). Missing means it never ends.
  endsOn?: string
  // Single days that were removed or changed with "This day only"
  skipDates?: string[]
}

export interface Routine extends RoutineInput, RoutineSpan {
  id: string
  ownerId: string
  attachmentIds: string[]
}
