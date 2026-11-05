import { describe, expect, it } from 'vitest'
import { spanParts } from './span'

describe('spanParts', () => {
  it('splits minutes into hours and minutes', () => {
    expect(spanParts(120)).toEqual({ h: 2, m: 0 })
    expect(spanParts(90)).toEqual({ h: 1, m: 30 })
    expect(spanParts(45)).toEqual({ h: 0, m: 45 })
  })

  it('never goes below zero', () => {
    expect(spanParts(-5)).toEqual({ h: 0, m: 0 })
  })
})
