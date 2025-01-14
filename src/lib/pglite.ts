import { injectPGlite as originalInjectPGlite } from '@electric-sql/pglite-vue'

export function injectPGlite() {
    const pg = originalInjectPGlite()

    if (!pg) {
      throw new Error('PGlite not provided')
    }

    return pg
}
