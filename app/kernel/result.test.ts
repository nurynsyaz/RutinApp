import { describe, it, expect } from 'vitest'
import { ok, err } from './result'

describe('result', () => {
    it('ok wraps a value', () => {
        expect(ok(5)).toEqual({ ok: true, value: 5 })
    })

    it('err wraps an error', () => {
        const error = new Error('boom')
        expect(err(error)).toEqual({ ok: false, error })
  })
})