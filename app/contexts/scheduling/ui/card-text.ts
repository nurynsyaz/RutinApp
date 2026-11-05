import type { DayItem } from '../domain/day-schedule'
import type { Repeat, Weekday } from '../domain/routine'

export interface RepeatText {
  kind: Repeat['kind']
  // Only for custom days
  days: Weekday[]
}

export interface CardText {
  category: DayItem['routine']['category']
  repeat: RepeatText
  // The last part of the line under the title: "Done", "Starts in 20 min" or nothing
  status: { kind: 'done' } | { kind: 'startsIn'; minutes: number } | null
}

// What the line under the title says ("Health · Weekdays · Done"), as codes the card turns into
// words in the active language. A routine that is done says Done, not when it starts.
export function cardText(item: DayItem, startsInMin: number | null = null): CardText {
  const { repeat } = item.routine
  return {
    category: item.routine.category,
    repeat: { kind: repeat.kind, days: repeat.kind === 'custom' ? repeat.days : [] },
    status: item.done
      ? { kind: 'done' }
      : startsInMin !== null && startsInMin > 0
        ? { kind: 'startsIn', minutes: startsInMin }
        : null,
  }
}
