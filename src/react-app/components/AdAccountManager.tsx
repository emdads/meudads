import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { AD_PLATFORMS, AdAccount, AdAccountCreate } from '../../shared/platforms';
import { useAuthFetch } from '../hooks/useAuth';

interface AdAccountManagerProps {
  clientSlug: string;
  onClose: () => void;
  onAccountsChanged: () => void;
}

export default function AdAccountManager({ clientSlug, onClose, onAccountsChanged }: AdAccountManagerProps) {
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdAccount | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const fetchWithAuth = useAuthFetch();

  const [formData, setFormData] = useState<AdAccountCreate>({
    platform: 'meta',
    account_name: '',
    account_id: '',
    access_token: ''
  });
  const [formErrors, setFormErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAdAccounts();
  }, [clientSlug]);

  const fetchAdAccounts = async () => {
    try {
      const response = await fetchWithAuth(`/api/clients/${clientSlug}/ad-accounts`);
      const data = await response.json();
      
      if (data.ok) {
        setAdAccounts(data.ad_accounts);
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      platform: 'meta',
      account_name: '',
      account_id: '',
      access_token: ''
    });
    setFormErrors({});
    setEditingAccount(null);
    setShowAddForm(false);
  };

  const handleEdit = (account: AdAccount) => {
    setEditingAccount(account);
    setFormData({
      platform: account.platform,
      account_name: account.account_name,
      account_id: account.account_id,
      access_token: '' // Don't pre-fill token for security
    });
    setShowAddForm(true);
  };

  const validateForm = () => {
    const errors: any = {};
    
    if (!formData.account_name.trim()) {
      errors.account_name = 'Nome da conta é obrigatório';
    }
    
    if (!formData.account_id.trim()) {
      errors.account_id = 'ID da conta é obrigatório';
    }
    
    if (!editingAccount && !formData.access_token?.trim()) {
      errors.access_token = 'Token de acesso é obrigatório';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    try {
      const url = editingAccount 
        ? `/api/clients/${clientSlug}/ad-accounts/${editingAccount.id}`
        : `/api/clients/${clientSlug}/ad-accounts`;
      const method = editingAccount ? 'PATCH' : 'POST';
      
      const payload: any = {
        platform: formData.platform,
        account_name: formData.account_name.trim(),
        account_id: formData.account_id.trim()
      };
      
      if (formData.access_token?.trim()) {
        payload.access_token = formData.access_token.trim();
      }
      
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.ok) {
        // If it's a new account, automatically sync it
        if (!editingAccount && data.account_id) {
          console.log('🔄 Iniciando sincronização automática da nova conta...');
          
          try {
            const syncResponse = await fetchWithAuth(`/api/admin/clients/${clientSlug}/ad-accounts/${data.account_id}/sync?days=30`);
            const syncData = await syncResponse.json();
            
            if (syncData.ok) {
              await fetchAdAccounts();
              onAccountsChanged();
              resetForm();
              
              alert(`✅ Conta criada e sincronizada com sucesso!\n\n${syncData.summary?.ads || 0} anúncios importados e prontos para uso.`);
            } else {
              await fetchAdAccounts();
              onAccountsChanged();
              resetForm();
              
              alert(`⚠️ Conta criada mas erro na sincronização: ${syncData.error}\n\nVocê pode tentar sincronizar manualmente.`);
            }
          } catch (syncError) {
            console.error('Auto-sync error:', syncError);
            await fetchAdAccounts();
            onAccountsChanged();
            resetForm();
            
            alert('✅ Conta criada com sucesso!\n\n⚠️ Erro na sincronização automática. Você pode sincronizar manualmente.');
          }
        } else {
          // Edit case - just refresh
          await fetchAdAccounts();
          onAccountsChanged();
          resetForm();
          
          const successMsg = editingAccount ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!';
          alert(successMsg);
        }
      } else {
        if (data.error === 'account_exists') {
          setFormErrors({ account_id: 'Esta conta já existe para esta plataforma' });
        } else {
          alert(data.error || 'Erro ao salvar conta');
        }
      }
    } catch (error) {
      console.error('Error saving ad account:', error);
      alert('Erro ao salvar conta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accountId: string, accountName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a conta "${accountName}"?`)) {
      return;
    }

    setDeletingAccountId(accountId);
    
    try {
      const response = await fetchWithAuth(`/api/clients/${clientSlug}/ad-accounts/${accountId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.ok) {
        await fetchAdAccounts();
        onAccountsChanged();
      } else {
        alert(data.error || 'Erro ao excluir conta');
      }
    } catch (error) {
      console.error('Error deleting ad account:', error);
      alert('Erro ao excluir conta');
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleToggleStatus = async (accountId: string, currentStatus: boolean) => {
    try {
      const response = await fetchWithAuth(`/api/clients/${clientSlug}/ad-accounts/${accountId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        await fetchAdAccounts();
        onAccountsChanged();
      } else {
        alert(data.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Error toggling account status:', error);
      alert('Erro ao alterar status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Gerenciar Contas de Anúncios
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Add Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Conta</span>
            </button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-md font-medium text-slate-900 mb-4">
                {editingAccount ? 'Editar Conta' : 'Nova Conta de Anúncios'}
              </h4>
              
              {!editingAccount && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-600 text-sm">ℹ️</div>
                    <div className="text-sm text-blue-800">
                      <strong>Sincronização Automática:</strong> Após criar a conta, o sistema irá automaticamente sincronizar os anúncios e deixar tudo pronto para uso.
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Plataforma *
                    </label>
                    <select
                      value={formData.platform}
                      onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!!editingAccount}
                    >
                      {Object.values(AD_PLATFORMS).map((platform) => (
                        <option key={platform.id} value={platform.id}>
                          {platform.icon} {platform.name} - {platform.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nome da Conta *
                    </label>
                    <input
                      type="text"
                      value={formData.account_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.account_name ? 'border-red-300' : 'border-slate-300'
                      }`}
                      placeholder="Ex: Conta Principal Facebook"
                    />
                    {formErrors.account_name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.account_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ID da Conta *
                    </label>
                    <input
                      type="text"
                      value={formData.account_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.account_id ? 'border-red-300' : 'border-slate-300'
                      }`}
                      placeholder={AD_PLATFORMS[formData.platform]?.accountIdPlaceholder}
                    />
                    {formErrors.account_id && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.account_id}</p>
                    )}
                    <p className="mt-1 text-sm text-slate-500">
                      {AD_PLATFORMS[formData.platform]?.accountIdFormat}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Token de Acesso {!editingAccount && '*'}
                    </label>
                    <input
                      type="password"
                      value={formData.access_token}
                      onChange={(e) => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.access_token ? 'border-red-300' : 'border-slate-300'
                      }`}
                      placeholder={editingAccount ? "Deixe vazio para manter o atual" : "Cole aqui o token de acesso"}
                    />
                    {formErrors.access_token && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.access_token}</p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>{editingAccount ? 'Salvando...' : 'Criando e Sincronizando...'}</span>
                      </>
                    ) : (
                      <span>{editingAccount ? 'Salvar Alterações' : 'Criar e Sincronizar'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Accounts List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-slate-600">Carregando contas...</p>
            </div>
          ) : adAccounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="text-lg font-medium text-slate-900 mb-2">Nenhuma conta cadastrada</h4>
              <p className="text-slate-600">Adicione sua primeira conta de anúncios para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group by platform */}
              {Object.entries(
                adAccounts.reduce((acc, account) => {
                  if (!acc[account.platform]) acc[account.platform] = [];
                  acc[account.platform].push(account);
                  return acc;
                }, {} as Record<string, AdAccount[]>)
              ).map(([platform, accounts]) => (
                <div key={platform} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                      {AD_PLATFORMS[platform]?.logo ? (
                        <img 
                          src={AD_PLATFORMS[platform].logo} 
                          alt={AD_PLATFORMS[platform].name}
                          className="w-10 h-10 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'inline';
                          }}
                        />
                      ) : null}
                      <span className={`text-3xl ${AD_PLATFORMS[platform]?.logo ? 'hidden' : ''}`}>
                        {AD_PLATFORMS[platform]?.icon || '📊'}
                      </span>
                      <h5 className="font-medium text-slate-900">
                        {AD_PLATFORMS[platform]?.name || platform}
                      </h5>
                      <span className="text-sm text-slate-500">
                        ({accounts.length} conta{accounts.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-slate-200">
                    {accounts.map((account) => (
                      <div key={account.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h6 className="font-medium text-slate-900">{account.account_name}</h6>
                              {getStatusIcon(account.sync_status)}
                              {!account.is_active && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                  Inativa
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <span>ID: {account.account_id}</span>
                              {account.last_sync_at && (
                                <span>Última sincronização: {new Date(account.last_sync_at).toLocaleDateString('pt-BR')}</span>
                              )}
                            </div>
                            
                            {account.sync_error && (
                              <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-400 rounded-r">
                                <div className="flex items-start space-x-2 mb-2">
                                  <div className="text-red-500 text-lg mt-0.5">⚠️</div>
                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-red-800 mb-1">
                                      Erro Detalhado da Meta
                                    </div>
                                    <div className="text-sm text-red-700 font-mono bg-red-100 p-2 rounded mb-2 break-words">
                                      {account.sync_error}
                                    </div>
                                    
                                    {/* Explicações específicas para erros comuns */}
                                    {account.sync_error?.includes('Rate limit') && (
                                      <div className="text-xs text-red-600 bg-red-100 p-2 rounded mb-2">
                                        <strong>💡 Solução:</strong> A Meta limitou suas requisições temporariamente. 
                                        Aguarde 15-30 minutos e tente novamente. Este é um limite automático da Meta para proteger seus servidores.
                                      </div>
                                    )}
                                    
                                    {account.sync_error?.includes('Token') && (
                                      <div className="text-xs text-red-600 bg-red-100 p-2 rounded mb-2">
                                        <strong>💡 Solução:</strong> Token de acesso expirado ou inválido. 
                                        Edite esta conta e forneça um novo token de acesso gerado no Meta Business.
                                      </div>
                                    )}
                                    
                                    {account.sync_error?.includes('Permission') && (
                                      <div className="text-xs text-red-600 bg-red-100 p-2 rounded mb-2">
                                        <strong>💡 Solução:</strong> Token sem permissões necessárias. 
                                        Certifique-se que o token tem permissão 'ads_read' no Meta Business.
                                      </div>
                                    )}
                                    
                                    {account.sync_error?.includes('Invalid account') && (
                                      <div className="text-xs text-red-600 bg-red-100 p-2 rounded mb-2">
                                        <strong>💡 Solução:</strong> ID da conta incorreto ou conta não acessível. 
                                        Verifique se o ID está correto e se você tem acesso à conta no Meta Business.
                                      </div>
                                    )}
                                    
                                    <div className="text-xs text-red-600 opacity-75 flex items-center space-x-1">
                                      <span>🕐</span>
                                      <span>
                                        Última tentativa: {account.last_sync_at ? 
                                          new Date(account.last_sync_at).toLocaleString('pt-BR') : 
                                          'Nunca'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleToggleStatus(account.id, account.is_active)}
                              className={`px-3 py-1 text-xs rounded-full font-medium ${
                                account.is_active
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              {account.is_active ? 'Ativa' : 'Inativa'}
                            </button>
                            
                            <button
                              onClick={() => handleEdit(account)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                              title="Editar conta"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleDelete(account.id, account.account_name)}
                              disabled={deletingAccountId === account.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                              title="Excluir conta"
                            >
                              {deletingAccountId === account.id ? (
                                <div className="animate-spin w-4 h-4 border border-red-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
