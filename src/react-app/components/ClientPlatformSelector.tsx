import { useState, useEffect } from 'react';
import { Users, ChevronDown, Filter } from 'lucide-react';
import { useAuthFetch } from '../hooks/useAuth';
import { AD_PLATFORMS } from '../../shared/platforms';

interface ClientPlatform {
  client_id: string;
  client_name: string;
  client_slug: string;
  platforms: {
    platform: string;
    account_count: number;
    is_active: boolean;
  }[];
}

interface ClientPlatformSelectorProps {
  onSelect: (clientSlug: string, platform: string) => void;
  selectedClient?: string;
  selectedPlatform?: string;
}

export default function ClientPlatformSelector({ onSelect, selectedClient, selectedPlatform }: ClientPlatformSelectorProps) {
  const [clients, setClients] = useState<ClientPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fetchWithAuth = useAuthFetch();

  useEffect(() => {
    fetchClientPlatforms();
  }, []);

  const fetchClientPlatforms = async () => {
    try {
      const response = await fetchWithAuth('/api/admin/client-platforms');
      const data = await response.json();
      
      if (data.ok) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Error fetching client platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => 
    !searchTerm || client.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClientData = clients.find(c => c.client_slug === selectedClient);
  const selectedPlatformData = selectedClientData?.platforms.find(p => p.platform === selectedPlatform);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 bg-white rounded-lg border border-slate-200 px-3 py-2">
        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="text-sm text-slate-600">Carregando clientes...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center justify-between w-full bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {selectedClientData && selectedPlatformData ? (
            <>
              <div className="flex items-center space-x-2">
                {AD_PLATFORMS[selectedPlatform!]?.logo ? (
                  <img 
                    src={AD_PLATFORMS[selectedPlatform!].logo} 
                    alt={AD_PLATFORMS[selectedPlatform!].name}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'inline';
                    }}
                  />
                ) : null}
                <span className={`text-3xl ${AD_PLATFORMS[selectedPlatform!]?.logo ? 'hidden' : ''}`}>
                  {AD_PLATFORMS[selectedPlatform!]?.icon || '📊'}
                </span>
                <div className="text-left">
                  <div className="font-medium text-slate-900">
                    {selectedClientData.client_name}
                  </div>
                  <div className="text-sm text-slate-500">
                    {AD_PLATFORMS[selectedPlatform!]?.name || selectedPlatform}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <span className="text-slate-500">Selecionar cliente e plataforma</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Buscar cliente..."
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente com plataformas configuradas'}
              </div>
            ) : (
              filteredClients.map((client) => (
                <div key={client.client_id} className="border-b border-slate-100 last:border-b-0">
                  <div className="px-3 py-2 bg-slate-50">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-slate-600" />
                      <span className="font-medium text-slate-900 text-sm">{client.client_name}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {client.platforms.map((platform) => (
                      <button
                        key={`${client.client_id}-${platform.platform}`}
                        onClick={() => {
                          onSelect(client.client_slug, platform.platform);
                          setShowDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                          selectedClient === client.client_slug && selectedPlatform === platform.platform
                            ? 'bg-blue-50 text-blue-900'
                            : 'text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {AD_PLATFORMS[platform.platform]?.logo ? (
                              <img 
                                src={AD_PLATFORMS[platform.platform].logo} 
                                alt={AD_PLATFORMS[platform.platform].name}
                                className="w-9 h-9 object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'inline';
                                }}
                              />
                            ) : null}
                            <span className={`text-2xl ${AD_PLATFORMS[platform.platform]?.logo ? 'hidden' : ''}`}>
                              {AD_PLATFORMS[platform.platform]?.icon || '📊'}
                            </span>
                            <div>
                              <div className="font-medium">
                                {AD_PLATFORMS[platform.platform]?.name || platform.platform}
                              </div>
                              <div className="text-xs text-slate-500">
                                {platform.account_count} conta{platform.account_count !== 1 ? 's' : ''} configurada{platform.account_count !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          {!platform.is_active && (
                            <span className="text-xs text-red-500">Inativa</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
