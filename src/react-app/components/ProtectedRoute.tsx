import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: string[];
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  permissions = [],
  requireAdmin = false,
  requireSuperAdmin = false 
}: ProtectedRouteProps) {
  const { user, loading, hasPermissions, isAdmin, isSuperAdmin } = useAuth();

  // Redireciona para login se não estiver autenticado (antes de mostrar loading)
  if (!user && !loading) {
    return <Navigate to="/login" replace />;
  }

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin mb-4">
          <Shield className="w-10 h-10 text-blue-600" />
        </div>
        <p className="text-slate-600">Verificando permissões...</p>
      </div>
    );
  }

  // Redireciona para login se não estiver autenticado após loading
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar se requer super admin
  if (requireSuperAdmin && !isSuperAdmin()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Acesso Negado</h2>
          <p className="text-slate-600 mb-6">
            Você precisa ser Super Administrador para acessar esta página.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Verificar se requer admin
  if (requireAdmin && !isAdmin()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Acesso Negado</h2>
          <p className="text-slate-600 mb-6">
            Você precisa ser Administrador para acessar esta página.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Verificar permissões específicas
  if (permissions.length > 0 && !hasPermissions(permissions)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Permissão Insuficiente</h2>
          <p className="text-slate-600 mb-6">
            Você não tem as permissões necessárias para acessar esta página.
          </p>
          <div className="text-xs text-slate-500 mb-4">
            Permissões necessárias: {permissions.join(', ')}
          </div>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
