import { describe, expect, it } from 'vitest'
import {
  changedFields, isDirty, isValidTimezone, timezoneOptions, toChanges, validateChanges,
  type Profile, type ProfileChanges,
} from './profile'

const profile: Profile = {
  userId: 'usr_member',
  name: 'Aina Member',
  email: 'member@rutin.test',
  role: 'member',
  memberSince: '2026-01-15',
  language: 'en',
  timezone: 'Asia/Kuala_Lumpur',
  dayStart: '06:00',
  weekStart: 'monday',
}
const same = toChanges(profile)
const reason = (input: ProfileChanges) => {
  const result = validateChanges(input)
  return result.ok ? 'ok' : `${result.error.reason}:${result.error.field}`
}

describe('validateChanges', () => {
  it('accepts the saved values', () => {
    expect(validateChanges(same).ok).toBe(true)
  })

  it('trims the name', () => {
    const result = validateChanges({ ...same, name: '  Aina  ' })
    expect(result.ok && result.value.name).toBe('Aina')
  })

  it('needs a name of 1 to 60 characters', () => {
    expect(reason({ ...same, name: '   ' })).toBe('NAME_INVALID:name')
    expect(reason({ ...same, name: 'a'.repeat(61) })).toBe('NAME_INVALID:name')
    expect(reason({ ...same, name: 'a'.repeat(60) })).toBe('ok')
  })

  it('only allows English or Malay', () => {
    expect(reason({ ...same, language: 'fr' as 'en' })).toBe('LANGUAGE_INVALID:language')
    expect(reason({ ...same, language: 'ms' })).toBe('ok')
  })

  it('needs a real time zone', () => {
    expect(reason({ ...same, timezone: 'Mars/Olympus' })).toBe('TIMEZONE_INVALID:timezone')
    expect(reason({ ...same, timezone: '' })).toBe('TIMEZONE_INVALID:timezone')
    expect(reason({ ...same, timezone: 'Asia/Singapore' })).toBe('ok')
  })

  it('needs a 24-hour time for the start of the day', () => {
    for (const bad of ['6:00', '24:00', '12:60', 'noon', '']) {
      expect(reason({ ...same, dayStart: bad })).toBe('DAY_START_INVALID:dayStart')
    }
    for (const good of ['00:00', '06:30', '23:59']) expect(reason({ ...same, dayStart: good })).toBe('ok')
  })

  it('only allows Monday or Sunday as the start of the week', () => {
    expect(reason({ ...same, weekStart: 'friday' as 'monday' })).toBe('WEEK_START_INVALID:weekStart')
    expect(reason({ ...same, weekStart: 'sunday' })).toBe('ok')
  })
})

describe('changed fields', () => {
  it('is empty when nothing changed', () => {
    expect(changedFields(profile, same)).toEqual({})
    expect(isDirty(profile, same)).toBe(false)
  })

  it('lists only the fields that differ', () => {
    const next = { ...same, name: 'Aina', weekStart: 'sunday' as const }
    expect(changedFields(profile, next)).toEqual({ name: 'Aina', weekStart: 'sunday' })
    expect(isDirty(profile, next)).toBe(true)
  })

  it('never includes the email', () => {
    expect(Object.keys(toChanges(profile))).not.toContain('email')
  })
})

describe('time zones', () => {
  it('knows real zones and rejects made up ones', () => {
    expect(isValidTimezone('Asia/Kuala_Lumpur')).toBe(true)
    expect(isValidTimezone('UTC')).toBe(true)
    expect(isValidTimezone('Not/AZone')).toBe(false)
  })

  it('lists zones for the picker, always with the one in use', () => {
    const options = timezoneOptions('Asia/Kuala_Lumpur')
    expect(options).toContain('Asia/Kuala_Lumpur')
    expect(options).toContain('UTC')
    expect(new Set(options).size).toBe(options.length)
  })
})
