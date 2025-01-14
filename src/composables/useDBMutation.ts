import { type Drizzle, injectDrizzle } from '@/lib/drizzle.ts'
import * as schema from '@/db/schema.ts'
import { type DefaultError, useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { type AnyPgUpdate } from 'drizzle-orm/pg-core'
import type { AnyPgInsert } from 'drizzle-orm/pg-core/query-builders/insert'
import type { AnyPgDeleteBase } from 'drizzle-orm/pg-core/query-builders/delete'
import { SQL } from 'drizzle-orm'

export type DBMutationFunctionContext = {
  db: Drizzle
} & typeof schema

export type DBMutationOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
> = Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> & {
  mutation: (
    variables: TVariables,
    context: DBMutationFunctionContext,
  ) => AnyPgInsert | AnyPgUpdate | AnyPgDeleteBase | SQL
}

export function useDBMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(options: DBMutationOptions<TData, TError, TVariables, TContext>) {
  const db = injectDrizzle()

  const { mutation, ...rest } = options

  return useMutation({
    ...rest,
    mutationFn: async (variables: TVariables) => {
      const query = mutation(variables, { db, ...schema })
      return db.execute(query)
    },
  })
}
