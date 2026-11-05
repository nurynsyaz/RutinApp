// S-05: the week is a 7-column grid from tablet up (640 px, Tailwind's sm) and a day strip on mobile
export function useIsWide() {
  const wide = ref(true)
  if (!import.meta.client) return wide

  const query = window.matchMedia('(min-width: 640px)')
  wide.value = query.matches
  const update = (event: MediaQueryListEvent) => {
    wide.value = event.matches
  }
  query.addEventListener('change', update)
  onScopeDispose(() => query.removeEventListener('change', update))
  return wide
}
