import type { DayItem, DaySchedule } from './day-schedule'

// Not in BRD, my choice: a "Free for ..." row appears for a gap of an hour or more
export const MIN_GAP_MIN = 60

export type TimelineEntry =
  | { kind: 'item'; item: DayItem }
  | { kind: 'gap'; fromMin: number; toMin: number }
  | { kind: 'now'; minute: number }

// SC-01: the day as rows for the timeline: routines in time order, free gaps, and the
// current-time line. Pass nowMin as null when the day shown is not today (no line).
export function buildTimeline(day: DaySchedule, nowMin: number | null): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  let latestEnd: number | null = null
  let nowPlaced = nowMin === null

  const placeNow = () => {
    if (nowMin !== null) entries.push({ kind: 'now', minute: nowMin })
    nowPlaced = true
  }

  for (const item of day.items) {
    const gap =
      latestEnd !== null && item.startMin - latestEnd >= MIN_GAP_MIN
        ? ({ kind: 'gap', fromMin: latestEnd, toMin: item.startMin } as const)
        : null

    if (nowMin !== null && !nowPlaced && item.startMin > nowMin) {
      // The line goes before the gap when it is still in the earlier routine, inside it otherwise
      if (gap && nowMin > gap.fromMin) {
        entries.push(gap)
        placeNow()
      } else {
        placeNow()
        if (gap) entries.push(gap)
      }
    } else if (gap) {
      entries.push(gap)
    }

    entries.push({ kind: 'item', item })
    latestEnd = latestEnd === null ? item.endMin : Math.max(latestEnd, item.endMin)
  }

  if (!nowPlaced) placeNow()
  return entries
}

export interface UpNext {
  item: DayItem
  // null when it has already started
  startsInMin: number | null
}

// The "Up next" card: the first routine that is not done and has not finished yet
export function upNext(day: DaySchedule, nowMin: number): UpNext | null {
  const item = day.items.find((candidate) => !candidate.done && candidate.endMin > nowMin)
  if (!item) return null
  return { item, startsInMin: item.startMin > nowMin ? item.startMin - nowMin : null }
}
