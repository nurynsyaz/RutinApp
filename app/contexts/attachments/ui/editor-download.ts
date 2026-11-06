// AT-05: hands a stored file to the browser under its original name
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  // BRD s.8: an iOS home screen app ignores the download attribute, so the file opens in a new tab instead
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) {
    window.open(url, '_blank')
  } else {
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
  // Give the browser a moment to start the download before the address is released
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
