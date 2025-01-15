<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/shadcn'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('flex gap-2 justify-end', props.class)">
    <slot />
  </div>
</template>
