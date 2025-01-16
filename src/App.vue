<script setup lang="ts">
import { RouterView } from 'vue-router'
import { live, type PGliteWithLive } from '@electric-sql/pglite/live'
import { providePGlite } from '@electric-sql/pglite-vue'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '@/db/schema'
import { provideDrizzle } from '@/lib/drizzle.ts'
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'
import ScopedAlert from '@/components/error/ScopedAlert.vue'
import { migrate } from '@/lib/migrator.ts'
import { toast, Toaster } from 'vue-sonner'
import { PGliteWorker } from '@electric-sql/pglite/worker'
import { onMounted, ref } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import type { PGlite } from '@electric-sql/pglite'

const completed = ref(false)

const client = new PGliteWorker(
  new Worker(new URL('@/lib/pgliteWorker', import.meta.url), {
    type: 'module',
  }),
  {
    extensions: {
      live,
    },
  },
) as unknown as PGlite

const db = drizzle({
  client,
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

providePGlite(client as unknown as PGliteWithLive)
provideDrizzle(db)

onMounted(async () => {
  await migrate(client)

  completed.value = true
})
</script>

<template>
  <Toaster :visible-toasts="10" theme="dark" />
  <main v-if="!completed" class="h-screen flex items-center justify-center">
    <div class="flex flex-row gap-2 items-center text-muted-foreground">
      <LoaderCircle class="animate-spin size-6" />
      <p class="text-lg">Initiating database...</p>
    </div>
  </main>
  <ErrorBoundary v-else>
    <ScopedAlert />
    <RouterView />
  </ErrorBoundary>
</template>
