import { useInspectorStore } from '~/contexts/shell/application/inspector-store'

// Switches the dev-only event inspector on or off (see 01.event-bus.ts for how that is decided)
export default defineNuxtPlugin((nuxtApp) => {
  useInspectorStore().enable(nuxtApp.$inspectorOn)
})
