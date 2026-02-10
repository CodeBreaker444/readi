import Cookies from '@/node_modules/@types/js-cookie';
import { decodeToken } from './jwt-utils';
import { Role } from './roles';

const AUTH_COOKIE_NAME = 'readi_auth_token';

export interface UserData {
  userId: string;
  username: string;
  email: string;
  role: Role;
}

const cookieOptions = {
  expires: 7,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export const authCookies = {
  setAuthToken: (token: string) => {
    Cookies.set(AUTH_COOKIE_NAME, token, cookieOptions);
  },

  getAuthToken: (): string | undefined => {
    return Cookies.get(AUTH_COOKIE_NAME);
  },

  getUserData: (): UserData | null => {
    const token = authCookies.getAuthToken();
    if (!token) return null;

    const decoded = decodeToken(token);
    if (!decoded) return null;

    return {
      userId: decoded.sub,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
    };
  },

  clearAuth: () => {
    Cookies.remove(AUTH_COOKIE_NAME, { path: '/' });
  },

  getUserRole: (): Role | null => {
    const userData = authCookies.getUserData();
    return userData?.role || null;
  },

  getUserId: (): string | null => {
    const userData = authCookies.getUserData();
    return userData?.userId || null;
  },

  getUsername: (): string | null => {
    const userData = authCookies.getUserData();
    return userData?.username || null;
  },

  getEmail: (): string | null => {
    const userData = authCookies.getUserData();
    return userData?.email || null;
  },

  isAuthenticated: (): boolean => {
    const token = authCookies.getAuthToken();
    return !!token;
  },

  hasToken: (): boolean => {
    return !!authCookies.getAuthToken();
  },
};