import { type Drizzle, injectDrizzle } from '@/lib/drizzle.ts'
import {
  type DefaultError,
  useQuery,
  useQueryClient,
  type UseQueryReturnType,
  keepPreviousData,
} from '@tanstack/vue-query'
import { computed, onScopeDispose, shallowRef, toValue, watchEffect } from 'vue'
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
import { is, SQL } from 'drizzle-orm'
import { createGlobalState } from '@vueuse/core'

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
export type DBQueryType = RelaxedPgSelect | PgCountBuilder<any> | SQLWrapper

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DBQueryDynamicType = PgSelect | PgCountBuilder<any> | SQL

export type DBQueryFunctionContext = {
  db: Drizzle
} & typeof schema

export type DBQueryOptions<TQuery extends DBQueryType> = {
  query: (context: DBQueryFunctionContext) => TQuery
}

const useLiveState = createGlobalState(() => {
  const pg = injectPGlite()
  const client = useQueryClient()

  const queryMap = new Map<string, {
    count: number,
    unsubscribe: () => Promise<void>,
  }>

  function unsubscribe(sql: string) {
    const existing = queryMap.get(sql)

    if (!existing) {
      return
    }

    existing.count--

    if (existing.count === 0) {
      existing.unsubscribe()
      queryMap.delete(sql)
    }
  }

  function subscribe({ sql, params }: Query) {
    const existing = queryMap.get(sql)

    if (existing) {
      existing.count++
      return
    }

    queryMap.set(sql, {
      count: 1,
      unsubscribe: () => {}
    })

    pg.live.query(
      sql,
      params,
    ).then((live) => {
      queryMap.get(sql)!.unsubscribe = live.unsubscribe

      live.subscribe(async () => {
        await client.invalidateQueries({
          queryKey: ['dbQuery', sql],
        })
      })
    })

    return () => unsubscribe(sql)
  }

  return {
    subscribe,
    unsubscribe,
  }
})

export function useDBQuery<TQuery extends DBQueryType = DBQueryType>(
  options: DBQueryOptions<TQuery>,
): UseQueryReturnType<Awaited<TQuery>, DefaultError> {
  const db = injectDrizzle()
  const live = useLiveState()
  const dialect = new PgDialect()

  const queryRef = shallowRef<DBQueryDynamicType>()
  const sqlRef = shallowRef<Query>({
    sql: '',
    params: [],
  })

  const queryKey = computed(() => ['dbQuery', sqlRef.value.sql, ...sqlRef.value.params])

  watchEffect((onCleanup) => {
    const res = options.query({ db, ...schema })

    let query: DBQueryDynamicType
    let sql: Query

    if (isPgSelect(res)) {
      query = res.$dynamic()
      sql = dialect.sqlToQuery(query.getSQL())
    } else if (isPgCount(res)) {
      query = res
      sql = dialect.sqlToQuery(query.getSQL())
    } else if (isSQL(res)) {
      query = res
      sql = dialect.sqlToQuery(res)
    } else {
      throw new Error('Invalid query')
    }

    const unsubscribe = live.subscribe(sql)

    queryRef.value = query
    sqlRef.value = sql

    onCleanup(unsubscribe)
  })

  return useQuery({
    queryKey,
    queryFn: async () => {
      const query = queryRef.value!

      if (isSQL(query)) {
        // execute returns the raw result
        return (await db.execute(query)).rows as Awaited<TQuery>
      }

      // awaiting the query causes it to run
      return (await query) as Awaited<TQuery>
    },
    // should always be true by this point but just to be safe
    enabled: () => queryRef.value !== undefined,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    initialData: () => isPgCount(queryRef.value!) ? 0 : [],
    placeholderData: keepPreviousData,
  })
}

function isPgSelect(query: DBQueryType): query is PgSelect {
  return '$dynamic' in query
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPgCount(query: DBQueryType): query is PgCountBuilder<any> {
  return is(query, PgCountBuilder)
}

function isSQL(query: DBQueryType): query is SQL {
  return is(query, SQL) && !isPgCount(query)
}
