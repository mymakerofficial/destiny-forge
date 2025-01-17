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

type EncryptedColumnHelperReturnType<TColumnsMap extends Record<string, PgColumnBuilderBase>> = {
  [K in keyof TColumnsMap]: TColumnsMap[K]
} & {
  [K in `encrypted${Capitalize<string & keyof TColumnsMap>}`]: HasDefault<
    NotNull<PgTextBuilder<ColumnBuilderBaseConfig<'string', 'PgText'>>>
  >
}

function encrypted<TColumnsMap extends Record<string, PgColumnBuilderBase>>(
  columnsMap: TColumnsMap,
): EncryptedColumnHelperReturnType<TColumnsMap> {
  return {
    ...columnsMap,
    ...Object.entries(columnsMap).reduce(
      (acc, [key, original]) => {
        // @ts-expect-error
        const pgName = `encrypted_${original.config?.name || key}`
        const tsName = `encrypted${key.charAt(0).toUpperCase() + key.slice(1)}`
        acc[tsName] = text(pgName).notNull().default('')
        return acc
      },
      {} as { [key: string]: unknown },
    ),
  } as EncryptedColumnHelperReturnType<TColumnsMap>
}

const timestampColumns = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql<Date>`now()`)
    .$onUpdateFn(() => sql<Date>`now()`),
}

const syncColumns = {
  id: uuid().primaryKey().defaultRandom(),
  // set to true by server
  isSynced: boolean('is_synced')
    .notNull()
    .default(false)
    .$onUpdateFn(() => false),
  // set to true by client
  sentToServer: boolean('sent_to_server')
    .notNull()
    .default(false)
    .$onUpdateFn(() => false),
  isDecrypted: boolean('is_decrypted').notNull().default(false),
  sessionId: text('session_id'),
}

export type SyncedTable = PgTableWithColumns<{
  name: string
  schema: undefined
  columns: BuildColumns<string, typeof syncColumns, 'pg'>
  dialect: 'pg'
}>

export const items = pgTable(
  'items',
  {
    ...encrypted({
      name: text().notNull(),
    }),
    ...timestampColumns,
    ...syncColumns,
  },
  (table) => ({
    nameNotEmpty: check('name_not_empty', sql`${table.name} <> ''`),
  }),
)

export const testTable = pgTable('test_table', {
  publicText: text('public_text'),
  ...encrypted({
    secretText: text('secret_text'),
  }),
  ...timestampColumns,
  ...syncColumns,
})

export type ItemDto = typeof items.$inferSelect
