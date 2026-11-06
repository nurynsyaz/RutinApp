// SH-02: the iOS "Add to Home Screen" hint. Safari on iPhone and iPad has no install prompt,
// so the app shows steps instead, until it runs from the home screen or the person closes the hint.
export const IOS_HINT_KEY = 'rutin.ios-hint.hidden'

// iPadOS 13 and newer reports itself as a Mac, so a Mac with a touch screen counts as an iPad
export function isIosSafari(userAgent: string, maxTouchPoints = 0): boolean {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  // Other iOS browsers (Chrome, Firefox, Edge) cannot add to the home screen from their own menu
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent)
  return ios && !otherBrowser && /Safari/.test(userAgent)
}

export function shouldShowIosHint(input: { userAgent: string; maxTouchPoints?: number; standalone: boolean; hidden: boolean }): boolean {
  return isIosSafari(input.userAgent, input.maxTouchPoints ?? 0) && !input.standalone && !input.hidden
}
