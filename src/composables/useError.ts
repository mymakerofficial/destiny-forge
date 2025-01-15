import { inject, onErrorCaptured, provide, type Ref, ref } from 'vue'

const errorContextKey = Symbol('errorContextKey')

type ErrorContext = {
  error: Ref<Error | null>
  setError: (error: Error) => void
}

export function createErrorBoundary() {
  const error = ref<Error>(null)

  const context: ErrorContext = {
    error,
    setError: (e) => {
      error.value = e
    },
  }

  onErrorCaptured((error) => {
    context.setError(error)
    return false
  })

  provide(errorContextKey, context)
  return context
}

export function useError() {
  const errorContext = inject<ErrorContext>(errorContextKey)

  if (!errorContext) {
    throw new Error('useError must be used within a ErrorBoundary')
  }

  return errorContext
}
