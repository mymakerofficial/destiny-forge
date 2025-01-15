<script setup lang="ts">
import { RouterView } from 'vue-router'
import { PGlite } from '@electric-sql/pglite'
import { live } from '@electric-sql/pglite/live'
import { providePGlite } from '@electric-sql/pglite-vue'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '@/db/schema'
import { provideDrizzle } from '@/lib/drizzle.ts'
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import ScopedAlert from '@/components/error/ScopedAlert.vue'

const client = new PGlite({
  extensions: {
    live,
    migrator: {
      name: 'migrator',
      setup: (pg) => {
        return {
          init: async () => {
            const migrations = import.meta.glob('./db/migrations/*.sql', {
              query: '?raw',
              import: 'default',
            })
            for (const path in migrations) {
              const content = await migrations[path]()
              await pg.exec(content)
            }
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
    <ScopedAlert />
    <RouterView />
  </ErrorBoundary>
</template>
