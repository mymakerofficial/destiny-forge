import type { PGliteWithExtensions } from '@/lib/pglite.ts'
import type { SyncedTable } from '@/db/schema.ts'
import * as schema from '@/db/schema.ts'
import { getTableName, type InferSelectModel } from 'drizzle-orm/table'
import { sql } from 'drizzle-orm'
import { PgDialect, PgTable, QueryBuilder } from 'drizzle-orm/pg-core'

export async function setupSync(pg: PGliteWithExtensions) {
  await pg.electric.initMetadataTables()

  const tablesToSync: SyncedTable[] = Object.values(schema).filter(isSyncedTable)

  for (const table of tablesToSync) {
    const tableName = getTableName(table)

    await pg.electric.syncShapeToTable({
      shape: {
        url: 'http://localhost:3000/v1/shape',
        params: {
          table: tableName,
        },
      },
      table: tableName,
      primaryKey: ['id'],
    })
  }

  await setupSyncToServer(pg, tablesToSync)
}

async function setupSyncToServer(pg: PGliteWithExtensions, tablesToSync: SyncedTable[]) {
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

  const dialect = new PgDialect()
  const countQuery = dialect.sqlToQuery(countQB.getSQL())

  await pg.live.query<{ [P: string]: number }>({
    query: countQuery.sql,
    params: countQuery.params,
    callback: (res) => {
      // TODO: send to server
      //  encrypt text fields
      //  omit original text fields

      const [count] = res.rows

      if (Object.values(count).some((it) => it > 0)) {
        console.log('syncing to server...')
        syncToServer(pg, tablesToSync)
      }
    },
  })
}

async function syncToServer(pg: PGliteWithExtensions, tablesToSync: SyncedTable[]) {
  const qb = new QueryBuilder()
  const dialect = new PgDialect()

  for (const table of tablesToSync) {
    const query = qb
      .select()
      .from(table)
      .where(
        sql`${table.isSynced} = false AND ${table.sentToServer} = false AND ${table.sessionId} IS NOT NULL`,
      )
      .toSQL()

    const res = await pg.query<InferSelectModel<SyncedTable>>(query.sql, query.params)

    console.log(getTableName(table), res)

    for (const row of res.rows) {
      const updateEntitySql = sql`UPDATE ${table} SET "${sql.raw(table.sentToServer.name)}" = true WHERE ${table.id} = ${row.id}`
      const updateEntityQuery = dialect.sqlToQuery(updateEntitySql)

      // TODO sync to server

      await pg.query(updateEntityQuery.sql, updateEntityQuery.params)
    }
  }
}

function isSyncedTable(table: PgTable): table is SyncedTable {
  return 'isSynced' in table
}
