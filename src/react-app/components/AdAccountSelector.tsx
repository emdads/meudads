import { useState, useEffect } from 'react';
import { ChevronDown, Settings, CheckCircle, XCircle, Clock, RefreshCw, Database, AlertCircle } from 'lucide-react';
import { AD_PLATFORMS, AdAccount } from '../../shared/platforms';
import { useAuthFetch } from '../hooks/useAuth';
import { formatToBrazilRelativeTime, formatWithTimezone } from '../../shared/timezone';

interface AdAccountSelectorProps {
  clientSlug?: string; // Make optional for admin use
  selectedAccount: AdAccount | null;
  onAccountSelect: (account: AdAccount | null) => void;
  onManageAccounts?: () => void;
  hideManageButton?: boolean;
  isSyncing?: boolean;
  syncingMessage?: string;
  showAllAccounts?: boolean; // New prop for admin view
  filterByClient?: string; // Filter by specific client
  showAccountId?: boolean; // Show account IDs
}

interface ExtendedAdAccount extends AdAccount {
  client_name?: string;
  client_slug?: string;
}

export default function AdAccountSelector({ 
  clientSlug, 
  selectedAccount, 
  onAccountSelect,
  onManageAccounts,
  hideManageButton = false,
  isSyncing = false,
  syncingMessage = '',
  showAllAccounts = false,
  filterByClient = '',
  showAccountId = false
}: AdAccountSelectorProps) {
  const [adAccounts, setAdAccounts] = useState<ExtendedAdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchWithAuth = useAuthFetch();

  useEffect(() => {
    fetchAdAccounts();
  }, [clientSlug, showAllAccounts, filterByClient]);

  // REMOVE POLLING: Sistema de sincronização automática foi desabilitado
  // Não há mais necessidade de verificar status de sync automaticamente

  const fetchAdAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let accounts: ExtendedAdAccount[] = [];
      
      console.log('[AD-ACCOUNT-SELECTOR] 🔍 Starting fetch:', {
        showAllAccounts,
        clientSlug,
        filterByClient
      });
      
      if (showAllAccounts) {
        // Admin view - get all accounts
        console.log('[AD-ACCOUNT-SELECTOR] Fetching all accounts from admin endpoint...');
        
        const response = await fetchWithAuth('/api/admin/client-platforms');
        console.log('[AD-ACCOUNT-SELECTOR] Admin endpoint response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[AD-ACCOUNT-SELECTOR] Admin endpoint response data:', data);
          
          if (data.ok && data.accounts && Array.isArray(data.accounts)) {
            // Get all active accounts
            accounts = data.accounts.filter((acc: ExtendedAdAccount) => acc.is_active);
            
            // Filter by specific client if requested
            if (filterByClient) {
              accounts = accounts.filter((acc: ExtendedAdAccount) => 
                acc.client_slug === filterByClient || 
                acc.client_name?.toLowerCase().includes(filterByClient.toLowerCase())
              );
            }
            
            console.log('[AD-ACCOUNT-SELECTOR] ✅ Successfully got accounts:', accounts.length);
            accounts.forEach(acc => {
              console.log(`[AD-ACCOUNT-SELECTOR] Account: ${acc.account_name} (${acc.platform}) for ${acc.client_name}`);
            });
          } else {
            console.warn('[AD-ACCOUNT-SELECTOR] No accounts in response data:', data);
            setError('Nenhuma conta de anúncios encontrada no sistema.');
          }
        } else {
          let errorData: any = {};
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error('[AD-ACCOUNT-SELECTOR] Failed to parse admin error response:', parseError);
            errorData = { error: 'Erro de resposta' };
          }
          
          console.error('[AD-ACCOUNT-SELECTOR] Admin endpoint failed:', response.status, errorData);
          
          if (response.status === 401) {
            setError('Não autenticado. Faça login novamente.');
          } else if (response.status === 403) {
            setError('Sem permissão para acessar as contas de anúncios.');
          } else {
            // Show detailed error message including any Meta API errors
            const detailedError = errorData.error_details 
              ? `${errorData.error} - ${errorData.error_details}`
              : errorData.error || 'Erro desconhecido';
            setError(`Erro ${response.status}: ${detailedError}`);
          }
        }
        
      } else if (clientSlug) {
        // Client-specific view
        console.log('[AD-ACCOUNT-SELECTOR] Fetching accounts for client:', clientSlug);
        
        const response = await fetchWithAuth(`/api/clients/${clientSlug}/ad-accounts`);
        console.log('[AD-ACCOUNT-SELECTOR] Client endpoint response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[AD-ACCOUNT-SELECTOR] Client endpoint response data:', data);
          
          if (data.ok && data.ad_accounts && Array.isArray(data.ad_accounts)) {
            accounts = data.ad_accounts.filter((acc: AdAccount) => acc.is_active);
            console.log('[AD-ACCOUNT-SELECTOR] ✅ Successfully got client accounts:', accounts.length);
            accounts.forEach(acc => {
              console.log(`[AD-ACCOUNT-SELECTOR] Client Account: ${acc.account_name} (${acc.platform})`);
            });
          } else {
            console.warn('[AD-ACCOUNT-SELECTOR] No accounts in client response:', data);
            setError('Nenhuma conta configurada para este cliente.');
          }
        } else {
          let errorData: any = {};
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error('[AD-ACCOUNT-SELECTOR] Failed to parse client error response:', parseError);
            errorData = { error: 'Erro de resposta' };
          }
          
          console.error('[AD-ACCOUNT-SELECTOR] Client endpoint failed:', response.status, errorData);
          
          // Show detailed error message including any Meta API errors
          const detailedError = errorData.error_details 
            ? `${errorData.error} - ${errorData.error_details}`
            : errorData.error || 'Erro desconhecido';
          setError(`Erro ao carregar contas: ${detailedError}`);
        }
      } else {
        console.log('[AD-ACCOUNT-SELECTOR] No clientSlug and not showAllAccounts - skipping fetch');
      }
      
      console.log('[AD-ACCOUNT-SELECTOR] Final accounts to display:', accounts.length);
      setAdAccounts(accounts);
      
      // Auto-select first account if none selected and we have accounts
      if (!selectedAccount && accounts.length > 0) {
        console.log('[AD-ACCOUNT-SELECTOR] Auto-selecting first account:', accounts[0].account_name);
        onAccountSelect(accounts[0]);
      }
      
    } catch (error) {
      console.error('[AD-ACCOUNT-SELECTOR] ❌ Error fetching ad accounts:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar contas');
      setAdAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" title="Última sincronização realizada com sucesso" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" title="Erro na última sincronização - clique para ver detalhes" />;
      case 'syncing':
        return <Clock className="w-4 h-4 text-blue-500" title="Sincronização em andamento" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" title="Aguardando primeira sincronização" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Sincronizada';
      case 'error':
        return 'Erro na sync';
      case 'syncing':
        return 'Sincronizando';
      default:
        return 'Pendente';
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      meta: 'bg-blue-100 text-blue-800',
      pinterest: 'bg-red-100 text-red-800',
      tiktok: 'bg-gray-100 text-gray-800',
      google: 'bg-green-100 text-green-800',
      linkedin: 'bg-blue-100 text-blue-800'
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg px-4 py-3 shadow-sm">
        <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full"></div>
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-800">
            {showAllAccounts ? 'Carregando todas as contas...' : 'Carregando contas de anúncios...'}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            ⏳ Verificando configurações no sistema
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-3 bg-red-50 border-2 border-red-200 rounded-lg px-4 py-3">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <div className="flex-1">
          <div className="text-sm font-medium text-red-800">Erro ao carregar contas</div>
          <div className="text-xs text-red-600 mt-1">{error}</div>
        </div>
        <button
          onClick={fetchAdAccounts}
          className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-100"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // DO NOT show syncing state here - let the main component handle it
  // This prevents duplicate "Conectando com a plataforma" messages

  if (adAccounts.length === 0) {
    return (
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <div className="flex items-center space-x-3">
          <Database className="w-5 h-5 text-amber-500" />
          <div>
            <div className="text-sm font-medium text-amber-800">
              {showAllAccounts ? 'Nenhuma conta de anúncios encontrada' : 'Nenhuma conta configurada'}
            </div>
            <div className="text-xs text-amber-600 mt-1">
              {showAllAccounts 
                ? (clientSlug 
                    ? `Nenhuma conta ativa configurada para este cliente. Configure em "Gerenciar Clientes".`
                    : 'Configure contas de anúncios nos clientes para que apareçam aqui.')
                : 'Configure pelo menos uma conta de anúncios para este cliente'
              }
            </div>
          </div>
        </div>
        {!hideManageButton && onManageAccounts && (
          <button
            onClick={onManageAccounts}
            className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors"
          >
            {showAllAccounts ? 'Configurar Contas' : 'Configurar'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center justify-between w-full bg-white border-2 rounded-lg px-4 py-3 transition-all duration-200 ${
          selectedAccount 
            ? 'border-blue-200 hover:border-blue-400 hover:shadow-md' 
            : 'border-slate-200 hover:border-blue-300'
        } ${showDropdown ? 'border-blue-400 shadow-md' : ''}`}
      >
        <div className="flex items-center space-x-3">
          {selectedAccount ? (
            <>
              <div className="flex items-center space-x-3">
                {AD_PLATFORMS[selectedAccount.platform]?.logo ? (
                  <img 
                    src={AD_PLATFORMS[selectedAccount.platform].logo} 
                    alt={AD_PLATFORMS[selectedAccount.platform].name}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'inline';
                    }}
                  />
                ) : null}
                <span className={`text-2xl ${AD_PLATFORMS[selectedAccount.platform]?.logo ? 'hidden' : ''}`}>
                  {AD_PLATFORMS[selectedAccount.platform]?.icon || '📊'}
                </span>
                <div className="text-left">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-slate-900">
                      {selectedAccount.account_name}
                    </span>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(selectedAccount.sync_status)}
                      <span className="text-xs text-slate-500">
                        {getStatusText(selectedAccount.sync_status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getPlatformColor(selectedAccount.platform)}`}>
                      {AD_PLATFORMS[selectedAccount.platform]?.name || selectedAccount.platform}
                    </span>
                    {showAllAccounts && (selectedAccount as ExtendedAdAccount).client_name && (
                      <span className="text-xs text-slate-500 font-medium">
                        {(selectedAccount as ExtendedAdAccount).client_name}
                      </span>
                    )}
                    {(showAccountId || showAllAccounts) && (
                      <span className="text-xs text-slate-400 font-mono">
                        {selectedAccount.account_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div>
              <span className="text-slate-500">
                {showAllAccounts ? 'Selecionar conta para sincronizar' : 'Selecionar conta de anúncios'}
              </span>
              <div className="text-xs text-slate-400 mt-1">
                {adAccounts.length} conta{adAccounts.length !== 1 ? 's' : ''} disponível{adAccounts.length !== 1 ? 'is' : ''}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            {!hideManageButton && onManageAccounts && (
              <div className="pb-2 mb-2 border-b border-slate-200">
                <button
                  onClick={() => {
                    onManageAccounts();
                    setShowDropdown(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>{showAllAccounts ? 'Gerenciar Todas as Contas' : 'Gerenciar Contas'}</span>
                </button>
              </div>
            )}
            
            {/* Group accounts by platform or by client if showing all accounts */}
            {Object.entries(
              showAllAccounts 
                ? adAccounts.reduce((acc: Record<string, ExtendedAdAccount[]>, account) => {
                    const key = account.client_name || 'Cliente Sem Nome';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(account);
                    return acc;
                  }, {} as Record<string, ExtendedAdAccount[]>)
                : adAccounts.reduce((acc: Record<string, ExtendedAdAccount[]>, account) => {
                    if (!acc[account.platform]) acc[account.platform] = [];
                    acc[account.platform].push(account);
                    return acc;
                  }, {} as Record<string, ExtendedAdAccount[]>)
            ).map(([groupKey, accounts]) => (
              <div key={groupKey} className="mb-3 last:mb-0">
                <div className="px-3 py-1 text-xs font-medium text-slate-600 uppercase tracking-wide">
                  {showAllAccounts ? groupKey : (AD_PLATFORMS[groupKey]?.name || groupKey)}
                </div>
                <div className="space-y-1">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => {
                        onAccountSelect(account);
                        setShowDropdown(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedAccount?.id === account.id
                          ? 'bg-blue-50 text-blue-900 border border-blue-200'
                          : account.is_active
                          ? 'hover:bg-slate-50 text-slate-900'
                          : 'text-slate-400 cursor-not-allowed'
                      }`}
                      disabled={!account.is_active}
                    >
                      <div className="flex items-center space-x-3">
                        {AD_PLATFORMS[account.platform]?.logo ? (
                          <img 
                            src={AD_PLATFORMS[account.platform].logo} 
                            alt={AD_PLATFORMS[account.platform].name}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'inline';
                            }}
                          />
                        ) : null}
                        <span className={`text-xl ${AD_PLATFORMS[account.platform]?.logo ? 'hidden' : ''}`}>
                          {AD_PLATFORMS[account.platform]?.icon || '📊'}
                        </span>
                        <div className="text-left">
                          <div className="font-medium">{account.account_name}</div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-1.5 py-0.5 text-xs rounded ${getPlatformColor(account.platform)}`}>
                              {AD_PLATFORMS[account.platform]?.name || account.platform}
                            </span>
                            {showAllAccounts && account.client_name && (
                              <span className="text-xs text-slate-500">
                                {account.client_name}
                              </span>
                            )}
                          </div>
                          {(showAccountId || showAllAccounts) && (
                            <div className="text-xs text-slate-400 font-mono mt-1">
                              ID: {account.account_id}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(account.sync_status)}
                          <span className="text-xs text-slate-500">
                            {getStatusText(account.sync_status)}
                          </span>
                        </div>
                        {!account.is_active && (
                          <span className="text-xs text-red-500">Inativa</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {adAccounts.filter(acc => acc.is_active).length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                Nenhuma conta ativa encontrada
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
