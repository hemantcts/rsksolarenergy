// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const font = (file, weight) => ({ src: [`./src/assets/fonts/${file}.woff2`], weight, style: 'normal' });

export default defineConfig({
  site: 'https://rsksolarenergy.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,

  // Strict CSP, auto-hashed per build (CLAUDE.md §9 — the old site was compromised via an
  // injected script). Delivered as a <meta> tag on every page, so script-src/style-src hashes
  // always match whatever Astro actually inlined that build; no manual hash-keeping.
  // frame-ancestors can't be delivered via <meta> — that one lives in the .htaccess header
  // instead (see scripts/make-htaccess.mjs), deliberately as its own separate, non-overlapping
  // policy so the two never need to be kept in sync.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://i.ytimg.com",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
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
      filter: (page) => !page.includes('/404') && !page.includes('/awards-and-recognition'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
