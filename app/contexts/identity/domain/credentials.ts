import { z } from 'zod'
import { err, ok, type Result } from '~/kernel/result'
import { domainError, type DomainError } from '~/kernel/domain-error'

// The messages are reason codes. The UI shows errors.<reason> in the active language.
export const emailSchema = z.string().trim().toLowerCase().email('EMAIL_INVALID')

// ID-02: at least 8 characters, 1 letter and 1 number
export const passwordSchema = z
  .string()
  .min(8, 'PASSWORD_WEAK')
  .regex(/[A-Za-z]/, 'PASSWORD_WEAK')
  .regex(/\d/, 'PASSWORD_WEAK')

export const nameSchema = z.string().trim().min(1, 'NAME_INVALID').max(60, 'NAME_INVALID')

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
})

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const forgotPasswordSchema = z.object({ email: emailSchema })

function checkField(schema: z.ZodType<string>, field: string, raw: string): Result<string, DomainError> {
  const parsed = schema.safeParse(raw)
  return parsed.success
    ? ok(parsed.data)
    : err(domainError('VALIDATION', parsed.error.issues[0]?.message ?? 'INVALID', field))
}

export const validateEmail = (raw: string) => checkField(emailSchema, 'email', raw)
export const validatePassword = (raw: string) => checkField(passwordSchema, 'password', raw)
export const validateName = (raw: string) => checkField(nameSchema, 'name', raw)
