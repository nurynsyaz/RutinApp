import withNuxt from './.nuxt/eslint.config.mjs'
import boundaries from 'eslint-plugin-boundaries'

const contexts = ['identity', 'profile', 'scheduling', 'attachments', 'shell']

// What each layer may not import (BRD section 5.2)
const layerBans = {
  domain: ['application', 'infrastructure', 'ui'],
  application: ['infrastructure', 'ui'],
  infrastructure: ['ui'],
  ui: ['infrastructure'],
}

// Rule 5: contexts never import each other
const contextPolicies = contexts.map((c) => ({
  from: { element: { captured: { context: c } } },
  disallow: { to: { element: { captured: { context: contexts.filter((o) => o !== c) } } } },
  message: 'Contexts must not import each other. Use the event bus.',
}))

// Rules 1 to 4: layer direction
const layerPolicies = Object.entries(layerBans).map(([layer, banned]) => ({
  from: { element: { captured: { layer } } },
  disallow: { to: { element: { captured: { layer: banned } } } },
  message: `The ${layer} layer cannot import ${banned.join(' or ')} (BRD 5.2).`,
}))

const uiNoMocks = {
  from: { element: { captured: { layer: 'ui' } } },
  disallow: { to: { element: { type: 'mocks' } } },
  message: 'UI must not import mocks directly.',
}

export default withNuxt(
  {
    files: ['app/**/*.{ts,vue}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './.nuxt/tsconfig.app.json' },
      },
      'boundaries/elements': [
        { type: 'kernel', pattern: 'app/kernel' },
        { type: 'mocks', pattern: 'app/mocks' },
        { type: 'layer', pattern: 'app/contexts/*/*', capture: ['context', 'layer'] },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        2,
        { default: 'allow', policies: [...contextPolicies, ...layerPolicies, uiNoMocks] },
      ],
    },
  },
  {
    // Rule 1: domain is plain TypeScript, no framework
    files: ['app/contexts/*/domain/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['vue', 'vue-router', 'pinia', '@pinia/nuxt', 'nuxt', 'nuxt/*'], message: 'Domain must be plain TypeScript (BRD 5.2).' },
            { regex: '^#(app|imports)', message: 'Domain must be plain TypeScript (BRD 5.2).' },
          ],
        },
      ],
    },
  },
)