import type { FileKind } from '../domain/file-record'

const INTL_LOCALE: Record<string, string> = { en: 'en-MY', ms: 'ms-MY' }
const intl = (locale: string): string => INTL_LOCALE[locale] ?? locale

// "240 KB", "1.2 MB". Files here are 10 MB at most, so GB is never needed.
export function formatSize(bytes: number, locale = 'en'): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const mb = new Intl.NumberFormat(intl(locale), { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))
  return `${mb} MB`
}

const dayIn = (date: Date, zone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

// "Today, 09:12" for today, "2 Nov" for any other day, in the user's time zone
export function formatAdded(iso: string, now: Date, locale: string, zone: string, todayLabel: string): string {
  const added = new Date(iso)
  if (dayIn(added, zone) === dayIn(now, zone)) {
    const time = new Intl.DateTimeFormat(intl(locale), { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(added)
    return `${todayLabel}, ${time}`
  }
  return new Intl.DateTimeFormat(intl(locale), { timeZone: zone, day: 'numeric', month: 'short' }).format(added)
}

// The small badge in front of a file name
export const KIND_BADGE: Record<FileKind, { label: string; classes: string }> = {
  pdf: { label: 'PDF', classes: 'bg-rose-50 text-rose-700' },
  image: { label: 'IMG', classes: 'bg-sky-50 text-sky-700' },
  doc: { label: 'DOC', classes: 'bg-indigo-50 text-indigo-700' },
  sheet: { label: 'XLS', classes: 'bg-emerald-50 text-emerald-700' },
  text: { label: 'TXT', classes: 'bg-slate-100 text-slate-700' },
  other: { label: 'FILE', classes: 'bg-slate-100 text-slate-700' },
}

// The reason codes the store and the rules give, as words for the person. Falls back to a general line.
export function reasonText(
  t: (key: string, params?: Record<string, unknown>) => string,
  te: (key: string) => boolean,
  reason: string,
  name: string,
): string {
  if (te(`attachments.reject.${reason}`)) return t(`attachments.reject.${reason}`, { name })
  if (te(`errors.${reason}`)) return t(`errors.${reason}`)
  return t('errors.UNKNOWN')
}
