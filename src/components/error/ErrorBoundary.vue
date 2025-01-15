<script setup lang="ts">
import { createErrorBoundary } from '@/composables/useError.ts'

createErrorBoundary()
</script>

<template>
  <slot />
</template>
