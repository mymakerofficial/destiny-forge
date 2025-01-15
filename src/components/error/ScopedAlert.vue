<script setup lang="ts">
import { Alert, AlertActions, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAlertContext } from '@/lib/alert.ts'
import { Button } from '@/components/ui/button'
import { TriangleAlert } from 'lucide-vue-next'

const { alerts } = useAlertContext()
</script>

<template>
  <div v-if="alerts.length" class="flex flex-col gap-2">
    <Alert v-for="alert in alerts" :variant="alert.variant">
      <TriangleAlert v-if="alert.variant === 'destructive'" class="size-4" />
      <AlertTitle>{{ alert.title }}</AlertTitle>
      <AlertDescription>
        {{ alert.message }}
      </AlertDescription>
      <AlertActions>
        <Button
          v-for="action in alert.actions"
          @click="() => action.onClick()"
          size="sm"
          :variant="alert.variant"
        >
          {{ action.label }}
        </Button>
      </AlertActions>
    </Alert>
  </div>
</template>
