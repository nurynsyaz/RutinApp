import { systemClock } from '~/kernel/clock'
import { createMittEventBus } from '~/kernel/mitt-event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      bus: createMittEventBus<DomainEvents>(),
      clock: systemClock, // one clock for the whole app, so demos can freeze time later
    },
  }
})