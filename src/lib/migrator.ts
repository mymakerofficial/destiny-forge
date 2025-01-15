import type { Extension, PGliteInterface } from '@electric-sql/pglite'

// vite turns this into an object containing all the files in the directory
const migrationFiles = import.meta.glob('@/db/migrations/*.sql', {
  query: '?raw',
  import: 'default',
})

export async function migrate(pg: PGliteInterface) {
  await pg.exec(`
    CREATE SCHEMA IF NOT EXISTS drizzle;

    CREATE TABLE IF NOT EXISTS drizzle.migrations (
      tag TEXT PRIMARY KEY,
      executed_at TIMESTAMP DEFAULT now()
    );
  `)

  const { rows: completedMigrations } = await pg.query<{
    tag: string
    executed_at: Date
  }>(`
    SELECT tag, executed_at
    FROM drizzle.migrations
  `)

  console.log('[migrator] loaded completed migrations', completedMigrations)

  for (const path in migrationFiles) {
    const tag = path.split('/').pop().replace('.sql', '')

    if (completedMigrations.some((it) => it.tag === tag)) {
      console.log(`[migrator] skipping migration ${tag}`)
      continue
    }

    console.log(`[migrator] running migration ${tag}`)

    // load the file content
    const content = await migrationFiles[path]()

    await pg.exec(content)
    await pg.query(`INSERT INTO drizzle.migrations (tag) VALUES ($1)`, [tag])
  }
}

async function setup(pg: PGliteInterface) {
  return {
    init: () => migrate(pg),
  }
}

export const migrator = {
  name: 'Drizzle Migrator',
  setup,
} satisfies Extension
