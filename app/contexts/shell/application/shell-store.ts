import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Locale } from './locale'

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  title: string
  body?: string
  actionLabel?: string
  onAction?: () => void
}

export type ToastInput = Omit<Toast, 'id'>

export const useShellStore = defineStore('shell', () => {
  const toasts = ref<Toast[]>([])
  const locale = ref<Locale>('en')
  let nextId = 1

  function notify(input: ToastInput): number {
    const id = nextId++
    toasts.value.push({ ...input, id })
    return id
  }

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function setLocale(next: Locale): void {
    locale.value = next
  }

  function reset(): void {
    toasts.value = []
  }

  return { toasts, locale, notify, dismiss, setLocale, reset }
})
