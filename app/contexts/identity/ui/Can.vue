<!-- eslint-disable vue/multi-word-component-names -- the BRD names this component Can -->
<script setup lang="ts">
import type { Permission } from '../domain/permissions'
import { useCan } from './use-can'

const props = defineProps<{ permission: Permission }>()
const can = useCan()
</script>

<template>
  <slot v-if="can(props.permission)" />
</template>
