import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/context/auth-context-base';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export type { AuthUser, AuthContextType } from '@/context/auth-context-base';
