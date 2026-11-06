import type { EventBus, EventMap } from './event-bus'

// Wraps a bus so that every published event is also reported to `onPublish`.
// Subscribers still get the event first, so the tap can never change how the app behaves.
export function tapEventBus<E extends EventMap>(
  bus: EventBus<E>,
  onPublish: (type: keyof E & string, payload: unknown) => void,
): EventBus<E> {
  return {
    publish: (type, payload) => {
      bus.publish(type, payload)
      try {
        onPublish(type as keyof E & string, payload)
      } catch {
        // A broken tap must not break the flow it is watching
      }
    },
    subscribe: (type, handler) => bus.subscribe(type, handler),
  }
}
