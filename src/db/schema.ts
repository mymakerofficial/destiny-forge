import {
  boolean,
  check,
  PgBooleanBuilder,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { PgColumnBuilderBase } from 'drizzle-orm/pg-core/columns/common'
import type { NotNull } from 'drizzle-orm/column-builder'

function encrypted<TColumnsMap extends Record<string, PgColumnBuilderBase>>(
  columnsMap: TColumnsMap,
): {
  [K in keyof TColumnsMap]: TColumnsMap[K]
} & {
  [K in `encrypted${Capitalize<keyof TColumnsMap>}`]: TColumnsMap[K]
} & {
  ['isDecrypted']: NotNull<PgBooleanBuilder>
} {
  return {
    ...Object.fromEntries(
      Object.entries(columnsMap).reduce((acc, [key, original]) => {
        acc.push([key, original])

        const pgName = `encrypted_${original.config.name || key}`
        const tsName = `encrypted${key.charAt(0).toUpperCase() + key.slice(1)}`
        const encrypted = text(pgName).notNull().default('')

        acc.push([tsName, encrypted])
        return acc
      }, []),
    ),
    isDecrypted: boolean('is_decrypted').notNull().default(false),
  }
}

const timestampColumns = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
    .$onUpdate(sql`now()`),
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
