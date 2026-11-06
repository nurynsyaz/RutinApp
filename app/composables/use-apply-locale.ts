import { useShellStore } from '~/contexts/shell/application/shell-store'
import { writeDeviceLocale, type Locale } from '~/contexts/shell/application/locale'

// Switches the app language: the messages, the shell state, <html lang> and this device's choice.
// It works outside a component, so plugins can use it.
export function useApplyLocale() {
  const nuxtApp = useNuxtApp()
  const shell = useShellStore()

  return async (locale: Locale): Promise<void> => {
    await nuxtApp.$i18n.setLocale(locale)
    shell.setLocale(locale)
    document.documentElement.lang = locale
    writeDeviceLocale(locale)
  }
}
