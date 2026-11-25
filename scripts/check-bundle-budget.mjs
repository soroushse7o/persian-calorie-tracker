import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const ASSETS_DIR = resolve('dist/assets')

/** Strict gzipped size budgets (in bytes) preventing accidental heavy dependency regressions. */
const BUDGETS = {
  totalJsGzipBytes: 185 * 1024, // <= 185 KB total gzipped JS across ALL chunks (React + 322-Food Macro/Micro Catalog + App + Lazy tabs)
  entryJsGzipBytes: 70 * 1024, // <= 70 KB main index-*.js gzipped
  totalCssGzipBytes: 18 * 1024, // <= 18 KB total gzipped CSS
}

if (!existsSync(ASSETS_DIR)) {
  console.error(`dist/assets not found at ${ASSETS_DIR}. Run "npm run build" first.`)
  process.exit(1)
}

const files = readdirSync(ASSETS_DIR).sort()
let totalJsRaw = 0
let totalJsGzip = 0
let entryJsGzip = 0
let entryJsName = ''
let totalCssGzip = 0

console.log('Bundle Size Report (dist/assets):')
for (const file of files) {
  if (!file.endsWith('.js') && !file.endsWith('.css')) continue
  const buf = readFileSync(resolve(ASSETS_DIR, file))
  const gz = gzipSync(buf).byteLength
  const rawKb = (buf.byteLength / 1024).toFixed(1)
  const gzKb = (gz / 1024).toFixed(1)
  console.log(`  - ${file.padEnd(36)} raw: ${rawKb.padStart(6)} KB | gzip: ${gzKb.padStart(5)} KB`)

  if (file.endsWith('.js')) {
    totalJsRaw += buf.byteLength
    totalJsGzip += gz
    if (file.startsWith('index-')) {
      entryJsGzip = gz
      entryJsName = file
    }
  } else if (file.endsWith('.css')) {
    totalCssGzip += gz
  }
}

const fmtKb = (b) => `${(b / 1024).toFixed(1)} KB`
console.log(
  `\nTotals: JS raw=${fmtKb(totalJsRaw)}, JS gzip=${fmtKb(totalJsGzip)} (budget ${fmtKb(BUDGETS.totalJsGzipBytes)}), Entry (${entryJsName || 'n/a'}) gzip=${fmtKb(entryJsGzip)} (budget ${fmtKb(BUDGETS.entryJsGzipBytes)}), CSS gzip=${fmtKb(totalCssGzip)} (budget ${fmtKb(BUDGETS.totalCssGzipBytes)})`,
)

const violations = []
if (totalJsGzip > BUDGETS.totalJsGzipBytes) {
  violations.push(
    `Total gzipped JS (${fmtKb(totalJsGzip)}) exceeds budget (${fmtKb(BUDGETS.totalJsGzipBytes)})`,
  )
}
if (entryJsGzip > BUDGETS.entryJsGzipBytes) {
  violations.push(
    `Entry chunk ${entryJsName} gzipped (${fmtKb(entryJsGzip)}) exceeds budget (${fmtKb(BUDGETS.entryJsGzipBytes)})`,
  )
}
if (totalCssGzip > BUDGETS.totalCssGzipBytes) {
  violations.push(
    `Total gzipped CSS (${fmtKb(totalCssGzip)}) exceeds budget (${fmtKb(BUDGETS.totalCssGzipBytes)})`,
  )
}

if (violations.length > 0) {
  console.error('\nBundle budget check FAILED:')
  for (const v of violations) console.error(`  - ${v}`)
  process.exit(1)
}

console.log('Bundle budget check PASSED!')
