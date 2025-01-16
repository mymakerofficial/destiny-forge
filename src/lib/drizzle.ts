import type { PgliteDatabase } from 'drizzle-orm/pglite'
import * as schema from '@/db/schema'
import { inject, provide } from 'vue'

export type Drizzle = PgliteDatabase<typeof schema>

const drizzleKey = Symbol('drizzle')

export function provideDrizzle(drizzle: Drizzle) {
  provide(drizzleKey, drizzle)
}

export function injectDrizzle()  {
  const drizzle = inject<Drizzle>(drizzleKey)
  if (!drizzle) {
    throw new Error('Drizzle not provided')
  }
  return drizzle
}
