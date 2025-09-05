import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth, useAuthFetch } from '../hooks/useAuth';
import { Settings, AlertCircle, BarChart3, List, Database } from 'lucide-react';
import AdAccountManager from '../components/AdAccountManager';
import AdAccountSelector from '../components/AdAccountSelector';
import type { AdAccount } from '../../shared/platforms';

export default function AccountManagement() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const fetchWithAuth = useAuthFetch();
  
  const [client, setClient] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if we came from clients management
  const fromClients = searchParams.get('from') === 'clients';

  useEffect(() => {
    if (authLoading || !user) return;
    
    if (!slug) {
      setError('Cliente não especificado');
      setLoading(false);
      return;
    }
    
    fetchClient();
  }, [slug, authLoading, user]);

  const fetchClient = async () => {
    if (!slug) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchWithAuth(`/api/clients/${slug}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.client) {
          setClient(data.client);
        } else {
          setError(data.error || 'Dados do cliente inválidos');
        }
      } else {
        let errorMessage = 'Cliente não encontrado';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {}
        
        if (response.status === 403) {
          errorMessage = 'Acesso negado ao cliente';
        } else if (response.status === 404) {
          errorMessage = 'Cliente não encontrado ou inativo';
        }
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching client:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while authenticating
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Show error if any
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Problema Detectado</h3>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                fetchClient();
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => {
                if (fromClients) {
                  window.location.href = '/clients';
                } else {
                  window.location.href = '/';
                }
              }}
              className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              {fromClients ? 'Voltar à Gestão de Clientes' : 'Voltar ao Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-slate-600 mb-6">
          {fromClients ? (
            <a href="/clients" className="text-blue-600 hover:text-blue-700">
              Gestão de Clientes
            </a>
          ) : (
            <a href="/" className="text-blue-600 hover:text-blue-700">
              Dashboard
            </a>
          )}
          <span>/</span>
          <span>Contas de Anúncios</span>
          {client && (
            <>
              <span>/</span>
              <span className="font-medium">{client.name}</span>
            </>
          )}
        </div>
        {/* Compact Info Card */}
        <div className="mb-6 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3">
                <span className="text-emerald-700 text-sm font-medium">Plataformas suportadas:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-white/80 backdrop-blur rounded-lg flex items-center justify-center border border-emerald-200 p-0.5">
                    <img src="https://mocha-cdn.com/0198cf0a-d3c7-7d97-b482-1973c540093e/111.png" alt="Meta Ads" className="w-11 h-11 object-contain object-center" />
                  </div>
                  <div className="w-12 h-12 bg-white/80 backdrop-blur rounded-lg flex items-center justify-center border border-emerald-200 p-0.5">
                    <img src="https://mocha-cdn.com/0198cf0a-d3c7-7d97-b482-1973c540093e/113.png" alt="Google Ads" className="w-11 h-11 object-contain object-center" />
                  </div>
                  <div className="w-12 h-12 bg-white/80 backdrop-blur rounded-lg flex items-center justify-center border border-emerald-200 p-0.5">
                    <img src="https://mocha-cdn.com/0198cf0a-d3c7-7d97-b482-1973c540093e/112.png" alt="Pinterest Ads" className="w-11 h-11 object-contain object-center" />
                  </div>
                  <div className="w-12 h-12 bg-white/80 backdrop-blur rounded-lg flex items-center justify-center border border-emerald-200 p-0.5">
                    <img src="https://mocha-cdn.com/0198cf0a-d3c7-7d97-b482-1973c540093e/114.png" alt="TikTok Ads" className="w-11 h-11 object-contain object-center" />
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowAccountManager(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Gerenciar Contas</span>
            </button>
          </div>
        </div>

        {/* Account Selector - Improved Design */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-blue-600" />
              </div>
              <span>Contas Configuradas</span>
            </h3>
            
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <AdAccountSelector
              clientSlug={slug || ''}
              selectedAccount={selectedAccount}
              onAccountSelect={setSelectedAccount}
              onManageAccounts={() => setShowAccountManager(true)}
              hideManageButton={true}
            />
          </div>
        </div>

        {/* Account Details - Enhanced */}
        {selectedAccount && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6 max-w-4xl">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-slate-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900">Detalhes da Conta</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <span className="text-slate-500 text-xs font-medium">Nome da Conta</span>
                    <p className="font-semibold text-slate-900 mt-1">{selectedAccount.account_name}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <span className="text-slate-500 text-xs font-medium">Plataforma</span>
                    <p className="font-semibold text-slate-900 mt-1">{selectedAccount.platform}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <span className="text-slate-500 text-xs font-medium">ID da Conta</span>
                    <p className="font-mono text-slate-900 mt-1 text-xs">{selectedAccount.account_id}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <span className="text-slate-500 text-xs font-medium">Status</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedAccount.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedAccount.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <h5 className="font-semibold text-slate-700 mb-3 text-sm">Sincronização</h5>
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-500 text-xs font-medium">Status</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedAccount.sync_status === 'success' ? 'bg-green-100 text-green-800' :
                        selectedAccount.sync_status === 'error' ? 'bg-red-100 text-red-800' :
                        selectedAccount.sync_status === 'syncing' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedAccount.sync_status === 'success' ? 'Sincronizado' :
                         selectedAccount.sync_status === 'error' ? 'Erro' :
                         selectedAccount.sync_status === 'syncing' ? 'Sincronizando' :
                         'Pendente'}
                      </span>
                    </div>
                  </div>
                  
                  {selectedAccount.last_sync_at && (
                    <div>
                      <span className="text-slate-500 text-xs font-medium">Última Sync</span>
                      <p className="text-slate-900 text-xs mt-1 font-medium">
                        {(() => {
                          try {
                            let date: Date;
                            
                            if (selectedAccount.last_sync_at.includes('T')) {
                              if (selectedAccount.last_sync_at.includes('Z') || selectedAccount.last_sync_at.includes('+')) {
                                date = new Date(selectedAccount.last_sync_at);
                              } else {
                                date = new Date(selectedAccount.last_sync_at + 'Z');
                              }
                            } else {
                              date = new Date(selectedAccount.last_sync_at.replace(' ', 'T') + 'Z');
                            }
                            
                            if (isNaN(date.getTime())) return 'Data inválida';
                            
                            const formatter = new Intl.DateTimeFormat('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'America/Sao_Paulo'
                            });
                            
                            return formatter.format(date).replace(',', ' às');
                          } catch (error) {
                            return 'Erro na data';
                          }
                        })()}
                      </p>
                    </div>
                  )}
                  
                  {selectedAccount.sync_error && (
                    <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-xs">
                      <p className="text-red-700">
                        <strong>Erro:</strong> {selectedAccount.sync_error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ações Rápidas - Compacta e Elegante */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
              <span className="text-slate-600 text-sm">⚡</span>
            </div>
            <h4 className="text-lg font-semibold text-slate-900">Ações Rápidas</h4>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Ver Anúncios Ativos */}
            <a
              href={`/c/${slug}/ads/active${fromClients ? '?from=clients' : ''}`}
              className="flex items-center p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group flex-1"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h5 className="font-medium text-slate-900 group-hover:text-blue-700 text-sm">Ver Anúncios</h5>
                <p className="text-xs text-slate-600 truncate">Visualizar e gerenciar</p>
              </div>
            </a>
            
            {/* Ver Seleções de Anúncios */}
            <a
              href={`/selections?client=${slug}${fromClients ? '&from=clients' : ''}`}
              className="flex items-center p-3 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group flex-1"
            >
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors">
                <List className="w-4 h-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <h5 className="font-medium text-slate-900 group-hover:text-purple-700 text-sm">Ver Seleções de Anúncios</h5>
                <p className="text-xs text-slate-600 truncate">Histórico de seleções</p>
              </div>
            </a>
          </div>
        </div>
      </main>

      {/* Account Manager Modal */}
      {showAccountManager && slug && (
        <AdAccountManager
          clientSlug={slug}
          onClose={() => setShowAccountManager(false)}
          onAccountsChanged={() => {
            // Force refresh of the account selector
            setSelectedAccount(null);
          }}
        />
      )}
    </div>
  );
}
