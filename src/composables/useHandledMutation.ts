import { type DefaultError, type MutationOptions, useMutation } from '@tanstack/vue-query'
import { useAlert } from '@/lib/alert.ts'

export function useHandledMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(options: MutationOptions<TData, TError, TVariables, TContext>) {
  const alert = useAlert()

  return useMutation({
    ...options,
    onError: (error, variables, context) => {
      alert.open({
        variant: 'destructive',
        title: 'Mutation Error',
        message: isError(error) ? error.message : undefined,
      })

      return options.onError?.(error, variables, context)
    },
    onMutate: (variables) => {
      alert.close()

      return options.onMutate?.(variables)
    },
  })
}

function isError(error: any): error is Error {
  return error instanceof Error
}
