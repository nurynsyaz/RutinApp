// One shared "is the sign out dialog open" flag, so the sidebar and the Profile page open the same dialog
export function useSignOutDialog() {
  const open = useState('identity.signOutDialog', () => false)
  return {
    open,
    show: () => {
      open.value = true
    },
    hide: () => {
      open.value = false
    },
  }
}
