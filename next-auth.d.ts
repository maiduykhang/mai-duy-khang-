// FIX: Redefined interfaces to avoid circular dependency errors from importing DefaultSession/DefaultUser while augmenting the module.
import type { Prisma } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extends the built-in session to add role and id.
   */
  interface Session {
    user: {
      id: string;
      role: Prisma.Role;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  /**
   * Extends the built-in user model to match what authorize returns.
   */
  interface User {
    id: string;
    role: Prisma.Role;
    email?: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extends the built-in JWT to add role. The user ID is in `sub`.
   */
  interface JWT {
    role: Prisma.Role;
  }
}
