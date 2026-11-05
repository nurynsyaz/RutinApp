import type { Result } from '~/kernel/result'
import type { DomainError } from '~/kernel/domain-error'

interface ToggleDeps {
  setDone: (routineId: string, date: string, done: boolean) => Promise<Result<void, DomainError>>
  // Shows the error toast
  fail: () => void
}

// SC-06: the day changes straight away (the store does that). If the save fails, the store has
// already put it back, and this tells the user.
export async function toggleDone(deps: ToggleDeps, routineId: string, date: string, done: boolean): Promise<void> {
  const result = await deps.setDone(routineId, date, done)
  if (!result.ok) deps.fail()
}
