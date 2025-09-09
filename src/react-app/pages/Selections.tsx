import { useState, useEffect } from 'react';
import { useAuth, useAuthFetch } from '../hooks/useAuth';
import { List, ArrowLeft, Trash2, Pause, User, Hash, Target, CheckCircle, XCircle, Edit, Play, FileText, Clock, CheckSquare, RotateCcw, Flag, AlertCircle } from 'lucide-react';
import { OBJECTIVES_PT } from '../../shared/types';
import SelectionStatusBadge from '../components/SelectionStatusBadge';
import SelectionStatusModal from '../components/SelectionStatusModal';

interface Selection {
  id: string;
  client_id: string;
  slug: string;
  ad_ids: string;
  note: string;
  selection_type: 'pause' | 'adjust';
  description?: string;
  user_email: string;
  user_name: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  executed_at?: string;
  executed_by_user_name?: string;
  execution_notes?: string;
  ads_paused_count?: number;
  ads_total_count?: number;
}

interface AdDetail {
  ad_id: string;
  ad_name: string;
  effective_status: string;
  campaign_name: string;
  objective: string;
  reason?: string;
}

export default function Selections() {
  const { user } = useAuth();
  const fetchWithAuth = useAuthFetch();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [selectedSelection, setSelectedSelection] = useState<Selection | null>(null);
  const [adDetails, setAdDetails] = useState<AdDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAds, setLoadingAds] = useState(false);
  const [pausingAds, setPausingAds] = useState<Set<string>>(new Set());
  const [activatingAds, setActivatingAds] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientSlug, setSelectedClientSlug] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'admin' | 'client'>('all');
  const [hasAdminSelections, setHasAdminSelections] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adSearchTerm, setAdSearchTerm] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [statusUpdateModal, setStatusUpdateModal] = useState<{
    selection: Selection | null;
    show: boolean;
  }>({ selection: null, show: false });

  // Simplified initialization - run once when component mounts
  useEffect(() => {
    console.log('[SELECTIONS-INIT] Component mounted, starting initialization...');
    initializeData();
  }, []); // Empty dependency array - run only once

  const initializeData = async () => {
    console.log('[SELECTIONS-INIT] Starting initialization...');
    setLoading(true);
    
    try {
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const clientParam = urlParams.get('client');
      
      console.log('[SELECTIONS-INIT] URL client param:', clientParam);
      
      if (clientParam) {
        // Direct client access - load that client's selections
        console.log('[SELECTIONS-INIT] Loading selections for client:', clientParam);
        setSelectedClientSlug(clientParam);
        await fetchSelections(clientParam, 'all', statusFilter !== 'all' ? statusFilter : undefined, adSearchTerm || undefined);
      } else {
        // No client parameter - try to fetch clients first
        console.log('[SELECTIONS-INIT] No client param, fetching available clients...');
        await fetchClients();
      }
    } catch (error) {
      console.error('[SELECTIONS-INIT] Initialization error:', error);
      setSelections([]); // Ensure we have a fallback
    } finally {
      console.log('[SELECTIONS-INIT] Initialization complete, setting loading to false');
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      console.log('[SELECTIONS-CLIENTS] Fetching clients...');
      const response = await fetchWithAuth('/api/clients');
      
      if (response.ok) {
        const data = await response.json();
        console.log('[SELECTIONS-CLIENTS] Clients response:', data);
        const activeClients = data.clients.filter((c: any) => c.is_active);
        setClients(activeClients);
        
        if (activeClients.length === 0) {
          console.log('[SELECTIONS-CLIENTS] No clients, loading all selections...');
          setSelectedClientSlug('all');
          await fetchSelections('all', 'all', statusFilter !== 'all' ? statusFilter : undefined, adSearchTerm || undefined);
        }
      } else {
        console.log('[SELECTIONS-CLIENTS] Client fetch failed, loading all selections...');
        setClients([]);
        setSelectedClientSlug('all');
        await fetchSelections('all', 'all', statusFilter !== 'all' ? statusFilter : undefined);
      }
    } catch (error) {
      console.error('[SELECTIONS-CLIENTS] Error:', error);
      setClients([]);
      setSelectedClientSlug('all');
      await fetchSelections('all', 'all', undefined, adSearchTerm || undefined);
    }
  };

  const fetchSelections = async (clientSlug?: string, filter?: string, status?: string, adSearch?: string) => {
    try {
      console.log('[SELECTIONS-FETCH] Fetching selections...', { clientSlug, filter, status, adSearch });
      
      let url = '/api/selections';
      const params = new URLSearchParams();
      
      if (clientSlug && clientSlug !== 'all') {
        params.append('client_slug', clientSlug);
      }
      
      if (filter && filter !== 'all') {
        params.append('filter_type', filter);
      }
      
      if (status && status !== 'all') {
        params.append('status', status);
      }
      
      if (adSearch && adSearch.trim()) {
        params.append('ad_search', adSearch.trim());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('[SELECTIONS-FETCH] API URL:', url);
      const response = await fetchWithAuth(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[SELECTIONS-FETCH] Success:', { 
          selectionsCount: data.selections?.length, 
          isAdmin: data.is_admin,
          selectionsData: data.selections,
          searchTerm: adSearch
        });
        
        // Ensure we always have an array
        const selectionsArray = Array.isArray(data.selections) ? data.selections : [];
        setSelections(selectionsArray);
        setIsAdmin(data.is_admin || false);
        
        const hasAdmin = selectionsArray.some((s: any) => s.is_admin_selection);
        setHasAdminSelections(hasAdmin);
        
        console.log('[SELECTIONS-FETCH] State updated with', selectionsArray.length, 'selections');
      } else {
        console.error('[SELECTIONS-FETCH] API error:', response.status);
        setSelections([]);
        setIsAdmin(false);
        setHasAdminSelections(false);
      }
    } catch (error) {
      console.error('[SELECTIONS-FETCH] Error:', error);
      setSelections([]);
      setIsAdmin(false);
      setHasAdminSelections(false);
    }
  };

  const handleViewSelection = async (selection: Selection) => {
    console.log('[VIEW-SELECTION] Opening selection:', selection.id, selection.note);
    setSelectedSelection(selection);
    setLoadingAds(true);

    // ENHANCED: Re-fetch the selection from the backend to get latest status
    try {
      const selectionResponse = await fetchWithAuth(`/api/selections?client_slug=${selection.slug || 'all'}`);
      if (selectionResponse.ok) {
        const selectionData = await selectionResponse.json();
        const updatedSelection = selectionData.selections?.find((s: Selection) => s.id === selection.id);
        if (updatedSelection) {
          console.log('[VIEW-SELECTION] 🔄 Updated selection status from backend:', {
            old_status: selection.status,
            new_status: updatedSelection.status
          });
          setSelectedSelection(updatedSelection); // Use the fresh data from backend
        }
      }
    } catch (statusError) {
      console.warn('[VIEW-SELECTION] Could not refresh selection status, using cached:', statusError);
    }

    try {
      let adIds: string[] = [];
      try {
        adIds = JSON.parse(selection.ad_ids || '[]');
      } catch (parseError) {
        console.error('[VIEW-SELECTION] Error parsing ad_ids:', parseError, 'Raw ad_ids:', selection.ad_ids);
        setAdDetails([]);
        setLoadingAds(false);
        return;
      }
      
      console.log('[VIEW-SELECTION] Ad IDs to fetch:', adIds);
      
      if (adIds.length === 0) {
        console.warn('[VIEW-SELECTION] No ad IDs found in selection');
        setAdDetails([]);
        setLoadingAds(false);
        return;
      }
      
      // Get ad details
      const adsResponse = await fetchWithAuth(`/api/clients/${selection.slug}/ads-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_ids: adIds })
      });

      console.log('[VIEW-SELECTION] Ads API response status:', adsResponse.status);

      if (adsResponse.ok) {
        const adsData = await adsResponse.json();
        console.log('[VIEW-SELECTION] Ads data received:', adsData);
        let ads = adsData.ads || [];
        
        // Check for debug information
        if (adsData.debug_info) {
          console.warn('[VIEW-SELECTION] Debug info from server:', adsData.debug_info);
        }
        
        // If no ads found, provide helpful debug information
        if (ads.length === 0) {
          console.error('[VIEW-SELECTION] No ads found for selection. Debug info:', {
            selection_id: selection.id,
            client_slug: selection.slug,
            ad_ids_raw: selection.ad_ids,
            ad_ids_parsed: adIds,
            server_debug: adsData.debug_info
          });
        }
        
        // Get ad reasons
        try {
          const reasonsResponse = await fetchWithAuth(`/api/selections/${selection.id}/reasons`);
          console.log('[VIEW-SELECTION] Reasons API response status:', reasonsResponse.status);
          
          if (reasonsResponse.ok) {
            const reasonsData = await reasonsResponse.json();
            console.log('[VIEW-SELECTION] Reasons data received:', reasonsData);
            
            // Merge reasons with ads
            ads = ads.map((ad: AdDetail) => ({
              ...ad,
              reason: reasonsData.reasons?.[ad.ad_id] || ''
            }));
          } else {
            console.warn('[VIEW-SELECTION] Failed to load reasons, status:', reasonsResponse.status);
          }
        } catch (error) {
          console.warn('[VIEW-SELECTION] Could not load ad reasons:', error);
        }
        
        console.log('[VIEW-SELECTION] Final ads data:', ads);
        setAdDetails(ads);
      } else {
        const errorData = await adsResponse.json();
        console.error('[VIEW-SELECTION] API error:', errorData);
        
        // Show error message to user
        alert(`Erro ao carregar detalhes dos anúncios: ${errorData.error || 'Erro desconhecido'}`);
        setAdDetails([]);
      }
    } catch (error) {
      console.error('[VIEW-SELECTION] Error fetching ad details:', error);
      alert(`Erro ao carregar seleção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setAdDetails([]);
    } finally {
      setLoadingAds(false);
    }
  };

  const handleDeleteSelection = async (selectionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta seleção?')) return;

    try {
      const response = await fetchWithAuth(`/api/selections/${selectionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSelections(prev => prev.filter(s => s.id !== selectionId));
        if (selectedSelection?.id === selectionId) {
          setSelectedSelection(null);
          setAdDetails([]);
        }
        alert('Seleção excluída com sucesso!');
      } else {
        alert('Erro ao excluir seleção');
      }
    } catch (error) {
      console.error('Erro ao excluir seleção:', error);
      alert('Erro ao excluir seleção');
    }
  };

  const handlePauseAd = async (adId: string) => {
    console.log(`[PAUSE-AD] Tentando pausar anúncio: ${adId}`);
    setPausingAds(prev => new Set(prev).add(adId));

    try {
      // Include selection context if we're viewing a specific selection
      const params = new URLSearchParams();
      if (selectedSelection?.id) {
        params.append('selection_id', selectedSelection.id);
      }
      
      const url = `/api/ads/${adId}/pause${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetchWithAuth(url, {
        method: 'POST'
      });

      console.log(`[PAUSE-AD] Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[PAUSE-AD] Success response:`, data);
        
        setAdDetails(prev => prev.map(ad => 
          ad.ad_id === adId 
            ? { ...ad, effective_status: 'PAUSED' }
            : ad
        ));
        
        // Mensagem de sucesso mais detalhada
        const successMsg = data.platform 
          ? `Anúncio pausado com sucesso via ${data.platform}!`
          : 'Anúncio pausado com sucesso!';
        alert(successMsg);
        
        // FORCE REFRESH: Re-fetch the selection to get updated status from backend
        if (selectedSelection) {
          console.log(`[PAUSE-AD] 🔄 Refreshing selection data to sync status...`);
          setTimeout(() => {
            handleViewSelection(selectedSelection);
          }, 1000); // Small delay to ensure backend has processed the change
        }
        
        console.log(`[PAUSE-AD] ✅ Anúncio ${adId} pausado com sucesso`);
      } else {
        // Tentar obter detalhes do erro
        let errorMsg = 'Erro ao pausar anúncio';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || `Erro HTTP ${response.status}`;
          console.error(`[PAUSE-AD] API Error:`, errorData);
        } catch {
          errorMsg = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error(`[PAUSE-AD] ❌ Falha ao pausar anúncio ${adId}: ${errorMsg}`);
        alert(`Erro ao pausar anúncio: ${errorMsg}`);
      }
    } catch (error) {
      console.error(`[PAUSE-AD] ❌ Exception ao pausar anúncio ${adId}:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Erro de conexão';
      alert(`Erro ao pausar anúncio: ${errorMsg}`);
    } finally {
      setPausingAds(prev => {
        const newSet = new Set(prev);
        newSet.delete(adId);
        return newSet;
      });
      console.log(`[PAUSE-AD] Finalizado processo para anúncio: ${adId}`);
    }
  };

  const handleActivateAd = async (adId: string) => {
    console.log(`[ACTIVATE-AD] Tentando ativar anúncio: ${adId}`);
    setActivatingAds(prev => new Set(prev).add(adId));

    try {
      const response = await fetchWithAuth(`/api/ads/${adId}/reactivate`, {
        method: 'POST'
      });

      console.log(`[ACTIVATE-AD] Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[ACTIVATE-AD] Success response:`, data);
        
        setAdDetails(prev => prev.map(ad => 
          ad.ad_id === adId 
            ? { ...ad, effective_status: 'ACTIVE' }
            : ad
        ));
        
        // Mensagem de sucesso mais detalhada
        const successMsg = data.platform 
          ? `Anúncio ativado com sucesso via ${data.platform}!`
          : 'Anúncio ativado com sucesso!';
        alert(successMsg);
        
        // FORCE REFRESH: Re-fetch the selection to get updated status from backend
        if (selectedSelection) {
          console.log(`[ACTIVATE-AD] 🔄 Refreshing selection data to sync status...`);
          setTimeout(() => {
            handleViewSelection(selectedSelection);
          }, 1000); // Small delay to ensure backend has processed the change
        }
        
        console.log(`[ACTIVATE-AD] ✅ Anúncio ${adId} ativado com sucesso`);
      } else {
        // Tentar obter detalhes do erro
        let errorMsg = 'Erro ao ativar anúncio';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || `Erro HTTP ${response.status}`;
          console.error(`[ACTIVATE-AD] API Error:`, errorData);
        } catch {
          errorMsg = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error(`[ACTIVATE-AD] ❌ Falha ao ativar anúncio ${adId}: ${errorMsg}`);
        alert(`Erro ao ativar anúncio: ${errorMsg}`);
      }
    } catch (error) {
      console.error(`[ACTIVATE-AD] ❌ Exception ao ativar anúncio ${adId}:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Erro de conexão';
      alert(`Erro ao ativar anúncio: ${errorMsg}`);
    } finally {
      setActivatingAds(prev => {
        const newSet = new Set(prev);
        newSet.delete(adId);
        return newSet;
      });
      console.log(`[ACTIVATE-AD] Finalizado processo para anúncio: ${adId}`);
    }
  };

  const handlePauseAllAds = async () => {
    if (!selectedSelection || !confirm('Tem certeza que deseja pausar TODOS os anúncios ativos desta seleção?')) return;

    const activeAds = adDetails.filter(ad => ad.effective_status === 'ACTIVE');
    console.log(`[PAUSE-ALL] Pausando ${activeAds.length} anúncios ativos`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const ad of activeAds) {
      try {
        console.log(`[PAUSE-ALL] Pausando anúncio ${ad.ad_id} (${successCount + errorCount + 1}/${activeAds.length})`);
        await handlePauseAd(ad.ad_id);
        successCount++;
        
        // Pequena pausa entre requisições para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`[PAUSE-ALL] Erro ao pausar anúncio ${ad.ad_id}:`, error);
        errorCount++;
      }
    }
    
    // Resumo final - O status da seleção será atualizado automaticamente pelo backend
    const summary = `Processo concluído: ${successCount} anúncios pausados${errorCount > 0 ? `, ${errorCount} com erro` : ''}`;
    
    if (successCount === activeAds.length) {
      alert(summary + '. Seleção marcada como concluída automaticamente.');
    } else {
      alert(summary);
    }
    
    console.log(`[PAUSE-ALL] ${summary}`);
    
    // Refresh the selection data to show updated status
    if (successCount > 0) {
      setTimeout(() => {
        handleViewSelection(selectedSelection);
      }, 1000);
    }
  };

  const handleActivateAllAds = async () => {
    if (!selectedSelection || !confirm('Tem certeza que deseja ativar TODOS os anúncios pausados desta seleção?')) return;

    const pausedAds = adDetails.filter(ad => ad.effective_status === 'PAUSED');
    console.log(`[ACTIVATE-ALL] Ativando ${pausedAds.length} anúncios pausados`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const ad of pausedAds) {
      try {
        console.log(`[ACTIVATE-ALL] Ativando anúncio ${ad.ad_id} (${successCount + errorCount + 1}/${pausedAds.length})`);
        await handleActivateAd(ad.ad_id);
        successCount++;
        
        // Pequena pausa entre requisições para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`[ACTIVATE-ALL] Erro ao ativar anúncio ${ad.ad_id}:`, error);
        errorCount++;
      }
    }
    
    // Resumo final
    const summary = `Processo concluído: ${successCount} anúncios ativados${errorCount > 0 ? `, ${errorCount} com erro` : ''}`;
    alert(summary);
    
    console.log(`[ACTIVATE-ALL] ${summary}`);
    
    // Refresh the selection data to show updated status
    if (successCount > 0) {
      setTimeout(() => {
        handleViewSelection(selectedSelection);
      }, 1000);
    }
  };

  // Enhanced function to sync selection status - REMOVED because backend handles this automatically
  // Frontend will now rely on backend automatic status management and refresh from server

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PAUSED':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Ativo';
      case 'PAUSED':
        return 'Pausado';
      default:
        return status;
    }
  };

  // Handle ad search
  const handleAdSearch = async () => {
    if (!adSearchTerm.trim()) {
      return;
    }
    
    console.log('[AD-SEARCH] Starting search for:', adSearchTerm.trim());
    setSearchLoading(true);
    
    try {
      await fetchSelections(
        selectedClientSlug || 'all',
        filterType !== 'all' ? filterType : undefined,
        statusFilter !== 'all' ? statusFilter : undefined,
        adSearchTerm.trim()
      );
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle clear search
  const handleClearSearch = async () => {
    console.log('[AD-SEARCH] Clearing search');
    setAdSearchTerm('');
    setSearchLoading(true);
    
    try {
      await fetchSelections(
        selectedClientSlug || 'all',
        filterType !== 'all' ? filterType : undefined,
        statusFilter !== 'all' ? statusFilter : undefined,
        undefined // Clear the search term
      );
    } finally {
      setSearchLoading(false);
    }
  };

  // Função para formatar data/hora corretamente com timezone brasileiro
  const formatDateTime = (dateString: string, includeTime: boolean = true) => {
    try {
      if (!dateString || dateString.trim() === '') {
        return 'Data não disponível';
      }
      
      console.log('[DATE-FORMAT] Original dateString:', dateString);
      
      // SQLite sempre salva em UTC quando usamos datetime('now')
      // Precisamos tratar TODAS as datas como UTC e converter para Brasil
      let date: Date;
      
      if (dateString.includes('T')) {
        // Formato ISO
        if (dateString.includes('Z') || dateString.includes('+')) {
          // Já tem timezone, usar diretamente
          date = new Date(dateString);
        } else {
          // Formato ISO sem timezone - assumir que é UTC do SQLite
          date = new Date(dateString + 'Z');
        }
      } else {
        // Formato SQLite padrão "YYYY-MM-DD HH:MM:SS" - sempre UTC
        date = new Date(dateString.replace(' ', 'T') + 'Z');
      }
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('[DATE-FORMAT] Invalid date:', dateString);
        return 'Data inválida';
      }

      console.log('[DATE-FORMAT] Parsed as UTC:', date.toISOString());

      // Formatação com timezone brasileiro (irá converter automaticamente de UTC)
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      };

      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        
        const formatter = new Intl.DateTimeFormat('pt-BR', options);
        const formatted = formatter.format(date);
        
        console.log('[DATE-FORMAT] Formatted to Brazil time:', formatted);
        return formatted.replace(',', ' às');
      } else {
        const dateStr = date.toLocaleDateString('pt-BR', options);
        console.log('[DATE-FORMAT] Date only result:', dateStr);
        return dateStr;
      }
    } catch (error) {
      console.error('[DATE-FORMAT] Error formatting date:', error);
      return 'Erro na data';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin">
          <List className="w-10 h-10 text-blue-600" />
        </div>
        <p className="mt-4 text-slate-600">Carregando seleções...</p>
      </div>
    );
  }

  // Debug: Log current state for troubleshooting
  console.log('[SELECTIONS-DEBUG] Current state:', {
    selectedSelection: selectedSelection?.id,
    adDetails: adDetails.length,
    loadingAds,
    selections: selections.length
  });

  // Show client selection if no client is selected and we have clients
  if (!selectedClientSlug && clients.length > 0) {
    return (
      <div>
        {/* Header with Back Button */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Dashboard</span>
              </button>
              <span className="text-slate-400">/</span>
              <span className="text-slate-900 font-medium">Selecionar Cliente</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Escolha um cliente para visualizar as seleções:</h2>
            <div className="grid gap-4">
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('client', client.slug);
                    window.history.pushState({}, '', newUrl.toString());
                    
                    setSelectedClientSlug(client.slug);
                    setLoading(true);
                    setFilterType('all');
                    setStatusFilter('all');
                    fetchSelections(client.slug, 'all', undefined, adSearchTerm || undefined).finally(() => setLoading(false));
                  }}
                  className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group text-left"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    {client.logo_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
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
                        <div className="fallback-logo hidden w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-slate-900 group-hover:text-blue-700">{client.name}</h3>
                      <p className="text-sm text-slate-500">Ver seleções específicas do cliente</p>
                    </div>
                  </div>
                  <div className="text-slate-400 group-hover:text-blue-600">
                    <List className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Visualização de seleção específica
  if (selectedSelection) {
    return (
      <div>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setSelectedSelection(null);
                    setAdDetails([]);
                  }}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Voltar às Seleções</span>
                </button>
                {selectedClientSlug && (
                  <>
                    <div className="h-6 w-px bg-slate-300"></div>
                    <button
                      onClick={() => {
                        setSelectedClientSlug(null);
                        setSelections([]);
                        setSelectedSelection(null);
                        setAdDetails([]);
                      }}
                      className="flex items-center space-x-2 text-slate-600 hover:text-slate-700"
                    >
                      <Target className="w-4 h-4" />
                      <span>Trocar Cliente</span>
                    </button>
                  </>
                )}
                <div className="h-6 w-px bg-slate-300"></div>
                <h1 className="text-xl font-bold text-slate-900">
                  {selectedSelection.note || `Seleção ${selectedSelection.id.slice(0, 8)}`}
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          {/* Info da Seleção */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Informações básicas */}
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Criado por</p>
                      <p className="font-medium">{selectedSelection.user_name || selectedSelection.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Data e hora</p>
                      <p className="font-medium">{formatDateTime(selectedSelection.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Hash className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Quantidade de anúncios</p>
                      <p className="font-medium">{(() => {
                        try {
                          return JSON.parse(selectedSelection.ad_ids || '[]').length;
                        } catch {
                          return 0;
                        }
                      })()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Cliente</p>
                      <p className="font-medium">{selectedSelection.client_name || selectedSelection.slug}</p>
                    </div>
                  </div>
                </div>
                
                {/* Descrição da seleção */}
                {selectedSelection.description && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-1">Descrição:</p>
                    <p className="text-sm text-slate-600">{selectedSelection.description}</p>
                  </div>
                )}
              </div>
              
              {/* Status e execução */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Flag className="w-5 h-5 text-slate-400" />
                  <h4 className="font-medium text-slate-900">Status da Seleção</h4>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <SelectionStatusBadge status={selectedSelection.status as any || 'pending'} />
                  </div>
                  
                  {selectedSelection.status === 'completed' && selectedSelection.executed_at && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">Concluída em:</p>
                        <p className="text-sm font-medium text-slate-900">{formatDateTime(selectedSelection.executed_at)}</p>
                      </div>
                      
                      {selectedSelection.executed_by_user_name && (
                        <div>
                          <p className="text-xs text-slate-500">Executada por:</p>
                          <p className="text-sm font-medium text-slate-900">{selectedSelection.executed_by_user_name}</p>
                        </div>
                      )}
                      
                      {selectedSelection.ads_paused_count !== undefined && selectedSelection.ads_total_count && (
                        <div>
                          <p className="text-xs text-slate-500">Progresso:</p>
                          <p className="text-sm font-medium text-slate-900">
                            {selectedSelection.ads_paused_count}/{selectedSelection.ads_total_count} anúncios pausados
                          </p>
                        </div>
                      )}
                      
                      {selectedSelection.execution_notes && (
                        <div>
                          <p className="text-xs text-slate-500">Notas de execução:</p>
                          <p className="text-sm text-slate-600 bg-white p-2 rounded border text-xs">{selectedSelection.execution_notes}</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {selectedSelection.status === 'completed' && selectedSelection.selection_type === 'pause' && !selectedSelection.executed_at && (
                    <div className="text-xs text-green-600">
                      <strong>✅ Concluída automaticamente</strong> - Todos os anúncios foram pausados
                    </div>
                  )}
                  
                  {selectedSelection.status === 'in_progress' && (
                    <div className="text-xs text-blue-600">
                      <strong>🔄 Em execução</strong> - Processo de pausa iniciado
                    </div>
                  )}
                  
                  {selectedSelection.status === 'pending' && (
                    <div className="text-xs text-yellow-600">
                      <strong>⏳ Pendente</strong> - Aguardando início da execução
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Anúncios na Seleção ({adDetails.length})
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                {selectedSelection.selection_type === 'pause' ? (
                  <div className="flex items-center space-x-1 text-red-600">
                    <Play className="w-4 h-4 rotate-180" />
                    <span className="text-sm font-medium">Seleção para Pausar</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Edit className="w-4 h-4" />
                    <span className="text-sm font-medium">Seleção para Ajustar</span>
                  </div>
                )}
              </div>
              
              {/* Estatísticas dos anúncios */}
              <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{adDetails.filter(ad => ad.effective_status === 'ACTIVE').length} Ativos</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>{adDetails.filter(ad => ad.effective_status === 'PAUSED').length} Pausados</span>
                </span>
              </div>
            </div>
            
            {/* Controles em massa inteligentes */}
            <div className="flex items-center space-x-3">
              {selectedSelection.selection_type === 'pause' && (
                <>
                  {adDetails.some(ad => ad.effective_status === 'ACTIVE') && (
                    <button
                      onClick={handlePauseAllAds}
                      disabled={pausingAds.size > 0 || activatingAds.size > 0}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 flex items-center space-x-2"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pausar Todos Ativos ({adDetails.filter(ad => ad.effective_status === 'ACTIVE').length})</span>
                    </button>
                  )}
                  
                  {adDetails.some(ad => ad.effective_status === 'PAUSED') && (
                    <button
                      onClick={handleActivateAllAds}
                      disabled={pausingAds.size > 0 || activatingAds.size > 0}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Ativar Todos Pausados ({adDetails.filter(ad => ad.effective_status === 'PAUSED').length})</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Lista de Anúncios */}
          {loadingAds ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin">
                <List className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-slate-600 ml-3">Carregando detalhes dos anúncios...</p>
            </div>
          ) : adDetails.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum anúncio encontrado</h3>
              <p className="text-slate-600 mb-4">
                Os anúncios desta seleção podem ter sido removidos da base de dados.
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => handleViewSelection(selectedSelection!)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={() => {
                    setSelectedSelection(null);
                    setAdDetails([]);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Voltar à Lista
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="divide-y divide-slate-200">
                {adDetails.map((ad) => (
                  <div key={ad.ad_id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusIcon(ad.effective_status)}
                          <h3 className="font-semibold text-slate-900">
                            {ad.ad_name || `Anúncio ${ad.ad_id}`}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            ad.effective_status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {getStatusText(ad.effective_status)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600">
                          <div>
                            <span className="font-medium">ID:</span> {ad.ad_id}
                          </div>
                          <div>
                            <span className="font-medium">Campanha:</span> {ad.campaign_name || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Objetivo:</span> {OBJECTIVES_PT[ad.objective] || ad.objective || 'N/A'}
                          </div>
                        </div>
                        {ad.reason && (
                          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <FileText className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-slate-700 mb-1">
                                  {selectedSelection.selection_type === 'pause' ? 'Motivo para pausar:' : 'Ajustes necessários:'}
                                </p>
                                <p className="text-sm text-slate-600">{ad.reason}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {selectedSelection.selection_type === 'pause' && (
                        <div className="ml-4 flex items-center space-x-2">
                          {ad.effective_status === 'ACTIVE' && (
                            <button
                              onClick={() => handlePauseAd(ad.ad_id)}
                              disabled={pausingAds.has(ad.ad_id) || activatingAds.has(ad.ad_id)}
                              className="bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-yellow-400 flex items-center space-x-1 text-sm"
                            >
                              {pausingAds.has(ad.ad_id) ? (
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                              ) : (
                                <Pause className="w-4 h-4" />
                              )}
                              <span>Pausar</span>
                            </button>
                          )}
                          
                          {ad.effective_status === 'PAUSED' && (
                            <button
                              onClick={() => handleActivateAd(ad.ad_id)}
                              disabled={activatingAds.has(ad.ad_id) || pausingAds.has(ad.ad_id)}
                              className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center space-x-1 text-sm"
                            >
                              {activatingAds.has(ad.ad_id) ? (
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              <span>Ativar</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          
        </main>
      </div>
    );
  }

  // Lista principal de seleções - FORMATO LISTA MELHORADO
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb melhorado */}
            <div className="flex items-center space-x-3">
              {(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const fromClients = urlParams.get('from') === 'clients';
                
                if (fromClients) {
                  return (
                    <>
                      <button
                        onClick={() => window.location.href = '/clients'}
                        className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Gestão de Clientes</span>
                      </button>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-900 font-medium">Seleções de Ads</span>
                    </>
                  );
                } else if (selectedClientSlug && selectedClientSlug !== 'all' && clients.length > 0) {
                  return (
                    <>
                      <button
                        onClick={() => window.location.href = '/'}
                        className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Dashboard</span>
                      </button>
                      <span className="text-slate-400">/</span>
                      <button
                        onClick={() => {
                          const newUrl = new URL(window.location.href);
                          newUrl.searchParams.delete('client');
                          window.history.pushState({}, '', newUrl.toString());
                          
                          setSelectedClientSlug(null);
                          setSelections([]);
                          setFilterType('all');
                          setHasAdminSelections(false);
                        }}
                        className="text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Trocar Cliente
                      </button>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-900 font-medium">
                        {clients.find(c => c.slug === selectedClientSlug)?.name || selectedClientSlug}
                      </span>
                    </>
                  );
                } else {
                  return (
                    <>
                      <button
                        onClick={() => window.location.href = '/'}
                        className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar ao Dashboard</span>
                      </button>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-900 font-medium">Seleções de Anúncios</span>
                    </>
                  );
                }
              })()}
            </div>
            
            {/* Quick action button */}
            <div className="flex items-center space-x-3">
              <a
                href="/ads-active"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                <Target className="w-4 h-4 mr-2" />
                Criar Nova Seleção
              </a>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Filter Controls */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Type Filter - only show for admin with mixed selections */}
            {isAdmin && selectedClientSlug && hasAdminSelections && (
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-slate-700">Por criador:</h3>
                <button
                  onClick={() => {
                    setFilterType('all');
                    setLoading(true);
                    fetchSelections(selectedClientSlug || 'all', 'all', statusFilter !== 'all' ? statusFilter : undefined, adSearchTerm || undefined).finally(() => setLoading(false));
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => {
                    setFilterType('admin');
                    setLoading(true);
                    fetchSelections(selectedClientSlug || 'all', 'admin', statusFilter !== 'all' ? statusFilter : undefined, adSearchTerm || undefined).finally(() => setLoading(false));
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => {
                    setFilterType('client');
                    setLoading(true);
                    fetchSelections(selectedClientSlug || 'all', 'client', statusFilter !== 'all' ? statusFilter : undefined, adSearchTerm || undefined).finally(() => setLoading(false));
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'client'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cliente
                </button>
              </div>
            )}

            {/* Ad Search Filter */}
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-slate-700">Buscar anúncio:</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="ID do anúncio ou nome..."
                  value={adSearchTerm}
                  onChange={(e) => setAdSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAdSearch();
                    }
                  }}
                  className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                />
                <button
                  onClick={handleAdSearch}
                  disabled={searchLoading}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center space-x-1"
                >
                  {searchLoading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  <span>Buscar</span>
                </button>
                {adSearchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="px-2 py-1 text-slate-500 hover:text-slate-700 text-sm"
                    title="Limpar busca"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter - always show */}
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-slate-700">Por status:</h3>
              <div className="flex items-center space-x-2">
                {[
                  { value: 'all', label: 'Todos', color: 'blue' },
                  { value: 'pending', label: 'Pendentes', color: 'yellow' },
                  { value: 'in_progress', label: 'Em Execução', color: 'blue' },
                  { value: 'completed', label: 'Concluídas', color: 'green' },
                  { value: 'cancelled', label: 'Canceladas', color: 'red' }
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => {
                      setStatusFilter(status.value);
                      setLoading(true);
                      fetchSelections(
                        selectedClientSlug || 'all', 
                        filterType !== 'all' ? filterType : undefined,
                        status.value !== 'all' ? status.value : undefined,
                        adSearchTerm || undefined
                      ).finally(() => setLoading(false));
                    }}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === status.value
                        ? `bg-${status.color}-100 text-${status.color}-700`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {selections.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <List className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              {adSearchTerm ? 'Nenhuma seleção encontrada para sua busca' : 'Nenhuma seleção encontrada'}
            </h3>
            <p className="text-slate-600 mb-8">
              {adSearchTerm 
                ? `Não encontramos seleções que contenham anúncios com "${adSearchTerm}". Tente buscar por outro ID ou nome de anúncio.`
                : (selectedClientSlug === 'all' 
                    ? 'Você ainda não criou nenhuma seleção de anúncios. Comece criando seleções na página de Ads Ativos.'
                    : 'Comece salvando seleções de anúncios na página de Ads Ativos'
                  )
              }
            </p>
            <div className="flex items-center justify-center space-x-4">
              {adSearchTerm && (
                <button
                  onClick={handleClearSearch}
                  disabled={searchLoading}
                  className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:bg-gray-400"
                >
                  {searchLoading ? (
                    <div className="animate-spin w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {searchLoading ? 'Limpando...' : 'Limpar Busca'}
                </button>
              )}
              <a
                href="/ads-active"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Target className="w-5 h-5 mr-2" />
                Ir para Ads Ativos
              </a>
            </div>
          </div>
        ) : (
          // NOVO FORMATO DE LISTA MELHORADO
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {selections.length} seleções encontradas
                  {adSearchTerm && (
                    <span className="text-sm font-normal text-slate-600 ml-2">
                      para "{adSearchTerm}"
                    </span>
                  )}
                </h2>
                {adSearchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    disabled={searchLoading}
                  >
                    {searchLoading ? 'Limpando...' : 'Limpar busca'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="divide-y divide-slate-200">
              {selections.map((selection) => {
                const adCount = JSON.parse(selection.ad_ids).length;
                const canDelete = isAdmin || selection.user_email === user?.email;
                const isAdminSelection = (selection as any).is_admin_selection;
                
                return (
                  <div 
                    key={selection.id} 
                    className="p-6 hover:bg-slate-50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      {/* Conteúdo Principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-slate-900 truncate">
                            {selection.note || `Seleção ${selection.id.slice(0, 8)}`}
                          </h3>
                          {isAdminSelection && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex-shrink-0">
                              Admin
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                            selection.selection_type === 'pause' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {selection.selection_type === 'pause' ? 'Pausar' : 'Ajustar'}
                          </span>
                          <SelectionStatusBadge status={selection.status as any || 'pending'} className="flex-shrink-0" />
                        </div>
                        
                        {/* Grid de Informações */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-slate-600">
                              <strong>{adCount}</strong> anúncio{adCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-slate-600 truncate">
                              {selection.user_name || selection.user_email}
                              {isAdminSelection && (
                                <span className="text-purple-600 font-medium ml-1">(Admin)</span>
                              )}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-slate-600">
                              {formatDateTime(selection.created_at)}
                            </span>
                          </div>
                          
                          {selection.client_name && (
                            <div className="flex items-center space-x-2">
                              <Target className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="text-slate-600 truncate">
                                {selection.client_name}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Execution info if available */}
                        {selection.executed_at && (
                          <div className="flex items-center space-x-2 mt-3">
                            <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-slate-600 text-xs">
                              <strong>Concluído em:</strong> {formatDateTime(selection.executed_at)} por <strong>{selection.executed_by_user_name}</strong>
                              {selection.ads_paused_count !== undefined && (
                                <span className="ml-1">• ({selection.ads_paused_count}/{selection.ads_total_count || 0} anúncios pausados)</span>
                              )}
                            </span>
                          </div>
                        )}
                        
                        {/* Show completion info for pause selections even without executed_at if status is completed */}
                        {selection.selection_type === 'pause' && selection.status === 'completed' && !selection.executed_at && (
                          <div className="flex items-center space-x-2 mt-3">
                            <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-slate-600 text-xs">
                              <strong>✅ Concluída automaticamente</strong> - Todos os anúncios foram pausados pelo sistema
                            </span>
                          </div>
                        )}
                        
                        {/* Enhanced execution details for pause selections */}
                        {selection.selection_type === 'pause' && selection.status === 'in_progress' && (
                          <div className="flex items-center space-x-2 mt-3">
                            <RotateCcw className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="text-slate-600 text-xs">
                              <strong>🔄 Em execução</strong> - Processo de pausa iniciado
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Ações */}
                      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => handleViewSelection(selection)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Ver Detalhes
                        </button>

                        {/* Status update button - only for non-pause selections */}
                        {(isAdmin || selection.user_email === user?.email) && selection.selection_type !== 'pause' && (
                          <button
                            onClick={() => setStatusUpdateModal({ selection, show: true })}
                            className="p-2 text-slate-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50"
                            title="Atualizar status"
                          >
                            <Flag className="w-4 h-4" />
                          </button>
                        )}
                        
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteSelection(selection.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                            title="Excluir seleção"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {statusUpdateModal.show && statusUpdateModal.selection && (
          <SelectionStatusModal
            selection={statusUpdateModal.selection}
            onClose={() => setStatusUpdateModal({ selection: null, show: false })}
            onUpdated={() => {
              // Refresh selections list
              setLoading(true);
              fetchSelections(
                selectedClientSlug || 'all', 
                filterType !== 'all' ? filterType : undefined,
                statusFilter !== 'all' ? statusFilter : undefined,
                adSearchTerm || undefined
              ).finally(() => setLoading(false));
            }}
          />
        )}
      </main>
    </div>
  );
}
