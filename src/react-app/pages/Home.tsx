import { useState, useEffect } from 'react';
import { BarChart3, Settings, Users, UserCheck, UserX, Shield, Plus, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients');
        const data = await response.json();
        
        if (data.ok) {
          setClients(data.clients);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin">
          <BarChart3 className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-slate-600">Carregando...</p>
      </div>
    );
  }

  const activeClients = clients.filter(c => c.is_active);
  const configuredClients = clients.filter(c => c.ad_account_id && c.meta_token_enc);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header - Mobile Responsive */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">MeuDads</h1>
                <p className="text-xs sm:text-sm text-slate-500 truncate hidden sm:block">Performance Marketing Hub</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              <span className="text-xs sm:text-sm text-slate-600 hidden sm:inline">Powered by Mocha</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Responsive */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Hero Section - Mobile Responsive */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4 sm:mb-6">
            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4 px-2">
            Gerencie suas campanhas do Meta Ads
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto px-4">
            Centralize o controle de todos os seus clientes, monitore métricas em tempo real 
            e otimize suas campanhas com facilidade.
          </p>
        </div>

        {/* Statistics Cards - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Total de Clientes</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{clients.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Clientes Ativos</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{activeClients.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Clientes Inativos</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{clients.length - activeClients.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <UserX className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Configurados</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">{configuredClients.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gestão de Clientes */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Gestão de Clientes</h3>
                  <p className="text-sm text-slate-500">Configure e gerencie seus clientes</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Adicione novos clientes, configure tokens do Meta Ads e gerencie permissões.
              </p>
              <a
                href="/clients"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Gerenciar Clientes
              </a>
            </div>
          </div>

          {/* Anúncios Ativos */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Anúncios e Métricas</h3>
                  <p className="text-sm text-slate-500">Monitore performance em tempo real</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Visualize anúncios ativos, analise métricas e crie seleções para otimização.
              </p>
              {configuredClients.length > 0 ? (
                <div className="space-y-2">
                  {configuredClients.slice(0, 3).map(client => (
                    <a
                      key={client.id}
                      href={`/c/${client.slug}/creatives/active`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex items-center space-x-2">
                        {client.logo_url ? (
                          <img src={client.logo_url} alt={client.name} className="w-6 h-6 rounded object-cover" />
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-slate-700">{client.name}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    </a>
                  ))}
                  {configuredClients.length > 3 && (
                    <a
                      href="/clients"
                      className="flex items-center justify-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-sm text-slate-600"
                    >
                      Ver mais {configuredClients.length - 3} cliente(s)
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-3">
                    Nenhum cliente configurado ainda
                  </p>
                  <a
                    href="/clients"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar Primeiro Cliente
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Clientes Resumida */}
        {clients.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Clientes Recentes</h3>
              <a
                href="/clients"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Ver todos →
              </a>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.slice(0, 6).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center space-x-3 p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    {client.logo_url ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img 
                          src={client.logo_url} 
                          alt={`Logo ${client.name}`}
                          className="w-full h-full object-contain object-center"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.parentElement?.querySelector('.fallback-logo') as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="fallback-logo hidden w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{client.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          client.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {client.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        {client.ad_account_id && client.meta_token_enc && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Configurado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Getting Started */}
        {clients.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Bem-vindo ao MeuDads
            </h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Comece criando seu primeiro cliente para gerenciar campanhas do Meta Ads
            </p>
            <a
              href="/clients"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Criar Primeiro Cliente
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
