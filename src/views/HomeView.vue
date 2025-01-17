<script setup lang="ts">
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import ItemList from '@/components/ItemList.vue'
import MainContainer from '@/components/MainContainer.vue'
import SearchTest from '@/components/SearchTest.vue'
import ScopedAlert from '@/components/error/ScopedAlert.vue'
import { getSessionId } from '../lib/crypt.ts'
</script>

<template>
  <ErrorBoundary>
    <MainContainer>
      <section class="mb-4">
        <h1 class="text-3xl font-bold">PostgreSQL reactive bindings demo</h1>
        <p>PGlite + Drizzle + TanStack Query + ElectricSQL</p>
      </section>
      <ErrorBoundary>
        <ScopedAlert />
        <ItemList />
      </ErrorBoundary>
      <!--      <hr class="my-12" />-->
      <!--      <ErrorBoundary>-->
      <!--        <ScopedAlert />-->
      <!--        <SearchTest />-->
      <!--      </ErrorBoundary>-->
      <hr class="my-12" />
      <p class="text-muted-foreground font-xs">{{ getSessionId() }}</p>
    </MainContainer>
  </ErrorBoundary>
</template>
