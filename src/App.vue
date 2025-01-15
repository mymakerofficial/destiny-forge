<script setup lang="ts">
import { RouterView } from 'vue-router'
import { PGlite } from '@electric-sql/pglite'
import { live } from '@electric-sql/pglite/live'
import { providePGlite } from '@electric-sql/pglite-vue'
import { drizzle } from 'drizzle-orm/pglite'
import migrate from '@/db/migrate.sql?raw'
import * as schema from '@/db/schema'
import { provideDrizzle } from '@/lib/drizzle.ts'
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import ErrorAlert from '@/components/error/ErrorAlert.vue'

const client = new PGlite({
  extensions: {
    live,
    seed: {
      name: 'seed',
      setup: (pg) => {
        return {
          init: async () => {
            await pg.exec(migrate)
          },
        }
      },
    },
  },
})

const db = drizzle({
  client,
  schema,
})

providePGlite(client)
provideDrizzle(db)
</script>

<template>
  <ErrorBoundary>
    <ErrorAlert />
    <RouterView />
  </ErrorBoundary>
</template>
