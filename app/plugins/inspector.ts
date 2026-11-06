import { useInspectorStore } from '~/contexts/shell/application/inspector-store'

// Switches the dev-only event inspector on or off (see event-bus.ts for how that is decided)
export default defineNuxtPlugin({
  name: 'inspector',
  dependsOn: ['event-bus'],
  setup(nuxtApp) {
    useInspectorStore().enable(nuxtApp.$inspectorOn)
  },
})