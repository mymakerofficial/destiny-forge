import { pgTable, text, timestamp, uuid, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const items = pgTable('items', {
  id: uuid().primaryKey().default('gen_random_uuid()'),
  name: text(),
  createdAt: timestamp('created_at').default('now()'),
}, (table) => ({
  nameNotEmpty: check('name_not_empty', sql`${table.name} <> ''`),
}))
