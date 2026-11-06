import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  readTable,
  writeTable,
  readBlob,
  writeBlob,
  deleteBlob,
  resetDemoData,
  clearUserData,
  shouldFail,
  latency,
} from './db'

beforeEach(async () => {
  await resetDemoData()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('mock db', () => {
  it('seeds the starter data on first read', async () => {
    expect(await readTable('users')).toHaveLength(3)
    expect(await readTable('routines')).toHaveLength(14)
    expect(await readTable('files')).toHaveLength(7)
  })

  it('keeps changes after writing', async () => {
    await writeTable('users', [{ id: 'only' }])
    expect(await readTable('users')).toEqual([{ id: 'only' }])
  })

  it('clearUserData drops routines and files but keeps users', async () => {
    await writeTable('routines', [{ id: 'mine' }])
    await writeTable('files', [{ id: 'mine' }])
    await writeTable('users', [{ id: 'only' }])
    await clearUserData()
    expect(await readTable('users')).toEqual([{ id: 'only' }])
    expect(await readTable('routines')).toHaveLength(14)
    expect(await readTable('files')).toHaveLength(7)
  })

  it('starts with no completed occurrences and clears them on sign out', async () => {
    expect(await readTable('completions')).toEqual([])
    await writeTable('completions', [{ routineId: 'rt_01', date: '2026-11-02' }])
    await clearUserData()
    expect(await readTable('completions')).toEqual([])
  })

  it('keeps the bytes of a file and gives them back', async () => {
    expect(await readBlob('fl_x')).toBeUndefined()
    await writeBlob('fl_x', new Blob(['hello'], { type: 'text/plain' }))
    const blob = await readBlob('fl_x')
    expect(blob?.type).toBe('text/plain')
    expect(await blob?.text()).toBe('hello')
    await deleteBlob('fl_x')
    expect(await readBlob('fl_x')).toBeUndefined()
  })

  it('clearUserData drops the stored file bytes', async () => {
    await writeBlob('fl_x', new Blob(['hello']))
    await clearUserData()
    expect(await readBlob('fl_x')).toBeUndefined()
  })

  it('goes back to the seed after reset', async () => {
    await writeTable('users', [])
    await resetDemoData()
    expect(await readTable('users')).toHaveLength(3)
  })

  it('does not fail by default', () => {
    expect(shouldFail('signin')).toBe(false)
  })

  it('fails the calls named in ?mockFail=', () => {
    vi.stubGlobal('window', { location: { search: '?mockFail=signin,upload' } })
    expect(shouldFail('signin')).toBe(true)
    expect(shouldFail('upload')).toBe(true)
    expect(shouldFail('complete')).toBe(false)
  })

  it('waits before resolving', async () => {
    vi.useFakeTimers()
    let done = false
    const waiting = latency().then(() => {
      done = true
    })
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(600)
    await waiting
    expect(done).toBe(true)
  })
})
