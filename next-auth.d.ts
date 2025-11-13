import { Role } from '@prisma/client';
// FIX: Removed `DefaultSession` and `DefaultUser` from import to fix circular definition errors. These types are available globally within the `declare module` block.
import NextAuth from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid: string;
    role: Role;
  }
}