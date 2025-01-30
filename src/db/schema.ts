import {
  boolean,
  check,
  PgBooleanBuilder,
  pgTable,
  PgTextBuilder,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type {
  BuildColumns,
  ColumnBuilderBaseConfig,
  HasDefault,
  NotNull,
} from 'drizzle-orm/column-builder'
import type { PgColumnBuilderBase } from 'drizzle-orm/pg-core/columns/common'
import type { PgTableWithColumns } from 'drizzle-orm/pg-core/table'

const timestampColumns = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql<Date>`now()`)
    .$onUpdateFn(() => new Date()),
}

const syncColumns = {
  id: uuid().primaryKey().defaultRandom(),
  // set to true by client when row is received from server
  isSynced: boolean('is_synced')
    .notNull()
    .default(false)
    .$onUpdateFn(() => false),
  // set to true by client after sending to server
  isSentToServer: boolean('is_sent_to_server')
    .notNull()
    .default(false)
    .$onUpdateFn(() => false),
  // set to false by client when row is received from server
  isNew: boolean('is_new')
    .notNull()
    .default(true)
    .$onUpdateFn(() => false),
  sessionId: text('session_id'),
}

export type SyncedTable = PgTableWithColumns<{
  name: string
  schema: undefined
  columns: BuildColumns<string, typeof syncColumns, 'pg'>
  dialect: 'pg'
}>

export type RawSyncedTable = {
  id: string
  is_synced: boolean
  is_sent_to_server: boolean
  session_id: string
}

export const items = pgTable(
  'items',
  {
    name: text().notNull(),
    ...timestampColumns,
    ...syncColumns,
  },
  (table) => ({
    nameNotEmpty: check('name_not_empty', sql`${table.name} <> ''`),
  }),
)

export type ItemDto = typeof items.$inferSelect
