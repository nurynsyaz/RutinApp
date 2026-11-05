import { describe, it, expect } from 'vitest'
import { initialsOf } from './initials'

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('Aina Member')).toBe('AM')
    expect(initialsOf('  nur  aina binti ali ')).toBe('NA')
  })

  it('works with one word and with nothing', () => {
    expect(initialsOf('Sara')).toBe('S')
    expect(initialsOf('   ')).toBe('')
  })
})
