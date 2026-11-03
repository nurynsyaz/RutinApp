export type EventMap = Record<string, unknown>

export interface EventBus<E extends EventMap> {
  publish<K extends keyof E>(type: K, payload: E[K]): void
  subscribe<K extends keyof E>(type: K, handler: (payload: E[K]) => void): () => void
}