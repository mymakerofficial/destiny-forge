import { PGlite } from '@electric-sql/pglite'
import { worker } from '@electric-sql/pglite/worker'
import { OpfsAhpFS } from '@electric-sql/pglite/opfs-ahp'
import { fuzzystrmatch } from '@electric-sql/pglite/contrib/fuzzystrmatch'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'

worker({
  async init() {
    return await PGlite.create({
      // fs: new OpfsAhpFS('destiny'),
      relaxedDurability: true,
      extensions: {
        pg_trgm,
        fuzzystrmatch,
      },
    })
  },
})
