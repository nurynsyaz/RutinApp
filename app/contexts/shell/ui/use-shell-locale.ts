import { readDeviceLocale, resolveLocale, writeDeviceLocale, type Locale } from '../application/locale'
import { useShellStore } from '../application/shell-store'

export function useShellLocale() {
  const { setLocale } = useI18n()
  const shell = useShellStore()

  async function apply(locale: Locale) {
    await setLocale(locale)
    shell.setLocale(locale)
    document.documentElement.lang = locale
  }

  async function init() {
    await apply(resolveLocale({ device: readDeviceLocale(), browser: navigator.language }))
  }

  async function choose(locale: Locale) {
    writeDeviceLocale(locale)
    await apply(locale)
  }

  return { init, choose }
}
