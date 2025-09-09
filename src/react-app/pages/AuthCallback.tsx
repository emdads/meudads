import { useEffect, useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';

import { TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const { exchangeCodeForSessionToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        setStatus('success');
        // Redireciona após 2 segundos
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } catch (error) {
        console.error('Erro no callback de autenticação:', error);
        setStatus('error');
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken]);

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Login realizado com sucesso!</h2>
            <p className="text-slate-600 mb-4">
              Redirecionando para o dashboard...
            </p>
            
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-sm text-slate-500">Carregando...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-red-200 p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Erro no login</h2>
            <p className="text-slate-600 mb-6">
              {error || 'Ocorreu um erro durante o processo de autenticação.'}
            </p>
            
            <a
              href="/login"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl mb-6 shadow-lg">
            <TrendingUp className="w-8 h-8 text-white animate-pulse" />
          </div>
          
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Finalizando login...</h2>
          <p className="text-slate-600 mb-6">
            Aguarde enquanto verificamos suas credenciais
          </p>
          
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-sm text-slate-500">Processando...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
