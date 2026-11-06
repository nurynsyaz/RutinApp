import { useNuxtApp } from '#app'
import type { Clock } from '~/kernel/clock'
import type { EventBus } from '~/kernel/event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import type { ProfileRepository } from '../domain/profile-repository'

export interface ProfileDeps {
  repo: ProfileRepository
  bus: EventBus<DomainEvents>
  clock: Clock
}

export function useProfileDeps(): ProfileDeps {
  const { $bus, $clock, $repositories } = useNuxtApp()
  return { repo: $repositories.profile, bus: $bus, clock: $clock }
}
