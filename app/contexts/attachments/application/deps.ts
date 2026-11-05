import { useNuxtApp } from '#app'
import type { Clock } from '~/kernel/clock'
import type { EventBus } from '~/kernel/event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import type { FileRepository } from '../domain/file-repository'

export interface StorageUsage {
  usage: number // bytes used by this site
  quota: number // bytes the browser allows
}

export interface AttachmentDeps {
  repo: FileRepository
  bus: EventBus<DomainEvents>
  clock: Clock
  // null when the browser cannot say
  storageUsage: () => Promise<StorageUsage | null>
}

async function browserStorageUsage(): Promise<StorageUsage | null> {
  try {
    const estimate = await navigator.storage?.estimate?.()
    if (estimate?.usage !== undefined && estimate.quota) return { usage: estimate.usage, quota: estimate.quota }
  } catch {
    // Some browsers refuse. The upload still goes ahead.
  }
  return null
}

export function useAttachmentDeps(): AttachmentDeps {
  const { $bus, $clock, $repositories } = useNuxtApp()
  return { repo: $repositories.files, bus: $bus, clock: $clock, storageUsage: browserStorageUsage }
}
