import { onErrorCaptured, ref } from 'vue'
import { createInjectionState } from '@vueuse/core'
import { v4 as uuidv4 } from 'uuid'

export type AlertAction = {
  label: string
  onClick: () => void
}

export type AlertInstance = {
  id: string
  variant: 'default' | 'destructive'
  title: string
  message?: string
  actions: AlertAction[]
}

export type AlertOptions = {
  variant?: 'default' | 'destructive'
  title?: string
  message?: string
  actions?: AlertAction[]
}

const [useProvideAlertContext, useInjectAlertContext] = createInjectionState(() => {
  const alerts = ref<AlertInstance[]>([])

  function addAlert(id: string, alert: AlertOptions) {
    alerts.value.push({
      id,
      variant: alert.variant || 'default',
      title: alert.title || 'Unexpected Error',
      message: alert.message,
      actions: [
        ...(alert.actions || []),
        {
          label: 'Dismiss',
          onClick: () => removeAlert(id),
        },
      ],
    })
  }

  function removeAlert(id: string) {
    alerts.value = alerts.value.filter((alert) => alert.id !== id)
  }

  return { alerts, addAlert, removeAlert }
})

export function useAlertContext() {
  const context = useInjectAlertContext()

  if (!context) {
    throw new Error('useAlertContext must be used within a ErrorBoundary')
  }

  return context
}

export function createErrorBoundary() {
  const context = useProvideAlertContext()

  onErrorCaptured((error) => {
    console.error(error)
    const id = uuidv4()
    context.addAlert(id, {
      variant: 'destructive',
      title: 'Unexpected Error',
      message: error.message,
      actions: [
        {
          label: 'Reload',
          onClick: () => window.location.reload(),
        },
      ],
    })
    return false
  })
}

export function useAlert() {
  const context = useAlertContext()
  const id = uuidv4()

  function open(alert: AlertOptions) {
    context.addAlert(id, alert)
  }

  function close() {
    context.removeAlert(id)
  }

  return {
    open,
    close,
  }
}
