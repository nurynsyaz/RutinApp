import { describe, it, expect } from 'vitest'
import routines from './seed/routines.json'
import files from './seed/files.json'
import { routineInputSchema } from '../contexts/scheduling/domain/routine-input'
import { CATEGORIES } from '../contexts/scheduling/domain/routine'

describe('seed data (BRD s.9)', () => {
  it('has 14 routines for the member across the four categories', () => {
    expect(routines).toHaveLength(14)
    expect(new Set(routines.map((r) => r.ownerId))).toEqual(new Set(['usr_member']))
    expect(new Set(routines.map((r) => r.category))).toEqual(new Set(CATEGORIES))
  })

  it('has unique ids and no placeholder titles', () => {
    expect(new Set(routines.map((r) => r.id)).size).toBe(14)
    expect(routines.some((r) => /^Routine \d+$/.test(r.title))).toBe(false)
  })

  it('has routines that pass the same rules as the editor', () => {
    for (const r of routines) {
      const { id: _id, ownerId: _owner, attachmentIds: _files, ...input } = r
      expect(routineInputSchema.safeParse(input).success, r.id).toBe(true)
    }
  })

  it('has 7 files, 6 linked to routines that list them back', () => {
    expect(files).toHaveLength(7)
    const linked = files.filter((f) => f.routineId !== null)
    expect(linked).toHaveLength(6)
    for (const f of linked) {
      const routine = routines.find((r) => r.id === f.routineId)
      expect(routine?.attachmentIds, f.id).toContain(f.id)
    }
  })

  it('only points at files that exist', () => {
    const ids = new Set(files.map((f) => f.id))
    for (const r of routines) for (const id of r.attachmentIds) expect(ids.has(id), `${r.id} -> ${id}`).toBe(true)
  })
})
