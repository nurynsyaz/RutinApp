import { describe, it, expect, vi } from 'vitest'
import { createMittEventBus } from './mitt-event-bus'
import { tapEventBus } from './event-tap'

type Events = { 'demo.Done': { id: string } }

describe('event tap', () => {
  it('still delivers to subscribers and also reports the event', () => {
    const tap = vi.fn()
    const bus = tapEventBus(createMittEventBus<Events>(), tap)
    const handler = vi.fn()
    bus.subscribe('demo.Done', handler)
    bus.publish('demo.Done', { id: 'a1' })
    expect(handler).toHaveBeenCalledWith({ id: 'a1' })
    expect(tap).toHaveBeenCalledWith('demo.Done', { id: 'a1' })
  })

  it('keeps working when the tap throws', () => {
    const bus = tapEventBus(createMittEventBus<Events>(), () => {
      throw new Error('boom')
    })
    const handler = vi.fn()
    bus.subscribe('demo.Done', handler)
    expect(() => bus.publish('demo.Done', { id: 'a1' })).not.toThrow()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('stops delivering after unsubscribe', () => {
    const bus = tapEventBus(createMittEventBus<Events>(), () => {})
    const handler = vi.fn()
    bus.subscribe('demo.Done', handler)()
    bus.publish('demo.Done', { id: 'a1' })
    expect(handler).not.toHaveBeenCalled()
  })
})
