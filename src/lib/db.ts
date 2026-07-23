import { PrismaClient } from '@prisma/client'

let _db: PrismaClient | null = null

try {
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
  }

  _db =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    })

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
} catch (e) {
  console.warn('[db] Prisma init failed — database features disabled:', e)
}

export const db = _db!