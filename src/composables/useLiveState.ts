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

  function unsubscribe(sql: string) {
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

  function subscribe({ sql, params }: Query): () => void {
    const existing = queryMap.get(sql)

    if (existing) {
      existing.count++
    } else {
      queryMap.set(sql, {
        count: 1,
        unsubscribe: () => Promise.resolve(),
      })

      pg.live.query(sql, params).then((live) => {
        queryMap.get(sql)!.unsubscribe = live.unsubscribe

        live.subscribe(async () => {
          await client.invalidateQueries({
            queryKey: ['dbQuery', sql],
          })
        })
      })
    }

    return () => unsubscribe(sql)
  }

  return {
    subscribe,
    unsubscribe,
  }
})
