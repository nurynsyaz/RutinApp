import { describe, it, expect } from 'vitest'
import { newId } from './ids'

describe('newId', () => {
  it('returns a valid UUID', () => {
    expect(newId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('returns a different id each time', () => {
    expect(newId()).not.toBe(newId())
  })
})