import type { Extension, PGliteInterface } from '@electric-sql/pglite'

export const MigratorStatus = {
  Initializing: 'Initializing',
  LoadingCompletedMigrations: 'LoadingCompletedMigrations',
  RunningStep: 'RunningStep',
  SkippingStep: 'SkippingStep',
  Completed: 'Completed',
  Error: 'Error',
} as const
export type MigratorStatus = (typeof MigratorStatus)[keyof typeof MigratorStatus]

// vite turns this into an object containing all the files in the directory
const importRaw = import.meta.glob('@/db/migrations/*.sql', {
  query: '?raw',
  import: 'default',
})

const migrationFiles = Object.fromEntries(
  Object.entries(importRaw).map(([path, loader]) => [
    path.split('/').pop()?.replace('.sql', '') ?? '',
    loader,
  ]),
)

class MigratorError extends Error {
  constructor(
    message: string,
    public readonly retry: boolean = false,
  ) {
    super(message)
    this.name = 'MigratorError'
  }
}

export async function migrate(
  pg: PGliteInterface,
  callback: (status: MigratorStatus, message: string) => void = () => {},
) {
  callback(MigratorStatus.Initializing, 'Initializing migrator')

  await pg
    .transaction(async (tx) => {
      await tx.exec(`
        CREATE SCHEMA IF NOT EXISTS drizzle;

        CREATE TABLE IF NOT EXISTS drizzle.migrations (
          tag TEXT PRIMARY KEY,
          executed_at TIMESTAMP DEFAULT now()
        );
      `)

      callback(MigratorStatus.LoadingCompletedMigrations, 'Loading completed migrations')

      const { rows: completedMigrations } = await tx.query<{
        tag: string
      }>(`
        SELECT tag
        FROM drizzle.migrations
      `)

      if (completedMigrations.some((completed) => !migrationFiles[completed.tag])) {
        throw new MigratorError(
          'Migrations present in database do not match available migration files. Dropping all tables and starting from scratch.',
        )
      }

      for (const tag in migrationFiles) {
        if (completedMigrations.some((it) => it.tag === tag)) {
          console.log(`[migrator] skipping migration '${tag}'`)
          callback(MigratorStatus.SkippingStep, `skipping migration '${tag}'`)
          continue
        }

        console.log(`[migrator] running migration '${tag}'`)
        callback(MigratorStatus.RunningStep, `running migration '${tag}'`)

        // load the file content
        const content = (await migrationFiles[tag]()) as string

        await tx.exec(content)
        await tx.query(`INSERT INTO drizzle.migrations (tag) VALUES ($1)`, [tag])
      }
    })
    .catch(async (err) => {
      callback(MigratorStatus.Error, err.message)
      if (err instanceof MigratorError) {
        if (err.retry) {
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // bye bye data
          await pg.exec(`
            DROP SCHEMA IF EXISTS drizzle CASCADE;
            DROP SCHEMA public CASCADE;
            CREATE SCHEMA public;
          `)

          await migrate(pg, callback)
        }
      }
    })
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
