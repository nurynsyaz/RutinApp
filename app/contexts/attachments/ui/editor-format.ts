import { ALLOWED_EXTENSIONS } from '../domain/file-rules'

const INTL_LOCALE: Record<string, string> = { en: 'en-MY', ms: 'ms-MY' }

// "240 KB", "1.8 MB". Files are 10 MB at most, so GB is never needed.
export function sizeText(bytes: number, locale = 'en'): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const mb = new Intl.NumberFormat(INTL_LOCALE[locale] ?? locale, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))
  return `${mb} MB`
}

// The file picker's accept list: ".pdf,.png,..."
export const ACCEPT = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',')

// A rejection or failure code as words for the person, naming the file (AT-02)
export function problemText(
  t: (key: string, params?: Record<string, unknown>) => string,
  te: (key: string) => boolean,
  reason: string,
  name: string,
): string {
  if (te(`routineFiles.reject.${reason}`)) return t(`routineFiles.reject.${reason}`, { name })
  if (te(`errors.${reason}`)) return t(`errors.${reason}`)
  return t('errors.UNKNOWN')
}
