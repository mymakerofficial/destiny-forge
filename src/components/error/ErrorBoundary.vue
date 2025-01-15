<script setup lang="ts">
import { createErrorBoundary } from '@/lib/alert.ts'

createErrorBoundary()
</script>

<template>
  <slot />
</template>
