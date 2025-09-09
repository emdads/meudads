import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  user_type: 'admin' | 'client' | 'user';
  is_active: boolean;
  last_login_at?: string;
}

interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
  action: string;
}

interface AuthContextType {
  user: User | null;
  permissions: Permission[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permissionName: string) => boolean;
  hasPermissions: (permissionNames: string[]) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = 'meudads_session_token';
const EXPLICIT_LOGOUT_KEY = 'meudads_explicit_logout';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const getStoredToken = () => {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  };

  const setStoredToken = (token: string) => {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  };

  const removeStoredToken = () => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  };

  const setExplicitLogout = () => {
    localStorage.setItem(EXPLICIT_LOGOUT_KEY, 'true');
  };

  const clearExplicitLogout = () => {
    localStorage.removeItem(EXPLICIT_LOGOUT_KEY);
  };

  const isExplicitLogout = () => {
    return localStorage.getItem(EXPLICIT_LOGOUT_KEY) === 'true';
  };

  const getAuthHeaders = () => {
    const token = getStoredToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const authHeaders = getAuthHeaders();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Safely merge options.headers
    if (options.headers) {
      const optionsHeaders = options.headers as Record<string, string>;
      Object.keys(optionsHeaders).forEach(key => {
        headers[key] = optionsHeaders[key];
      });
    }
    
    if (authHeaders.Authorization) {
      headers.Authorization = authHeaders.Authorization;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  const refreshUser = async () => {
    try {
      const token = getStoredToken();
      const explicitLogout = isExplicitLogout();
      
      console.log('[AUTH-DEBUG] Checking token:', token ? 'exists' : 'not found');
      console.log('[AUTH-DEBUG] Explicit logout:', explicitLogout);
      
      if (!token) {
        // Só fazer auto-login se não foi um logout explícito
        if (!explicitLogout) {
          console.log('[AUTH-DEBUG] No token found, attempting auto-login for development');
          try {
            await login('admin@meudads.com.br', 'admin123');
            return;
          } catch (autoLoginError) {
            console.log('[AUTH-DEBUG] Auto-login failed:', autoLoginError);
            setUser(null);
            setPermissions([]);
            setLoading(false);
            return;
          }
        } else {
          console.log('[AUTH-DEBUG] Explicit logout detected, not attempting auto-login');
          setUser(null);
          setPermissions([]);
          setLoading(false);
          return;
        }
      }

      console.log('[AUTH-DEBUG] Token found, verifying with server...');
      const response = await fetchWithAuth('/api/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AUTH-DEBUG] ✅ User verified:', data.user?.email);
        setUser(data.user);
        setPermissions(data.permissions || []);
        setLoading(false); // ✅ Importante: definir loading como false aqui
      } else {
        console.log('[AUTH-DEBUG] ❌ Token invalid, removing and retrying auto-login');
        // Token inválido - tentar auto-login
        removeStoredToken();
        try {
          await login('admin@meudads.com.br', 'admin123');
          return;
        } catch (autoLoginError) {
          console.log('[AUTH-DEBUG] Auto-login failed after token invalid:', autoLoginError);
          setUser(null);
          setPermissions([]);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('[AUTH-DEBUG] Error in refreshUser:', error);
      removeStoredToken();
      // Try auto-login as fallback
      try {
        await login('admin@meudads.com.br', 'admin123');
        return;
      } catch (autoLoginError) {
        console.log('[AUTH-DEBUG] Auto-login failed in catch:', autoLoginError);
        setUser(null);
        setPermissions([]);
        setLoading(false);
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('[AUTH-DEBUG] Attempting login for:', email);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('[AUTH-DEBUG] ✅ Login successful for:', data.user?.email);
        setStoredToken(data.token);
        setUser(data.user);
        setPermissions(data.permissions || []);
        setLoading(false);
        // Limpar flag de logout explícito quando fizer login com sucesso
        clearExplicitLogout();
      } else {
        console.log('[AUTH-DEBUG] ❌ Login failed:', data.error);
        throw new Error(data.error || 'Erro no login');
      }
    } catch (error) {
      console.error('[AUTH-DEBUG] Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Marcar como logout explícito ANTES de remover o token
      setExplicitLogout();
      
      const token = getStoredToken();
      if (token) {
        // Tentar revogar o token no servidor
        await fetchWithAuth('/api/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      console.error('Erro ao fazer logout no servidor:', error);
    } finally {
      removeStoredToken();
      setUser(null);
      setPermissions([]);
      setLoading(false); // ✅ Definir loading como false para evitar piscar da tela
      console.log('[AUTH-DEBUG] ✅ Logout completed, explicit flag set');
    }
  };

  const hasPermission = (permissionName: string): boolean => {
    return permissions.some(p => p.name === permissionName);
  };

  const hasPermissions = (permissionNames: string[]): boolean => {
    return permissionNames.every(permission => hasPermission(permission));
  };

  const isAdmin = (): boolean => {
    return user?.user_type === 'admin' || isSuperAdmin();
  };

  const isSuperAdmin = (): boolean => {
    return hasPermission('system.setup') || user?.user_type === 'admin';
  };

  // Verificar autenticação ao carregar
  useEffect(() => {
    refreshUser();
  }, []);

  const value = {
    user,
    permissions,
    loading,
    login,
    logout,
    hasPermission,
    hasPermissions,
    isAdmin,
    isSuperAdmin,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

// Hook para fazer requisições autenticadas
export function useAuthFetch() {
  const getStoredToken = () => {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    // Safely merge options.headers
    if (options.headers) {
      const optionsHeaders = options.headers as Record<string, string>;
      Object.keys(optionsHeaders).forEach(key => {
        headers[key] = optionsHeaders[key];
      });
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return fetchWithAuth;
}
