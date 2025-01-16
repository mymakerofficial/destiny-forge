import { type DefaultError, useMutation, type UseMutationOptions } from '@tanstack/vue-query'
import { useAlert } from '@/lib/alert.ts'

export function useHandledMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(options: UseMutationOptions<TData, TError, TVariables, TContext>) {
  const alert = useAlert()

  return useMutation({
    ...options,
    onError: (error) => {
      alert.open({
        variant: 'destructive',
        title: 'Mutation Error',
        message: isError(error) ? error.message : undefined,
      })
    },
    onMutate: () => {
      alert.close()
      return undefined
    },
  })
}

function isError(error: any): error is Error {
  return error instanceof Error
}
