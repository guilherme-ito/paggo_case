import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { apiClient } from './api-client';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const response = await apiClient.post('/auth/login', {
            email: credentials?.email,
            password: credentials?.password,
          });

          if (response.data.access_token && response.data.user) {
            return {
              id: response.data.user.id,
              email: response.data.user.email,
              name: response.data.user.name,
              accessToken: response.data.access_token,
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
});

export async function getServerSession() {
  return auth();
}
