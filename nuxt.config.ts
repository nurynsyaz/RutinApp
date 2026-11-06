import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-03',
  devtools: { enabled: false },
  ssr: false,
  typescript: { strict: true },
  modules: [
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@vite-pwa/nuxt',
    '@nuxt/icon',
    '@nuxtjs/i18n',
    '@nuxt/eslint',
  ],
  components: [
    { path: '~/contexts/identity/ui', pathPrefix: false },
    { path: '~/contexts/profile/ui', pathPrefix: false },
    { path: '~/contexts/shell/ui', pathPrefix: false },
    { path: '~/contexts/scheduling/ui', pathPrefix: false },
    { path: '~/contexts/attachments/ui', pathPrefix: false },
    '~/components',
  ],
  // Icons are bundled into the app, so a static build shows them offline
  icon: { clientBundle: { scan: true }, serverBundle: false },
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  runtimeConfig: {
    public: { dataSource: 'mock' },
  },
  piniaPluginPersistedstate: { storage: 'localStorage' },
  pwa: {
    registerType: 'prompt',
    // SH-02: the install card shows until the person says "Not now"; the choice is kept under this key
    client: { installPrompt: 'rutin.install.hidden' },
    manifest: {
      name: 'Rutin',
      short_name: 'Rutin',
      start_url: '/today',
      display: 'standalone',
      theme_color: '#0F766E',
      background_color: '#F6F7F9',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // App shell and fonts are precached. Any other page opens the app, which then routes itself.
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,webmanifest}'],
      runtimeCaching: [
        {
          // Images use CacheFirst (BRD s.10)
          urlPattern: ({ request }) => request.destination === 'image',
          handler: 'CacheFirst',
          options: { cacheName: 'images' },
        },
      ],
    },
  },
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [
      { code: 'en', language: 'en-MY', name: 'English', file: 'en.json' },
      { code: 'ms', language: 'ms-MY', name: 'Bahasa Melayu', file: 'ms.json' },
    ],
  },
})
