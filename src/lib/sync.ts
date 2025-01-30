import type { PGliteWithExtensions } from '@/lib/pglite.ts'
import type { RawSyncedTable, SyncedTable } from '@/db/schema.ts'
import * as schema from '@/db/schema.ts'
import { getTableName, type InferSelectModel } from 'drizzle-orm/table'
import { eq, getTableColumns, type SQL, sql } from 'drizzle-orm'
import { PgDialect, PgTable, QueryBuilder } from 'drizzle-orm/pg-core'
import { CryptoManager, getSessionId } from '@/lib/crypt.ts'
import { Mutex } from '@electric-sql/pglite'
import type { Message } from '@electric-sql/client'
import { isChangeMessage, ShapeStream } from '@electric-sql/client'
import type { Drizzle } from '@/lib/drizzle.ts'

export class SyncClient {
  private readonly shapeUrl = 'http://localhost:3000/v1/shape'
  private readonly syncUrl = 'http://localhost:3001/v1/sync'

  private readonly dialect = new PgDialect()
  private readonly qb = new QueryBuilder()

  private readonly crypto = new CryptoManager()

  private readonly tablesToSync: SyncedTable[] = Object.values(schema).filter(isSyncedTable)

  constructor(
    private readonly pg: PGliteWithExtensions,
    private readonly db: Drizzle,
  ) {}

  async setup() {
    const existing = localStorage.getItem('encryption_key')

    if (existing) {
      await this.crypto.importKey(existing)
    } else {
      await this.crypto.generateKey()
      const key = await this.crypto.exportKey()
      if (key) {
        localStorage.setItem('encryption_key', key)
      }
    }

    await this.setupSyncToClient()
    await this.setupSyncToServer()
  }

  // subscribe to changes from the server
  async setupSyncToClient() {
    for (const table of this.tablesToSync) {
      const tableName = getTableName(table)

      const stream = new ShapeStream<RawSyncedTable>({
        url: this.shapeUrl,
        params: {
          table: tableName,
          where: `"session_id"='${getSessionId()}'`,
        },
      })

      stream.subscribe(async (messages) => {
        for (const message of messages) {
          await this.syncToClient(table, message)
        }
      })
    }
  }

  async syncToClient(table: SyncedTable, message: Message<RawSyncedTable>) {
    console.log('sync message', message)

    const tableName = sql.raw(getTableName(table))

    if (!isChangeMessage(message)) {
      return
    }

    const rowValue = await this.decryptTextValues(table, {
      ...message.value,
      is_synced: true,
      is_sent_to_server: false,
      is_new: false,
    })

    const columnNames = Object.keys(rowValue) as (keyof RawSyncedTable)[]

    const columnRefs = sql.raw(columnNames.map((it) => `"${it}"`).join(','))

    const columnValues = joinSql(
      columnNames.map((column) => {
        const value = rowValue[column]
        return sql`${value}`
      }),
    )

    const updateValues = joinSql(
      columnNames.map((column) => {
        const columnName = sql.raw(`"${column}"`)
        const value = rowValue[column]
        return sql`${columnName} = ${value}`
      }),
    )

    if (message.headers.operation === 'insert') {
      const query = this.dialect.sqlToQuery(
        sql`
        INSERT INTO ${tableName}
          (${columnRefs})
        VALUES (${columnValues})
          ON CONFLICT ("id") DO UPDATE
            SET ${updateValues};
        `.getSQL(),
      )

      await this.pg.query(query.sql, query.params)
    }

    if (message.headers.operation === 'update') {
      const query = this.dialect.sqlToQuery(
        sql`UPDATE ${tableName} SET ${updateValues} WHERE ${table.id} = ${rowValue.id};`.getSQL(),
      )

      await this.pg.query(query.sql, query.params)
    }

    if (message.headers.operation === 'delete') {
      const query = this.dialect.sqlToQuery(
        sql`DELETE
            FROM ${tableName}
            WHERE ${table.id} = ${rowValue.id};`.getSQL(),
      )

      await this.pg.query(query.sql, query.params)
    }
  }

  async setupSyncToServer() {
    // TODO: use a more efficient way to check if sync is required

    const queryParts = joinSql(
      this.tablesToSync.map((table) => {
        const tableName = sql.raw(getTableName(table))
        return sql`(SELECT count(*) AS ${tableName} FROM ${table} WHERE ${table.isSynced} = false AND ${table.isSentToServer} = false AND ${table.sessionId} IS NOT NULL)`
      }),
    )

    const countQuery = this.dialect.sqlToQuery(sql`SELECT * FROM `.append(queryParts).getSQL())

    const mutex = new Mutex()

    await this.pg.live.query<{ [P: string]: number }>({
      query: countQuery.sql,
      params: countQuery.params,
      callback: async (res) => {
        const [count] = res.rows

        if (Object.values(count).some((it) => it > 0)) {
          console.log('sync required', count)
          await mutex.acquire()
          try {
            await this.syncToServer()
          } finally {
            mutex.release()
          }
        }
      },
    })
  }

  async syncToServer() {
    for (const table of this.tablesToSync) {
      const tableName = getTableName(table)

      const query = this.qb
        .select()
        .from(table)
        .where(
          sql`${table.isSynced} = false AND ${table.isSentToServer} = false AND ${table.sessionId} IS NOT NULL`,
        )
        .toSQL()

      const { rows } = await this.pg.query<InferSelectModel<SyncedTable>>(query.sql, query.params)

      if (rows.length === 0) {
        continue
      }

      await this.db.transaction(async (tx) => {
        for (const row of rows) {
          await tx
            .update(table)
            .set({
              isSynced: false,
            })
            .where(eq(table.id, row.id))
        }

        for (const originalRow of rows) {
          const row = await this.encryptTextValues(table, originalRow)

          console.log('sending row to server', tableName, row)

          await fetch(this.syncUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              table: tableName,
              row,
            }),
          })

          await tx
            .update(table)
            .set({
              isSentToServer: true,
            })
            .where(eq(table.id, originalRow.id))
        }
      })
    }
  }

  private async decryptTextValues<T extends Partial<RawSyncedTable>>(
    table: SyncedTable,
    values: T,
  ): Promise<T> {
    const textColumns = getTextColumns(table)

    const decryptedValues = Object.fromEntries(
      await Promise.all(
        Object.entries(values)
          .filter(([key]) => {
            return textColumns.some((it) => it.name === key)
          })
          .map(([key, value]) => {
            return this.crypto.decrypt(value as string).then((decrypted) => [key, decrypted])
          }),
      ),
    )

    return {
      ...values,
      ...decryptedValues,
    }
  }

  private async encryptTextValues<T extends Partial<RawSyncedTable>>(
    table: SyncedTable,
    values: T,
  ): Promise<T> {
    const textColumns = getTextColumns(table)

    const encryptedValues = Object.fromEntries(
      await Promise.all(
        Object.entries(values)
          .filter(([key]) => {
            return textColumns.some((it) => it.name === key)
          })
          .map(([key, value]) => {
            return this.crypto.encrypt(value as string).then((encrypted) => [key, encrypted])
          }),
      ),
    )

    return {
      ...values,
      ...encryptedValues,
    }
  }
}

export async function setupSync(pg: PGliteWithExtensions, db: Drizzle) {
  await new SyncClient(pg, db).setup()
}

function joinSql(parts: SQL[], seperator: SQL = sql`, `): SQL {
  return parts.reduce((acc, part, index) => {
    acc.append(part)

    if (index < parts.length - 1) {
      acc.append(seperator)
    }

    return acc
  }, sql.empty())
}

function isSyncedTable(table: PgTable): table is SyncedTable {
  return 'isSynced' in table
}

function getTextColumns(table: SyncedTable) {
  return Object.values(getTableColumns(table)).filter(
    (column) =>
      column.columnType === 'PgText' && column.name !== 'id' && column.name !== 'session_id',
  )
}
