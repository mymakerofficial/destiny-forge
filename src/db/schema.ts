import { pgTable, text, timestamp, uuid, check } from 'drizzle-orm/pg-core'
import { type InferSelectModel, sql } from 'drizzle-orm'

export const items = pgTable('items', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameNotEmpty: check('name_not_empty', sql`${table.name} <> ''`),
}))

export type ItemDto = {
  id: string
  name: string
  createdAt: Date
}
