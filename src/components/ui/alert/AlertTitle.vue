<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/shadcn'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <h5 :class="cn('font-medium leading-none tracking-tight', props.class)">
    <slot />
  </h5>
</template>
