import { useNuxtApp } from '#app'
import type { Clock } from '~/kernel/clock'
import type { EventBus } from '~/kernel/event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import type { RoutineRepository } from '../domain/routine-repository'

export interface SchedulingDeps {
  repo: RoutineRepository
  bus: EventBus<DomainEvents>
  clock: Clock
}

export function useSchedulingDeps(): SchedulingDeps {
  const { $bus, $clock, $repositories } = useNuxtApp()
  return { repo: $repositories.routines, bus: $bus, clock: $clock }
}
