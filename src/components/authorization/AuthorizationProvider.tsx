'use client';

import { useTheme } from '@/components/useTheme';
import {
  createContext,
  useContext,
  useRef,
  useState,
} from 'react';
import { AuthorizationModal, type AuthContext } from './AuthorizationModal';

interface AuthorizationContextType {
  requireAuthorization: (context: AuthContext) => Promise<string>;
}

const AuthorizationContext = createContext<AuthorizationContextType | null>(null);

export function AuthorizationProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<AuthContext | null>(null);
  const promiseRef = useRef<{
    resolve: (id: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const requireAuthorization = (context: AuthContext): Promise<string> => {
    setCtx(context);
    setOpen(true);
    return new Promise((resolve, reject) => {
      promiseRef.current = { resolve, reject };
    });
  };

  const handleSuccess = (transactionSignId: string) => {
    promiseRef.current?.resolve(transactionSignId);
    promiseRef.current = null;
    setOpen(false);
    setCtx(null);
  };

  const handleCancel = () => {
    promiseRef.current?.reject(new Error('Authorization cancelled'));
    promiseRef.current = null;
    setOpen(false);
    setCtx(null);
  };

  return (
    <AuthorizationContext.Provider value={{ requireAuthorization }}>
      {children}
      {ctx && (
        <AuthorizationModal
          open={open}
          context={ctx}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          isDark={isDark}
        />
      )}
    </AuthorizationContext.Provider>
  );
}

export function useAuthorization(): AuthorizationContextType {
  const context = useContext(AuthorizationContext);
  if (!context) {
    throw new Error('useAuthorization must be used within <AuthorizationProvider>');
  }
  return context;
}
