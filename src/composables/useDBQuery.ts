import type { Drizzle } from '@/lib/drizzle.ts'
import { injectDrizzle } from '@/lib/drizzle.ts'
import {
  type DefaultError,
  useQuery,
  useQueryClient,
  type UseQueryReturnType,
} from '@tanstack/vue-query'
import { toValue } from 'vue'
import { injectPGlite } from '@/lib/pglite.ts'
import { type PgSelectBase } from 'drizzle-orm/pg-core/query-builders/select'
import type { ColumnsSelection } from 'drizzle-orm/sql/sql'
import type {
  JoinNullability,
  SelectMode,
  SelectResult,
} from 'drizzle-orm/query-builders/select.types'

export type RelaxedPgSelect<
  TTableName extends string | undefined = string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSelection extends ColumnsSelection = Record<string, any>,
  TSelectMode extends SelectMode = SelectMode,
  TNullabilityMap extends Record<string, JoinNullability> = Record<string, JoinNullability>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TResult extends any[] = SelectResult<TSelection, TSelectMode, TNullabilityMap>[],
> = Pick<
  PgSelectBase<TTableName, TSelection, TSelectMode, TNullabilityMap, boolean, never, TResult>,
  '$dynamic'
>

export type DBQueryFunctionContext = {
  db: Drizzle
}

export type DBQueryOptions<TSelect extends RelaxedPgSelect> = {
  query: (context: DBQueryFunctionContext) => TSelect
}

export function useDBQuery<TSelect extends RelaxedPgSelect>(
  options: DBQueryOptions<TSelect>,
): UseQueryReturnType<Awaited<TSelect>, DefaultError> {
  const db = injectDrizzle()
  const pg = injectPGlite()
  const client = useQueryClient()

  const select = options.query({ db })
  const query = select.$dynamic().toSQL()

  const queryKey = ['dbQuery', query.sql, ...query.params]

  return useQuery({
    queryKey,
    queryFn: async (ctx): Promise<Awaited<TSelect>> => {
      const res = await pg.live.query(
        query.sql,
        query.params.map((it) => toValue(it)),
      )

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

      return res.initialResults.rows as Awaited<TSelect>
    },
    initialData: [],
  })
}
