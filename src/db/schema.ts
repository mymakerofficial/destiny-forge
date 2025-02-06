import { pgTable, text, timestamp, uuid, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const timestampColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql<Date>`now()`)
    .$onUpdateFn(() => new Date()),
}

export const items = pgTable(
  'items',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    ...timestampColumns,
  },
  (table) => ({
    nameNotEmpty: check('name_not_empty', sql`${table.name} <> ''`),
  }),
)

export type ItemDto = typeof items.$inferSelect
