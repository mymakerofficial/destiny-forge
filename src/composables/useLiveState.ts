import { createGlobalState } from '@vueuse/core'
import { injectPGlite } from '@/lib/pglite.ts'
import { useQueryClient } from '@tanstack/vue-query'
import type { Query } from 'drizzle-orm/sql/sql'

export const useLiveState = createGlobalState(() => {
  const pg = injectPGlite()
  const client = useQueryClient()

  const queryMap = new Map<
    string,
    {
      count: number
      unsubscribe: () => Promise<void>
    }
  >()

  async function unsubscribe(sql: string) {
    const existing = queryMap.get(sql)

    if (!existing) {
      return
    }

    existing.count--

    if (existing.count === 0) {
      existing.unsubscribe().then(() => {
        queryMap.delete(sql)
      })
    }
  }

  async function subscribe({ sql, params }: Query): Promise<() => Promise<void>> {
    const existing = queryMap.get(sql)

    if (existing) {
      existing.count++
    } else {
      const abortController = new AbortController()

      queryMap.set(sql, {
        count: 1,
        unsubscribe: () => {
          // aborting the signal is the same as unsubscribing all listeners
          abortController.abort()
          queryMap.delete(sql)
          return Promise.resolve()
        },
      })

      const live = await pg.live.query({
        query: sql,
        params,
        signal: abortController.signal,
      })

      if (queryMap.get(sql)) {
        // if the query has not been aborted subscribe to updates
        live.subscribe(async () => {
          await client.invalidateQueries({
            queryKey: ['dbQuery', sql],
          })
        })
      }
    }

    return () => unsubscribe(sql)
  }

  return {
    subscribe,
    unsubscribe,
  }
})
