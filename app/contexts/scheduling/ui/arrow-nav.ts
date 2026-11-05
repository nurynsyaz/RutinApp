// NFR: the arrow keys move between the routines in the timeline.
// Returns the index to focus next, or null when the key does nothing (wrong key, or already at the end).
export function nextFocusIndex(current: number, count: number, key: string): number | null {
  if (current < 0 || count === 0) return null
  const target =
    key === 'ArrowDown' ? current + 1 : key === 'ArrowUp' ? current - 1 : key === 'Home' ? 0 : key === 'End' ? count - 1 : null
  if (target === null || target < 0 || target >= count || target === current) return null
  return target
}
