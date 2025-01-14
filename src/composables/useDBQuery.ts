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
import type { ColumnsSelection, Query, SQLWrapper } from 'drizzle-orm/sql/sql'
import type {
  JoinNullability,
  SelectMode,
  SelectResult,
} from 'drizzle-orm/query-builders/select.types'
import * as schema from '@/db/schema.ts'
import { PgDialect, type PgSelect } from 'drizzle-orm/pg-core'
import { PgCountBuilder } from 'drizzle-orm/pg-core/query-builders/count'
import { is } from 'drizzle-orm'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DBQueryType = RelaxedPgSelect | PgCountBuilder<any>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DBQueryDynamicType = PgSelect | PgCountBuilder<any>

export type DBQueryFunctionContext = {
  db: Drizzle
} & typeof schema

export type DBQueryOptions<T extends DBQueryType> = {
  query: (context: DBQueryFunctionContext) => T
}

export function useDBQuery<T extends DBQueryType = DBQueryType>(
  options: DBQueryOptions<T>,
): UseQueryReturnType<Awaited<T>, DefaultError> {
  // TODO: allow magic sql queries and drizzle query api

  const db = injectDrizzle()
  const pg = injectPGlite()
  const client = useQueryClient()
  const dialect = new PgDialect()

  const queryRef = shallowRef<DBQueryDynamicType>()
  const sqlRef = shallowRef<Query>({
    sql: '',
    params: [],
  })

  const queryKey = computed(() => ['dbQuery', sqlRef.value.sql, ...sqlRef.value.params])

  watchEffect(async (onCleanup) => {
    const res = options.query({ db, ...schema })

    let query: DBQueryDynamicType
    let sql: Query

    if (isPgSelect(res)) {
      query = res.$dynamic()
      sql = dialect.sqlToQuery(query.getSQL())
    } else if (isPgCount(res)) {
      query = res
      sql = dialect.sqlToQuery(query.getSQL())
    } else {
      throw new Error('Invalid query')
    }

    queryRef.value = query
    sqlRef.value = sql

    // this essentially causes the query to run twice
    //  we would like to use the value from the live query
    //  but drizzle does some fancy mapping that we need and can't replicate,
    //  so we only use the value from the drizzle query
    const live = await pg.live.query(
      sql.sql,
      sql.params.map((it) => toValue(it)),
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
      // awaiting the query causes it to run
      return (await queryRef.value!) as Awaited<T>
    },
    enabled: queryRef.value !== undefined,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    initialData: [],
  })
}

function isPgSelect(query: DBQueryType): query is PgSelect {
  return '$dynamic' in query
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPgCount(query: DBQueryType): query is PgCountBuilder<any> {
  return is(query, PgCountBuilder)
}
