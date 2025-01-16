<script setup lang="ts">
import { type ItemDto, items } from '@/db/schema'
import { Trash } from 'lucide-vue-next'
import { ref } from 'vue'
import { useDBMutation } from '@/composables/useDBMutation.ts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { eq } from 'drizzle-orm'
import { toast } from 'vue-sonner'

const { item } = defineProps<{
  item: ItemDto
}>()

const name = ref(item.name)

const { mutate: updateItem } = useDBMutation({
  mutation: (name: string, { db, items }) =>
    db.update(items).set({ name }).where(eq(items.id, item.id)),
  onSuccess: () => {
    toast.success('Item updated')
  },
  onError: () => {
    name.value = item.name
  },
})

const { mutate: deleteItem } = useDBMutation({
  mutation: (_, { db, items }) => db.delete(items).where(eq(items.id, item.id)),
  onSuccess: () => {
    toast.success('Item deleted')
  },
})

function handleUpdate() {
  if (name.value === item.name) return
  updateItem(name.value)
}
</script>

<template>
  <div class="flex gap-2 items-center">
    <Input v-model="name" @blur="handleUpdate" />
    <Button @click="deleteItem" variant="ghost" size="icon" aria-label="Delete item">
      <Trash />
    </Button>
  </div>
</template>
