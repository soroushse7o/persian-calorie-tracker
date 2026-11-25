import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import {
  buildRobotsTxt,
  buildSitemapXml,
  injectAbsoluteSiteMetadata,
  validateSiteUrlForBuild,
} from './src/utils/siteMeta.ts'

/**
 * Enforces `VITE_SITE_URL` at production build time (throws if missing/invalid),
 * rewrites `canonical`, `og:url`, `og:image`, and `twitter:image` to absolute URLs,
 * and emits `dist/sitemap.xml` + `dist/robots.txt`.
 */
function siteMetadataBuildPlugin(): Plugin {
  let outDir = 'dist'
  let normalizedSiteUrl = ''

  return {
    name: 'kalorishomar-site-metadata',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
      const env = loadEnv(config.mode, config.root, '')
      const rawSiteUrl = process.env.VITE_SITE_URL ?? env.VITE_SITE_URL
      normalizedSiteUrl = validateSiteUrlForBuild(rawSiteUrl)
    },
    transformIndexHtml(html) {
      return injectAbsoluteSiteMetadata(html, normalizedSiteUrl)
    },
    closeBundle() {
      const distDir = resolve(outDir)
      if (!existsSync(distDir)) return
      writeFileSync(resolve(distDir, 'sitemap.xml'), buildSitemapXml(normalizedSiteUrl), 'utf8')
      writeFileSync(resolve(distDir, 'robots.txt'), buildRobotsTxt(normalizedSiteUrl), 'utf8')
    },
  }
}

/**
 * Injects the exact list of hashed Vite output assets (JS, CSS, self-hosted WOFF2 fonts)
 * into `dist/sw.js` at build time so a single online visit precaches 100% of the app
 * (including lazy-loaded tabs & font subsets) and invalidates stale caches on deploy.
 */
function swPrecacheManifestPlugin(): Plugin {
  let outDir = 'dist'

  return {
    name: 'kalorishomar-sw-precache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const distDir = resolve(outDir)
      const swPath = resolve(distDir, 'sw.js')
      const assetsDir = resolve(distDir, 'assets')
      if (!existsSync(swPath) || !existsSync(assetsDir)) return

      const assetFiles = readdirSync(assetsDir)
        .filter((file) => !file.endsWith('.map'))
        .sort()
        .map((file) => `/assets/${file}`)

      const hash = createHash('sha256')
        .update(assetFiles.join('|'))
        .digest('hex')
        .slice(0, 10)

      const swSource = readFileSync(swPath, 'utf8')
      const injected = swSource
        .replace('__SW_CACHE_VERSION__', `kalorishomar-${hash}`)
        .replace(
          '/* __SW_PRECACHE_ASSETS__ */',
          assetFiles.map((p) => `  ${JSON.stringify(p)},`).join('\n'),
        )

      writeFileSync(swPath, injected, 'utf8')
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), siteMetadataBuildPlugin(), swPrecacheManifestPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'vendor-react'
          }
          if (id.includes('/src/data/foods/') || id.includes('/src/data/iranianFoods')) {
            return 'food-catalog'
          }
        },
      },
    },
  },
  test: {
    isolate: false,
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.ts', 'src/store/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/utils/pwa.ts',
        'src/utils/reportImageExport.ts',
      ],
      thresholds: {
        lines: 82,
        functions: 82,
        statements: 82,
        branches: 72,
      },
    },
  },
})
