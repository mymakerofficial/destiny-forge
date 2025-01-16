<script setup lang="ts">
import { ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-vue-next'
import { useDBQuery } from '@/composables/useDBQuery.ts'
import { desc, getTableColumns, gt, sql } from 'drizzle-orm'

const input = ref('')

const { data: items } = useDBQuery({
  query: ({ db, items }) => {
    const sq = db
      .select({
        ...getTableColumns(items),
        score:
          sql<number>`similarity(metaphone(${items.name},10), metaphone(${input.value},10))`.as(
            'score',
          ),
      })
      .from(items)
      .as('sq')

    return db.select().from(sq).where(gt(sq.score, 0.1)).orderBy(desc(sq.score))
  },
})
</script>

<template>
  <div class="flex gap-2 items-center mb-4">
    <Input v-model="input" placeholder="Search..." />
    <Search class="mx-2 text-muted-foreground" />
  </div>
  <ol class="flex flex-col gap-4">
    <li
      v-for="item in items"
      :key="item.id"
      class="px-3 flex flex-row justify-between items-center"
    >
      <span>{{ item.name }}</span>
      <span class="text-muted-foreground text-sm">score {{ item.score }}</span>
    </li>
  </ol>
</template>
