import { useState, useEffect } from 'react';
import { useAuth, useAuthFetch } from '../hooks/useAuth';
import { Settings, BarChart3, X, Check, AlertCircle, Users, UserCheck, UserX, Shield, Link, CheckCircle, XCircle, Edit, Power, PowerOff, Mail, Send, Trash2, List } from 'lucide-react';

export default function ClientManagement() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const fetchWithAuth = useAuthFetch();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo_url: '',
    email: ''
  });
  const [formErrors, setFormErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [sendingAccess, setSendingAccess] = useState<Set<string>>(new Set());
  const [deletingClient, setDeletingClient] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetchWithAuth('/api/clients');
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

  const handleToggleClientStatus = async (clientId: string, currentStatus: boolean) => {
    try {
      const response = await fetchWithAuth(`/api/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus })
      });
      
      if (response.ok) {
        await fetchClients(); // Reload clients
      } else {
        alert('Erro ao alterar status do cliente');
      }
    } catch (error) {
      console.error('Error toggling client status:', error);
      alert('Erro ao alterar status do cliente');
    }
  };

  const handleSendAccess = async (clientId: string, clientEmail: string) => {
    if (!clientEmail) {
      alert('Cliente não possui e-mail cadastrado');
      return;
    }

    setSendingAccess(prev => new Set(prev).add(clientId));
    
    try {
      const response = await fetchWithAuth(`/api/clients/${clientId}/send-access`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert(`Dados de acesso enviados para ${clientEmail}`);
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao enviar dados de acesso');
      }
    } catch (error) {
      console.error('Error sending access:', error);
      alert('Erro ao enviar dados de acesso');
    } finally {
      setSendingAccess(prev => {
        const newSet = new Set(prev);
        newSet.delete(clientId);
        return newSet;
      });
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${clientName}"? Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.`)) {
      return;
    }

    setDeletingClient(clientId);
    
    try {
      const response = await fetchWithAuth(`/api/clients/${clientId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchClients(); // Reload clients
        alert('Cliente excluído com sucesso!');
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao excluir cliente');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erro ao excluir cliente');
    } finally {
      setDeletingClient(null);
    }
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      slug: client.slug,
      logo_url: client.logo_url || '',
      email: client.email || ''
    });
    setShowAddClientModal(true);
  };

  const handleCloseModal = () => {
    setShowAddClientModal(false);
    setEditingClient(null);
    setFormData({ name: '', slug: '', logo_url: '', email: '' });
    setFormErrors({});
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: editingClient ? prev.slug : generateSlug(name)
    }));
  };

  const validateForm = () => {
    const errors: any = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }
    
    if (!formData.slug.trim()) {
      errors.slug = 'Slug é obrigatório';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = 'Slug deve conter apenas letras minúsculas, números e hífens';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'E-mail deve ter um formato válido';
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
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PATCH' : 'POST';
      
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          logo_url: formData.logo_url.trim() || null,
          email: formData.email.trim()
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        await fetchClients();
        handleCloseModal();
        
        // If creating new client, offer to configure ad accounts
        if (!editingClient) {
          if (confirm("Cliente criado com sucesso! Deseja configurar as contas de anúncios agora?")) {
            // Find the newly created client and redirect to its ad management
            const newClient = await fetch(`/api/clients`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            }).then(res => res.json()).then(d => d.clients?.find((c: any) => c.id === data.client_id));
            
            if (newClient?.slug) {
              window.location.href = `/c/${newClient.slug}/ads/active`;
            }
          }
        }
      } else {
        if (data.error === 'slug_exists') {
          setFormErrors({ slug: 'Este slug já está em uso' });
        } else if (data.error === 'email_exists') {
          setFormErrors({ email: 'Este e-mail já está em uso' });
        } else {
          alert(data.error || 'Erro ao salvar cliente');
        }
      }
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div>
      {/* Main Content - Mobile Responsive */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Statistics Cards - Single Row */}
        <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4 mb-6 sm:mb-8">
          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 truncate">Total de Clientes</p>
                <p className="text-lg sm:text-xl font-bold text-slate-900">{clients.length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 truncate">Clientes Ativos</p>
                <p className="text-lg sm:text-xl font-bold text-green-600">{clients.filter(c => c.is_active).length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 truncate">Clientes Inativos</p>
                <p className="text-lg sm:text-xl font-bold text-red-600">{clients.filter(c => !c.is_active).length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <UserX className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600 truncate">Com Plataformas</p>
                <p className="text-lg sm:text-xl font-bold text-purple-600">{clients.filter(c => c.is_active).length}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Gestão de Clientes Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Clientes Cadastrados</h3>
            <div className="flex space-x-2">
              <a
                href="/admin/email-test"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center"
              >
                <Mail className="w-4 h-4 mr-1" />
                Testar Email
              </a>
              <button 
                onClick={() => setShowAddClientModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                + Novo Cliente
              </button>
            </div>
          </div>
          <div className="p-6">
            {clients.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="text-lg font-medium text-slate-900 mb-2">Nenhum cliente cadastrado</h4>
                <p className="text-slate-500 mb-6">Comece criando seu primeiro cliente para gerenciar campanhas</p>
                <button 
                  onClick={() => setShowAddClientModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Cadastrar Primeiro Cliente
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {clients.map((client) => (
                  <div key={client.id} className="border border-slate-200 rounded-lg hover:border-blue-300 transition-colors overflow-hidden">
                    {/* Client Info Section */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {client.logo_url ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
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
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-slate-900 truncate">{client.name}</h4>
                            {client.is_active ? (
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <div className="flex items-center space-x-1 text-slate-500">
                              <Link className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{client.slug}</span>
                            </div>
                            {client.email && (
                              <div className="flex items-center space-x-1 text-slate-500">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="text-xs truncate">{client.email}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <div className="flex items-center space-x-1 text-blue-600">
                                <Shield className="w-3 h-3 flex-shrink-0" />
                                <span className="text-xs whitespace-nowrap">Múltiplas plataformas</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions Section - Separação entre ações normais e destrutivas */}
                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between">
                        {/* Ações principais */}
                        <div className="flex items-center space-x-2">
                          {client.email && (
                            <button
                              onClick={() => handleSendAccess(client.id, client.email)}
                              disabled={sendingAccess.has(client.id)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50 border border-purple-200"
                              title="Enviar dados de acesso por e-mail"
                            >
                              {sendingAccess.has(client.id) ? (
                                <div className="animate-spin w-4 h-4 border border-purple-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleEditClient(client)}
                            className="p-2 text-slate-600 hover:bg-slate-50 rounded-md transition-colors border border-slate-200"
                            title="Editar cliente"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <a
                            href={`/c/${client.slug}/accounts?from=clients`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors border border-green-200"
                            title="Gerenciar contas de anúncios"
                          >
                            <Settings className="w-4 h-4" />
                          </a>
                          
                          <a
                            href={`/selections?client=${client.slug}&from=clients`}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-indigo-200"
                            title="Ver seleções salvas deste cliente"
                          >
                            <List className="w-4 h-4" />
                          </a>
                          
                          {client.is_active && (
                            <a
                              href={`/c/${client.slug}/ads/active?from=clients`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                              title="Ver anúncios do cliente"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        {/* Ações destrutivas separadas com linha divisória */}
                        <div className="flex items-center space-x-2 pl-4 border-l border-slate-200">
                          <button
                            onClick={() => handleToggleClientStatus(client.id, client.is_active)}
                            className={`p-2 rounded-md transition-colors border ${
                              client.is_active
                                ? 'text-orange-600 hover:bg-orange-50 border-orange-200'
                                : 'text-green-600 hover:bg-green-50 border-green-200'
                            }`}
                            title={client.is_active ? 'Desativar cliente' : 'Ativar cliente'}
                          >
                            {client.is_active ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>
                          
                          {(isAdmin() || isSuperAdmin()) && (
                            <button
                              onClick={() => handleDeleteClient(client.id, client.name)}
                              disabled={deletingClient === client.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 border border-red-200"
                              title="Excluir cliente permanentemente"
                            >
                              {deletingClient === client.id ? (
                                <div className="animate-spin w-4 h-4 border border-red-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full m-4 max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="Ex: Empresa ABC"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.slug ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="Ex: empresa-abc"
                  disabled={!!editingClient}
                />
                {formErrors.slug && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.slug}
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-500">
                  URL será: https://meudads.com/c/{formData.slug}/creatives/active
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.email ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="cliente@empresa.com"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.email}
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-500">
                  E-mail para envio dos dados de acesso ao sistema
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  URL da Logo
                </label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://exemplo.com/logo.png"
                />
                <p className="mt-1 text-sm text-slate-500">
                  URL da logo do cliente (opcional). Formatos aceitos: PNG, JPG, SVG
                </p>
              </div>

              {!editingClient && (
                <div className="col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Configuração de Plataformas</h4>
                      <p className="text-sm text-blue-800 mb-3">
                        Após criar o cliente, você poderá configurar contas de anúncios para múltiplas plataformas:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          📘 Meta Ads
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          📌 Pinterest Ads
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                          🎵 TikTok Ads
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          🔍 Google Ads
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
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
                      <Check className="w-4 h-4 mr-2" />
                      {editingClient ? 'Salvar Alterações' : 'Criar Cliente'}
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
