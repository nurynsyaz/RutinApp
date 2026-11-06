import { describe, expect, it } from 'vitest'
import { isIosSafari, shouldShowIosHint } from './install-hint'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1'
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'
const MAC_SAFARI = IPAD_AS_MAC

describe('isIosSafari', () => {
  it('is true for Safari on an iPhone', () => {
    expect(isIosSafari(IPHONE_SAFARI)).toBe(true)
  })
  it('is false for Chrome on an iPhone', () => {
    expect(isIosSafari(IPHONE_CHROME)).toBe(false)
  })
  it('is true for an iPad that reports itself as a Mac, because it has a touch screen', () => {
    expect(isIosSafari(IPAD_AS_MAC, 5)).toBe(true)
  })
  it('is false for Safari on a Mac without a touch screen', () => {
    expect(isIosSafari(MAC_SAFARI, 0)).toBe(false)
  })
  it('is false for Android', () => {
    expect(isIosSafari(ANDROID_CHROME)).toBe(false)
  })
})

describe('shouldShowIosHint', () => {
  const base = { userAgent: IPHONE_SAFARI, standalone: false, hidden: false }
  it('shows in Safari on iOS before the app is installed', () => {
    expect(shouldShowIosHint(base)).toBe(true)
  })
  it('does not show once the app runs from the home screen', () => {
    expect(shouldShowIosHint({ ...base, standalone: true })).toBe(false)
  })
  it('does not show after the person closed it', () => {
    expect(shouldShowIosHint({ ...base, hidden: true })).toBe(false)
  })
  it('does not show on other systems', () => {
    expect(shouldShowIosHint({ ...base, userAgent: ANDROID_CHROME })).toBe(false)
  })
})
