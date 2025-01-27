import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:password@localhost:54321/electric',
})

const app = express()

app.use(bodyParser.json())
app.use(cors())

app.post('/v1/sync', async (req, res) => {
  const body = req.body

  const id = body.row.id
  const isNew = body.row.is_new

  const row = {
    ...body.row,
    is_synced: true,
    is_sent_to_server: false,
    is_new: false,
  }

  const cols = Object.keys(row)
  const colsArgs = cols.map((_, index) => `$${index + 1}`)
  const values = cols.map((it) => row[it])

  console.log(body.table, row)

  if (isNew) {
    const sql = `INSERT INTO ${body.table} (${cols.join(', ')}) VALUES (${colsArgs.join(', ')})`
    console.log(sql)
    await pool.query(sql, values)
  } else {
    const sql = `UPDATE ${body.table} SET (${cols.join(', ')}) = (${colsArgs.join(', ')}) WHERE id = $${cols.length + 1}`
    console.log(sql)
    await pool.query(sql, [...values, id])
  }

  return res.status(200).json({ status: 'OK' })
})

app.listen(3001, () => {
  console.log(`Server running`)
})
