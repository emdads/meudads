import { useState, useEffect } from 'react';
import { useAuth, useAuthFetch } from '../hooks/useAuth';
import { Users, UserPlus, Calendar, Crown, Settings, Eye, EyeOff, Trash2, X, Edit } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  user_type: 'admin' | 'client' | 'user';
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  roles: Role[];
  client_access: ClientAccess[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
}

interface ClientAccess {
  client_id: string;
  client_name: string;
  access_level: string;
}

export default function UserManagement() {
  const { user: currentUser, hasPermission } = useAuth();
  const fetchWithAuth = useAuthFetch();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for add user
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    user_type: 'user' as 'admin' | 'client' | 'user',
    role_ids: [] as string[],
    client_access: [] as { client_id: string; access_level: string }[]
  });

  // Form state for edit user
  const [editFormData, setEditFormData] = useState({
    email: '',
    name: '',
    password: '',
    user_type: 'user' as 'admin' | 'client' | 'user',
    role_ids: [] as string[],
    client_access: [] as { client_id: string; access_level: string }[]
  });

  
  const [showEditPassword, setShowEditPassword] = useState(false);

  const canManageUsers = hasPermission('users.manage') || hasPermission('users.create');
  const canEditUsers = hasPermission('users.edit');
  const canDeleteUsers = hasPermission('users.delete');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetchWithAuth('/api/users'),
        fetchWithAuth('/api/users/roles')
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users);
      }

      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(rolesData.roles);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.name.trim()) return;

    setSaving(true);
    try {
      const response = await fetchWithAuth('/api/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchData();
        setFormData({
          email: '',
          name: '',
          user_type: 'user',
          role_ids: [],
          client_access: []
        });
        setShowAddUser(false);
        alert('Usuário criado com sucesso!');
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      alert('Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        await fetchData();
        alert(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      } else {
        alert('Erro ao alterar status do usuário');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;

    try {
      const response = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchData();
        alert('Usuário excluído com sucesso!');
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao excluir usuário');
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      name: user.name,
      password: '',
      user_type: user.user_type,
      role_ids: user.roles.map(r => r.id),
      client_access: user.client_access.map(ca => ({ client_id: ca.client_id, access_level: ca.access_level }))
    });
    setShowEditUser(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editFormData.email.trim() || !editFormData.name.trim()) return;

    setSaving(true);
    try {
      const updateData: any = {
        email: editFormData.email.trim(),
        name: editFormData.name.trim(),
        user_type: editFormData.user_type
      };

      // Only include password if it's provided
      if (editFormData.password.trim()) {
        updateData.password = editFormData.password.trim();
      }

      const response = await fetchWithAuth(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await fetchData();
        setShowEditUser(false);
        setEditingUser(null);
        setEditFormData({
          email: '',
          name: '',
          password: '',
          user_type: 'user',
          role_ids: [],
          client_access: []
        });
        alert('Usuário atualizado com sucesso!');
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao atualizar usuário');
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro ao atualizar usuário');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // SQLite salva em UTC, então precisamos tratar como UTC
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

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'admin': return 'Administrador';
      case 'client': return 'Cliente';
      case 'user': return 'Usuário';
      default: return type;
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'client': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin">
          <Users className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-slate-600">Carregando usuários...</p>
      </div>
    );
  }

  return (
    <div>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Action Bar */}
        <div className="flex justify-end items-center mb-6">
          {canManageUsers && (
            <button
              onClick={() => setShowAddUser(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário</span>
            </button>
          )}
        </div>
        {/* Lista de Usuários */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Usuários do Sistema</h3>
            <p className="text-sm text-slate-600 mt-1">
              Gerencie usuários, suas permissões e acesso ao sistema
            </p>
          </div>
          
          <div className="p-6">
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Nenhum usuário cadastrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-slate-900">{user.name}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUserTypeColor(user.user_type)}`}>
                            {getUserTypeLabel(user.user_type)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{user.email}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500">
                          {user.roles.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Crown className="w-3 h-3" />
                              <span>Roles: {user.roles.map(r => r.name).join(', ')}</span>
                            </div>
                          )}
                          {user.client_access.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Settings className="w-3 h-3" />
                              <span>Clientes: {user.client_access.length}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Criado: {formatDate(user.created_at)}</span>
                          </div>
                          {user.last_login_at && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Último login: {formatDate(user.last_login_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {canEditUsers && (
                        <button
                          onClick={() => handleEditUser(user)}
                          className="px-3 py-1 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center space-x-1"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Editar</span>
                        </button>
                      )}
                      
                      {canEditUsers && user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            user.is_active
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {user.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                      
                      {canDeleteUsers && user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-3 py-1 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Adicionar Usuário */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Novo Usuário</h3>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Senha Temporária
                  </label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Senha gerada automaticamente</strong>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Uma senha temporária será gerada automaticamente e enviada por email. O usuário será obrigado a alterá-la no primeiro acesso. Super admins podem alterar senhas através da edição do usuário.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Usuário
                  </label>
                  <select
                    value={formData.user_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">Usuário</option>
                    <option value="client">Cliente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Roles/Funções
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.role_ids.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              role_ids: [...prev.role_ids, role.id] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              role_ids: prev.role_ids.filter(id => id !== role.id) 
                            }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{role.name}</span>
                      {role.description && (
                        <span className="text-xs text-slate-500">- {role.description}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.email?.trim() || !formData.name?.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Criar Usuário
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário */}
      {showEditUser && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Editar Usuário: {editingUser.name}
                {editingUser.id === currentUser?.id && (
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Você
                  </span>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowEditUser(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nova Senha (deixe em branco para manter a atual)
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editFormData.password}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nova senha (opcional)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Usuário
                  </label>
                  <select
                    value={editFormData.user_type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, user_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={editingUser.id === currentUser?.id} // Impede que o usuário mude seu próprio tipo
                  >
                    <option value="user">Usuário</option>
                    <option value="client">Cliente</option>
                    <option value="admin">Administrador</option>
                  </select>
                  {editingUser.id === currentUser?.id && (
                    <p className="text-xs text-slate-500 mt-1">
                      Você não pode alterar seu próprio tipo de usuário
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Roles/Funções
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={editFormData.role_ids.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditFormData(prev => ({ 
                              ...prev, 
                              role_ids: [...prev.role_ids, role.id] 
                            }));
                          } else {
                            setEditFormData(prev => ({ 
                              ...prev, 
                              role_ids: prev.role_ids.filter(id => id !== role.id) 
                            }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        disabled={editingUser.id === currentUser?.id && role.name === 'Super Admin'}
                      />
                      <span className="text-sm text-slate-700">{role.name}</span>
                      {role.description && (
                        <span className="text-xs text-slate-500">- {role.description}</span>
                      )}
                    </label>
                  ))}
                </div>
                {editingUser.id === currentUser?.id && (
                  <p className="text-xs text-slate-500 mt-2">
                    Você não pode remover sua própria role de Super Admin
                  </p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUser(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
