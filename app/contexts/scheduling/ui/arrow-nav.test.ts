import { describe, expect, it } from 'vitest'
import { nextFocusIndex } from './arrow-nav'

describe('nextFocusIndex', () => {
  it('moves down and up one routine', () => {
    expect(nextFocusIndex(1, 4, 'ArrowDown')).toBe(2)
    expect(nextFocusIndex(1, 4, 'ArrowUp')).toBe(0)
  })

  it('stops at the first and last routine', () => {
    expect(nextFocusIndex(0, 4, 'ArrowUp')).toBeNull()
    expect(nextFocusIndex(3, 4, 'ArrowDown')).toBeNull()
  })

  it('jumps with Home and End', () => {
    expect(nextFocusIndex(2, 4, 'Home')).toBe(0)
    expect(nextFocusIndex(1, 4, 'End')).toBe(3)
  })

  it('ignores other keys and a focus that is not on a routine', () => {
    expect(nextFocusIndex(1, 4, 'Enter')).toBeNull()
    expect(nextFocusIndex(-1, 4, 'ArrowDown')).toBeNull()
    expect(nextFocusIndex(0, 0, 'ArrowDown')).toBeNull()
  })
})
