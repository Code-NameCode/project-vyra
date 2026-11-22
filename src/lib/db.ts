import { PrismaClient } from '@prisma/client'
import path from 'node:path'

// Some packaged development environments provide a Linux container path in
// DATABASE_URL even when the app is being run directly on Windows. Normalize
// that known workspace-relative form before Prisma initializes.
if (process.platform === 'win32' && process.env.DATABASE_URL?.startsWith('file:/home/')) {
  process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), 'db', 'custom.db')}`
}
if (process.platform === 'win32' && process.env.DATABASE_URL === 'file:../db/custom.db') {
  process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), 'db', 'custom.db')}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging can include user prompts, paths, and provider metadata.
    // Keep production diagnostics focused on failures only.
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
