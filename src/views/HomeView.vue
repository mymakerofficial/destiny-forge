<script setup lang="ts">
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import ItemList from '@/components/ItemList.vue'
import MainContainer from '@/components/MainContainer.vue'
import SearchTest from '@/components/SearchTest.vue'
import ScopedAlert from '@/components/error/ScopedAlert.vue'
</script>

<template>
  <ErrorBoundary>
    <MainContainer>
      <section class="mb-4">
        <h1 class="text-3xl font-bold">PostgreSQL reactive bindings demo</h1>
        <p>PGlite + Drizzle + TanStack Query</p>
      </section>
      <ErrorBoundary>
        <ScopedAlert />
        <ItemList />
      </ErrorBoundary>
      <hr class="my-12" />
      <ErrorBoundary>
        <ScopedAlert />
        <SearchTest />
      </ErrorBoundary>
    </MainContainer>
  </ErrorBoundary>
</template>
