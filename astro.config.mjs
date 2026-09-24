// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const font = (file, weight) => ({ src: [`./src/assets/fonts/${file}.woff2`], weight, style: 'normal' });

export default defineConfig({
  site: 'https://rsksolarenergy.com',
  trailingSlash: 'always',
  // 'always' rather than the default 'auto' (which only inlines stylesheets under ~4 KB — our
  // compiled CSS is ~31 KB/~7 KB gzipped, so it stayed a separate render-blocking request).
  // Inlining it removes that request/round-trip entirely, which PageSpeed flagged specifically
  // ("render-blocking requests", "network dependency tree") on the live site. Most visitors here
  // land on one or two pages before converting via WhatsApp/call, so losing separate-file caching
  // across page navigations costs less than the round-trip it removes on a slow mobile connection.
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,

  // Strict CSP, auto-hashed per build (CLAUDE.md §9 — the old site was compromised via an
  // injected script). Delivered as a <meta> tag on every page, so script-src/style-src hashes
  // always match whatever Astro actually inlined that build; no manual hash-keeping.
  // frame-ancestors can't be delivered via <meta> — that one lives in the .htaccess header
  // instead (see scripts/make-htaccess.mjs), deliberately as its own separate, non-overlapping
  // policy so the two never need to be kept in sync.
  //
  // Google Analytics (gtag.js) is the one exception to "everything self-hosted": it needs its
  // loader script allowed in script-src (external <script src> can't be hash-verified, so the
  // host has to be explicitly trusted) and its own collection endpoints allowed in connect-src.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://i.ytimg.com https://www.googletagmanager.com",
        "font-src 'self'",
        "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://www.googletagmanager.com'],
      },
    },
  },

  // Prefetch internal pages on hover / touchstart: near-instant navigation for ~1 KB of JS.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  // Routing ready for human-translated Hindi and Punjabi pages (CLAUDE.md §6). No content yet.
  i18n: {
    locales: ['en', 'hi', 'pa'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },

  // Self-hosted, subset IBM Plex (Latin + ₹). Astro generates metric-matched fallbacks to prevent layout shift.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-plex-sans',
      fallbacks: ['Arial', 'sans-serif'],
      display: 'swap',
      options: { variants: [font('plex-sans-400', 400), font('plex-sans-500', 500), font('plex-sans-600', 600)] },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans Condensed',
      cssVariable: '--font-plex-condensed',
      fallbacks: ['Arial Narrow', 'sans-serif'],
      display: 'swap',
      options: { variants: [font('plex-condensed-600', 600)] },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex-mono',
      fallbacks: ['Consolas', 'monospace'],
      display: 'swap',
      options: { variants: [font('plex-mono-500', 500)] },
    },
  ],

  integrations: [
    mdx(),
    sitemap({
      // Keep in sync with every page that sets noindex={true} in its BaseLayout props — a page
      // that tells crawlers not to index it shouldn't also be listed as a URL worth crawling.
      filter: (page) => !page.includes('/404') && !page.includes('/awards-and-recognition') && !page.includes('/search'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
