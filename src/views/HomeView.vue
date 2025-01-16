<script setup lang="ts">
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import ItemList from '@/components/ItemList.vue'
</script>

<template>
  <ErrorBoundary>
    <ItemList />
  </ErrorBoundary>
</template>
