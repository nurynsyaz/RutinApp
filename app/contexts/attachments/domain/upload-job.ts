// BRD section 8: UploadJob { id, name, size, progress, status }
export type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'cancelled'

export interface UploadJob {
  id: string
  name: string
  size: number // bytes
  progress: number // 0 to 1
  status: UploadStatus
  // Not in BRD, my choice: why a job failed, as a code the UI shows as errors.<reason>
  reason?: string
}

// Still waiting or sending, so it counts toward the routine's 20 files
export const isActive = (job: UploadJob): boolean => job.status === 'queued' || job.status === 'uploading'
