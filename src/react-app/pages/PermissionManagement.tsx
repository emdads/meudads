import { useState, useEffect } from 'react';
import { useAuth, useAuthFetch } from '../hooks/useAuth';
import { Shield, Users, Save, X, Target, BarChart3, List, Edit3 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  user_type: 'admin' | 'client' | 'user';
  is_active: boolean;
  permissions: UserPermission[];
  client_access: ClientAccess[];
}

interface UserPermission {
  permission_name: string;
  permission_description?: string;
  module: string;
  has_access: boolean;
  restrictions?: PermissionRestriction[];
}

interface PermissionRestriction {
  type: 'column' | 'feature' | 'data';
  name: string;
  allowed: boolean;
}

interface ClientAccess {
  client_id: string;
  client_name: string;
  access_level: string;
}

interface PermissionModule {
  name: string;
  displayName: string;
  icon: React.ReactNode;
  permissions: PermissionDefinition[];
}

interface PermissionDefinition {
  name: string;
  displayName: string;
  description: string;
  restrictable: boolean;
  restrictions?: RestrictionOption[];
}

interface RestrictionOption {
  type: 'column' | 'feature' | 'data';
  name: string;
  displayName: string;
  description: string;
}

export default function PermissionManagement() {
  const { user: currentUser, hasPermission } = useAuth();
  const fetchWithAuth = useAuthFetch();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission modules definition
  const permissionModules: PermissionModule[] = [
    {
      name: 'ads',
      displayName: 'Anúncios',
      icon: <Target className="w-5 h-5" />,
      permissions: [
        {
          name: 'ads.view',
          displayName: 'Visualizar Anúncios',
          description: 'Permite ver a lista de anúncios ativos',
          restrictable: false
        },
        {
          name: 'ads.metrics',
          displayName: 'Ver Métricas',
          description: 'Permite visualizar métricas dos anúncios',
          restrictable: true,
          restrictions: [
            { type: 'column', name: 'spend', displayName: 'Gasto', description: 'Valor gasto nos anúncios' },
            { type: 'column', name: 'impressions', displayName: 'Impressões', description: 'Número de impressões' },
            { type: 'column', name: 'link_clicks', displayName: 'Cliques', description: 'Cliques no link' },
            { type: 'column', name: 'ctr', displayName: 'CTR', description: 'Taxa de cliques' },
            { type: 'column', name: 'cost_per_link_click', displayName: 'CPC', description: 'Custo por clique' },
            { type: 'column', name: 'cpm', displayName: 'CPM', description: 'Custo por mil impressões' },
            { type: 'column', name: 'landing_page_views', displayName: 'LPVs', description: 'Visualizações da landing page' },
            { type: 'column', name: 'cpa', displayName: 'CPA', description: 'Custo por aquisição' },
            { type: 'column', name: 'results', displayName: 'Resultados', description: 'Número de conversões' },
            { type: 'column', name: 'revenue', displayName: 'Valor Conv.', description: 'Valor das conversões' },
            { type: 'column', name: 'roas', displayName: 'ROAS', description: 'Retorno sobre investimento' }
          ]
        },
        {
          name: 'ads.pause',
          displayName: 'Pausar Anúncios',
          description: 'Permite pausar anúncios ativos',
          restrictable: false
        },
        {
          name: 'ads.reactivate',
          displayName: 'Reativar Anúncios',
          description: 'Permite reativar anúncios pausados',
          restrictable: false
        }
      ]
    },
    {
      name: 'selections',
      displayName: 'Seleções',
      icon: <List className="w-5 h-5" />,
      permissions: [
        {
          name: 'selections.view',
          displayName: 'Visualizar Seleções',
          description: 'Permite ver seleções criadas',
          restrictable: false
        },
        {
          name: 'selections.create',
          displayName: 'Criar Seleções',
          description: 'Permite criar novas seleções',
          restrictable: false
        },
        {
          name: 'selections.delete',
          displayName: 'Excluir Seleções',
          description: 'Permite excluir seleções próprias',
          restrictable: false
        },
        {
          name: 'selections.manage',
          displayName: 'Gerenciar Seleções',
          description: 'Permite gerenciar todas as seleções (admin)',
          restrictable: false
        }
      ]
    },
    {
      name: 'performance',
      displayName: 'Performance',
      icon: <BarChart3 className="w-5 h-5" />,
      permissions: [
        {
          name: 'performance.view',
          displayName: 'Ver Relatórios',
          description: 'Permite visualizar relatórios de performance',
          restrictable: true,
          restrictions: [
            { type: 'data', name: 'cost_data', displayName: 'Dados de Custo', description: 'Informações sobre gastos' },
            { type: 'data', name: 'revenue_data', displayName: 'Dados de Receita', description: 'Informações sobre receita' },
            { type: 'data', name: 'roi_data', displayName: 'Dados de ROI', description: 'Cálculos de retorno sobre investimento' },
            { type: 'feature', name: 'export', displayName: 'Exportar Dados', description: 'Baixar relatórios em Excel/CSV' },
            { type: 'feature', name: 'historical', displayName: 'Dados Históricos', description: 'Acessar dados antigos (>30 dias)' }
          ]
        }
      ]
    },
    {
      name: 'clients',
      displayName: 'Clientes',
      icon: <Users className="w-5 h-5" />,
      permissions: [
        {
          name: 'clients.view',
          displayName: 'Visualizar Clientes',
          description: 'Permite ver lista de clientes',
          restrictable: false
        },
        {
          name: 'clients.create',
          displayName: 'Criar Clientes',
          description: 'Permite criar novos clientes',
          restrictable: false
        },
        {
          name: 'clients.edit',
          displayName: 'Editar Clientes',
          description: 'Permite editar dados dos clientes',
          restrictable: false
        },
        {
          name: 'clients.delete',
          displayName: 'Excluir Clientes',
          description: 'Permite excluir clientes',
          restrictable: false
        }
      ]
    }
  ];

  

  useEffect(() => {
    console.log('[PERMISSIONS] Component mounted, starting fetch...');
    
    // Add a small delay to ensure database is ready
    const timer = setTimeout(() => {
      fetchUsers();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[PERMISSIONS] Fetching users for permission management...');
      
      const response = await fetchWithAuth('/api/users/permissions');
      console.log('[PERMISSIONS] Response status:', response.status);
      console.log('[PERMISSIONS] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('[PERMISSIONS] Received data:', data);
        
        if (data.ok && Array.isArray(data.users)) {
          setUsers(data.users);
          setError(null);
          console.log('[PERMISSIONS] ✅ Successfully loaded', data.users.length, 'users');
        } else {
          console.warn('[PERMISSIONS] ⚠️ Unexpected response format:', data);
          setUsers([]);
          setError('Formato de resposta inesperado do servidor');
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}` };
        }
        console.error('[PERMISSIONS] ❌ Failed to fetch users:', errorData);
        setError(`Erro ao carregar usuários: ${errorData.error || 'Erro desconhecido'}`);
        setUsers([]);
      }
    } catch (error) {
      console.error('[PERMISSIONS] ❌ Network/fetch error:', error);
      setError(`Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setUsers([]);
    } finally {
      console.log('[PERMISSIONS] Setting loading to false');
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const updateUserPermission = (permissionName: string, hasAccess: boolean) => {
    if (!selectedUser) return;

    setSelectedUser(prev => {
      if (!prev) return prev;
      
      const updatedPermissions = prev.permissions.map(p => 
        p.permission_name === permissionName 
          ? { ...p, has_access: hasAccess, restrictions: hasAccess ? p.restrictions : [] }
          : p
      );

      // Add permission if it doesn't exist
      if (!updatedPermissions.find(p => p.permission_name === permissionName)) {
        const permissionDef = permissionModules
          .flatMap(m => m.permissions)
          .find(p => p.name === permissionName);
        
        if (permissionDef) {
          updatedPermissions.push({
            permission_name: permissionName,
            permission_description: permissionDef.description,
            module: permissionModules.find(m => m.permissions.includes(permissionDef))?.name || '',
            has_access: hasAccess,
            restrictions: []
          });
        }
      }

      return { ...prev, permissions: updatedPermissions };
    });
  };

  const updatePermissionRestriction = (permissionName: string, restrictionName: string, allowed: boolean) => {
    if (!selectedUser) return;

    setSelectedUser(prev => {
      if (!prev) return prev;
      
      const updatedPermissions = prev.permissions.map(p => {
        if (p.permission_name === permissionName) {
          const updatedRestrictions = p.restrictions || [];
          const existingIndex = updatedRestrictions.findIndex(r => r.name === restrictionName);
          
          if (existingIndex >= 0) {
            updatedRestrictions[existingIndex] = { ...updatedRestrictions[existingIndex], allowed };
          } else {
            const restrictionDef = permissionModules
              .flatMap(m => m.permissions)
              .find(perm => perm.name === permissionName)?.restrictions
              ?.find(r => r.name === restrictionName);
            
            if (restrictionDef) {
              updatedRestrictions.push({
                type: restrictionDef.type,
                name: restrictionName,
                allowed
              });
            }
          }
          
          return { ...p, restrictions: updatedRestrictions };
        }
        return p;
      });

      return { ...prev, permissions: updatedPermissions };
    });
  };

  const saveUserPermissions = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const response = await fetchWithAuth(`/api/users/${selectedUser.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          permissions: selectedUser.permissions
        })
      });

      if (response.ok) {
        // Update the user in the list
        setUsers(prev => prev.map(u => 
          u.id === selectedUser.id ? selectedUser : u
        ));
        
        setShowUserModal(false);
        alert('Permissões atualizadas com sucesso!');
      } else {
        const errorData = await response.json();
        alert(`Erro ao salvar permissões: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const getUserPermission = (permissionName: string) => {
    return selectedUser?.permissions.find(p => p.permission_name === permissionName);
  };

  const hasUserPermission = (permissionName: string) => {
    return getUserPermission(permissionName)?.has_access || false;
  };

  const getRestrictionStatus = (permissionName: string, restrictionName: string) => {
    const permission = getUserPermission(permissionName);
    return permission?.restrictions?.find(r => r.name === restrictionName)?.allowed || false;
  };

  const canManagePermissions = hasPermission('users.manage') || hasPermission('permissions.manage') || currentUser?.user_type === 'admin';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin">
          <Shield className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-slate-600">Carregando permissões...</p>
        <button 
          onClick={() => {
            console.log('[PERMISSIONS] Force reload button clicked');
            setLoading(false);
            setError('Carregamento forçado - clique para tentar novamente');
          }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          Forçar Carregamento
        </button>
      </div>
    );
  }

  return (
    <div>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Users List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Usuários e Permissões</h3>
            <p className="text-sm text-slate-600 mt-1">
              Gerencie permissões detalhadas para cada usuário do sistema
            </p>
          </div>
          
          <div className="p-6">
            {error ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 font-medium">Erro ao carregar</p>
                <p className="text-slate-600 text-sm mt-2">{error}</p>
                <button 
                  onClick={fetchUsers}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : !canManagePermissions ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 font-medium">Sem permissão para gerenciar usuários</p>
                <p className="text-slate-600 text-sm mt-2">Contacte um administrador para obter acesso</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-slate-900">{user.name}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.user_type === 'admin' ? 'bg-red-100 text-red-800' :
                            user.user_type === 'client' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.user_type === 'admin' ? 'Admin' : 
                             user.user_type === 'client' ? 'Cliente' : 'Usuário'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{user.email}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500">
                          <span>Permissões: {user.permissions?.filter(p => p.has_access).length || 0}</span>
                          {user.client_access?.length > 0 && (
                            <span>Clientes: {user.client_access.length}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {canManagePermissions ? (
                        <button 
                          onClick={() => handleUserSelect(user)}
                          className="px-3 py-1 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center space-x-1"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Configurar</span>
                        </button>
                      ) : (
                        <span className="px-3 py-1 rounded-md text-sm font-medium text-gray-400 flex items-center space-x-1">
                          <Edit3 className="w-4 h-4" />
                          <span>Somente leitura</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Permission Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Permissões - {selectedUser.name}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Configure permissões detalhadas e restrições específicas
                  </p>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
                <div className="space-y-8">
                  {permissionModules.map((module) => (
                    <div key={module.name} className="border border-slate-200 rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white">
                          {module.icon}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">{module.displayName}</h4>
                          <p className="text-sm text-slate-600">Configurações do módulo {module.displayName.toLowerCase()}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        {module.permissions.map((permission) => (
                          <div key={permission.name} className="border-l-4 border-blue-200 pl-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={hasUserPermission(permission.name)}
                                      onChange={(e) => updateUserPermission(permission.name, e.target.checked)}
                                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <div>
                                      <span className="font-medium text-slate-900">{permission.displayName}</span>
                                      <p className="text-sm text-slate-600">{permission.description}</p>
                                    </div>
                                  </label>
                                </div>
                                
                                {/* Restrictions */}
                                {permission.restrictable && hasUserPermission(permission.name) && permission.restrictions && (
                                  <div className="ml-7 mt-4 bg-slate-50 rounded-lg p-4">
                                    <h5 className="text-sm font-medium text-slate-900 mb-3">
                                      Restrições Específicas:
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {permission.restrictions.map((restriction) => (
                                        <label 
                                          key={restriction.name}
                                          className="flex items-start space-x-2 cursor-pointer p-2 rounded hover:bg-white transition-colors"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={getRestrictionStatus(permission.name, restriction.name)}
                                            onChange={(e) => updatePermissionRestriction(permission.name, restriction.name, e.target.checked)}
                                            className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500 mt-0.5"
                                          />
                                          <div className="flex-1">
                                            <span className="text-sm font-medium text-slate-800">{restriction.displayName}</span>
                                            <p className="text-xs text-slate-600">{restriction.description}</p>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                              {restriction.type === 'column' ? 'Coluna' : 
                                               restriction.type === 'feature' ? 'Funcionalidade' : 'Dados'}
                                            </span>
                                          </div>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Permissões ativas: {selectedUser.permissions?.filter(p => p.has_access).length || 0}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveUserPermissions}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Salvar Permissões</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
