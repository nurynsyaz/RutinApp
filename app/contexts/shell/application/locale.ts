export const LOCALES = ['en', 'ms'] as const
export type Locale = (typeof LOCALES)[number]

export const DEVICE_LOCALE_KEY = 'rutin.locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

// Order: profile setting, then this device's choice, then the browser, then English
export function resolveLocale(input: { profile?: unknown, device?: unknown, browser?: string }): Locale {
  if (isLocale(input.profile)) return input.profile
  if (isLocale(input.device)) return input.device
  if (input.browser?.toLowerCase().startsWith('ms')) return 'ms'
  return 'en'
}

export function readDeviceLocale(): Locale | undefined {
  try {
    const value = localStorage.getItem(DEVICE_LOCALE_KEY)
    return isLocale(value) ? value : undefined
  }
  catch {
    return undefined
  }
}

export function writeDeviceLocale(locale: Locale): void {
  try {
    localStorage.setItem(DEVICE_LOCALE_KEY, locale)
  }
  catch {
    // storage blocked, the choice just lasts for this visit
  }
}
