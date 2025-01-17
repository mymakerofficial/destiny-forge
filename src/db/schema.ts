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
import type { ColumnBuilderBaseConfig, HasDefault, NotNull } from 'drizzle-orm/column-builder'
import type { PgColumnBuilderBase } from 'drizzle-orm/pg-core/columns/common'

type EncryptedColumnHelperReturnType<TColumnsMap extends Record<string, PgColumnBuilderBase>> = {
  [K in keyof TColumnsMap]: TColumnsMap[K]
} & {
  [K in `encrypted${Capitalize<string & keyof TColumnsMap>}`]: HasDefault<
    NotNull<PgTextBuilder<ColumnBuilderBaseConfig<'string', 'PgText'>>>
  >
} & {
  ['isDecrypted']: HasDefault<
    NotNull<PgBooleanBuilder<ColumnBuilderBaseConfig<'boolean', 'PgBoolean'>>>
  >
}

function encrypted<TColumnsMap extends Record<string, PgColumnBuilderBase>>(
  columnsMap: TColumnsMap,
): EncryptedColumnHelperReturnType<TColumnsMap> {
  return {
    ...columnsMap,
    ...Object.entries(columnsMap).reduce(
      (acc, [key, original]) => {
        const pgName = `encrypted_${original._.name || key}`
        const tsName = `encrypted${key.charAt(0).toUpperCase() + key.slice(1)}`
        acc[tsName] = text(pgName).notNull().default('')
        return acc
      },
      {} as { [key: string]: unknown },
    ),
    isDecrypted: boolean('is_decrypted').notNull().default(false),
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
  isSynced: boolean('is_synced').notNull().default(false),
  sessionId: text('session_id'),
}

export const items = pgTable(
  'items',
  {
    id: uuid().primaryKey().defaultRandom(),
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

export type ItemDto = {
  id: string
  name: string
  createdAt: Date
}
