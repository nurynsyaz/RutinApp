import { describe, it, expect } from 'vitest'
import { addEntry, payloadText, resolveInspector, type InspectorEntry } from './inspector'

const entry = (id: number): InspectorEntry => ({ id, type: 'demo.Done', at: '2026-11-03T10:00:00Z', payload: { id } })

describe('resolveInspector', () => {
  it('is off in a normal build', () => {
    expect(resolveInspector({ dev: false })).toBe(false)
  })
  it('is on in dev', () => {
    expect(resolveInspector({ dev: true })).toBe(true)
  })
  it('?inspector=1 turns it on and the device remembers it', () => {
    expect(resolveInspector({ dev: false, query: '1' })).toBe(true)
    expect(resolveInspector({ dev: false, stored: '1' })).toBe(true)
  })
  it('?inspector=0 turns it off, even in dev or when remembered', () => {
    expect(resolveInspector({ dev: true, stored: '1', query: '0' })).toBe(false)
  })
})

describe('addEntry', () => {
  it('puts the newest first', () => {
    expect(addEntry([entry(1)], entry(2)).map((e) => e.id)).toEqual([2, 1])
  })
  it('keeps only the newest entries', () => {
    const list = addEntry(addEntry(addEntry([], entry(1), 2), entry(2), 2), entry(3), 2)
    expect(list.map((e) => e.id)).toEqual([3, 2])
  })
})

describe('payloadText', () => {
  it('prints the payload as indented JSON', () => {
    expect(payloadText({ a: 1 })).toBe('{\n  "a": 1\n}')
  })
  it('does not throw on a payload that cannot be printed', () => {
    const loop: Record<string, unknown> = {}
    loop.self = loop
    expect(() => payloadText(loop)).not.toThrow()
  })
})
