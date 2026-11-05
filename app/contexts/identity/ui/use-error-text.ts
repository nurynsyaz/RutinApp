// BRD s.11: the domain returns codes, the UI turns them into words
export function useErrorText() {
  const { t, te } = useI18n()
  return (reason: string, params: Record<string, unknown> = {}): string =>
    te(`errors.${reason}`) ? t(`errors.${reason}`, params) : t('errors.UNKNOWN')
}
