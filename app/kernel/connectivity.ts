import { readonly, ref } from 'vue'

// SH-01: whether the browser is online. The connectivity plugin keeps it up to date; screens only read it.
const online = ref(true)

export function useOnline() {
  return readonly(online)
}

export function setOnlineState(value: boolean): void {
  online.value = value
}
