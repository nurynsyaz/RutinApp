import { err, ok, type Result } from '~/kernel/result'
import { domainError, type DomainError } from '~/kernel/domain-error'

export type Language = 'en' | 'ms'
export type WeekStartDay = 'monday' | 'sunday'

// PR-01: what the Profile screen shows
export interface Profile {
  userId: string
  name: string
  email: string // read-only (PR-02)
  role: 'member' | 'admin'
  memberSince: string // YYYY-MM-DD
  language: Language
  timezone: string // IANA name, for example Asia/Kuala_Lumpur
  dayStart: string // HH:MM, 24-hour
  weekStart: WeekStartDay
}

// PR-02: the fields a person can change. The email is not one of them.
export interface ProfileChanges {
  name: string
  language: Language
  timezone: string
  dayStart: string
  weekStart: WeekStartDay
}

export const LANGUAGES: Language[] = ['en', 'ms']
export const WEEK_STARTS: WeekStartDay[] = ['monday', 'sunday']
export const NAME_MAX = 60

export function isValidTimezone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone })
    return zone.length > 0
  }
  catch {
    return false
  }
}

const DAY_START = /^([01]\d|2[0-3]):[0-5]\d$/

// PR-02: checks the form. The reason codes are shown as errors.<reason>.
export function validateChanges(input: ProfileChanges): Result<ProfileChanges, DomainError> {
  const name = input.name.trim()
  if (name.length < 1 || name.length > NAME_MAX) return err(domainError('VALIDATION', 'NAME_INVALID', 'name'))
  if (!LANGUAGES.includes(input.language)) return err(domainError('VALIDATION', 'LANGUAGE_INVALID', 'language'))
  if (!isValidTimezone(input.timezone)) return err(domainError('VALIDATION', 'TIMEZONE_INVALID', 'timezone'))
  if (!DAY_START.test(input.dayStart)) return err(domainError('VALIDATION', 'DAY_START_INVALID', 'dayStart'))
  if (!WEEK_STARTS.includes(input.weekStart)) return err(domainError('VALIDATION', 'WEEK_START_INVALID', 'weekStart'))
  return ok({ ...input, name })
}

export const toChanges = (profile: Profile): ProfileChanges => ({
  name: profile.name,
  language: profile.language,
  timezone: profile.timezone,
  dayStart: profile.dayStart,
  weekStart: profile.weekStart,
})

// The fields that differ from the saved profile. Empty means there is nothing to save.
export function changedFields(profile: Profile, next: ProfileChanges): Partial<ProfileChanges> {
  const before = toChanges(profile)
  const changed: Partial<ProfileChanges> = {}
  for (const key of Object.keys(before) as (keyof ProfileChanges)[]) {
    if (before[key] !== next[key]) (changed as Record<string, unknown>)[key] = next[key]
  }
  return changed
}

export const isDirty = (profile: Profile, next: ProfileChanges): boolean =>
  Object.keys(changedFields(profile, next)).length > 0

// The time zones for the picker, always including the one in use
const FALLBACK_ZONES = [
  'Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Manila', 'Asia/Hong_Kong',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
]

export function timezoneOptions(current: string): string[] {
  const supported = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
  const zones = supported ? supported('timeZone') : FALLBACK_ZONES
  const all = new Set([...zones, 'UTC', current])
  return [...all].sort((a, b) => a.localeCompare(b))
}
