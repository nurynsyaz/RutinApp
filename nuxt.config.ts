import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-03',
  devtools: { enabled: true },
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
    { path: '~/contexts/shell/ui', pathPrefix: false },
    '~/components',
  ],

  // Icons are bundled into the app, so a static build shows them offline
  icon: { clientBundle: { scan: true }, serverBundle: false },

  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Rutin',
      short_name: 'Rutin',
      theme_color: '#0F766E',
      background_color: '#F6F7F9',
      display: 'standalone',
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
  runtimeConfig: {
    public: { dataSource: 'mock' }, // 'mock' now, 'http' when the real API exists
  },
  piniaPluginPersistedstate: { storage: 'localStorage' },
})