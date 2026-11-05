import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { parseWith } from './validation'

const schema = z.object({
  name: z.string().min(1, 'NAME_INVALID'),
  age: z.number().min(18, 'TOO_YOUNG').max(99, 'TOO_OLD'),
})

describe('parseWith', () => {
  it('returns the parsed value when valid', () => {
    expect(parseWith(schema, { name: 'Aina', age: 30 })).toEqual({
      ok: true,
      value: { name: 'Aina', age: 30 },
    })
  })

  it('returns one reason code per field', () => {
    expect(parseWith(schema, { name: '', age: 5 })).toEqual({
      ok: false,
      error: { name: 'NAME_INVALID', age: 'TOO_YOUNG' },
    })
  })
})
