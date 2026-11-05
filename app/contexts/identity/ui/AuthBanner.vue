<template>
  <div
    role="alert"
    class="flex gap-2 rounded-lg border border-danger-line bg-danger-soft p-3 text-sm text-danger"
  >
    <Icon name="lucide:triangle-alert" class="mt-0.5 size-4 shrink-0" />
    <p><slot /></p>
  </div>
</template>
