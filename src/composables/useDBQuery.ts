import type { Drizzle } from '@/lib/drizzle.ts'
import { injectDrizzle } from '@/lib/drizzle.ts'
import { injectPGlite } from '@electric-sql/pglite-vue'
import { type DefaultError, useQuery, type UseQueryReturnType } from '@tanstack/vue-query'
import type { PgSelect } from 'drizzle-orm/pg-core'
import { toValue } from 'vue'

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
  const pg = injectPGlite()!

  return useQuery({
    queryKey: ['db'],
    queryFn: async () => {
      const select = options.query({ db })
      const query = select.toSQL()
      const res = await pg.query(query.sql, query.params.map((it) => toValue(it)))
      return res.rows
    },
    initialData: [],
  })
}
