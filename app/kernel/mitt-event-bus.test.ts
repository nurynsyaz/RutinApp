import { describe, it, expect, vi } from 'vitest'
import { createMittEventBus } from './mitt-event-bus'

type Events = {
  'demo.Done': { id: string }
  'demo.Other': { n: number }
}

describe('event bus', () => {
  it('delivers the payload to a subscriber', () => {
    const bus = createMittEventBus<Events>()
    const handler = vi.fn()
    bus.subscribe('demo.Done', handler)
    bus.publish('demo.Done', { id: 'a1' })
    expect(handler).toHaveBeenCalledWith({ id: 'a1' })
  })

  it('stops delivering after unsubscribe', () => {
    const bus = createMittEventBus<Events>()
    const handler = vi.fn()
    const unsubscribe = bus.subscribe('demo.Done', handler)
    unsubscribe()
    bus.publish('demo.Done', { id: 'a1' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('only notifies subscribers of that event', () => {
    const bus = createMittEventBus<Events>()
    const handler = vi.fn()
    bus.subscribe('demo.Other', handler)
    bus.publish('demo.Done', { id: 'a1' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('supports many subscribers', () => {
    const bus = createMittEventBus<Events>()
    const first = vi.fn()
    const second = vi.fn()
    bus.subscribe('demo.Done', first)
    bus.subscribe('demo.Done', second)
    bus.publish('demo.Done', { id: 'a1' })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })
})