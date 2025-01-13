<script setup lang="ts">
import { RouterView } from 'vue-router'
import { PGlite } from '@electric-sql/pglite'
import { live } from '@electric-sql/pglite/live'
import { providePGlite } from '@electric-sql/pglite-vue'
import { onMounted } from 'vue'

const db = new PGlite({
  extensions: {
    live,
  },
})
providePGlite(db)

onMounted(async () => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    INSERT INTO items (name) VALUES ('test1');
    INSERT INTO items (name) VALUES ('test2');
    INSERT INTO items (name) VALUES ('test3');
    INSERT INTO items (name) VALUES ('test4');
  `)
})
</script>

<template>
  <RouterView />
</template>
