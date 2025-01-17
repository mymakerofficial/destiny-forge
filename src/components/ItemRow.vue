<script setup lang="ts">
import { type ItemDto } from '@/db/schema'
import { Trash, Cloud, CloudOff, CloudUpload } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useDBMutation } from '@/composables/useDBMutation.ts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { eq } from 'drizzle-orm'
import { toast } from 'vue-sonner'

const { item } = defineProps<{
  item: ItemDto
}>()

const name = ref(item.name)

watch(
  () => item.name,
  (value) => {
    name.value = value
  },
)

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
    <div class="ml-2">
      <CloudUpload v-if="item.isSentToServer" class="size-5 text-orange-500" />
      <Cloud v-else-if="item.isSynced" class="size-5 text-green-500" />
      <CloudOff v-else class="size-5 text-red-500" />
    </div>
    <Button @click="deleteItem" variant="ghost" size="icon" aria-label="Delete item">
      <Trash />
    </Button>
  </div>
</template>
