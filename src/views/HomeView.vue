<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ref } from 'vue'
import { useDBQuery } from '@/composables/useDBQuery.ts'
import { sql } from 'drizzle-orm'
import { useDBMutation } from '@/composables/useDBMutation.ts'

const input = ref('')
const limit = ref(5)

const { data, error } = useDBQuery({
  query: ({ db, items }) =>
    db
      .select({
        id: items.id,
        displayName: items.name,
        date: items.createdAt,
      })
      .from(items)
      .limit(limit.value)
      .orderBy(sql`${items.createdAt} DESC`),
})

const { mutate: addItem, error: mutationError } = useDBMutation({
  mutation: (name: string) => sql`INSERT INTO items (name) VALUES (${name})`,
})

function handleAdd() {
  addItem(input.value)
  input.value = ''
}
</script>

<template>
  <main class="p-12 flex flex-col gap-4 max-w-screen-md">
    <div class="flex gap-2 items-center">
      <Input v-model="input" />
      <Button @click="handleAdd">Add</Button>
    </div>
    <hr />
    <div class="flex gap-2 items-center">
      <label>Limit</label>
      <Input v-model="limit" type="number" class="w-min" />
      <Button @click="() => (limit -= 1)">-</Button>
      <Button @click="() => (limit += 1)">+</Button>
    </div>
    <b>Showing {{ data.length }} items</b>
    <hr />
    <p class="text-red-500">{{ error }}</p>
    <p class="text-red-500">{{ mutationError }}</p>
    <div class="flex flex-col gap-2">
      <div v-for="item in data" :key="item.id" class="flex gap-2 items-center">
        <span>{{ item.displayName }}</span>
        <span class="text-neutral-500">{{ item.date }}</span>
      </div>
    </div>
  </main>
</template>
