<script setup lang="ts">
import { RouterView } from 'vue-router'
import { live, type PGliteWithLive } from '@electric-sql/pglite/live'
import { providePGlite } from '@electric-sql/pglite-vue'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '@/db/schema'
import { provideDrizzle } from '@/lib/drizzle.ts'
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import ScopedAlert from '@/components/error/ScopedAlert.vue'
import { migrate, MigratorStatus } from '@/lib/migrator.ts'
import { toast, Toaster } from 'vue-sonner'
import { PGliteWorker } from '@electric-sql/pglite/worker'
import { onMounted, reactive } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import type { PGlite } from '@electric-sql/pglite'
import type { PGliteWithExtensions } from '@/lib/pglite.ts'

const loadingState = reactive({
  isComplete: false,
  isError: false,
  title: 'Loading',
  message: 'Getting ready...',
})

const pg = new PGliteWorker(
  new Worker(new URL('@/lib/pgliteWorker', import.meta.url), {
    type: 'module',
  }),
  {
    extensions: {
      live,
    },
  },
) as unknown as PGliteWithExtensions

const db = drizzle({
  client: pg as unknown as PGlite,
  schema,
  logger: {
    logQuery(query: string, params: unknown[]): void {
      console.log({ query, params })
      toast(`Query executed`, {
        description: `${query}\n${JSON.stringify(params)}`,
      })
    },
  },
})

providePGlite(pg as unknown as PGliteWithLive)
provideDrizzle(db)

onMounted(async () => {
  loadingState.title = 'Starting database...'
  loadingState.message = 'Waiting for database to be ready'

  await pg.waitReady

  loadingState.message = 'Loading extensions'

  await pg.exec('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
  await pg.exec('CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;')

  loadingState.title = 'Migrating data...'
  await migrate(pg, (status, msg) => {
    if (status === MigratorStatus.Error) {
      loadingState.isError = true
    }
    loadingState.message = msg
  })

  loadingState.isComplete = true
})
</script>

<template>
  <Toaster :visible-toasts="10" theme="dark" />
  <main v-if="!loadingState.isComplete" class="h-screen flex items-center justify-center">
    <div
      :data-error="loadingState.isError"
      class="group px-6 flex flex-wrap gap-2 items-center data-[error=true]:text-destructive"
    >
      <div class="flex flex-row gap-2 items-center">
        <LoaderCircle class="animate-spin size-6" />
        <h1 class="text-lg font-medium truncate">{{ loadingState.title }}</h1>
      </div>
      <p class="text-lg text-muted-foreground group-data-[error=true]:text-destructive">
        {{ loadingState.message }}
      </p>
    </div>
  </main>
  <ErrorBoundary v-else>
    <ScopedAlert />
    <RouterView />
  </ErrorBoundary>
</template>
