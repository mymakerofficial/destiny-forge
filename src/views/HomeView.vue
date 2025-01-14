<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ref } from 'vue'
import { useDBQuery } from '@/composables/useDBQuery.ts'
import { sql } from 'drizzle-orm'
import { useDBMutation } from '@/composables/useDBMutation.ts'

const input = ref('')
const limit = ref(5)

const { data } = useDBQuery({
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

const { data: count } = useDBQuery({
  query: ({ db, items }) => db.$count(items),
})

const { mutate: addItem } = useDBMutation({
  mutation: (name: string) => sql`INSERT INTO items (name) VALUES (${name})`,
})

function handleAdd() {
  addItem(input.value)
  input.value = ''
}
</script>

<template>
  <main class="p-12 flex flex-col gap-4 max-w-screen-md">
    <form class="flex gap-2 items-center" @submit.prevent="handleAdd">
      <Input v-model="input" />
      <Button type="submit">Add</Button>
    </form>
    <hr />
    <div class="flex gap-2 items-center justify-between">
      <b>Showing {{ data.length }} items of {{ count }}</b>
      <div class="flex gap-2 items-center">
        <Input v-model="limit" type="number" class="w-min" />
        <Button @click="() => (limit -= 1)">-</Button>
        <Button @click="() => (limit += 1)">+</Button>
      </div>
    </div>
    <hr />
    <div class="flex flex-col gap-2">
      <div v-for="item in data" :key="item.id" class="flex gap-2 items-center">
        <span>{{ item.displayName }}</span>
        <span class="text-neutral-500">{{ item.date }}</span>
      </div>
    </div>
  </main>
</template>
