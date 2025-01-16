import { pgTable, text, timestamp, uuid, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const items = pgTable('items', {
  id: uuid().primaryKey().defaultRandom(),
  name: text(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameNotEmpty: check('name_not_empty', sql`${table.name} <> ''`),
}))
