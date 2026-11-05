<script setup lang="ts">
import { useShellLocale } from '~/contexts/shell/ui/use-shell-locale'

await useShellLocale().init()
</script>

<template>
  <!-- Adds the <link rel="manifest"> tag, without it Chrome finds no manifest and offers no install -->
  <VitePwaManifest />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ToastHost />
</template>
