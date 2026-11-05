import { err, ok } from '~/kernel/result'
import { domainError } from '~/kernel/domain-error'
import { newId } from '~/kernel/ids'
import { parseWith } from '~/kernel/validation'
import { latency, readTable, shouldFail, writeTable } from '~/mocks/db'
import { isValidDate } from '../domain/dates'
import type { Routine, RoutineSpan } from '../domain/routine'
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

// Keeps only valid, non-empty parts of a span. Not in BRD, my choice: a bad date is DATE_INVALID.
function checkSpan(span: RoutineSpan) {
  const days = [span.startsOn, span.endsOn, ...(span.skipDates ?? [])]
  if (days.some((day) => day !== undefined && !isValidDate(day))) {
    return err(domainError('VALIDATION', 'DATE_INVALID', 'date'))
  }
  const clean: RoutineSpan = {}
  if (span.startsOn) clean.startsOn = span.startsOn
  if (span.endsOn) clean.endsOn = span.endsOn
  if (span.skipDates && span.skipDates.length > 0) clean.skipDates = [...new Set(span.skipDates)].sort()
  return ok(clean)
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

    async create(ownerId, input, span = {}) {
      await latency()
      const checked = checkInput(input)
      if (!checked.ok) return checked
      const checkedSpan = checkSpan(span)
      if (!checkedSpan.ok) return checkedSpan

      const routine: Routine = { ...checked.value, ...checkedSpan.value, id: `rt_${newId()}`, ownerId, attachmentIds: [] }
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

      // The first, last and skipped days stay as they were
      const updated: Routine = { ...current, ...checked.value }
      await writeTable('routines', routines.map((r) => (r.id === id ? updated : r)))
      return ok(updated)
    },

    async setSpan(ownerId, id, span) {
      await latency()
      const checkedSpan = checkSpan(span)
      if (!checkedSpan.ok) return checkedSpan

      const routines = await readRoutines()
      const current = routines.find((r) => r.id === id && r.ownerId === ownerId)
      if (!current) return err(notFound())

      const { startsOn: _s, endsOn: _e, skipDates: _k, ...rest } = current
      const updated: Routine = { ...rest, ...checkedSpan.value }
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
