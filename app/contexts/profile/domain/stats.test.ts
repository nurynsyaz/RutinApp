import { describe, expect, it } from 'vitest'
import { currentStreak, weekCompletion, type DayTally } from './stats'

const day = (date: string, total: number, done: number): DayTally => ({ date, total, done })

describe('currentStreak', () => {
  it('is 0 with no days', () => {
    expect(currentStreak([])).toBe(0)
  })

  it('counts the days in a row where everything was done, ending today', () => {
    const days = [day('1', 3, 3), day('2', 3, 3), day('3', 2, 2)]
    expect(currentStreak(days)).toBe(3)
  })

  it('stops at the first day with something left undone', () => {
    const days = [day('1', 3, 3), day('2', 3, 2), day('3', 3, 3), day('4', 3, 3)]
    expect(currentStreak(days)).toBe(2)
  })

  it('does not break because today is not finished yet', () => {
    const days = [day('1', 2, 2), day('2', 2, 2), day('3', 4, 1)]
    expect(currentStreak(days)).toBe(2)
  })

  it('skips days with no routines without counting or breaking', () => {
    const days = [day('1', 2, 2), day('2', 0, 0), day('3', 0, 0), day('4', 2, 2)]
    expect(currentStreak(days)).toBe(2)
  })

  it('is 0 when yesterday was missed', () => {
    expect(currentStreak([day('1', 2, 2), day('2', 2, 0), day('3', 2, 0)])).toBe(0)
  })
})

describe('weekCompletion', () => {
  it('is the share of routines done', () => {
    expect(weekCompletion([day('1', 4, 4), day('2', 3, 1)])).toBe(71)
  })

  it('is null when nothing was planned', () => {
    expect(weekCompletion([day('1', 0, 0)])).toBeNull()
    expect(weekCompletion([])).toBeNull()
  })

  it('reaches 100', () => {
    expect(weekCompletion([day('1', 2, 2)])).toBe(100)
  })
})
