import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../domain/routine'
import type { DayItem } from '../domain/day-schedule'
import type { Routine } from '../domain/routine'
import { CATEGORY_STYLE } from './category-style'
import { cardText } from './card-text'

function item(patch: Partial<Routine> = {}, done = false): DayItem {
  const routine: Routine = {
    id: 'a',
    ownerId: 'usr_member',
    title: 'Morning run',
    category: 'health',
    start: '06:30',
    durationMin: 45,
    repeat: { kind: 'weekdays' },
    reminderMin: 0,
    notes: '',
    attachmentIds: [],
    ...patch,
  }
  return { routine, date: '2026-11-03', startMin: 390, endMin: 435, done, overlapsWith: [] }
}

describe('cardText', () => {
  it('names the category and the repeat', () => {
    expect(cardText(item())).toEqual({
      category: 'health',
      repeat: { kind: 'weekdays', days: [] },
      files: 0,
      status: null,
    })
  })

  it('counts the attached files', () => {
    expect(cardText(item({ attachmentIds: ['fl_01', 'fl_02'] })).files).toBe(2)
  })

  it('lists the days of a custom repeat', () => {
    const text = cardText(item({ repeat: { kind: 'custom', days: [2, 4] } }))
    expect(text.repeat).toEqual({ kind: 'custom', days: [2, 4] })
  })

  it('says Done for a done routine, even when it would start soon', () => {
    expect(cardText(item({}, true), 20).status).toEqual({ kind: 'done' })
  })

  it('says when it starts for the next routine', () => {
    expect(cardText(item(), 20).status).toEqual({ kind: 'startsIn', minutes: 20 })
  })

  it('says nothing once it has started', () => {
    expect(cardText(item(), null).status).toBeNull()
    expect(cardText(item(), 0).status).toBeNull()
  })
})

describe('category colours', () => {
  it('has a colour for every category', () => {
    for (const category of CATEGORIES) expect(CATEGORY_STYLE[category].card).toMatch(/^bg-/)
  })
})
