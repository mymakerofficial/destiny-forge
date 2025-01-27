<script setup lang="ts">
import { RouterView } from 'vue-router'
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import ScopedAlert from '@/components/error/ScopedAlert.vue'
import { toast, Toaster } from 'vue-sonner'
import { PGliteWorker } from '@electric-sql/pglite/worker'
import { live, type PGliteWithLive } from '@electric-sql/pglite/live'
import { electricSync } from '@electric-sql/pglite-sync'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '@/db/schema.ts'
import { providePGlite } from '@electric-sql/pglite-vue'
import { provideDrizzle } from '@/lib/drizzle.ts'
import { onMounted, reactive } from 'vue'
import { migrate, MigratorStatus } from '@/lib/migrator.ts'
import { LoaderCircle } from 'lucide-vue-next'
import type { PGliteWithExtensions } from '@/lib/pglite.ts'
import { setupSync } from '@/lib/sync.ts'

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
      electric: electricSync({ debug: true }),
    },
  },
) as unknown as PGliteWithExtensions

const db = drizzle({
  client: pg as unknown as PGlite,
  schema,
  casing: 'snake_case',
  // logger: {
  //   logQuery(query: string, params: unknown[]): void {
  //     console.log('Query:', { query, params })
  //     toast(`Query executed`, {
  //       description: `${query}\n${JSON.stringify(params)}`,
  //     })
  //   },
  // },
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

  loadingState.title = 'Sync'

  await setupSync(pg, db)

  // const getItemsNotSynced = db
  //   .select()
  //   .from(schema.items)
  //   .where(eq(schema.items.isSynced, false))
  //   .toSQL()
  // await pg.live.query({
  //   query: getItemsNotSynced.sql,
  //   params: getItemsNotSynced.params,
  //   callback: (res) => {
  //     console.log(res)
  //     // TODO: send to server
  //     //  encrypt text fields
  //     //  omit original text fields
  //     //  include session id
  //   },
  // })
  //
  // const getItemsNotDecrypted = db
  //   .select()
  //   .from(schema.items)
  //   .where(eq(schema.items.isDecrypted, false))
  //   .toSQL()
  // await pg.live.query({
  //   query: getItemsNotDecrypted.sql,
  //   params: getItemsNotDecrypted.params,
  //   callback: (res) => {
  //     console.log(res)
  //     // TODO: decrypt and update locally
  //   },
  // })

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
