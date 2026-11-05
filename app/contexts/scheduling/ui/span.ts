// 120 -> { h: 2, m: 0 }, 90 -> { h: 1, m: 30 }. The "Free for ..." rows turn this into words.
export function spanParts(minutes: number): { h: number; m: number } {
  const whole = Math.max(0, Math.round(minutes))
  return { h: Math.floor(whole / 60), m: whole % 60 }
}
