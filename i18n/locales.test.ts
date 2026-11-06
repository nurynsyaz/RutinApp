import { describe, it, expect } from 'vitest'
import en from './locales/en.json'
import ms from './locales/ms.json'

// BRD section 11: CI fails when a key is missing from either file
function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key))
}

describe('message files', () => {
  it('have the same keys in English and Malay', () => {
    const english = keysOf(en).sort()
    const malay = keysOf(ms).sort()
    expect(malay.filter((key) => !english.includes(key))).toEqual([])
    expect(english.filter((key) => !malay.includes(key))).toEqual([])
  })

  it('have no empty messages', () => {
    for (const file of [en, ms]) {
      for (const key of keysOf(file)) {
        const message = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], file)
        expect(String(message).trim(), key).not.toBe('')
      }
    }
  })

  // SH-04: a Malay message that drops or renames a {placeholder} would show the raw braces to the person
  it('use the same {placeholders} in English and Malay', () => {
    const placeholders = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort()
    const read = (file: unknown, key: string) => String(key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], file))
    for (const key of keysOf(en)) {
      expect(placeholders(read(ms, key)), key).toEqual(placeholders(read(en, key)))
    }
  })

  // SH-04: one word for one thing. The role is "pentadbir" in Malay, never the English "admin".
  it('call the administrator "pentadbir" in Malay', () => {
    for (const key of keysOf(ms)) {
      const message = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], ms)
      expect(String(message), key).not.toMatch(/\badmin\b/i)
    }
  })
})
