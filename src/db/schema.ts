import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const items = pgTable('items', {
  id: uuid().primaryKey().default('gen_random_uuid()'),
  name: text(),
  createdAt: timestamp('created_at').default('now()'),
})
