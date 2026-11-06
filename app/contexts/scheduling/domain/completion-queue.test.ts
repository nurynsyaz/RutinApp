import { describe, expect, it } from 'vitest'
import { applyQueue, enqueue, type QueuedChange } from './completion-queue'

const done = (routineId: string, date = '2026-11-03', value = true): QueuedChange => ({ routineId, date, done: value })

describe('enqueue', () => {
  it('adds a change', () => {
    expect(enqueue([], done('a'))).toEqual([done('a')])
  })

  it('keeps only the last change for the same day', () => {
    const queue = enqueue(enqueue([], done('a')), done('a', '2026-11-03', false))
    expect(queue).toEqual([done('a', '2026-11-03', false)])
  })

  it('keeps changes for different routines or days apart', () => {
    const queue = enqueue(enqueue(enqueue([], done('a')), done('b')), done('a', '2026-11-04'))
    expect(queue).toHaveLength(3)
  })

  it('does not change the list it is given', () => {
    const queue: QueuedChange[] = [done('a')]
    enqueue(queue, done('b'))
    expect(queue).toHaveLength(1)
  })
})

describe('applyQueue', () => {
  it('puts a queued done day on top of the saved ones', () => {
    expect(applyQueue([], [done('a')])).toEqual([{ routineId: 'a', date: '2026-11-03' }])
  })

  it('takes away a day that was queued as not done', () => {
    const saved = [{ routineId: 'a', date: '2026-11-03' }, { routineId: 'b', date: '2026-11-03' }]
    expect(applyQueue(saved, [done('a', '2026-11-03', false)])).toEqual([{ routineId: 'b', date: '2026-11-03' }])
  })

  it('does not list a day twice', () => {
    const saved = [{ routineId: 'a', date: '2026-11-03' }]
    expect(applyQueue(saved, [done('a')])).toHaveLength(1)
  })
})
