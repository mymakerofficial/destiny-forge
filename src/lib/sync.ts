import type { PGliteWithExtensions } from '@/lib/pglite.ts'
import type { SyncedTable } from '@/db/schema.ts'
import * as schema from '@/db/schema.ts'
import { getTableName, type InferSelectModel } from 'drizzle-orm/table'
import { sql } from 'drizzle-orm'
import { PgDialect, PgTable, QueryBuilder } from 'drizzle-orm/pg-core'
import { getSessionId } from '@/lib/crypt.ts'
import { Mutex } from '@electric-sql/pglite'
import type { ChangeMessage } from '@electric-sql/client'

const dialect = new PgDialect()
const qb = new QueryBuilder()

export async function setupSync(pg: PGliteWithExtensions) {
  await pg.electric.initMetadataTables()

  const tablesToSync: SyncedTable[] = Object.values(schema).filter(isSyncedTable)

  const changeSet = new Set<string>()

  for (const table of tablesToSync) {
    const tableName = getTableName(table)

    await pg.electric.syncShapeToTable({
      shape: {
        url: 'http://localhost:3000/v1/shape',
        params: {
          table: tableName,
          where: `"session_id"='${getSessionId()}'`,
        },
      },
      table: tableName,
      primaryKey: ['id'],
      commitGranularity: 'up-to-date',
      mapColumns: (message: ChangeMessage) => {
        // server can't change isSynced to true because it's always true on the server,
        //  so we need to explicitly set it to true here
        return {
          ...message.value,
          is_synced: true,
          is_sent_to_server: false,
          is_new: false,
        }
      },
    })
  }

  await pg.exec(`ALTER TABLE items ENABLE TRIGGER ALL`)

  await setupSyncToServer(pg, tablesToSync, changeSet)
}

async function setupSyncToServer(
  pg: PGliteWithExtensions,
  tablesToSync: SyncedTable[],
  changeSet: Set<string>,
) {
  const countQB = sql`SELECT * FROM `

  tablesToSync.forEach((table, index) => {
    const tableName = sql.raw(getTableName(table))

    countQB.append(
      sql`(SELECT count(*) AS ${tableName} FROM ${table} WHERE ${table.isSynced} = false AND ${table.sessionId} IS NOT NULL)`,
    )

    if (index < tablesToSync.length - 1) {
      countQB.append(sql`, `)
    }
  })

  const countQuery = dialect.sqlToQuery(countQB.getSQL())

  const mutex = new Mutex()

  await pg.live.query<{ [P: string]: number }>({
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
          await syncToServer(pg, tablesToSync, changeSet)
        } finally {
          mutex.release()
        }
      }
    },
  })
}

async function syncToServer(
  pg: PGliteWithExtensions,
  tablesToSync: SyncedTable[],
  changeSet: Set<string>,
) {
  for (const table of tablesToSync) {
    const tableName = getTableName(table)

    const query = qb
      .select()
      .from(table)
      .where(
        sql`${table.isSynced} = false AND ${table.isSentToServer} = false AND ${table.sessionId} IS NOT NULL`,
      )
      .toSQL()

    const res = await pg.query<InferSelectModel<SyncedTable>>(query.sql, query.params)

    if (res.rows.length === 0) {
      continue
    }

    console.log('sending to server', { tableName, res })

    await pg.transaction(async (tx) => {
      await tx.exec('SET LOCAL electric.bypass_triggers = true')

      for (const row of res.rows) {
        changeSet.add(`${tableName}:${row.id}`)

        const updateEntitySql = sql`UPDATE ${table}SET "${sql.raw(table.isSentToServer.name)}" = true WHERE ${table.id} = ${row.id}`
        const updateEntityQuery = dialect.sqlToQuery(updateEntitySql)

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

        await tx.query(updateEntityQuery.sql, updateEntityQuery.params)
      }
    })
  }
}

function isSyncedTable(table: PgTable): table is SyncedTable {
  return 'isSynced' in table
}
