<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useError } from '@/composables/useError.ts'

const { error } = useError()
</script>

<template>
  <Alert v-if="error" variant="destructive">
    <AlertTitle>Error!</AlertTitle>
    <AlertDescription>
      {{ error }}
    </AlertDescription>
  </Alert>
</template>
