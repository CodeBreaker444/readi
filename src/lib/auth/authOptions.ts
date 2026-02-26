import { supabase } from '@/backend/database/database';
import bcrypt from 'bcryptjs';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Role } from './roles';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;          
      userId: number;
      ownerId: number;
      email: string;
      fullname: string;
      username?: string;
      role: Role;
      phone?: string;
      userActive: 'Y' | 'N';
      avatar?: string | null;
    };
  }

  interface User {
    id: string;
    userId: number;
    ownerId: number;
    email: string;
    fullname: string;
    username?: string;
    role: Role;
    phone?: string;
    userActive: 'Y' | 'N';
    avatar?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    userId: number;
    ownerId: number;
    email: string;
    fullname: string;
    username?: string;
    role: Role;
    phone?: string;
    userActive: 'Y' | 'N';
    avatar?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  jwt: {
    maxAge: 14 * 24 * 3600,
  },
  session: {
    maxAge: 24 * 3600,
  },

  cookies: {
    sessionToken: {
      name: 'readi_auth_token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select(`
            user_id,
            username,
            email,
            password_hash,
            first_name,
            last_name,
            phone,
            user_active,
            user_role,
            auth_user_id,
            fk_owner_id,
            users_profile!fk_user_id (
              profile_picture
            )
          `)
          .eq('email', credentials.email.toLowerCase().trim())
          .eq('user_active', 'Y')
          .single();

        if (error || !userData) {
          throw new Error('Invalid email or password');
        }

        const passwordValid = await bcrypt.compare(
          credentials.password,
          userData.password_hash ?? ''
        );
        if (!passwordValid) {
          throw new Error('Invalid email or password');
        }

        const profileData = Array.isArray(userData.users_profile)
          ? userData.users_profile[0]
          : userData.users_profile;

        const fullname =
          [userData.first_name, userData.last_name].filter(Boolean).join(' ') ||
          userData.username ||
          userData.email;

        return {
          id:         userData.auth_user_id,   
          userId:     userData.user_id,
          ownerId:    userData.fk_owner_id,
          email:      userData.email,
          fullname,
          username:   userData.username,
          role:       userData.user_role as Role,
          phone:      userData.phone,
          userActive: userData.user_active,
          avatar:     profileData?.profile_picture ?? null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id         = user.id;
        token.userId     = user.userId;
        token.ownerId    = user.ownerId;
        token.email      = user.email;
        token.fullname   = user.fullname;
        token.username   = user.username;
        token.role       = user.role;
        token.phone      = user.phone;
        token.userActive = user.userActive;
        token.avatar     = user.avatar;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        id:         token.id,
        userId:     token.userId,
        ownerId:    token.ownerId,
        email:      token.email,
        fullname:   token.fullname,
        username:   token.username,
        role:       token.role,
        phone:      token.phone,
        userActive: token.userActive,
        avatar:     token.avatar,
      };
      return session;
    },
  },

  pages: {
    signIn:  '/auth/login',
    error:   '/auth/login',
  },

  secret: process.env.JWT_SECRET,

  debug: process.env.NODE_ENV === 'development',
};