import { useState, useEffect } from 'react';
import { useAuth, useAuthFetch } from '../hooks/useAuth';
import { Shield, Users, UserPlus, Calendar, Crown, Settings, RotateCcw, Bell, BarChart3, Clock, CheckCircle, AlertCircle, XCircle, Zap, ArrowLeft, Home, Archive, Download, Upload, FileText, Eye, Trash2 } from 'lucide-react';
import { useNotifications } from '../components/NotificationToast';

interface Admin {
  id: string;
  user_id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface ClientUser {
  id: string;
  user_id: string;
  email: string;
  name: string;
  client_id: string;
  client_name: string;
  is_active: boolean;
  created_at: string;
}

interface AdAccount {
  id: string;
  client_id: string;
  client_name?: string;
  client_slug?: string;
  platform: string;
  account_name: string;
  account_id: string;
  is_active: boolean;
  last_sync_at?: string;
  sync_status: string;
}

interface SyncStatus {
  enabled: boolean;
  status: 'success' | 'error' | 'syncing' | 'pending';
  last_sync?: string;
  next_sync?: string;
  historical_complete?: boolean;
  sync_mode: 'full' | 'daily' | 'initial';
  error?: string;
  stats?: {
    accounts_synced: number;
    total_accounts: number;
    last_historical_sync?: string;
  };
}

interface SyncConfig {
  time: string;
  days: string[];
  accounts: string[];
  enabled: boolean;
}

interface SyncProgress {
  isRunning: boolean;
  currentAccount?: string;
  progress: number;
  startTime?: number;
  accounts: {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    ads_count?: number;
    error_message?: string;
  }[];
  stats: {
    total_accounts: number;
    completed_accounts: number;
    total_ads: number;
    errors: number;
  };
}

export default function Setup() {
  const { user, loading: authLoading } = useAuth();
  const notifications = useNotifications();
  const fetchWithAuth = useAuthFetch();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    time: '04:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    accounts: [],
    enabled: true
  });
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isRunning: false,
    progress: 0,
    accounts: [],
    stats: {
      total_accounts: 0,
      completed_accounts: 0,
      total_ads: 0,
      errors: 0
    }
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    enabled: true,
    status: 'success',
    last_sync: '2025-08-29T04:15:00-03:00',
    next_sync: '2025-08-30T04:00:00-03:00',
    historical_complete: true,
    sync_mode: 'daily',
    stats: {
      accounts_synced: 12,
      total_accounts: 12,
      last_historical_sync: '2025-08-28T04:00:00-03:00'
    }
  });
  const [lastExecution, setLastExecution] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [backupFiles, setBackupFiles] = useState<any[]>([]);
  const [generatingBackup, setGeneratingBackup] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  useEffect(() => {
    // Esperar a autenticação ser resolvida antes de buscar dados
    if (!authLoading && user) {
      console.log('[SETUP-DEBUG] Auth resolved, user:', user.email);
      fetchData();
    } else if (!authLoading && !user) {
      console.log('[SETUP-DEBUG] No user found after auth resolved');
      setLoading(false);
    }
  }, [authLoading, user]);

  const fetchData = async () => {
    try {
      console.log('[SETUP-DEBUG] Starting fetchData...');
      const [adminsResponse, clientUsersResponse, adAccountsResponse] = await Promise.all([
        fetchWithAuth('/api/admin/users/admins'),
        fetchWithAuth('/api/admin/users/clients'),
        fetchWithAuth('/api/admin/client-platforms')
      ]);

      if (adminsResponse.ok) {
        const adminsData = await adminsResponse.json();
        setAdmins(adminsData.admins);
      }

      if (clientUsersResponse.ok) {
        const clientUsersData = await clientUsersResponse.json();
        setClientUsers(clientUsersData.clientUsers);
      }

      if (adAccountsResponse.ok) {
        const adAccountsData = await adAccountsResponse.json();
        console.log('[SETUP-DEBUG] Ad accounts data received:', adAccountsData);
        
        // Usar as contas individuais reais do banco de dados
        const realAccounts: AdAccount[] = adAccountsData.accounts?.map((account: any) => ({
          id: account.id, // ID real da conta no banco
          client_id: account.client_id,
          client_name: account.client_name, // Nome real do cliente
          client_slug: account.client_slug, // Slug do cliente
          platform: account.platform,
          account_name: account.account_name,
          account_id: account.account_id,
          is_active: account.is_active,
          sync_status: account.sync_status || 'pending',
          last_sync_at: account.last_sync_at
        })) || [];
        
        console.log('[SETUP-DEBUG] Processed real accounts:', realAccounts);
        console.log('[SETUP-DEBUG] Setting adAccounts state...');
        setAdAccounts(realAccounts);
        
        // Selecionar automaticamente todas as contas ativas para facilitar o uso
        setSyncConfig(prev => ({
          ...prev,
          accounts: realAccounts.filter(acc => acc.is_active).map(acc => acc.id)
        }));
        console.log('[SETUP-DEBUG] State updated with', realAccounts.length, 'accounts');
      } else {
        console.log('[SETUP-DEBUG] Ad accounts response not ok:', adAccountsResponse.status);
      }

      await fetchSyncConfig();
      await fetchSyncStatus();
      await fetchBackupFiles();
    } catch (error) {
      console.error('Erro ao buscar dados do setup:', error);
      notifications.error('Erro ao carregar dados', 'Não foi possível carregar as configurações');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncConfig = async () => {
    try {
      const response = await fetchWithAuth('/api/admin/sync-config');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setSyncConfig(data.config);
          console.log('[SETUP-DEBUG] Configuração carregada do servidor:', data.config);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar configuração de sincronização:', error);
    }
  };

  const fetchBackupFiles = async () => {
    try {
      const response = await fetchWithAuth('/api/admin/backup/files');
      if (response.ok) {
        const data = await response.json();
        setBackupFiles(data.files || []);
        setLastBackupDate(data.last_backup_date || null);
        console.log('[BACKUP-FILES] Loaded backup files:', data.files?.length || 0);
      }
    } catch (error) {
      console.error('Erro ao buscar arquivos de backup:', error);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetchWithAuth('/api/admin/sync-schedules');
      if (response.ok) {
        await response.json();
        // Process real sync schedules data here
      }
    } catch (error) {
      console.error('Erro ao buscar status de sincronização:', error);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim()) return;

    setSaving(true);
    try {
      const response = await fetchWithAuth('/api/admin/users/admins', {
        method: 'POST',
        body: JSON.stringify({ email: adminEmail.trim() })
      });

      if (response.ok) {
        await fetchData();
        setAdminEmail('');
        setShowAddAdmin(false);
        notifications.success('Administrador adicionado', 'Usuário foi promovido a administrador com sucesso');
      } else {
        const data = await response.json();
        notifications.error('Erro ao adicionar administrador', data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao adicionar admin:', error);
      notifications.error('Erro ao adicionar administrador', 'Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      const response = await fetchWithAuth(`/api/admin/users/admins/${adminId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        await fetchData();
        notifications.success(
          'Status alterado', 
          `Administrador ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`
        );
      } else {
        notifications.error('Erro ao alterar status', 'Não foi possível alterar o status do administrador');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      notifications.error('Erro ao alterar status', 'Erro de conexão');
    }
  };

  const handleSyncConfigChange = async (newConfig: Partial<SyncConfig>) => {
    setSaveStatus('saving');
    
    try {
      const updatedConfig = { ...syncConfig, ...newConfig };
      setSyncConfig(updatedConfig);
      
      // Salvar configuração real no backend
      const response = await fetchWithAuth('/api/admin/sync-config', {
        method: 'POST',
        body: JSON.stringify(updatedConfig)
      });
      
      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        if (newConfig.enabled !== undefined) {
          setSyncStatus(prev => ({ ...prev, enabled: newConfig.enabled! }));
          notifications.success(
            'Configuração salva',
            `Sincronização de dados ${newConfig.enabled ? 'ativada' : 'desativada'} com sucesso`
          );
        } else {
          notifications.success(
            'Configuração salva',
            'Configurações de sincronização atualizadas com sucesso'
          );
        }
      } else {
        throw new Error('Falha ao salvar no servidor');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      setSaveStatus('idle');
      // Reverter mudanças se falhou
      await fetchSyncConfig();
      notifications.error('Erro ao salvar', 'Não foi possível salvar a configuração. Configurações restauradas.');
    }
  };

  const handleCustomSync = async (type: 'incremental' | 'full') => {
    // Notificar outros admins que sync está iniciando
    notifyAdmins('sync_started', {
      user: user?.name || user?.email,
      type: type,
      accounts: syncConfig.accounts.length
    });

    setSyncProgress({
      isRunning: true,
      progress: 0,
      startTime: Date.now(),
      accounts: syncConfig.accounts.map(accountId => {
        const account = adAccounts.find(acc => acc.id === accountId);
        return {
          id: accountId,
          name: account?.account_name || 'Conta desconhecida',
          status: 'pending'
        };
      }),
      stats: {
        total_accounts: syncConfig.accounts.length,
        completed_accounts: 0,
        total_ads: 0,
        errors: 0
      }
    });

    try {
      for (let i = 0; i < syncConfig.accounts.length; i++) {
        const accountId = syncConfig.accounts[i];
        const account = adAccounts.find(acc => acc.id === accountId);
        
        if (!account) continue;

        // Atualizar progresso
        setSyncProgress(prev => ({
          ...prev,
          currentAccount: account.account_name,
          progress: (i / syncConfig.accounts.length) * 100,
          accounts: prev.accounts.map(acc => 
            acc.id === accountId 
              ? { ...acc, status: 'running' }
              : acc
          )
        }));

        try {
          // Simular sincronização da conta
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
          
          const adsCount = Math.floor(Math.random() * 50) + 10;
          
          // Marcar como sucesso
          setSyncProgress(prev => ({
            ...prev,
            accounts: prev.accounts.map(acc => 
              acc.id === accountId 
                ? { ...acc, status: 'success', ads_count: adsCount }
                : acc
            ),
            stats: {
              ...prev.stats,
              completed_accounts: prev.stats.completed_accounts + 1,
              total_ads: prev.stats.total_ads + adsCount
            }
          }));

        } catch (accountError) {
          // Marcar conta com erro
          setSyncProgress(prev => ({
            ...prev,
            accounts: prev.accounts.map(acc => 
              acc.id === accountId 
                ? { 
                    ...acc, 
                    status: 'error', 
                    error_message: 'Erro na sincronização da conta'
                  }
                : acc
            ),
            stats: {
              ...prev.stats,
              errors: prev.stats.errors + 1,
              completed_accounts: prev.stats.completed_accounts + 1
            }
          }));
        }
      }

      // Finalizar sincronização
      setSyncProgress(prev => ({
        ...prev,
        isRunning: false,
        progress: 100,
        currentAccount: undefined
      }));

      // Salvar resultado da execução
      const executionResult = {
        type,
        timestamp: new Date().toISOString(),
        duration: Date.now() - (syncProgress.startTime || 0),
        accounts: syncProgress.accounts.length,
        success: syncProgress.stats.total_ads,
        errors: syncProgress.stats.errors
      };
      setLastExecution(executionResult);

      // Notificar admins sobre conclusão
      notifyAdmins('sync_completed', {
        user: user?.name || user?.email,
        ...executionResult
      });

      // Atualizar status geral
      setSyncStatus(prev => ({
        ...prev,
        status: syncProgress.stats.errors > 0 ? 'error' : 'success',
        last_sync: new Date().toISOString()
      }));

      if (syncProgress.stats.errors === 0) {
        notifications.success(
          'Sincronização concluída!',
          `${syncProgress.stats.total_ads} anúncios atualizados em ${syncProgress.accounts.length} contas`
        );
      } else {
        notifications.warning(
          'Sincronização concluída com erros',
          `${syncProgress.stats.total_ads} anúncios atualizados, ${syncProgress.stats.errors} erros`
        );
      }

    } catch (error) {
      console.error('Erro na sincronização customizada:', error);
      setSyncProgress(prev => ({ ...prev, isRunning: false }));
      notifications.error('Erro na sincronização', 'Falha na execução da sincronização customizada');
      
      // Notificar admins sobre erro
      notifyAdmins('sync_error', {
        user: user?.name || user?.email,
        type: type,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  const notifyAdmins = async (event: string, data: any) => {
    try {
      // Simular notificação para outros admins
      console.log(`[ADMIN-NOTIFICATION] ${event}:`, data);
      
      // Aqui seria implementada a notificação real via websocket ou API
      // await fetch('/api/admin/notifications', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ event, data })
      // });
    } catch (error) {
      console.warn('Erro ao notificar admins:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      let date: Date;
      
      if (dateString.includes('T')) {
        if (dateString.includes('Z') || dateString.includes('+')) {
          date = new Date(dateString);
        } else {
          date = new Date(dateString + 'Z');
        }
      } else {
        date = new Date(dateString.replace(' ', 'T') + 'Z');
      }
      
      return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Data inválida';
    }
  };

  const handleGenerateBackup = async () => {
    setGeneratingBackup(true);
    try {
      const response = await fetchWithAuth('/api/admin/backup/generate', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        notifications.success('Backup gerado!', `${data.files_created || 0} arquivos CSV criados com sucesso`);
        await fetchBackupFiles(); // Recarregar lista de arquivos
      } else {
        const error = await response.json();
        notifications.error('Erro ao gerar backup', error.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao gerar backup:', error);
      notifications.error('Erro ao gerar backup', 'Erro de conexão');
    } finally {
      setGeneratingBackup(false);
    }
  };

  const handleDownloadFile = async (filename: string) => {
    try {
      const response = await fetchWithAuth(`/api/admin/backup/download/${encodeURIComponent(filename)}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        notifications.success('Download iniciado', `Arquivo ${filename} baixado com sucesso`);
      } else {
        const error = await response.json();
        notifications.error('Erro no download', error.error || 'Arquivo não encontrado');
      }
    } catch (error) {
      console.error('Erro no download:', error);
      notifications.error('Erro no download', 'Falha na conexão');
    }
  };

  const handleViewFile = async (filename: string) => {
    try {
      const response = await fetchWithAuth(`/api/admin/backup/view/${encodeURIComponent(filename)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Criar modal ou nova janela para mostrar o conteúdo
        const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>Visualizar ${filename}</title>
                <style>
                  body { font-family: monospace; padding: 20px; background: #f5f5f5; }
                  .header { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                  .content { background: white; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-size: 12px; }
                  .stats { color: #666; margin-top: 10px; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h2>${filename}</h2>
                  <div class="stats">
                    Linhas: ${data.lines || 0} | Tamanho: ${data.size || 0} bytes | 
                    Última modificação: ${data.last_modified || 'N/A'}
                  </div>
                </div>
                <div class="content">${data.content || 'Conteúdo não disponível'}</div>
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      } else {
        const error = await response.json();
        notifications.error('Erro ao visualizar', error.error || 'Arquivo não encontrado');
      }
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error);
      notifications.error('Erro ao visualizar', 'Falha na conexão');
    }
  };

  const handleDownloadAllFiles = async () => {
    if (backupFiles.length === 0) return;
    
    for (const file of backupFiles) {
      await handleDownloadFile(file.name);
      // Pequeno delay entre downloads para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    notifications.success('Downloads concluídos', `${backupFiles.length} arquivos baixados`);
  };

  const handleClearBackups = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os arquivos de backup? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetchWithAuth('/api/admin/backup/clear', {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        setBackupFiles([]);
        setLastBackupDate(null);
        notifications.success('Backups limpos', `${data.files_deleted || 0} arquivos removidos`);
      } else {
        const error = await response.json();
        notifications.error('Erro ao limpar backups', error.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao limpar backups:', error);
      notifications.error('Erro ao limpar backups', 'Erro de conexão');
    }
  };

  const getDayName = (day: string) => {
    const days: Record<string, string> = {
      monday: 'Segunda',
      tuesday: 'Terça',
      wednesday: 'Quarta',
      thursday: 'Quinta',
      friday: 'Sexta',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };
    return days[day] || day;
  };

  const getAccountsByClient = () => {
    const clientMap = new Map();
    
    console.log('[SETUP-DEBUG] Getting accounts by client. Total accounts:', adAccounts.length);
    console.log('[SETUP-DEBUG] All accounts:', adAccounts);
    
    adAccounts.forEach(account => {
      // Usar o client_id como chave e o nome real do cliente
      const clientKey = account.client_id;
      const clientDisplayName = account.client_name || `Cliente ${account.client_id.substring(0, 8)}`;
      
      console.log('[SETUP-DEBUG] Processing account:', {
        id: account.id,
        client_id: account.client_id,
        client_name: account.client_name,
        account_name: account.account_name,
        platform: account.platform,
        is_active: account.is_active
      });
      
      if (!clientMap.has(clientKey)) {
        clientMap.set(clientKey, {
          name: clientDisplayName,
          accounts: []
        });
      }
      clientMap.get(clientKey).accounts.push(account);
    });
    
    const result = Array.from(clientMap.entries()).map(([_clientKey, clientData]: [string, any]) => [
      clientData.name,
      clientData.accounts
    ]);
    
    console.log('[SETUP-DEBUG] Grouped accounts by client:', result);
    console.log('[SETUP-DEBUG] Final result length:', result.length);
    return result;
  };

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin">
          <Shield className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-slate-600">
          {authLoading ? 'Verificando autenticação...' : 'Carregando configurações...'}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-slate-700 mb-2">Acesso negado</p>
          <p className="text-slate-600">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Botão de Voltar */}
        <div className="mb-6">
          <a
            href="/"
            className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <Home className="w-4 h-4" />
            <span className="font-medium">Voltar ao Dashboard</span>
          </a>
        </div>
        {/* Info do Usuário Atual */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-semibold">
                {user?.name?.charAt(0) || user?.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {user?.name || user?.email}
              </h2>
              <p className="text-slate-600">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-600 font-medium">Super Administrador</span>
              </div>
            </div>
          </div>
        </div>

        

        {/* Sistema de Backup e Restore */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Sistema de Backup e Restore</h3>
            <p className="text-sm text-slate-600 mt-1">
              Faça backup dos dados do sistema e restaure quando necessário
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Status do Último Backup */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Archive className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Último Backup</h4>
                    <p className="text-sm text-slate-600">Arquivos CSV exportados</p>
                  </div>
                </div>
                <button
                  onClick={handleGenerateBackup}
                  disabled={generatingBackup}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {generatingBackup ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Gerar Novo Backup</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white/70 rounded-lg p-4">
                  <span className="text-slate-500 text-xs font-medium">Total de Arquivos</span>
                  <p className="text-slate-900 text-lg font-bold mt-1">{backupFiles.length}</p>
                </div>
                <div className="bg-white/70 rounded-lg p-4">
                  <span className="text-slate-500 text-xs font-medium">Último Backup</span>
                  <p className="text-slate-900 text-sm font-medium mt-1">
                    {lastBackupDate || 'Nunca'}
                  </p>
                </div>
                <div className="bg-white/70 rounded-lg p-4">
                  <span className="text-slate-500 text-xs font-medium">Tamanho Total</span>
                  <p className="text-slate-900 text-sm font-medium mt-1">
                    {backupFiles.reduce((total, file) => total + (file.size || 0), 0) > 0 
                      ? `${(backupFiles.reduce((total, file) => total + (file.size || 0), 0) / 1024).toFixed(1)} KB`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Arquivos de Backup */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <h5 className="font-medium text-slate-900 mb-4 flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Arquivos de Backup Disponíveis</span>
              </h5>
              
              {backupFiles.length === 0 ? (
                <div className="text-center py-8">
                  <Archive className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">Nenhum arquivo de backup encontrado</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Clique em "Gerar Novo Backup" para criar os arquivos CSV
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backupFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <h6 className="font-medium text-slate-900">{file.name}</h6>
                          <p className="text-sm text-slate-600">
                            {file.description} • {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Tamanho desconhecido'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewFile(file.name)}
                          className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Visualizar conteúdo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadFile(file.name)}
                          className="text-green-600 hover:text-green-700 p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title="Baixar arquivo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instruções de Restore */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h5 className="font-medium text-amber-900 mb-4 flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Como Fazer Restore</span>
              </h5>
              
              <div className="space-y-3 text-sm text-amber-800">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h6 className="font-medium mb-2">📥 Para Next.js + PostgreSQL:</h6>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Baixe os arquivos CSV acima</li>
                      <li>Crie conta no Neon.tech (PostgreSQL)</li>
                      <li>Configure o projeto Next.js</li>
                      <li>Importe os dados CSV no Neon</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h6 className="font-medium mb-2">🔄 Para Cloudflare D1:</h6>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Use o comando: <code>wrangler d1 execute DATABASE_NAME --file=import.sql</code></li>
                      <li>Ou importe via dashboard do Cloudflare</li>
                      <li>Verifique a integridade dos dados</li>
                      <li>Teste funcionalidades críticas</li>
                    </ol>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                  <p className="font-medium">⚠️ Importante:</p>
                  <p>Sempre teste o restore em ambiente de desenvolvimento antes de aplicar em produção.</p>
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h5 className="font-medium text-slate-900 mb-4 flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Ações Rápidas</span>
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={handleGenerateBackup}
                  disabled={generatingBackup}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg font-medium transition-colors flex flex-col items-center space-y-2 disabled:bg-blue-400"
                >
                  <Download className="w-6 h-6" />
                  <span>{generatingBackup ? 'Gerando...' : 'Backup Completo'}</span>
                </button>
                
                <button
                  onClick={handleDownloadAllFiles}
                  disabled={backupFiles.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg font-medium transition-colors flex flex-col items-center space-y-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  <Archive className="w-6 h-6" />
                  <span>Baixar Tudo</span>
                </button>
                
                <button
                  onClick={handleClearBackups}
                  disabled={backupFiles.length === 0}
                  className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg font-medium transition-colors flex flex-col items-center space-y-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-6 h-6" />
                  <span>Limpar Backups</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Administradores */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Administradores do Sistema</h3>
            <button
              onClick={() => setShowAddAdmin(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Adicionar Admin</span>
            </button>
          </div>
          
          <div className="p-6">
            {admins.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Nenhum administrador adicional cadastrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {admin.name?.charAt(0) || admin.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">
                          {admin.name || admin.email.split('@')[0]}
                        </h4>
                        <p className="text-sm text-slate-600">{admin.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            Desde {formatDate(admin.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        admin.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                      
                      <button
                        onClick={() => handleToggleAdminStatus(admin.id, admin.is_active)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          admin.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {admin.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Usuários de Clientes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Usuários de Clientes</h3>
            <p className="text-sm text-slate-600 mt-1">
              Usuários com acesso restrito aos anúncios de seus clientes
            </p>
          </div>
          
          <div className="p-6">
            {clientUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Nenhum usuário de cliente cadastrado</p>
                <p className="text-sm text-slate-500 mt-1">
                  Usuários serão adicionados automaticamente quando acessarem pela primeira vez
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientUsers.map((clientUser) => (
                  <div key={clientUser.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {clientUser.name?.charAt(0) || clientUser.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">
                          {clientUser.name || clientUser.email.split('@')[0]}
                        </h4>
                        <p className="text-sm text-slate-600">{clientUser.email}</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <div className="flex items-center space-x-1">
                            <Settings className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-500">
                              Cliente: {clientUser.client_name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-500">
                              Desde {formatDate(clientUser.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        clientUser.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {clientUser.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Adicionar Admin */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full m-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Adicionar Administrador</h3>
              <button
                onClick={() => setShowAddAdmin(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddAdmin} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email do Administrador
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="admin@exemplo.com"
                  required
                />
                <p className="mt-1 text-sm text-slate-500">
                  O usuário deve fazer login pelo menos uma vez no sistema
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddAdmin(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-400 flex items-center justify-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer discreto com link para política de privacidade */}
      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center">
            <a 
              href="/privacy-policy" 
              className="text-slate-400 hover:text-slate-600 text-xs transition-colors"
            >
              Política de Privacidade
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
