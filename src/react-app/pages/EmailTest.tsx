import { useState } from 'react';
import { useAuth, useAuthFetch } from '../hooks/useAuth';
import { Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function EmailTest() {
  const { hasPermission } = useAuth();
  const fetchWithAuth = useAuthFetch();
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!hasPermission('clients.view')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Acesso Negado</h1>
          <p className="text-slate-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testEmail.trim() || !testEmail.includes('@')) {
      setResult({
        ok: false,
        error: 'Por favor, insira um email válido'
      });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const response = await fetchWithAuth('/api/test-email', {
        method: 'POST',
        body: JSON.stringify({ test_email: testEmail.trim() })
      });
      
      const data = await response.json();
      setResult(data);
      
    } catch (error) {
      console.error('Error testing email:', error);
      setResult({
        ok: false,
        error: 'Erro de rede ao testar email'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Testar Sistema de Email</h3>
            <p className="text-sm text-slate-600 mt-1">
              Envie um email de teste para verificar se o sistema está funcionando corretamente
            </p>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleTestEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email de Teste
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu-email@exemplo.com"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Digite o email onde deseja receber o teste
                </p>
              </div>

              <button
                type="submit"
                disabled={testing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center"
              >
                {testing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Enviando teste...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Email de Teste
                  </>
                )}
              </button>
            </form>

            {/* Result */}
            {result && (
              <div className={`mt-6 p-4 rounded-lg ${
                result.ok 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start">
                  {result.ok ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      result.ok ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.ok ? 'Sucesso!' : 'Erro'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      result.ok ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.message || result.error}
                    </p>
                    
                    {result.details && (
                      <div className="mt-3 text-xs">
                        <details className={result.ok ? 'text-green-600' : 'text-red-600'}>
                          <summary className="cursor-pointer font-medium">
                            Detalhes técnicos
                          </summary>
                          <pre className="mt-2 p-2 bg-slate-100 rounded text-slate-700 overflow-auto">
{JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Como funciona:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• O sistema enviará um email de boas-vindas igual ao que os clientes recebem</li>
                <li>• Se der erro, verifique se a chave API do Resend está configurada</li>
                <li>• O email será enviado de: noreply@meudads.com.br</li>
                <li>• Verifique também a pasta de spam do email de teste</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
