import type { Extension, PGliteInterface } from '@electric-sql/pglite'

// vite turns this into an object containing all the files in the directory
const importRaw = import.meta.glob('@/db/migrations/*.sql', {
  query: '?raw',
  import: 'default',
})

const migrationFiles = Object.fromEntries(
  Object.entries(importRaw).map(([path, loader]) => [
    path.split('/').pop().replace('.sql', ''),
    loader,
  ]),
)

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
  }>(`
    SELECT tag
    FROM drizzle.migrations
  `)

  if (completedMigrations.some((completed) => !migrationFiles[completed.tag])) {
    console.error(
      '[migrator] migrations present in database do not match available migration files. Dropping all tables and starting from scratch.',
    )

    // bye bye data
    await pg.exec(`
      DROP SCHEMA IF EXISTS drizzle CASCADE;
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
    `)

    await migrate(pg)
    return
  }

  for (const tag in migrationFiles) {
    if (completedMigrations.some((it) => it.tag === tag)) {
      console.log(`[migrator] skipping migration '${tag}'`)
      continue
    }

    console.log(`[migrator] running migration '${tag}'`)

    // load the file content
    const content = await migrationFiles[tag]()

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
