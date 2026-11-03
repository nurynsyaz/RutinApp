import mitt from 'mitt'
import type { EventBus, EventMap } from './event-bus'

export function createMittEventBus<E extends EventMap>(): EventBus<E> {
  const emitter = mitt<E>()
  return {
    publish: (type, payload) => emitter.emit(type, payload),
    subscribe: (type, handler) => {
      emitter.on(type, handler)
      return () => emitter.off(type, handler)
    },
  }
}
