import { defineConfig } from 'astro/config';

// GitHub Pages serves this as a project site, so every page lives under /rbrwt.
// The deploy workflow passes the real origin and base path; these are the defaults for local builds.
export default defineConfig({
  site: process.env.SITE_URL || 'https://auroruse.github.io',
  base: process.env.BASE_PATH || '/rbrwt',
  // Styles inside every page: a browser holding an older page can never ask for a stylesheet a newer deploy removed.
  build: { inlineStylesheets: 'always' },
});
