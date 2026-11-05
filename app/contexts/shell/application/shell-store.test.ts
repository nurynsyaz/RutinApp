import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useShellStore } from './shell-store'

describe('shell store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('adds and dismisses toasts', () => {
    const shell = useShellStore()
    const a = shell.notify({ kind: 'info', title: 'A' })
    const b = shell.notify({ kind: 'error', title: 'B' })
    expect(shell.toasts.map((t) => t.title)).toEqual(['A', 'B'])
    shell.dismiss(a)
    expect(shell.toasts.map((t) => t.id)).toEqual([b])
  })

  it('reset clears toasts but keeps the language', () => {
    const shell = useShellStore()
    shell.setLocale('ms')
    shell.notify({ kind: 'info', title: 'A' })
    shell.reset()
    expect(shell.toasts).toEqual([])
    expect(shell.locale).toBe('ms')
  })
})
