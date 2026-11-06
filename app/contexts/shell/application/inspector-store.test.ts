import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInspectorStore } from './inspector-store'

describe('inspector store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts off and closed', () => {
    const store = useInspectorStore()
    expect(store.enabled).toBe(false)
    expect(store.open).toBe(false)
  })

  it('records events newest first, with the payload', () => {
    const store = useInspectorStore()
    store.record('identity.SignedIn', { userId: 'u1' })
    store.record('scheduling.RoutineCreated', { routineId: 'r1' })
    expect(store.entries.map((e) => e.type)).toEqual(['scheduling.RoutineCreated', 'identity.SignedIn'])
    expect(store.entries[1]?.payload).toEqual({ userId: 'u1' })
  })

  it('clear empties the list and turning it off closes the panel', () => {
    const store = useInspectorStore()
    store.enable(true)
    store.record('a.B', {})
    store.toggle()
    store.clear()
    expect(store.entries).toEqual([])
    store.enable(false)
    expect(store.open).toBe(false)
  })
})
