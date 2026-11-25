/**
 * Build-time validation & SEO/OpenGraph/Sitemap generators for `VITE_SITE_URL`.
 * Enforces strict presence of `VITE_SITE_URL` on production builds (no silent fallback).
 */
export function validateSiteUrlForBuild(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/\/+$/, '')
  if (!trimmed) {
    throw new Error(
      'Build aborted: VITE_SITE_URL environment variable is required for production builds (no default fallback). Set VITE_SITE_URL="https://your-domain.com" in your environment.',
    )
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error(
      `Build aborted: VITE_SITE_URL="${trimmed}" is not a valid absolute URL. Expected https://example.com`,
    )
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(
      `Build aborted: VITE_SITE_URL must use https:// or http:// protocol (received "${parsed.protocol}").`,
    )
  }

  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`
}

export function injectAbsoluteSiteMetadata(html: string, siteUrl: string): string {
  const canonicalUrl = `${siteUrl}/`
  const ogImageUrl = `${siteUrl}/og-image.png`

  let next = html
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${canonicalUrl}" />\n    <meta property="og:url" content="${canonicalUrl}" />`,
    )
    .replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:image" content="${ogImageUrl}" />`,
    )
    .replace(
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:image" content="${ogImageUrl}" />`,
    )

  if (!next.includes('rel="canonical"')) {
    next = next.replace('</head>', `  <link rel="canonical" href="${canonicalUrl}" />\n  </head>`)
  }
  return next
}

export function buildSitemapXml(siteUrl: string, isoDate = new Date().toISOString().slice(0, 10)): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${siteUrl}/</loc>`,
    `    <lastmod>${isoDate}</lastmod>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '</urlset>',
    '',
  ].join('\n')
}

export function buildRobotsTxt(siteUrl: string): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n')
}
