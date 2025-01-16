import { type Drizzle, useDrizzle } from '@/lib/drizzle.ts'
import { useQuery, type UseQueryReturnType } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, type Ref, shallowRef, toValue, watchEffect } from 'vue'
import type { Query, SQLWrapper } from 'drizzle-orm/sql/sql'
import * as schema from '@/db/schema.ts'
import { PgDialect, type PgSelect, type PgSelectDynamic } from 'drizzle-orm/pg-core'
import { PgCountBuilder } from 'drizzle-orm/pg-core/query-builders/count'
import { is, sql, SQL } from 'drizzle-orm'
import { useLiveState } from '@/composables/useLiveState.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DBQueryDynamicType = PgSelectDynamic<any> | PgCountBuilder<any> | SQL

type QueryResultType<
  // override for data returned by the query
  TData = void,
  // actual return type of the query
  TQueryFnData extends SQLWrapper | string = SQLWrapper | string,
> = TData extends void
  ? TQueryFnData extends SQL<infer T>
    ? T
    : TQueryFnData extends string
      ? TData[]
      : Awaited<TQueryFnData>
  : TData[]

export type UseDBQueryFunctionContext = {
  db: Drizzle
} & typeof schema

export type UseDBQueryOptions<
  // override for data returned by the query
  TData = void,
  // actual return type of the query
  TQueryFnData extends SQLWrapper | string = SQLWrapper | string,
> = {
  query: ((context: UseDBQueryFunctionContext) => TQueryFnData) | MaybeRefOrGetter<TQueryFnData>
}

export type UseDBQueryReturnType<TResult> = {
  data: Ref<Readonly<TResult>>
} & Omit<UseQueryReturnType<TResult, Error>, 'data'>

export function useDBQuery<
  // override for data returned by the query
  TData = void,
  // actual return type of the query
  TQueryFnData extends SQLWrapper | string = SQLWrapper | string,
  TResult = QueryResultType<TData, TQueryFnData>,
>(options: UseDBQueryOptions<TData, TQueryFnData>): UseDBQueryReturnType<TResult> {
  const db = useDrizzle()
  const live = useLiveState()
  const dialect = new PgDialect()

  const queryRef = shallowRef<DBQueryDynamicType>()
  const sqlRef = shallowRef<Query>({
    sql: '',
    params: [],
  })

  const queryKey = computed(() => ['dbQuery', sqlRef.value.sql, ...sqlRef.value.params])

  watchEffect((onCleanup) => {
    const res =
      typeof options.query === 'function'
        ? options.query({ db, ...schema })
        : toValue(options.query)

    let query: DBQueryDynamicType
    let sqlQuery: Query

    if (isString(res)) {
      query = sql.raw(res)
      sqlQuery = dialect.sqlToQuery(query.getSQL())
    } else if (isPgSelect(res)) {
      query = res.$dynamic()
      sqlQuery = dialect.sqlToQuery(query.getSQL())
    } else if (isPgCount(res)) {
      query = res
      sqlQuery = dialect.sqlToQuery(query.getSQL())
    } else if (isSQL(res)) {
      query = res
      sqlQuery = dialect.sqlToQuery(res)
    } else {
      throw new Error('Invalid query')
    }

    const unsubscribe = live.subscribe(sqlQuery)

    queryRef.value = query
    sqlRef.value = sqlQuery

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

export function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

function isString(query: unknown): query is string {
  return typeof query === 'string'
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
