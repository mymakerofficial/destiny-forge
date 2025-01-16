<script setup lang="ts">
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import PlaygroundContent from '@/components/PlaygroundContent.vue'
</script>

<template>
  <div class="flex flex-wrap">
    <ErrorBoundary>
      <PlaygroundContent />
    </ErrorBoundary>
    <ErrorBoundary>
      <PlaygroundContent />
    </ErrorBoundary>
  </div>
</template>
