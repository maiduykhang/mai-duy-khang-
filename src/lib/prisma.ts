import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the Prisma client instance.
// This ensures that the Prisma client is only instantiated once.
declare global {
  var prisma: PrismaClient | undefined;
}

// FIX: Replaced non-standard `global` with `globalThis` for cross-environment compatibility.
const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  // FIX: Replaced non-standard `global` with `globalThis` for cross-environment compatibility.
  globalThis.prisma = prisma;
}

export default prisma;