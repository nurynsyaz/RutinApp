import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, type Page } from '@playwright/test'
import { MEMBER, signIn } from './helpers'

// Helpers for the Milestone 5 tests that run in both languages.
// Labels come from the real message files, so one test body checks English and Malay.
export type Lang = 'en' | 'ms'
export const LANGS: Lang[] = ['en', 'ms']

const messages: Record<Lang, Record<string, unknown>> = {
  en: JSON.parse(readFileSync(join(process.cwd(), 'i18n/locales/en.json'), 'utf8')),
  ms: JSON.parse(readFileSync(join(process.cwd(), 'i18n/locales/ms.json'), 'utf8')),
}

// msg('ms', 'profile.saved') gives "Profil disimpan". A message with a plural ("one | many") uses `count`.
export function msg(lang: Lang, key: string, params: Record<string, string | number> = {}): string {
  let value: unknown = messages[lang]
  for (const part of key.split('.')) value = (value as Record<string, unknown> | undefined)?.[part]
  if (typeof value !== 'string') throw new Error(`No ${lang} message for ${key}`)
  const forms = value.split(' | ')
  const count = typeof params.count === 'number' ? params.count : 1
  const form = forms.length > 1 ? (count === 1 ? forms[0]! : forms[forms.length - 1]!) : forms[0]!
  return form.replace(/\{(\w+)\}/g, (_all, name: string) => String(params[name] ?? `{${name}}`))
}

export const TUESDAY = '2026-11-03'

// Saves the language on the Profile page. It opens Profile from the menu, so the page is not reloaded.
export async function saveLanguage(page: Page, from: Lang, to: Lang) {
  await page.getByRole('navigation').getByRole('link', { name: msg(from, 'nav.profile') }).click()
  await page.getByLabel(msg(to, `profile.languages.${to}`)).check()
  await page.getByRole('button', { name: msg(from, 'profile.save') }).click()
  await expect(page.getByRole('region', { name: msg(to, 'shell.toasts.label') })).toContainText(msg(to, 'profile.saved'))
}

// Signs in as the member. For Malay the member's saved language is switched to Malay first,
// because the saved language wins over the browser after sign-in.
export async function signInIn(page: Page, lang: Lang, path = '/sign-in?inspector=1') {
  await signIn(page, MEMBER, path)
  if (lang === 'ms') await saveLanguage(page, 'en', 'ms')
}

export async function confirmSignOut(page: Page, lang: Lang) {
  await page.getByRole('button', { name: msg(lang, 'identity.signOut.cta') }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: msg(lang, 'identity.signOut.cta') }).click()
  await expect(page).toHaveURL(/\/signed-out/)
}
