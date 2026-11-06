import type { Pinia } from 'pinia'
import { systemClock } from '~/kernel/clock'
import { createMittEventBus } from '~/kernel/mitt-event-bus'
import { tapEventBus } from '~/kernel/event-tap'
import { consoleLogger, silentLogger } from '~/kernel/logger'
import type { DomainEvents } from '~/kernel/events/catalogue'
import { INSPECTOR_KEY, resolveInspector } from '~/contexts/shell/application/inspector'
import { useInspectorStore } from '~/contexts/shell/application/inspector-store'

function readInspectorSetting(): boolean {
  let stored: string | null = null
  const query = new URLSearchParams(window.location.search).get('inspector')
  try {
    if (query === '1') localStorage.setItem(INSPECTOR_KEY, '1')
    if (query === '0') localStorage.removeItem(INSPECTOR_KEY)
    stored = localStorage.getItem(INSPECTOR_KEY)
  } catch {
    // Storage can be blocked. The inspector then follows dev mode and the query only.
  }
  return resolveInspector({ dev: import.meta.dev, stored, query })
}

export default defineNuxtPlugin((nuxtApp) => {
  const inspectorOn = readInspectorSetting()
  const logger = inspectorOn && import.meta.dev ? consoleLogger : silentLogger
  const base = createMittEventBus<DomainEvents>()

  // The inspector store is looked up when an event is published, because Pinia is set up after this plugin runs
  const bus = tapEventBus(base, (type, payload) => {
    if (!inspectorOn) return
    logger.debug(type, payload)
    useInspectorStore(nuxtApp.$pinia as Pinia).record(type, payload)
  })

  return {
    provide: {
      bus,
      logger,
      inspectorOn,
      clock: systemClock, // one clock for the whole app, so demos can freeze time later
    },
  }
})
