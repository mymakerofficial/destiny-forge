import { type Drizzle, injectDrizzle } from '@/lib/drizzle.ts'
import {
  type DefaultError,
  useQuery,
  useQueryClient,
  type UseQueryReturnType,
} from '@tanstack/vue-query'
import { computed, shallowRef, toValue, watchEffect } from 'vue'
import { injectPGlite } from '@/lib/pglite.ts'
import { type PgSelectBase } from 'drizzle-orm/pg-core/query-builders/select'
import type { ColumnsSelection, Query } from 'drizzle-orm/sql/sql'
import type {
  JoinNullability,
  SelectMode,
  SelectResult,
} from 'drizzle-orm/query-builders/select.types'
import * as schema from '@/db/schema.ts'
import type { PgSelect } from 'drizzle-orm/pg-core'

// stupidly complex type that allows us to accept drizzle queries at any stage of construction
//  without the user needing to use $dynamic
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
} & typeof schema

export type DBQueryOptions<TSelect extends RelaxedPgSelect> = {
  query: (context: DBQueryFunctionContext) => TSelect
}

export function useDBQuery<TSelect extends RelaxedPgSelect>(
  options: DBQueryOptions<TSelect>,
): UseQueryReturnType<Awaited<TSelect>, DefaultError> {
  // TODO: allow magic sql queries and drizzle query api

  const db = injectDrizzle()
  const pg = injectPGlite()
  const client = useQueryClient()

  const selectRef = shallowRef<PgSelect>()
  const queryRef = shallowRef<Query>({
    sql: '',
    params: [],
  })

  const queryKey = computed(() => ['dbQuery', queryRef.value.sql, ...queryRef.value.params])

  watchEffect(async (onCleanup) => {
    const select = options.query({ db, ...schema }).$dynamic()
    const query = select.toSQL()

    selectRef.value = select
    queryRef.value = query

    // this essentially causes the query to run twice
    //  we would like to use the value from the live query
    //  but drizzle does some fancy mapping that we need and can't replicate,
    //  so we only use the value from the drizzle query
    const live = await pg.live.query(
      query.sql,
      query.params.map((it) => toValue(it)),
    )

    live.subscribe(async () => {
      await client.invalidateQueries({
        queryKey,
      })
    })

    onCleanup(async () => {
      await live.unsubscribe()
    })
  })

  return useQuery({
    queryKey,
    queryFn: async () => {
      return (await selectRef.value!.execute()) as Awaited<TSelect>
    },
    enabled: selectRef.value !== undefined,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    initialData: [],
  })
}
