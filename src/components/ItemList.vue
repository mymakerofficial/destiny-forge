<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ref } from 'vue'
import { useDBQuery } from '@/composables/useDBQuery.ts'
import { desc } from 'drizzle-orm'
import { useDBMutation } from '@/composables/useDBMutation.ts'
import { Plus, LoaderCircle } from 'lucide-vue-next'
import ItemRow from '@/components/ItemRow.vue'

const input = ref('')

const { data: items, isPending } = useDBQuery({
  query: ({ db, items }) => db.select().from(items).orderBy(desc(items.createdAt)),
})

const { data: itemCount } = useDBQuery({
  query: ({ db, items }) => db.$count(items),
})

const { mutate: addItem } = useDBMutation({
  mutation: (name: string, { db, items }) => db.insert(items).values({ name }),
})

function handleAdd() {
  addItem(input.value)
  input.value = ''
}
</script>

<template>
  <form class="flex gap-2 items-center" @submit.prevent="handleAdd">
    <Input v-model="input" />
    <Button type="submit" aria-label="Add item"><Plus /><span>Add</span></Button>
  </form>
  <div v-if="isPending" class="w-full h-24 flex items-center justify-center">
    <LoaderCircle class="animate-spin size-6" />
  </div>
  <div v-else class="flex flex-col gap-2">
    <ItemRow v-for="item in items" :key="item.id" :item="item" />
  </div>
  <div>
    <p v-if="itemCount === 0" class="text-center text-muted-foreground">
      Add some items to get started.
    </p>
    <p v-else class="text-center text-muted-foreground">{{ itemCount }} items</p>
  </div>
</template>
