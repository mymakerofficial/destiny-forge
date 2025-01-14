import type { Drizzle } from '@/lib/drizzle.ts'
import { injectDrizzle } from '@/lib/drizzle.ts'
import { type DefaultError, useQuery, useQueryClient, type UseQueryReturnType } from '@tanstack/vue-query'
import type { PgSelect } from 'drizzle-orm/pg-core'
import { toValue } from 'vue'
import { injectPGlite } from '@/lib/pglite.ts'

export type DBQueryFunctionContext = {
  db: Drizzle
}

export type DBQueryOptions<T extends PgSelect> = {
  query: (context: DBQueryFunctionContext) => T
}

export function useDBQuery<T extends PgSelect>(
  options: DBQueryOptions<T>,
): UseQueryReturnType<Awaited<T>, DefaultError> {
  const db = injectDrizzle()
  const pg = injectPGlite()
  const client = useQueryClient()

  const select = options.query({ db })
  const query = select.toSQL()

  const queryKey = ['dbQuery', query]

  return useQuery({
    queryKey,
    queryFn: async (ctx) => {
      const res = await pg.live.query(query.sql, query.params.map((it) => toValue(it)))

      // TODO: handle unsubscribe after key changes

      // console.log('got query results', queryKey, res.initialResults.rows)

      const callback = (results) => {
        // console.log('setting query data', queryKey, results)
        client.setQueryData(queryKey, results.rows)
      }

      res.subscribe(callback)

      ctx.signal.onabort = () => {
        // console.log('unsubscribing from query', queryKey)
        res.unsubscribe(callback)
      }

      return res.initialResults.rows
    },
    initialData: [],
  })
}
