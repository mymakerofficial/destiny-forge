import { type Drizzle, injectDrizzle } from '@/lib/drizzle.ts'
import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query'
import { computed, type Ref, shallowRef, watchEffect } from 'vue'
import type { Query, SQLWrapper } from 'drizzle-orm/sql/sql'
import * as schema from '@/db/schema.ts'
import { PgDialect, type PgSelect, type PgSelectDynamic } from 'drizzle-orm/pg-core'
import { PgCountBuilder } from 'drizzle-orm/pg-core/query-builders/count'
import { is, SQL } from 'drizzle-orm'
import { useLiveState } from '@/composables/useLiveState.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DBQueryDynamicType = PgSelectDynamic<any> | PgCountBuilder<any> | SQL

export type UseDBQueryFunctionContext = {
  db: Drizzle
} & typeof schema

export type UseDBQueryOptions<
  TData extends { [key: string]: unknown } | unknown = unknown,
  TQuery extends SQLWrapper = SQLWrapper,
  // if TData is given, return it, otherwise return the result of the query
  TQueryResult = TData extends { [key: string]: unknown } ? TData : Awaited<TQuery>,
  TResult = TQueryResult,
> = {
  query: (context: UseDBQueryFunctionContext) => TQuery
  select?: (data: TQueryResult) => TResult
}

export type UseDBQueryReturnType<TResult> = {
  data: Ref<Readonly<TResult>>
} & Omit<UseQueryReturnType<TResult, Error>, 'data'>

export function useDBQuery<
  TData extends { [key: string]: unknown } | unknown = unknown,
  TQuery extends SQLWrapper = SQLWrapper,
  // if TData is given, return it, otherwise return the result of the query
  TQueryResult = TData extends { [key: string]: unknown } ? TData : Awaited<TQuery>,
  TResult = TQueryResult,
>(options: UseDBQueryOptions<TData, TQuery, TQueryResult, TResult>): UseDBQueryReturnType<TResult> {
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
        return (await db.execute(query)).rows
      }

      // awaiting the query causes it to run
      return query
    },
    // should always be true by this point but just to be safe
    enabled: () => queryRef.value !== undefined,
    initialData: () => (isPgCount(queryRef.value!) ? 0 : []),
    refetchOnWindowFocus: false,
  }) as UseDBQueryReturnType<TResult>
}

function isPgSelect(query: SQLWrapper): query is PgSelect {
  return '$dynamic' in query
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPgCount(query: SQLWrapper): query is PgCountBuilder<any> {
  return is(query, PgCountBuilder)
}

function isSQL(query: SQLWrapper): query is SQL {
  return is(query, SQL) && !isPgCount(query)
}
