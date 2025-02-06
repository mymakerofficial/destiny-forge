import { injectPGlite as originalInjectPGlite } from '@electric-sql/pglite-vue'
import type { LiveNamespace } from '@electric-sql/pglite/live'
import type { PGliteInterface } from '@electric-sql/pglite'

export type PGliteWithExtensions = PGliteInterface & {
  live: LiveNamespace
}

export function injectPGlite() {
  const pg = originalInjectPGlite()

  if (!pg) {
    throw new Error('PGlite not provided')
  }

  return pg as PGliteWithExtensions
}
