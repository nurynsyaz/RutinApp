import withNuxt from './.nuxt/eslint.config.mjs'

const contexts = ['identity', 'profile', 'scheduling', 'attachments', 'shell']

// What each layer must NOT import (BRD section 5.2)
const layerBans = {
  domain: ['vue', 'vue-router', 'pinia', '@pinia/nuxt', '#app', '#imports', 'nuxt', 'nuxt/*', '**/application/**', '**/infrastructure/**', '**/ui/**'],
  application: ['**/infrastructure/**', '**/ui/**'],
  infrastructure: ['**/ui/**'],
  ui: ['**/infrastructure/**', '~/mocks/**'],
}

const boundaryRules = contexts.flatMap((ctx) => {
  const others = contexts.filter((c) => c !== ctx)
  const otherContexts = others.flatMap((o) => [`~/contexts/${o}/**`, `**/contexts/${o}/**`])
  return Object.entries(layerBans).map(([layer, bans]) => ({
    files: [`app/contexts/${ctx}/${layer}/**/*.{ts,vue}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: bans, message: `The ${layer} layer cannot import this (see BRD 5.2).` },
            { group: otherContexts, message: 'Contexts must not import each other. Use the event bus.' },
          ],
        },
      ],
    },
  }))
})

export default withNuxt(...boundaryRules, {
  files: ['app/contexts/*/domain/**/*.ts'],
  rules: { '@typescript-eslint/no-explicit-any': 'error' },
})