// FIX: Assuming the error is a module resolution issue, importing Prisma namespace might help.
import { PrismaClient } from '@prisma/client';

// Add prisma to the NodeJS global type
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;