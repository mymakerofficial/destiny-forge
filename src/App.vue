<script setup lang="ts">
import { RouterView } from 'vue-router'
import { PGlite } from '@electric-sql/pglite'
import { live, type PGliteWithLive } from '@electric-sql/pglite/live'
import { providePGlite } from '@electric-sql/pglite-vue'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '@/db/schema'
import { provideDrizzle } from '@/lib/drizzle.ts'
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import ScopedAlert from '@/components/error/ScopedAlert.vue'
import { migrator } from '@/lib/migrator.ts'

const client = new PGlite({
  dataDir: 'idb://destiny',
  extensions: {
    live,
    migrator,
  },
})

const db = drizzle({
  client,
  schema,
})

providePGlite(client as unknown as PGliteWithLive)
provideDrizzle(db)
</script>

<template>
  <ErrorBoundary>
    <ScopedAlert />
    <RouterView />
  </ErrorBoundary>
</template>
