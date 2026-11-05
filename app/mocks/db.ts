import { createStore, get, set, clear, del } from 'idb-keyval'
import users from './seed/users.json'
import routines from './seed/routines.json'
import files from './seed/files.json'

export type Table = 'users' | 'routines' | 'files' | 'completions'
export type FailKey = 'signin' | 'upload' | 'complete'

// Change these to speed up or slow down the fake server
export const mockConfig = { minLatencyMs: 150, maxLatencyMs: 600 }

const store = createStore('rutin-db', 'tables')
// Nobody has finished anything on a fresh install, so completions start empty
const seeds: Record<Table, unknown[]> = { users, routines, files, completions: [] }

export function latency(): Promise<void> {
  const { minLatencyMs, maxLatencyMs } = mockConfig
  const ms = minLatencyMs + Math.random() * (maxLatencyMs - minLatencyMs)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Use ?mockFail=signin,upload,complete in the URL to force these calls to fail
export function shouldFail(key: FailKey): boolean {
  if (typeof window === 'undefined') return false
  const raw = new URLSearchParams(window.location.search).get('mockFail')
  return raw ? raw.split(',').includes(key) : false
}

export async function readTable<T>(table: Table): Promise<T[]> {
  const existing = await get<T[]>(table, store)
  if (existing) return existing
  const seeded = structuredClone(seeds[table]) as T[]
  await set(table, seeded, store)
  return seeded
}

export async function writeTable<T>(table: Table, rows: T[]): Promise<void> {
  await set(table, rows, store)
}

// Sign out (BRD s.7 step 4): drops the signed-in user's routines and files.
// The users table stays because accounts are not cached user data, and the PWA shell cache is not touched.
export async function clearUserData(): Promise<void> {
  await del('routines', store)
  await del('files', store)
  await del('completions', store)
}

export async function resetDemoData(): Promise<void> {
  await clear(store)
}
