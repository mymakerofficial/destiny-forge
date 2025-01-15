<script setup lang="ts">
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import PlaygroundContent from '@/components/PlaygroundContent.vue'
</script>

<template>
  <ErrorBoundary>
    <PlaygroundContent />
  </ErrorBoundary>
</template>
