import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST_DIR = resolve('dist')
const ASSETS_DIR = resolve(DIST_DIR, 'assets')
const INDEX_HTML = resolve(DIST_DIR, 'index.html')

/** Strict gzipped size budgets (in bytes) preventing accidental heavy dependency regressions. */
const BUDGETS = {
  totalJsGzipBytes: 185 * 1024, // <= 185 KB total gzipped JS across ALL chunks
  entryJsGzipBytes: 70 * 1024, // <= 70 KB gzipped JS for the entry chunk referenced by index.html
  totalCssGzipBytes: 18 * 1024, // <= 18 KB total gzipped CSS
  // Fonts (self-hosted Vazirmatn woff2) are shipped as-is, so their RAW bytes
  // count towards what a visitor actually downloads. Measured baseline is
  // ~283 KB (JS gzip + CSS gzip + fonts); 320 KB leaves room for growth.
  totalDownloadBytes: 320 * 1024,
}

const FONT_RE = /\.(woff2?|ttf|otf|eot)$/i
const fmtKb = (b) => `${(b / 1024).toFixed(1)} KB`

if (!existsSync(INDEX_HTML)) {
  console.error(`dist/index.html not found at ${INDEX_HTML}. Run "npm run build" first.`)
  process.exit(1)
}
if (!existsSync(ASSETS_DIR)) {
  console.error(`dist/assets not found at ${ASSETS_DIR}. Run "npm run build" first.`)
  process.exit(1)
}

/**
 * Resolve the real entry chunk from the built HTML instead of guessing it
 * from a filename prefix. Only a module <script> with a resolvable src under
 * dist/assets qualifies; if Vite changes its naming scheme the check fails
 * loudly instead of silently reporting a zero-byte entry.
 */
function findEntryFileName() {
  const html = readFileSync(INDEX_HTML, 'utf8')
  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? []
  for (const tag of scriptTags) {
    const type = tag.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]
    if (type !== 'module' || !src) continue
    const fileName = src.split(/[?#]/)[0].split('/').pop()
    if (fileName && existsSync(resolve(ASSETS_DIR, fileName))) return fileName
  }
  return null
}

const entryFileName = findEntryFileName()
if (!entryFileName) {
  console.error(
    `Could not resolve the JS entry chunk from ${INDEX_HTML}.\n` +
      'Expected a <script type="module" src="/assets/....js"> pointing to an existing file in dist/assets. ' +
      'The budget check refuses to pass with an unknown entry (bundle naming may have changed).',
  )
  process.exit(1)
}

const files = readdirSync(ASSETS_DIR).sort()
let totalJsRaw = 0
let totalJsGzip = 0
let entryJsGzip = 0
let totalCssGzip = 0
let fontRawBytes = 0
const fontFiles = []

console.log('Bundle Size Report (dist/assets):')
for (const file of files) {
  const isFont = FONT_RE.test(file)
  if (!file.endsWith('.js') && !file.endsWith('.css') && !isFont) continue
  const buf = readFileSync(resolve(ASSETS_DIR, file))
  const gz = gzipSync(buf).byteLength
  const rawKb = (buf.byteLength / 1024).toFixed(1)
  const gzKb = (gz / 1024).toFixed(1)
  console.log(`  - ${file.padEnd(48)} raw: ${rawKb.padStart(6)} KB | gzip: ${gzKb.padStart(5)} KB`)

  if (file.endsWith('.js')) {
    totalJsRaw += buf.byteLength
    totalJsGzip += gz
    if (file === entryFileName) entryJsGzip = gz
  } else if (file.endsWith('.css')) {
    totalCssGzip += gz
  } else if (isFont) {
    // woff2 is already compressed; count raw bytes as served to the browser.
    fontRawBytes += buf.byteLength
    fontFiles.push(file)
  }
}

const totalDownload = totalJsGzip + totalCssGzip + fontRawBytes
console.log(
  `\nTotals: JS raw=${fmtKb(totalJsRaw)}, JS gzip=${fmtKb(totalJsGzip)} (budget ${fmtKb(BUDGETS.totalJsGzipBytes)}), ` +
    `Entry (${entryFileName}) gzip=${fmtKb(entryJsGzip)} (budget ${fmtKb(BUDGETS.entryJsGzipBytes)}), ` +
    `CSS gzip=${fmtKb(totalCssGzip)} (budget ${fmtKb(BUDGETS.totalCssGzipBytes)}), ` +
    `Fonts raw=${fmtKb(fontRawBytes)} [${fontFiles.length} files], ` +
    `Total download=${fmtKb(totalDownload)} (budget ${fmtKb(BUDGETS.totalDownloadBytes)})`,
)

const violations = []
if (totalJsGzip > BUDGETS.totalJsGzipBytes) {
  violations.push(`Total gzipped JS (${fmtKb(totalJsGzip)}) exceeds budget (${fmtKb(BUDGETS.totalJsGzipBytes)})`)
}
if (!entryJsGzip) {
  violations.push(`Entry chunk ${entryFileName} has no measurable JS bytes`)
} else if (entryJsGzip > BUDGETS.entryJsGzipBytes) {
  violations.push(`Entry chunk ${entryFileName} gzipped (${fmtKb(entryJsGzip)}) exceeds budget (${fmtKb(BUDGETS.entryJsGzipBytes)})`)
}
if (totalCssGzip > BUDGETS.totalCssGzipBytes) {
  violations.push(`Total gzipped CSS (${fmtKb(totalCssGzip)}) exceeds budget (${fmtKb(BUDGETS.totalCssGzipBytes)})`)
}
if (fontFiles.length === 0) {
  violations.push('No self-hosted font files found in dist/assets — the total-download budget would be incomplete')
}
if (totalDownload > BUDGETS.totalDownloadBytes) {
  violations.push(`Total download (${fmtKb(totalDownload)}) exceeds budget (${fmtKb(BUDGETS.totalDownloadBytes)})`)
}

if (violations.length > 0) {
  console.error('\nBundle budget check FAILED:')
  for (const v of violations) console.error(`  - ${v}`)
  process.exit(1)
}

console.log('Bundle budget check PASSED!')
