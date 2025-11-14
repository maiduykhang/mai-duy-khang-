// FIX: Use AuthOptions instead of NextAuthOptions and combine imports to resolve type errors.
import NextAuth, { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { PrismaAdapter } from '@next-auth/prisma-adapter'

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        if (!user || !user.password) {
          return null
        }
        
        const isValid = await bcrypt.compare(credentials.password, user.password)
        
        if (!isValid) {
          return null
        }
        
        return {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        // FIX: With corrected type augmentations, we can safely assign properties without 'as any'.
        session.user.role = token.role;
        if (token.sub) {
          session.user.id = token.sub;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login'
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);