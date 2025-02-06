import { type Drizzle, useDrizzle } from '@/lib/drizzle.ts'
import * as schema from '@/db/schema.ts'
import { type DefaultError, type MutationOptions } from '@tanstack/vue-query'
import { useHandledMutation } from '@/composables/useHandledMutation.ts'
import type { SQLWrapper } from 'drizzle-orm/sql/sql'
import type { SQL } from 'drizzle-orm'

export type DBMutationFunctionContext = {
  db: Drizzle
} & typeof schema

export type DBMutationOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = unknown,
  TContext = unknown,
> = Omit<MutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> & {
  mutation: (
    variables: TVariables,
    context: DBMutationFunctionContext,
  ) => SQLWrapper | SQL | string | Promise<void> | void
}

export function useDBMutation<TError = DefaultError, TVariables = unknown, TContext = unknown>(
  options: DBMutationOptions<void, TError, TVariables, TContext>,
) {
  const db = useDrizzle()

  const { mutation, ...rest } = options

  return useHandledMutation<void, TError, TVariables, TContext>({
    ...rest,
    mutationFn: async (variables: TVariables) => {
      const res = mutation(variables, { db, ...schema })

      if (isPromise(res)) {
        await res
        return
      }

      if (!res) {
        return
      }

      await db.execute(res)
    },
    networkMode: 'always',
  })
}

function isPromise<T, G = T>(value: T | Promise<G>): value is Promise<G> {
  return value instanceof Promise
}
