// Checks the app shell size (BRD section 1: app-shell JS <= 200 KB gzipped).
// The app shell is the entry script plus every script the page preloads. Run `npm run generate` first.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const BUDGET_KB = 200
const root = '.output/public'

let html
try {
  html = readFileSync(join(root, '200.html'), 'utf8')
} catch {
  console.error('Cannot find .output/public/200.html. Run "npm run generate" first.')
  process.exit(1)
}

const files = new Set()
for (const match of html.matchAll(/<(?:link rel="modulepreload"[^>]*href|script[^>]*src)="([^"]+\.js)"/g)) files.add(match[1])

let total = 0
const rows = []
for (const file of files) {
  const bytes = gzipSync(readFileSync(join(root, file))).length
  total += bytes
  rows.push({ file, kb: bytes / 1024 })
}

rows.sort((a, b) => b.kb - a.kb)
for (const row of rows.slice(0, 5)) console.log(`${row.kb.toFixed(1).padStart(7)} KB  ${row.file}`)
const totalKb = total / 1024
console.log(`${files.size} files, ${totalKb.toFixed(1)} KB gzipped (budget ${BUDGET_KB} KB)`)

if (totalKb > BUDGET_KB) {
  console.error('The app shell is over the budget.')
  process.exit(1)
}