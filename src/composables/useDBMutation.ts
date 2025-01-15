import { type Drizzle, injectDrizzle } from '@/lib/drizzle.ts'
import * as schema from '@/db/schema.ts'
import { type DefaultError, type UseMutationOptions } from '@tanstack/vue-query'
import { type AnyPgUpdate } from 'drizzle-orm/pg-core'
import type { AnyPgInsert } from 'drizzle-orm/pg-core/query-builders/insert'
import type { AnyPgDeleteBase } from 'drizzle-orm/pg-core/query-builders/delete'
import { SQL } from 'drizzle-orm'
import { useHandledMutation } from '@/composables/useHandledMutation.ts'

export type DBMutationFunctionContext = {
  db: Drizzle
} & typeof schema

type MaybePromise<T> = T | Promise<T>

export type DBMutationOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> = Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> & {
  mutation: (
    variables: TVariables,
    context: DBMutationFunctionContext,
  ) => MaybePromise<AnyPgInsert | AnyPgUpdate | AnyPgDeleteBase | SQL | string>
}

export function useDBMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(options: DBMutationOptions<TData, TError, TVariables, TContext>) {
  const db = injectDrizzle()

  const { mutation, ...rest } = options

  return useHandledMutation({
    ...rest,
    mutationFn: (variables: TVariables) => {
      const res = mutation(variables, { db, ...schema })

      if (isPromise(res)) {
        return res
      }

      return db.execute(res)
    },
  })
}

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return value instanceof Promise
}
