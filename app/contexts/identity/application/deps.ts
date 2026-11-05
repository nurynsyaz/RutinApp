import { useNuxtApp } from '#app'
import type { Clock } from '~/kernel/clock'
import type { EventBus } from '~/kernel/event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import type { AuthRepository } from '../domain/auth-repository'

export interface IdentityDeps {
  repo: AuthRepository
  bus: EventBus<DomainEvents>
  clock: Clock
}

export function useIdentityDeps(): IdentityDeps {
  const { $bus, $clock, $repositories } = useNuxtApp()
  return { repo: $repositories.auth, bus: $bus, clock: $clock }
}