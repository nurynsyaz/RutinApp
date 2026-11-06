import { useShellStore } from '~/contexts/shell/application/shell-store'

// SH-02: a new version never reloads the page by itself, so nobody loses what they are typing.
// The toast stays until the person reloads or closes it (a toast with an action does not time out).
export default defineNuxtPlugin({
  name: 'rutin:update-prompt',
  // $pwa comes from the PWA module's own plugin, which runs late
  dependsOn: ['vite-pwa:nuxt:client:plugin'],
  setup(nuxtApp) {
    const shell = useShellStore()
    const pwa = nuxtApp.$pwa
    if (!pwa) return

    watch(
      () => pwa.needRefresh,
      (needed) => {
        if (!needed) return
        shell.notify({
          kind: 'info',
          title: nuxtApp.$i18n.t('shell.update.title'),
          body: nuxtApp.$i18n.t('shell.update.body'),
          actionLabel: nuxtApp.$i18n.t('shell.update.action'),
          onAction: () => void pwa.updateServiceWorker(true),
        })
      },
      { immediate: true },
    )
  },
})
