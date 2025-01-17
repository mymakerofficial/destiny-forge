import { Hono } from 'jsr:@hono/hono'
import { cors } from 'jsr:@hono/hono/cors'
import { Client } from 'https://deno.land/x/postgres/mod.ts'

const app = new Hono()
const client = new Client('postgresql://postgres:password@localhost:54321/electric')

app.use(cors())

app.post('/v1/sync', async (ctx) => {
  const body = await ctx.req.json()

  const isInset = body.row.is_new

  const row = {
    ...body.row,
    is_synced: true,
    is_sent_to_server: false,
    is_new: false,
  }

  const cols = Object.keys(row)
  const colsArgs = cols.map((it) => `$${it}`)

  console.log(body.table, row)

  if (isInset) {
    const sql = `INSERT INTO ${body.table} (${cols.join(', ')}) VALUES (${colsArgs})`
    console.log(sql)
    await client.queryArray({
      text: sql,
      args: row,
    })
  } else {
    const sql = `UPDATE ${body.table} SET (${cols.join(', ')}) = (${colsArgs}) WHERE id = $id`
    console.log(sql)
    await client.queryArray({
      text: sql,
      args: row,
    })
  }

  return ctx.json({ success: true })
})

Deno.serve(
  {
    port: 3001,
  },
  app.fetch,
)
