import { describe, expect, it, vi } from 'vitest'
import { domainError } from '~/kernel/domain-error'
import { err, ok } from '~/kernel/result'
import { toggleDone } from './toggle-done'

describe('toggleDone', () => {
  it('passes the change to the store and stays quiet when it saves', async () => {
    const setDone = vi.fn().mockResolvedValue(ok(undefined))
    const fail = vi.fn()

    await toggleDone({ setDone, fail }, 'rt_01', '2026-11-03', true)

    expect(setDone).toHaveBeenCalledWith('rt_01', '2026-11-03', true)
    expect(fail).not.toHaveBeenCalled()
  })

  it('shows the error toast when the save fails', async () => {
    const setDone = vi.fn().mockResolvedValue(err(domainError('NETWORK', 'NETWORK')))
    const fail = vi.fn()

    await toggleDone({ setDone, fail }, 'rt_01', '2026-11-03', false)

    expect(fail).toHaveBeenCalledOnce()
  })
})
