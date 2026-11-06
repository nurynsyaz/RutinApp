import type { Role } from './permissions'

// Not in BRD, my choice: "status" is active or inactive, shown as it is stored
export type UserStatus = 'active' | 'inactive'

// AD-01: one row of the Users page. It never carries the password.
export interface UserSummary {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  lastActiveAt: string | null // ISO 8601, null when the person has never signed in
  memberSince: string // YYYY-MM-DD
}
