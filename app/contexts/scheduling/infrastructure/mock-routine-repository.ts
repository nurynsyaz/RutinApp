import { err, ok } from '~/kernel/result'
import { domainError } from '~/kernel/domain-error'
import { newId } from '~/kernel/ids'
import { parseWith } from '~/kernel/validation'
import { latency, readTable, shouldFail, writeTable } from '~/mocks/db'
import { isValidDate } from '../domain/dates'
import type { Routine } from '../domain/routine'
import { routineInputSchema } from '../domain/routine-input'
import type { Completion, RoutineRepository } from '../domain/routine-repository'

// Not in BRD, my choice: a routine that is missing or belongs to someone else is reported
// the same way, so one account cannot find out what another account has.
const notFound = () => domainError('VALIDATION', 'ROUTINE_NOT_FOUND')

function checkInput(input: unknown) {
  const parsed = parseWith(routineInputSchema, input)
  if (parsed.ok) return parsed
  const [field, reason] = Object.entries(parsed.error)[0] ?? ['', 'VALIDATION']
  return err(domainError('VALIDATION', String(reason), field || undefined))
}

export function createMockRoutineRepository(): RoutineRepository {
  const readRoutines = () => readTable<Routine>('routines')
  const readCompletions = () => readTable<Completion>('completions')
  const mine = (routines: Routine[], ownerId: string) => routines.filter((r) => r.ownerId === ownerId)

  return {
    async list(ownerId) {
      await latency()
      return ok(mine(await readRoutines(), ownerId))
    },

    async get(ownerId, id) {
      await latency()
      const routine = mine(await readRoutines(), ownerId).find((r) => r.id === id)
      return routine ? ok(routine) : err(notFound())
    },

    async create(ownerId, input) {
      await latency()
      const checked = checkInput(input)
      if (!checked.ok) return checked

      const routine: Routine = { ...checked.value, id: `rt_${newId()}`, ownerId, attachmentIds: [] }
      await writeTable('routines', [...(await readRoutines()), routine])
      return ok(routine)
    },

    async update(ownerId, id, input) {
      await latency()
      const checked = checkInput(input)
      if (!checked.ok) return checked

      const routines = await readRoutines()
      const current = routines.find((r) => r.id === id && r.ownerId === ownerId)
      if (!current) return err(notFound())

      const updated: Routine = { ...checked.value, id, ownerId, attachmentIds: current.attachmentIds }
      await writeTable('routines', routines.map((r) => (r.id === id ? updated : r)))
      return ok(updated)
    },

    async remove(ownerId, id) {
      await latency()
      const routines = await readRoutines()
      if (!routines.some((r) => r.id === id && r.ownerId === ownerId)) return err(notFound())

      await writeTable('routines', routines.filter((r) => r.id !== id))
      await writeTable('completions', (await readCompletions()).filter((c) => c.routineId !== id))
      return ok(undefined)
    },

    async listCompletions(ownerId) {
      await latency()
      const ids = new Set(mine(await readRoutines(), ownerId).map((r) => r.id))
      return ok((await readCompletions()).filter((c) => ids.has(c.routineId)))
    },

    async setDone(ownerId, routineId, date, done) {
      await latency()
      if (shouldFail('complete')) return err(domainError('NETWORK', 'NETWORK'))
      if (!isValidDate(date)) return err(domainError('VALIDATION', 'DATE_INVALID', 'date'))
      const ownRoutines = mine(await readRoutines(), ownerId)
      if (!ownRoutines.some((r) => r.id === routineId)) return err(notFound())

      const others = (await readCompletions()).filter((c) => !(c.routineId === routineId && c.date === date))
      const next = done ? [...others, { routineId, date }] : others
      await writeTable('completions', next)
      // Only this owner's days go back to the caller
      const ids = new Set(ownRoutines.map((r) => r.id))
      return ok(next.filter((c) => ids.has(c.routineId)))
    },
  }
}
