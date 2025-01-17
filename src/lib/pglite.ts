import { injectPGlite as originalInjectPGlite } from '@electric-sql/pglite-vue'
import type { LiveNamespace } from '@electric-sql/pglite/live'
import type { SyncNamespaceObj } from '@electric-sql/pglite-sync'
import type { PGliteInterface } from '@electric-sql/pglite'

export type PGliteWithExtensions = PGliteInterface & {
  live: LiveNamespace
  sync: SyncNamespaceObj
}

export function injectPGlite() {
  const pg = originalInjectPGlite()

  if (!pg) {
    throw new Error('PGlite not provided')
  }

  return pg as PGliteWithExtensions
}
