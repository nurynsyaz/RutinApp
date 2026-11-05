import type { z } from 'zod'
import { err, ok, type Result } from './result'

// Field name -> reason code, for example { email: 'EMAIL_INVALID' }
export type FieldErrors = Partial<Record<string, string>>

// Runs a zod schema and returns the first reason code for each field (BRD section 4: zod in the domain)
export function parseWith<S extends z.ZodType>(schema: S, input: unknown): Result<z.output<S>, FieldErrors> {
  const parsed = schema.safeParse(input)
  if (parsed.success) return ok(parsed.data)
  const errors: FieldErrors = {}
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? '')
    if (errors[field] === undefined) errors[field] = issue.message
  }
  return err(errors)
}
