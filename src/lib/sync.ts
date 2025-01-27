import type { PGliteWithExtensions } from '@/lib/pglite.ts'
import type { SyncedTable } from '@/db/schema.ts'
import * as schema from '@/db/schema.ts'
import { getTableName, type InferSelectModel } from 'drizzle-orm/table'
import { eq, type SQL, sql } from 'drizzle-orm'
import { PgDialect, PgTable, QueryBuilder } from 'drizzle-orm/pg-core'
import { getSessionId } from '@/lib/crypt.ts'
import { Mutex } from '@electric-sql/pglite'
import type { Message } from '@electric-sql/client'
import { isChangeMessage, ShapeStream } from '@electric-sql/client'
import type { Drizzle } from '@/lib/drizzle.ts'

type RawSyncedTable = {
  id: string
}

export class SyncClient {
  private readonly dialect = new PgDialect()
  private readonly qb = new QueryBuilder()

  private readonly tablesToSync: SyncedTable[] = Object.values(schema).filter(isSyncedTable)

  constructor(
    private readonly pg: PGliteWithExtensions,
    private readonly db: Drizzle,
  ) {}

  async setup() {
    await this.setupSyncToClient()
    await this.setupSyncToServer()
  }

  async setupSyncToClient() {
    for (const table of this.tablesToSync) {
      const tableName = getTableName(table)

      const stream = new ShapeStream<RawSyncedTable>({
        url: 'http://localhost:3000/v1/shape',
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

    const rowValue = {
      ...message.value,
      is_synced: true,
      is_sent_to_server: false,
      is_new: false,
      is_decrypted: false,
    }

    const columns = Object.keys(rowValue) as (keyof typeof rowValue)[]

    const columnRefs = sql.raw(columns.map((it) => `"${it}"`).join(','))

    const columnValues = joinSql(
      columns.map((column) => {
        const value = rowValue[column]
        return sql`${value}`
      }),
    )

    const updateValues = joinSql(
      columns.map((column, index) => {
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
    const queryParts = this.tablesToSync.map((table, index) => {
      const tableName = sql.raw(getTableName(table))

      const query = sql`(SELECT count(*) AS ${tableName} FROM ${table} WHERE ${table.isSynced} = false AND ${table.isSentToServer} = false AND ${table.sessionId} IS NOT NULL)`

      if (index < this.tablesToSync.length - 1) {
        query.append(sql`, `)
      }

      return query
    })

    const countQuery = this.dialect.sqlToQuery(
      sql.fromList([sql`SELECT * FROM `, ...queryParts]).getSQL(),
    )

    const mutex = new Mutex()

    await this.pg.live.query<{ [P: string]: number }>({
      query: countQuery.sql,
      params: countQuery.params,
      callback: async (res) => {
        // TODO: send to server
        //  encrypt text fields
        //  omit original text fields

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

      console.log('sending to server', { tableName, rows })

      await this.db.transaction(async (tx) => {
        for (const row of rows) {
          await fetch('http://localhost:3001/v1/sync', {
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
            .where(eq(table.id, row.id))
        }
      })
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
