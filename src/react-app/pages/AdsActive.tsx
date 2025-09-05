import { useState, useEffect } from 'react';
import { useParams, useLocation, useSearchParams } from 'react-router';
import { useAuth, useAuthFetch } from '../hooks/useAuth';
import { Target, Filter, CheckSquare, Square, BarChart3, RefreshCw, Save, AlertCircle, Settings, ChevronUp, ChevronDown, ArrowUp, ArrowDown, X, Minus, Plus, Users, ArrowLeft } from 'lucide-react';
import AdAccountSelector from '../components/AdAccountSelector';
import AdAccountManager from '../components/AdAccountManager';
import SelectionCreator from '../components/SelectionCreator';
import ClientPlatformSelector from '../components/ClientPlatformSelector';
import type { AdAccount } from '../../shared/platforms';
import { OBJECTIVES_PT, OPTIMIZATION_GOALS_PT } from '../../shared/types';


interface Ad {
  ad_id: string;
  ad_name: string;
  effective_status: string;
  creative_id: string;
  creative_thumb: string;
  campaign_id: string;
  campaign_name: string;
  objective: string;
  adset_optimization_goal: string;
  client_id: string;
}

export default function AdsActive() {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const fetchWithAuth = useAuthFetch();
  
  // Core states
  const [client, setClient] = useState<any>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Stability states
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Selection states
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showSelectionCreator, setShowSelectionCreator] = useState(false);
  
  // Preview states
  const [showPreview, setShowPreview] = useState(false);
  const [previewAd, setPreviewAd] = useState<any>(null);
  
  // Sync states
  const [updatingAll, setUpdatingAll] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStep, setSyncStep] = useState('');
  const [syncTimeRemaining, setSyncTimeRemaining] = useState(0);
  
  // Metrics states
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metricsDays, setMetricsDays] = useState<7 | 14 | 30>(7);
  
  // Admin mode states
  const [selectedClientSlug] = useState(slug || '');
  const [selectedPlatform, setSelectedPlatform] = useState(searchParams.get('platform') || '');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptimizationGoal, setSelectedOptimizationGoal] = useState('');
  const [selectedObjective, setSelectedObjective] = useState('');
  
  // Metrics sorting and filtering
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [metricFilters, setMetricFilters] = useState<Record<string, { min?: number; max?: number }>>({});
  const [showMetricFilters, setShowMetricFilters] = useState<boolean>(false);
  
  // Selected ads list state for metrics view - Start minimized
  const [selectedAdsExpanded, setSelectedAdsExpanded] = useState<boolean>(false);
  
  // Separate state for checked ads in metrics view (for creating selections)
  const [checkedAdsInMetrics, setCheckedAdsInMetrics] = useState<Set<string>>(new Set());
  const [showMetricsSelectionCreator, setShowMetricsSelectionCreator] = useState(false);

  // State for minimizing/expanding ads list
  const [adsExpanded, setAdsExpanded] = useState<boolean>(false);

  // Column visibility state for metrics table
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
    'spend', 'impressions', 'link_clicks', 'ctr', 'cost_per_link_click', 
    'cpm', 'landing_page_views', 'cpa', 'results', 'revenue', 'roas'
  ]));
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [userMetricPermissions, setUserMetricPermissions] = useState<Set<string>>(new Set());

  const isCreativesPage = location.pathname.includes('/creatives/');

  // Check user permissions for metrics columns with BULLETPROOF error handling
  useEffect(() => {
    let isCancelled = false;
    let permissionAbortController: AbortController | null = null;
    
    const checkMetricPermissions = async () => {
      if (isCancelled) return;
      
      try {
        console.log(`[METRICS-PERMISSIONS] Starting bulletproof permission check for user: ${user?.email}`);
        
        // Create abort controller for permission checks
        permissionAbortController = new AbortController();
        const signal = permissionAbortController.signal;
        
        const metricColumns = ['spend', 'impressions', 'link_clicks', 'ctr', 'cost_per_link_click', 
                             'cpm', 'landing_page_views', 'cpa', 'results', 'revenue', 'roas'];
        
        const allowedColumns = new Set<string>();
        
        for (const column of metricColumns) {
          if (isCancelled || signal.aborted) {
            console.log('[METRICS-PERMISSIONS] Permission check cancelled');
            return;
          }
          
          try {
            console.log(`[METRICS-PERMISSIONS] Checking permission for column: ${column}`);
            
            // Add timeout for individual permission checks
            const permissionPromise = fetchWithAuth('/api/users/check-permission', {
              method: 'POST',
              body: JSON.stringify({
                permission: 'ads.metrics',
                restriction_type: 'column',
                restriction_name: column
              }),
              signal
            });
            
            // Race with timeout
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Permission check timeout')), 5000);
            });
            
            const response = await Promise.race([permissionPromise, timeoutPromise]) as Response;
            
            if (signal.aborted || isCancelled) {
              console.log('[METRICS-PERMISSIONS] Permission check was cancelled');
              return;
            }
            
            if (response && response.ok) {
              const data = await response.json();
              console.log(`[METRICS-PERMISSIONS] Response for ${column}:`, data);
              
              if (data && data.has_permission && data.has_restriction) {
                allowedColumns.add(column);
                console.log(`[METRICS-PERMISSIONS] ✅ Column ${column} ALLOWED`);
              } else {
                console.log(`[METRICS-PERMISSIONS] ❌ Column ${column} DENIED (permission: ${data?.has_permission}, restriction: ${data?.has_restriction})`);
              }
            } else {
              console.error(`[METRICS-PERMISSIONS] API error for column ${column}:`, response?.status || 'No response');
            }
          } catch (error: any) {
            if (error?.name === 'AbortError' || isCancelled) {
              console.log(`[METRICS-PERMISSIONS] Permission check cancelled for ${column}`);
              return;
            }
            console.error(`[METRICS-PERMISSIONS] Error checking permission for column ${column}:`, error);
            // Default to denying if check fails for security
            console.log(`[METRICS-PERMISSIONS] ⚠️  Denying ${column} due to error (security fallback)`);
          }
        }
        
        if (isCancelled) return;
        
        console.log(`[METRICS-PERMISSIONS] Final allowed columns (${allowedColumns.size}):`, Array.from(allowedColumns));
        
        // If no columns allowed, user has no permissions configured for metrics columns
        if (allowedColumns.size === 0) {
          console.warn('[METRICS-PERMISSIONS] ⚠️  No columns allowed - user has no column permissions configured!');
          console.log('[METRICS-PERMISSIONS] User needs column permissions to be explicitly granted in permission management');
        }
        
        setUserMetricPermissions(allowedColumns);
        
        // Set initial visible columns to allowed ones
        setVisibleColumns(prev => {
          if (isCancelled) return prev;
          
          try {
            // Filter to only show columns the user is allowed to see
            const newVisible = new Set<string>();
            
            // Only use allowed columns
            if (allowedColumns.size > 0) {
              // Start with user's current selection, but filter to allowed only
              if (prev.size > 0) {
                for (const col of prev) {
                  if (allowedColumns.has(col)) {
                    newVisible.add(col);
                  }
                }
              }
              
              // If no valid columns from previous selection, add first few allowed ones
              if (newVisible.size === 0) {
                const defaultOrder = ['spend', 'impressions', 'link_clicks', 'ctr', 'results', 'roas'];
                let added = 0;
                for (const col of defaultOrder) {
                  if (allowedColumns.has(col) && added < 6) {
                    newVisible.add(col);
                    added++;
                  }
                }
                
                // If still no columns, add any available
                if (newVisible.size === 0 && allowedColumns.size > 0) {
                  Array.from(allowedColumns).slice(0, 6).forEach(col => newVisible.add(col));
                }
              }
            } else {
              // No columns allowed - clear all
              newVisible.clear();
            }
            
            console.log(`[METRICS-PERMISSIONS] Setting visible columns (${newVisible.size}):`, Array.from(newVisible));
            return newVisible;
          } catch (columnError) {
            console.error('[METRICS-PERMISSIONS] Error setting visible columns:', columnError);
            return prev; // Keep previous state on error
          }
        });
        
      } catch (error: any) {
        if (error?.name === 'AbortError' || isCancelled) {
          console.log('[METRICS-PERMISSIONS] Permission check operation was cancelled');
          return;
        }
        console.error('[METRICS-PERMISSIONS] Critical error in permission check:', error);
        // Set fallback permissions to prevent total failure
        if (!isCancelled) {
          setUserMetricPermissions(new Set(['spend', 'impressions'])); // Minimal fallback
        }
      }
    };
    
    if (user && fetchWithAuth && typeof fetchWithAuth === 'function' && !isCancelled) {
      checkMetricPermissions().catch(error => {
        if (!isCancelled && error?.name !== 'AbortError') {
          console.error('[METRICS-PERMISSIONS] Top-level error in useEffect:', error);
        }
      });
    }
    
    // Cleanup function
    return () => {
      isCancelled = true;
      if (permissionAbortController && !permissionAbortController.signal.aborted) {
        permissionAbortController.abort();
        console.log('[METRICS-PERMISSIONS] Cleanup: Cancelled permission checks');
      }
    };
  }, [user, fetchWithAuth]);

  

  // Helper function to normalize timestamps from SQLite vs ISO
  const normalizeTimestamp = (timestamp: string | null): Date | null => {
    if (!timestamp) return null;
    
    try {
      let normalizedDate: Date;
      
      // SQLite datetime('now') sempre salva em UTC
      // Precisamos tratar TODAS as datas como UTC
      if (timestamp.includes('T')) {
        // Formato ISO
        if (timestamp.includes('Z') || timestamp.includes('+')) {
          // Já tem timezone
          normalizedDate = new Date(timestamp);
        } else {
          // Formato ISO sem timezone - assumir UTC do SQLite
          normalizedDate = new Date(timestamp + 'Z');
        }
      } else {
        // Formato SQLite padrão "YYYY-MM-DD HH:MM:SS" - sempre UTC
        normalizedDate = new Date(timestamp.replace(' ', 'T') + 'Z');
      }
      
      // Validate the date
      if (isNaN(normalizedDate.getTime())) {
        console.warn('[TIMESTAMP] Invalid date detected:', timestamp);
        return null;
      }
      
      console.log('[TIMESTAMP] Normalized:', timestamp, '→', normalizedDate.toISOString());
      return normalizedDate;
    } catch (error) {
      console.error('[TIMESTAMP] Error parsing timestamp:', timestamp, error);
      return null;
    }
  };

  // Helper function to format timestamp for display
  const formatTimestamp = (timestamp: string | null, includeTime: boolean = true): string => {
    const date = normalizeTimestamp(timestamp);
    if (!date) return 'Nunca';
    
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
      return formatted.replace(',', ' às');
    }
    
    return date.toLocaleDateString('pt-BR', options);
  };

  // Handle errors safely
  const handleError = (error: any, context: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`${context}:`, errorMessage);
    setError(`${context}: ${errorMessage}`);
    setLoading(false);
  };

  

  // Simplified initialization with error protection
  useEffect(() => {
    let isCancelled = false;
    
    const safeInit = async () => {
      try {
        if (authLoading || !user) return;

        if (slug && !isCancelled) {
          await fetchClient();
        } else if (!isCancelled) {
          setLoading(false);
        }
        
        if (!isCancelled) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[INIT] Initialization error:', error);
        if (!isCancelled) {
          setError('Erro na inicialização. Recarregue a página.');
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };
    
    safeInit();
    
    return () => {
      isCancelled = true;
    };
  }, [slug, authLoading, user]);

  // Update platform from URL
  useEffect(() => {
    const urlPlatform = searchParams.get('platform');
    if (urlPlatform && urlPlatform !== selectedPlatform) {
      setSelectedPlatform(urlPlatform);
    }
  }, [searchParams]);

  const fetchClient = async () => {
    if (!slug) {
      setLoading(false);
      return;
    }
    
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
      handleError(error, 'Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  

  const fetchAds = async (accountId: string) => {
    const currentSlug = selectedClientSlug || slug;
    if (!currentSlug || !accountId) {
      console.warn('[FETCH-ADS] Missing parameters:', { currentSlug, accountId });
      throw new Error('Parâmetros obrigatórios ausentes para buscar anúncios');
    }
    
    console.log('[FETCH-ADS] Fetching ads for account:', accountId);
    
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = `/api/clients/${currentSlug}/ad-accounts/${accountId}/ads`;
      console.log('[FETCH-ADS] API URL:', apiUrl);
      
      const response = await fetchWithAuth(apiUrl);
      console.log('[FETCH-ADS] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[FETCH-ADS] Response data:', { ok: data.ok, adsCount: data.ads?.length || 0 });
        
        if (data.ok) {
          const adsArray = Array.isArray(data.ads) ? data.ads : [];
          setAds(adsArray);
          console.log('[FETCH-ADS] ✅ Successfully set ads:', adsArray.length);
        } else {
          const errorMsg = String(data.error || 'Erro ao carregar anúncios').substring(0, 200);
          console.error('[FETCH-ADS] API error:', errorMsg);
          setError(errorMsg);
          setAds([]);
          throw new Error(errorMsg);
        }
      } else {
        let errorText = 'Erro desconhecido';
        try {
          const errorData = await response.json();
          errorText = String(errorData.error || response.statusText).substring(0, 200);
        } catch {
          try {
            errorText = String(await response.text() || response.statusText).substring(0, 200);
          } catch {
            errorText = `HTTP ${response.status}`;
          }
        }
        const errorMsg = `Erro HTTP ${response.status}: ${errorText}`;
        console.error('[FETCH-ADS] HTTP error:', errorMsg);
        setError(errorMsg);
        setAds([]);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('[FETCH-ADS] Exception:', error);
      const errorMsg = String(error.message || 'Erro desconhecido ao buscar anúncios').substring(0, 200);
      
      // Only set error state if it's not already an Error we threw
      if (!error.message || error.message.includes('Erro desconhecido')) {
        setError(`Erro ao buscar anúncios: ${errorMsg}`);
      }
      
      setAds([]);
      throw error; // Re-throw to let calling function handle it
    } finally {
      try {
        setLoading(false);
      } catch (e) {
        console.warn('[FETCH-ADS] Error setting loading state:', e);
      }
      console.log('[FETCH-ADS] Fetch completed');
    }
  };

  const handleAccountSelect = (account: AdAccount | null) => {
    console.log(`[ACCOUNT-SELECT] Starting account selection:`, account?.account_name);
    
    if (account) {
      // Prevent flickering by setting transition state
      setIsTransitioning(true);
      
      console.log(`[ACCOUNT-SELECT] Setting account and loading data...`);
      
      // Batch state updates to prevent flickering
      setTimeout(() => {
        // Clear previous state
        setError(null);
        setSelectedAds(new Set());
        setMetrics({});
        setShowMetrics(false);
        setCheckedAdsInMetrics(new Set());
        
        // Set new account
        setSelectedAccount(account);
        setLastSyncTime(account.last_sync_at || null);
        setLoading(true);
        
        // Load ads from database
        fetchAds(account.id)
          .then(() => {
            console.log(`[ACCOUNT-SELECT] ✅ Ads loaded successfully`);
          })
          .catch(error => {
            console.error(`[ACCOUNT-SELECT] ❌ Error loading ads:`, error);
            setError(`Erro ao carregar anúncios: ${error.message}`);
          })
          .finally(() => {
            setLoading(false);
            setIsTransitioning(false);
          });
      }, 50); // Small delay to batch updates
        
    } else {
      // Clear all state when no account selected
      console.log(`[ACCOUNT-SELECT] Clearing account selection`);
      
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedAccount(null);
        setAds([]);
        setSelectedAds(new Set());
        setMetrics({});
        setShowMetrics(false);
        setCheckedAdsInMetrics(new Set());
        setLastSyncTime(null);
        setError(null);
        setLoading(false);
        setIsTransitioning(false);
      }, 50);
    }
  };

  

  const handleUpdateAll = async () => {
    // SIMPLE, ROBUST SYNC SYSTEM
    const requestId = Math.random().toString(36).substring(2, 8);
    console.log(`[SYNC-${requestId}] Starting sync for account: ${selectedAccount?.account_name}`);
    
    // Emergency cleanup function
    const cleanup = () => {
      setUpdatingAll(false);
      setSyncProgress(0);
      setSyncStep('');
      setSyncTimeRemaining(0);
    };
    
    try {
      // Basic validation
      if (!selectedAccount?.id || !slug) {
        console.warn(`[SYNC-${requestId}] Missing required data`);
        return;
      }
      
      // Start sync
      setUpdatingAll(true);
      setError(null);
      setSyncProgress(10);
      setSyncStep('Conectando...');
      setSyncTimeRemaining(90);
      
      // Countdown timer
      const countdown = setInterval(() => {
        setSyncTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      
      try {
        setSyncProgress(30);
        setSyncStep('Sincronizando anúncios...');
        
        // API call with shorter timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout
        
        const apiUrl = `/api/admin/clients/${slug}/ad-accounts/${selectedAccount.id}/sync?days=30`;
        const response = await fetchWithAuth(apiUrl, { signal: controller.signal });
        
        clearTimeout(timeoutId);
        clearInterval(countdown);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.ok) {
          throw new Error(data.error || 'Falha na sincronização');
        }
        
        // Success - reload data
        setSyncProgress(80);
        setSyncStep('Atualizando lista...');
        
        setLastSyncTime(new Date().toISOString());
        await fetchAds(selectedAccount.id);
        
        setSyncProgress(100);
        setSyncStep('Concluído!');
        
        // Clear selections
        setSelectedAds(new Set());
        setMetrics({});
        setShowMetrics(false);
        setMetricsError(null);
        setCheckedAdsInMetrics(new Set());
        
        console.log(`[SYNC-${requestId}] ✅ Success: ${data.summary?.ads || 0} ads`);
        
        // Show success message and auto-hide after 3 seconds
        setTimeout(() => {
          cleanup();
        }, 3000);
        
      } catch (syncError: any) {
        clearInterval(countdown);
        console.error(`[SYNC-${requestId}] Sync error:`, syncError);
        
        let errorMessage = 'Erro na sincronização';
        
        if (syncError.name === 'AbortError') {
          errorMessage = 'Sincronização muito lenta - tente novamente';
        } else if (syncError.message?.includes('Failed to fetch')) {
          errorMessage = 'Problema de conexão - verifique sua internet';
        } else if (syncError.message) {
          errorMessage = syncError.message.substring(0, 150);
        }
        
        setError(errorMessage);
        cleanup();
      }
      
    } catch (outerError: any) {
      console.error(`[SYNC-${requestId}] Critical error:`, outerError);
      setError('Erro crítico - recarregue a página');
      cleanup();
    }
  };

  // Intelligent sync status with automatic scheduling awareness
  const getLastSyncStatus = () => {
    if (!lastSyncTime) return { canSync: true, message: '', isAutoSynced: false };
    
    try {
      const lastSync = normalizeTimestamp(lastSyncTime);
      if (!lastSync) {
        console.warn('[SYNC-STATUS] Invalid timestamp detected:', lastSyncTime);
        return { canSync: true, message: '', isAutoSynced: false };
      }
      
      const now = new Date();
      const diffMs = now.getTime() - lastSync.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      
      console.log('[SYNC-STATUS] Intelligent sync check:', { 
        lastSyncTime: lastSyncTime,
        diffMinutes,
        diffHours
      });
      
      // BUG FIX: Handle negative time differences
      if (diffMinutes < 0) {
        console.warn(`[SYNC-STATUS] ⚠️ Negative time difference detected, allowing sync`);
        return { canSync: true, message: '', isAutoSynced: false };
      }
      
      // NEW INTELLIGENT LOGIC:
      // 1. If sync was recent (< 2 hours), consider it auto-synced and allow immediate manual sync
      // 2. If sync was very recent (< 15 min), show info but allow sync
      // 3. If sync is old (> 12 hours), definitely allow sync
      
      if (diffMinutes < 15) {
        // Very recent sync - show info but allow (could be auto-sync)
        return {
          canSync: true,
          message: `Sincronização recente (${diffMinutes} min atrás). Dados já atualizados.`,
          isAutoSynced: true
        };
      } else if (diffHours < 2) {
        // Recent sync - likely auto-sync, allow manual sync
        return {
          canSync: true,
          message: `Última sincronização: ${diffMinutes} min atrás`,
          isAutoSynced: true
        };
      } else if (diffHours >= 12) {
        // Old sync - definitely allow
        return {
          canSync: true,
          message: `Sincronização antiga (${diffHours}h atrás). Recomendado atualizar.`,
          isAutoSynced: false
        };
      } else {
        // Medium age sync - allow but with info
        return {
          canSync: true,
          message: `Última sincronização: ${diffHours}h atrás`,
          isAutoSynced: false
        };
      }
      
    } catch (error) {
      console.error('[SYNC-STATUS] Error calculating sync status:', error);
      return { canSync: true, message: '', isAutoSynced: false };
    }
  };

  const toggleAdSelection = (adId: string) => {
    const newSelected = new Set(selectedAds);
    if (newSelected.has(adId)) {
      newSelected.delete(adId);
    } else {
      newSelected.add(adId);
    }
    setSelectedAds(newSelected);
  };

  const selectAllVisible = () => {
    const visibleAdIds = filteredAds.map(ad => ad.ad_id);
    if (visibleAdIds.length === selectedAds.size && 
        visibleAdIds.every(id => selectedAds.has(id))) {
      setSelectedAds(new Set());
    } else {
      setSelectedAds(new Set(visibleAdIds));
    }
  };

  // SISTEMA DE MÉTRICAS EM LOTES - ULTRA ROBUSTO PARA ALTO VOLUME
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, processing: false });
  const [batchResults, setBatchResults] = useState<Record<string, any>>({});

  const fetchMetricsData = async () => {
    const requestId = Math.random().toString(36).substring(2, 8);
    console.log(`[METRICS-BATCH-${requestId}] ==================== BULLETPROOF SISTEMA DE LOTES ====================`);
    
    // Create dedicated abort controller for this batch operation
    const batchAbortController = new AbortController();
    setGlobalAbortController(batchAbortController);
    
    // Global error handler to prevent system crashes and "Preview failed" errors
    let hasError = false;
    let operationCancelled = false;
    
    const safeSetError = (message: string) => {
      try {
        if (!hasError && !operationCancelled && !batchAbortController.signal.aborted) {
          hasError = true;
          setMetricsError(message);
        }
      } catch (e) {
        console.error('[METRICS-BATCH] Error setting error state:', e);
      }
    };
    
    const safeBulletproofCleanup = () => {
      try {
        operationCancelled = true;
        if (!batchAbortController.signal.aborted) {
          batchAbortController.abort();
        }
        setMetricsLoading(false);
        setBatchProgress({ current: 0, total: 0, processing: false });
        setGlobalAbortController(null);
        console.log(`[METRICS-BATCH-${requestId}] ✅ Bulletproof cleanup completed`);
      } catch (e) {
        console.error('[METRICS-BATCH] Error in bulletproof cleanup:', e);
      }
    };
    
    // Set up automatic timeout cleanup to prevent hanging operations
    const globalTimeoutId = setTimeout(() => {
      console.log(`[METRICS-BATCH-${requestId}] ⏰ Global timeout reached - forcing cleanup`);
      safeBulletproofCleanup();
      safeSetError('⏱️ Operação de métricas expirou. Tente novamente com menos anúncios.');
    }, 120000); // 2 minutes max
    
    try {
      // Enhanced validation with null checks
      if (!selectedAds || selectedAds.size === 0) {
        console.warn(`[METRICS-BATCH-${requestId}] ❌ Nenhum anúncio selecionado`);
        safeSetError('⚠️ Selecione anúncios antes de carregar métricas');
        return;
      }
      
      if (!selectedAccount?.id) {
        console.warn(`[METRICS-BATCH-${requestId}] ❌ Conta não selecionada`);
        safeSetError('⚠️ Selecione uma conta de anúncios válida');
        return;
      }
      
      if (!slug) {
        console.warn(`[METRICS-BATCH-${requestId}] ❌ Cliente não identificado`);
        safeSetError('⚠️ Cliente não identificado');
        return;
      }
      
      const totalAds = selectedAds.size;
      const adIds = Array.from(selectedAds);
      console.log(`[METRICS-BATCH-${requestId}] 🎯 Processando ${totalAds} anúncios em lotes`);
      
      // Limpar estado anterior
      setMetricsLoading(true);
      setMetricsError(null);
      setShowMetrics(false);
      setBatchResults({});
      
      // SISTEMA INTELIGENTE DE LOTES
      let batchSize: number;
      if (totalAds > 100) {
        batchSize = 15; // Lotes pequenos para volumes muito altos
      } else if (totalAds > 50) {
        batchSize = 20; // Lotes médios
      } else if (totalAds > 20) {
        batchSize = 25; // Lotes maiores para volumes menores
      } else {
        batchSize = totalAds; // Processar tudo de uma vez se for pouco
      }
      
      const batches = [];
      for (let i = 0; i < adIds.length; i += batchSize) {
        batches.push(adIds.slice(i, i + batchSize));
      }
      
      console.log(`[METRICS-BATCH-${requestId}] 📦 Criados ${batches.length} lotes de ${batchSize} anúncios`);
      
      // Inicializar progresso
      setBatchProgress({ current: 0, total: batches.length, processing: true });
      
      const allResults: Record<string, any> = {};
      let successCount = 0;
      let errorCount = 0;
      
      // Processar cada lote com proteção total contra crashes
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        // Check if component is still mounted
        if (hasError) {
          console.log(`[METRICS-BATCH-${requestId}] Aborting due to previous error`);
          break;
        }
        
        const batch = batches[batchIndex];
        console.log(`[METRICS-BATCH-${requestId}] 🔄 Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} anúncios)`);
        
        try {
          // Safe progress update
          setBatchProgress({ current: batchIndex, total: batches.length, processing: true });
        } catch (progressError) {
          console.error(`[METRICS-BATCH-${requestId}] Progress update error:`, progressError);
        }
        
        let controller: AbortController | null = null;
        let timeoutId: NodeJS.Timeout | null = null;
        
        try {
          // Check for cancellation before each batch
          if (operationCancelled || batchAbortController.signal.aborted) {
            console.log(`[METRICS-BATCH-${requestId}] Operation cancelled before batch ${batchIndex + 1}`);
            break;
          }
          
          // Robust timeout for each batch with cancellation check
          const batchTimeoutMs = 40000; // 40 segundos por lote - reduced for faster failure detection
          controller = new AbortController();
          
          // Link batch controller to global controller
          if (batchAbortController.signal.aborted) {
            controller.abort();
          } else {
            batchAbortController.signal.addEventListener('abort', () => {
              controller?.abort();
            });
          }
          
          timeoutId = setTimeout(() => {
            console.log(`[METRICS-BATCH-${requestId}] Lote ${batchIndex + 1} timeout - aborting gracefully`);
            controller?.abort();
          }, batchTimeoutMs);
          
          const apiUrl = `/api/clients/${slug}/ad-accounts/${selectedAccount.id}/ads/metrics`;
          const requestBody = {
            ad_ids: batch,
            days: metricsDays,
            banco_first: true,
            batch_info: { index: batchIndex + 1, total: batches.length, size: batch.length }
          };
          
          if (!fetchWithAuth || typeof fetchWithAuth !== 'function') {
            throw new Error('fetchWithAuth não disponível');
          }
          
          // Double-check cancellation before making request
          if (operationCancelled || batchAbortController.signal.aborted || controller.signal.aborted) {
            console.log(`[METRICS-BATCH-${requestId}] Batch ${batchIndex + 1} cancelled before request`);
            break;
          }
          
          const response = await fetchWithAuth(apiUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Request-ID': `${requestId}-batch-${batchIndex + 1}`,
              'X-Batch-Processing': 'true',
              'X-Batch-Bulletproof': 'enabled'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });
          
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          if (response && response.ok) {
            try {
              const data = await response.json();
              
              if (data && data.ok && data.metrics && typeof data.metrics === 'object') {
                // Safely merge results
                try {
                  Object.assign(allResults, data.metrics);
                  
                  // Count successes and errors safely
                  const metricsEntries = Object.values(data.metrics);
                  if (Array.isArray(metricsEntries)) {
                    metricsEntries.forEach((result: any) => {
                      if (result && typeof result === 'object' && result.ok) {
                        successCount++;
                      } else {
                        errorCount++;
                      }
                    });
                  }
                  
                  console.log(`[METRICS-BATCH-${requestId}] ✅ Lote ${batchIndex + 1} processado: ${Object.keys(data.metrics).length} métricas`);
                  
                  // Safe intermediate state update
                  try {
                    setBatchResults({ ...allResults });
                  } catch (stateError) {
                    console.warn(`[METRICS-BATCH-${requestId}] State update warning:`, stateError);
                  }
                  
                } catch (mergeError) {
                  console.error(`[METRICS-BATCH-${requestId}] Error merging results:`, mergeError);
                  errorCount += batch.length;
                }
              } else {
                console.warn(`[METRICS-BATCH-${requestId}] ⚠️ Lote ${batchIndex + 1} sem dados válidos`);
                errorCount += batch.length;
              }
            } catch (jsonError) {
              console.error(`[METRICS-BATCH-${requestId}] JSON parse error:`, jsonError);
              errorCount += batch.length;
            }
          } else {
            const status = response?.status || 'unknown';
            console.error(`[METRICS-BATCH-${requestId}] ❌ Lote ${batchIndex + 1} falhou: HTTP ${status}`);
            errorCount += batch.length;
          }
          
          // Safe pause between batches
          if (batchIndex < batches.length - 1 && !hasError) {
            try {
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (pauseError) {
              console.warn(`[METRICS-BATCH-${requestId}] Pause error:`, pauseError);
            }
          }
          
        } catch (batchError: any) {
          // Check if error is due to cancellation - if so, break gracefully
          if (batchError?.name === 'AbortError' || operationCancelled || batchAbortController.signal.aborted) {
            console.log(`[METRICS-BATCH-${requestId}] Batch ${batchIndex + 1} was cancelled gracefully`);
            break;
          }
          
          console.error(`[METRICS-BATCH-${requestId}] ❌ Erro no lote ${batchIndex + 1}:`, batchError);
          errorCount += batch.length;
          
          // Safe error marking for batch ads (only if not cancelled)
          if (!operationCancelled && !batchAbortController.signal.aborted) {
            try {
              for (const adId of batch) {
                if (adId && typeof adId === 'string') {
                  allResults[adId] = {
                    ok: false,
                    error: 'Erro no processamento deste lote',
                    batch_error: true,
                    error_type: batchError?.name || 'UnknownError'
                  };
                }
              }
            } catch (markingError) {
              console.error(`[METRICS-BATCH-${requestId}] Error marking failed ads:`, markingError);
            }
          }
        } finally {
          // Always cleanup batch resources
          try {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            controller = null;
          } catch (cleanupError) {
            console.warn(`[METRICS-BATCH-${requestId}] Batch cleanup warning:`, cleanupError);
          }
        }
      }
      
      // Clear global timeout since we completed normally
      if (globalTimeoutId) {
        clearTimeout(globalTimeoutId);
      }
      
      // Check final cancellation state
      if (operationCancelled || batchAbortController.signal.aborted) {
        console.log(`[METRICS-BATCH-${requestId}] 🛑 Operation was cancelled - skipping result updates`);
        safeBulletproofCleanup();
        return;
      }
      
      // Finalizar progresso
      setBatchProgress({ current: batches.length, total: batches.length, processing: false });
      
      console.log(`[METRICS-BATCH-${requestId}] 🏁 PROCESSAMENTO COMPLETO: ${successCount} sucessos, ${errorCount} erros`);
      
      // Aplicar resultados finais (only if not cancelled)
      if (!operationCancelled && !batchAbortController.signal.aborted) {
        setMetrics(allResults);
        setShowMetrics(true);
        setSelectedAdsExpanded(false);
        
        // Mostrar resumo do processamento
        if (errorCount > 0 && successCount > 0) {
          setMetricsError(`⚠️ Processamento parcial: ${successCount} métricas carregadas, ${errorCount} falharam. Dados disponíveis para visualização.`);
        } else if (errorCount === totalAds) {
          setMetricsError(`❌ Falha completa: Não foi possível carregar métricas para nenhum anúncio. Tente novamente com menos anúncios.`);
        }
      }
      
    } catch (error: any) {
      // Clear global timeout on error
      if (globalTimeoutId) {
        clearTimeout(globalTimeoutId);
      }
      
      // Don't show errors if operation was cancelled
      if (error?.name === 'AbortError' || operationCancelled || batchAbortController.signal.aborted) {
        console.log(`[METRICS-BATCH-${requestId}] 🛑 Operation was cancelled - no error display needed`);
        safeBulletproofCleanup();
        return;
      }
      
      console.error(`[METRICS-BATCH-${requestId}] ❌ ERRO CRÍTICO:`, error);
      
      try {
        let userError = 'Erro crítico no processamento de métricas';
        if (error?.message?.includes('Failed to fetch')) {
          userError = '🌐 Problema de conexão. Verifique sua internet e tente novamente.';
        } else if (error?.message?.includes('timeout')) {
          userError = `⏱️ Sistema sobrecarregado. Tente com menos anúncios (recomendado: máximo 50 por vez).`;
        } else if (error?.name === 'AbortError') {
          userError = '⏹️ Operação cancelada.';
        } else if (error?.message?.includes('network')) {
          userError = '📡 Erro de rede. Verifique sua conexão.';
        }
        
        safeSetError(userError);
      } catch (errorHandlingError) {
        console.error(`[METRICS-BATCH-${requestId}] Error in error handling:`, errorHandlingError);
      }
      
    } finally {
      // Final bulletproof cleanup
      safeBulletproofCleanup();
      console.log(`[METRICS-BATCH-${requestId}] ==================== SISTEMA BULLETPROOF FINALIZADO ====================`);
    }
  };

  // Scroll functions
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  // Fixed filtering logic
  const filteredAds = ads.filter(ad => {
    try {
      // Search filter
      const matchesSearch = !searchTerm || 
        ad.ad_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.ad_id.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Optimization goal filter - Compare by translated values
      let matchesOptimizationGoal = true;
      if (selectedOptimizationGoal && selectedOptimizationGoal.trim() !== '') {
        const adGoal = ad.adset_optimization_goal || '';
        
        // Get the translated value for this ad's goal
        const translatedAdGoal = OPTIMIZATION_GOALS_PT[adGoal?.toUpperCase() || ''] || 
                                OPTIMIZATION_GOALS_PT[adGoal || ''] || 
                                adGoal;
        
        // Compare translated values
        matchesOptimizationGoal = translatedAdGoal === selectedOptimizationGoal;
      }
      
      // Objective filter
      let matchesObjective = true;
      if (selectedObjective && selectedObjective.trim() !== '') {
        const adObjective = ad.objective || '';
        matchesObjective = adObjective === selectedObjective ||
                          adObjective.toUpperCase() === selectedObjective.toUpperCase();
      }
      
      return matchesSearch && matchesOptimizationGoal && matchesObjective;
    } catch (error) {
      console.error('Filter error for ad:', ad.ad_id, error);
      return false;
    }
  });

  

  // Global cleanup controller for all async operations
  const [globalAbortController, setGlobalAbortController] = useState<AbortController | null>(null);

  // Master cleanup function to prevent "Preview failed" errors
  const masterCleanup = () => {
    try {
      // Cancel all pending fetch requests
      if (globalAbortController) {
        globalAbortController.abort();
        setGlobalAbortController(null);
      }
      
      // Reset all loading states safely
      setMetricsLoading(false);
      setBatchProgress({ current: 0, total: 0, processing: false });
      setUpdatingAll(false);
      setLoading(false);
      
      // Clear all error states
      setMetricsError(null);
      setError(null);
      
      console.log('[MASTER-CLEANUP] All async operations cleaned up successfully');
    } catch (error) {
      console.warn('[MASTER-CLEANUP] Error during cleanup:', error);
    }
  };

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      masterCleanup();
    };
  }, []);

  // Auto-update metrics when days selection changes with ROBUST error protection
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let abortController: AbortController | null = null;
    
    try {
      // Only auto-update if we're currently showing metrics and have selected ads
      if (showMetrics && selectedAds.size > 0 && selectedAccount && slug) {
        console.log('[METRICS-AUTO-UPDATE] Setting up auto-update for', metricsDays, 'days');
        
        // Create new abort controller for this operation
        abortController = new AbortController();
        setGlobalAbortController(abortController);
        
        // Add delay to prevent rapid successive calls
        timeoutId = setTimeout(async () => {
          try {
            if (abortController?.signal.aborted) {
              console.log('[METRICS-AUTO-UPDATE] Operation was cancelled before starting');
              return;
            }
            
            console.log('[METRICS-AUTO-UPDATE] Starting protected auto-update');
            await fetchMetricsData();
            console.log('[METRICS-AUTO-UPDATE] Auto-update completed successfully');
          } catch (error: any) {
            // Only set error if operation wasn't cancelled
            if (error?.name !== 'AbortError' && !abortController?.signal.aborted) {
              console.error('[METRICS-AUTO-UPDATE] Error during auto-update:', error);
              setMetricsError('Erro ao atualizar métricas automaticamente. Tente recarregar manualmente.');
            } else {
              console.log('[METRICS-AUTO-UPDATE] Operation was cancelled - no error needed');
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('[METRICS-AUTO-UPDATE] Setup error:', error);
    }
    
    // Cleanup function
    return () => {
      try {
        console.log('[METRICS-AUTO-UPDATE] Cleaning up auto-update');
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (abortController && !abortController.signal.aborted) {
          abortController.abort();
          console.log('[METRICS-AUTO-UPDATE] Cancelled pending operation');
        }
      } catch (cleanupError) {
        console.warn('[METRICS-AUTO-UPDATE] Cleanup error:', cleanupError);
      }
    };
  }, [metricsDays]);

  // Get unique values for filters
  const uniqueOptimizationGoals = [...new Set(ads.map(ad => {
    const goal = ad.adset_optimization_goal || '';
    if (!goal) return null;
    
    const translatedGoal = OPTIMIZATION_GOALS_PT[goal?.toUpperCase() || ''] || 
                          OPTIMIZATION_GOALS_PT[goal || ''] || 
                          goal;
    
    return translatedGoal;
  }).filter(Boolean))].sort();
  
  const uniqueObjectives = [...new Set(ads.map(ad => ad.objective).filter(Boolean))].sort();
  
  

  

  const formatMetricValue = (value: any, type: string) => {
    if (value === null || value === undefined || value === 0) return '-';
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'number':
        return new Intl.NumberFormat('pt-BR').format(Math.round(value));
      default:
        return value.toString();
    }
  };

  // Sorting logic for metrics
  const sortedMetrics = () => {
    if (!sortBy || !showMetrics) return Object.entries(metrics);
    
    return Object.entries(metrics).sort((a, b) => {
      const [, dataA] = a;
      const [, dataB] = b;
      
      if (!dataA.ok || !dataB.ok) return 0;
      
      let valueA = dataA.metrics?.[sortBy] || 0;
      let valueB = dataB.metrics?.[sortBy] || 0;
      
      if (sortOrder === 'asc') {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });
  };

  // Filter metrics by value ranges
  const filteredMetrics = () => {
    const sorted = sortedMetrics();
    
    return sorted.filter(([, data]) => {
      if (!data.ok || !data.metrics) return true;
      
      for (const [metric, filter] of Object.entries(metricFilters)) {
        const value = data.metrics[metric];
        if (value === undefined || value === null) continue;
        
        if (filter.min !== undefined && value < filter.min) return false;
        if (filter.max !== undefined && value > filter.max) return false;
      }
      
      return true;
    });
  };

  const handleSortMetric = (metric: string) => {
    if (sortBy === metric) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(metric);
      setSortOrder('desc');
    }
  };

  const updateMetricFilter = (metric: string, type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setMetricFilters(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [type]: numValue
      }
    }));
  };

  // Function to remove an ad from selection (for metrics view)
  const removeAdFromMetrics = (adId: string) => {
    const newSelected = new Set(selectedAds);
    newSelected.delete(adId);
    setSelectedAds(newSelected);
    
    // If no ads left, close metrics view
    if (newSelected.size === 0) {
      setShowMetrics(false);
      setMetrics({});
    } else {
      // Refresh metrics with remaining ads
      fetchMetricsData();
    }
  };

  // Function to clear all selected ads (for metrics view)
  const clearAllMetricsSelection = () => {
    setSelectedAds(new Set());
    setShowMetrics(false);
    setMetrics({});
    setSelectedAdsExpanded(false); // Keep minimized by default
    setCheckedAdsInMetrics(new Set());
  };

  // Handle checking/unchecking ads in metrics view
  const toggleAdCheckInMetrics = (adId: string) => {
    const newChecked = new Set(checkedAdsInMetrics);
    if (newChecked.has(adId)) {
      newChecked.delete(adId);
    } else {
      newChecked.add(adId);
    }
    setCheckedAdsInMetrics(newChecked);
  };

  // Select all visible ads in metrics
  const selectAllVisibleInMetrics = () => {
    const visibleMetricsAdIds = filteredMetrics().map(([adId]) => adId);
    if (visibleMetricsAdIds.length === checkedAdsInMetrics.size && 
        visibleMetricsAdIds.every(id => checkedAdsInMetrics.has(id))) {
      setCheckedAdsInMetrics(new Set());
    } else {
      setCheckedAdsInMetrics(new Set(visibleMetricsAdIds));
    }
  };

  // Available metrics columns - filtered by user permissions
  const availableColumns = [
    { id: 'spend', name: 'Gasto', alwaysVisible: false },
    { id: 'impressions', name: 'Impressões', alwaysVisible: false },
    { id: 'link_clicks', name: 'Cliques', alwaysVisible: false },
    { id: 'ctr', name: 'CTR', alwaysVisible: false },
    { id: 'cost_per_link_click', name: 'CPC', alwaysVisible: false },
    { id: 'cpm', name: 'CPM', alwaysVisible: false },
    { id: 'landing_page_views', name: 'LPVs', alwaysVisible: false },
    { id: 'cpa', name: 'CPA', alwaysVisible: false },
    { id: 'results', name: 'Resultados', alwaysVisible: false },
    { id: 'revenue', name: 'Valor Conv.', alwaysVisible: false },
    { id: 'roas', name: 'ROAS', alwaysVisible: false }
  ].filter(column => {
    const hasPermission = userMetricPermissions.has(column.id);
    console.log(`[AVAILABLE-COLUMNS] Column ${column.id}: permission=${hasPermission}`);
    return hasPermission;
  });
  
  console.log(`[AVAILABLE-COLUMNS] Total available columns:`, availableColumns.length);

  const toggleColumnVisibility = (columnId: string) => {
    // Only allow toggling if user has permission for this column
    if (!userMetricPermissions.has(columnId)) {
      console.log(`[COLUMN-TOGGLE] Permission denied for column: ${columnId}`);
      return;
    }
    
    console.log(`[COLUMN-TOGGLE] Toggling column: ${columnId}`);
    
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(columnId)) {
      newVisible.delete(columnId);
      console.log(`[COLUMN-TOGGLE] Removed column: ${columnId}`);
    } else {
      newVisible.add(columnId);
      console.log(`[COLUMN-TOGGLE] Added column: ${columnId}`);
    }
    
    console.log(`[COLUMN-TOGGLE] New visible columns:`, Array.from(newVisible));
    setVisibleColumns(newVisible);
  };

  // Show loading while authenticating or initializing
  if (authLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Ensure user is available before rendering
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Show loading for initial data fetch (only when has slug)
  if (loading && !error && slug && client === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  // Show error if any (only when has slug and error occurred)
  if (error && !loading && !authLoading && slug) {
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
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin mode with integrated client selection (when no slug)
  if (!slug && isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 w-full overflow-x-hidden">
        {/* Header */}
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
              <span className="text-slate-900 font-medium">
                {isCreativesPage ? 'Criativos Ativos' : 'Anúncios Ativos'}
              </span>
            </div>
          </div>
        </div>

        <main className={`max-w-7xl mx-auto px-4 lg:px-8 py-8 transition-all duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
          {/* Simplified Client Selector */}
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Selecionar Cliente
              </h2>
              <div className="max-w-md">
                {user && (
                  <ClientPlatformSelector
                    onSelect={(clientSlug) => {
                      // Redirecionar direto para o cliente (sem filtro de plataforma)
                      window.location.href = `/c/${clientSlug}/ads/active`;
                    }}
                    selectedClient={selectedClientSlug}
                    selectedPlatform={selectedPlatform}
                  />
                )}
              </div>
              <p className="text-sm text-slate-500 mt-3">
                💡 Após selecionar o cliente, você poderá escolher as contas de anúncios na próxima tela
              </p>
            </div>
          </div>

          {/* Welcome message */}
          <div className="text-center py-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Bem-vindo aos Anúncios Ativos
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Selecione um cliente acima para visualizar e gerenciar anúncios ativos. 
              O sistema carrega dados salvos localmente para máxima velocidade.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="text-2xl mb-2">⚡</div>
                <div className="font-medium text-slate-800">Ultra Rápido</div>
                <div className="text-slate-600">Dados do banco local</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="text-2xl mb-2">🔄</div>
                <div className="font-medium text-slate-800">Auto Sync</div>
                <div className="text-slate-600">Atualiza às 7h e 19h</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium text-slate-800">Métricas</div>
                <div className="text-slate-600">Histórico completo</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main render for client mode (ensure user exists)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Main render for client mode
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header with Navigation */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
                    <span className="text-slate-900 font-medium">
                      {isCreativesPage ? 'Criativos Ativos' : 'Anúncios Ativos'}
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
                      <span>Dashboard</span>
                    </button>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-900 font-medium">
                      {isCreativesPage ? 'Criativos Ativos' : 'Anúncios Ativos'}
                    </span>
                  </>
                );
              }
            })()}
            
            <div className="flex items-center space-x-3">
              {selectedAccount && user?.user_type === 'admin' && (
                <>
                  {(() => {
                    const syncStatus = getLastSyncStatus();
                    return (
                      <div className="relative group">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            console.log('[UPDATE-BUTTON] Clicked, current state:', { 
                              updatingAll, 
                              loading,
                              selectedAccount: selectedAccount?.account_name,
                              slug
                            });
                            
                            // Only proceed if not already in progress
                            if (!updatingAll && !loading) {
                              try {
                                handleUpdateAll();
                              } catch (error) {
                                console.error('[UPDATE-BUTTON] Error calling handleUpdateAll:', error);
                              }
                            }
                          }}
                          disabled={updatingAll || loading}
                          className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            !updatingAll && !loading
                              ? syncStatus.isAutoSynced 
                                ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                              : 'bg-gray-400 text-white cursor-not-allowed'
                          }`}
                          title={syncStatus.message || 'Atualizar dados dos anúncios'}
                        >
                          {updatingAll ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                              {syncStep && (
                                <div className="text-xs text-white opacity-90">
                                  {syncStep}
                                </div>
                              )}
                            </>
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          <span>
                            {updatingAll 
                              ? `Sincronizando... ${syncTimeRemaining > 0 ? `${syncTimeRemaining}s` : ''}` 
                              : loading
                                ? 'Aguarde...'
                                : syncStatus.isAutoSynced 
                                  ? 'Forçar Atualização'
                                  : 'Atualizar Anúncios'
                            }
                          </span>
                        </button>
                        
                        {syncStatus.message && !updatingAll && !loading && (
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-black text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 max-w-xs">
                            {syncStatus.message}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black"></div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        

        {/* Ad Account Selector - Always show when we have a client */}
        {slug && (
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="mb-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Conta de Anúncios
                </h2>
              </div>
              
              <AdAccountSelector
                clientSlug={slug}
                selectedAccount={selectedAccount}
                onAccountSelect={handleAccountSelect}
                onManageAccounts={() => setShowAccountManager(true)}
                hideManageButton={false}
                isSyncing={updatingAll}
                syncingMessage={updatingAll ? syncStep : ""}
              />
            </div>
          </div>
        )}

        {/* Enhanced Account Status Info - Moved here */}
        {selectedAccount && !loading && (
          <div className={`mb-6 rounded-lg p-3 text-sm border ${
            selectedAccount.sync_status === 'success' ? 'bg-green-50 border-green-200' :
            selectedAccount.sync_status === 'error' ? 'bg-red-50 border-red-200' :
            selectedAccount.sync_status === 'syncing' ? 'bg-blue-50 border-blue-200' :
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className={`font-medium ${
                selectedAccount.sync_status === 'success' ? 'text-green-800' :
                selectedAccount.sync_status === 'error' ? 'text-red-800' :
                selectedAccount.sync_status === 'syncing' ? 'text-blue-800' :
                'text-yellow-800'
              }`}>
                📊 Status: {selectedAccount.account_name}
              </h4>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedAccount.sync_status === 'success' ? 'bg-green-100 text-green-800' :
                  selectedAccount.sync_status === 'error' ? 'bg-red-100 text-red-800' :
                  selectedAccount.sync_status === 'syncing' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedAccount.sync_status === 'success' ? '✅ Sincronizado' :
                   selectedAccount.sync_status === 'error' ? '❌ Erro' :
                   selectedAccount.sync_status === 'syncing' ? '🔄 Sincronizando' :
                   '⏳ Pendente'}
                </span>
                
                {lastSyncTime && (
                  <span className="text-xs text-gray-600">
                    🕐 {formatTimestamp(lastSyncTime)}
                  </span>
                )}
              </div>
            </div>
            
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 text-xs ${
              selectedAccount.sync_status === 'success' ? 'text-green-700' :
              selectedAccount.sync_status === 'error' ? 'text-red-700' :
              selectedAccount.sync_status === 'syncing' ? 'text-blue-700' :
              'text-yellow-700'
            }`}>
              <div>
                <span className="font-medium">📈 Anúncios:</span> {filteredAds.length} de {ads.length} visíveis
              </div>
              <div>
                <span className="font-medium">🔗 Plataforma:</span> {selectedAccount.platform.toUpperCase()}
              </div>
              <div>
                <span className="font-medium">🤖 Sistema:</span> Sincronização Automática 2x/dia
              </div>
            </div>
            
            {selectedAccount.sync_status === 'error' && selectedAccount.sync_error && (
              <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                <strong>Erro:</strong> {selectedAccount.sync_error}
              </div>
            )}
          </div>
        )}

        {/* SYNC LOADING STATE - Moved right below status */}
        {(loading || updatingAll) && !error && selectedAccount && (
          <div className="mb-6 text-center py-8 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {updatingAll ? 'Sincronizando Anúncios' : 'Carregando Anúncios'}
            </h3>
            
            {updatingAll && syncStep && (
              <p className="text-blue-600 font-medium mb-2 text-sm">{syncStep}</p>
            )}
            
            <p className="text-slate-600 mb-4 text-sm">
              {selectedAccount?.account_name} • {selectedAccount?.platform?.toUpperCase()}
            </p>
            
            {/* Simple Progress Bar */}
            {updatingAll && (
              <div className="max-w-sm mx-auto mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Progresso</span>
                  <span>{Math.round(syncProgress)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${syncProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Time Remaining */}
            {updatingAll && syncTimeRemaining > 0 && (
              <div className="text-xs text-slate-600 mb-2">
                <span>Tempo restante: {Math.floor(syncTimeRemaining / 60)}m {syncTimeRemaining % 60}s</span>
              </div>
            )}
            
            <p className="text-xs text-slate-500">
              {updatingAll 
                ? '🔄 Buscando anúncios da plataforma' 
                : '📊 Carregando dados do banco'
              }
            </p>
          </div>
        )}

        {/* Ads Count Summary - Compact */}
        {filteredAds.length > 0 && !showMetrics && (
          <div className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-baseline space-x-2 mb-1">
                  <h3 className="text-lg font-bold">{filteredAds.length}</h3>
                  <span className="text-blue-100 text-sm">de {ads.length}</span>
                </div>
                <p className="text-blue-100 text-xs">
                  {isCreativesPage ? 'Criativos' : 'Anúncios'} Encontrados
                </p>
                
                {lastSyncTime && (
                  <p className="text-blue-200 text-xs mt-1">
                    Última sincronização: {formatTimestamp(lastSyncTime)}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        )}

        

        {/* Filters - MOVED ABOVE ADS BLOCK */}
        {filteredAds.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-5 h-5 text-slate-400" />
              <h3 className="font-medium text-slate-900">Filtros</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Buscar
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do anúncio ou ID..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Meta do Criativo
                </label>
                <select
                  value={selectedOptimizationGoal || ''}
                  onChange={(e) => setSelectedOptimizationGoal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas as metas</option>
                  {uniqueOptimizationGoals.map(translatedGoal => (
                    <option key={translatedGoal || ''} value={translatedGoal || ''}>
                      {translatedGoal}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Objetivo
                </label>
                <select
                  value={selectedObjective || ''}
                  onChange={(e) => setSelectedObjective(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os objetivos</option>
                  {uniqueObjectives.map(objective => (
                    <option key={objective} value={objective}>
                      {OBJECTIVES_PT[objective?.toUpperCase() || ''] || 
                       OBJECTIVES_PT[objective || ''] || 
                       objective}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Ads Management Section */}
        {filteredAds.length > 0 && !showMetrics && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200">
            {/* Header with expand/collapse */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setAdsExpanded(!adsExpanded)}
                    className="flex items-center space-x-2 text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    {adsExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                    <h3 className="text-lg font-semibold">
                      Anúncios ({filteredAds.length})
                    </h3>
                  </button>
                  
                  {/* Active Filters Display */}
                  {(searchTerm || selectedOptimizationGoal || selectedObjective) && (
                    <div className="flex flex-wrap gap-1">
                      {searchTerm && (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          🔍 "{searchTerm}"
                        </span>
                      )}
                      {selectedOptimizationGoal && (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          🎯 {selectedOptimizationGoal}
                        </span>
                      )}
                      {selectedObjective && (
                        <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          📈 {OBJECTIVES_PT[selectedObjective?.toUpperCase() || ''] || OBJECTIVES_PT[selectedObjective || ''] || selectedObjective}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setAdsExpanded(!adsExpanded)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 font-medium rounded-md border border-blue-200 hover:border-blue-300 transition-all duration-200 hover:scale-105 text-sm"
                >
                  {adsExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimizar</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expandir</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selection Tools - Always visible */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={selectAllVisible}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                  >
                    {filteredAds.length === selectedAds.size && 
                     filteredAds.every(ad => selectedAds.has(ad.ad_id)) ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">
                      {selectedAds.size > 0 ? `${selectedAds.size} selecionados` : 'Selecionar todos'}
                    </span>
                  </button>
                  
                  {/* Warning for large selections */}
                  {selectedAds.size > 50 && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                      <span>⚠️</span>
                      <span>Muitos anúncios - métricas podem demorar</span>
                    </div>
                  )}
                  
                  {selectedAds.size > 100 && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                      <span>🚨</span>
                      <span>Recomendado: menos de 50 anúncios</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {selectedAds.size > 0 && (
                    <>
                      <button
                        onClick={() => setShowSelectionCreator(true)}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <Save className="w-4 h-4" />
                        <span>Criar Seleção</span>
                      </button>

                      <button
                        onClick={fetchMetricsData}
                        disabled={metricsLoading || batchProgress.processing}
                        className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 text-sm transition-all duration-200"
                        title={selectedAds.size > 100 ? `⚡ ${selectedAds.size} anúncios - processamento em lotes inteligentes` : selectedAds.size > 50 ? `⚠️ ${selectedAds.size} anúncios selecionados - pode levar alguns minutos` : undefined}
                      >
                        {(metricsLoading || batchProgress.processing) ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            <div className="flex items-center space-x-1">
                              {batchProgress.processing ? (
                                <span>Lote {batchProgress.current + 1}/{batchProgress.total}</span>
                              ) : (
                                <>
                                  <span>Consultando banco</span>
                                  <div className="flex space-x-1">
                                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                  </div>
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <BarChart3 className="w-4 h-4" />
                        )}
                        {!metricsLoading && !batchProgress.processing && (
                          <span>
                            {selectedAds.size > 100
                              ? `Ver Métricas (${selectedAds.size} - Lotes)`
                              : selectedAds.size > 50 
                              ? `Ver Métricas (${selectedAds.size})`
                              : 'Ver Métricas'
                            }
                          </span>
                        )}
                      </button>

                      <div className="relative group">
                        <select
                          value={metricsDays}
                          onChange={(e) => {
                            const newDays = Number(e.target.value) as 7 | 14 | 30;
                            setMetricsDays(newDays);
                            // Show loading indicator while updating
                            if (showMetrics && selectedAds.size > 0) {
                              setMetricsLoading(true);
                            }
                          }}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={7}>Últimos 7 dias</option>
                          <option value={14}>Últimos 14 dias</option>
                          <option value={30}>Últimos 30 dias</option>
                        </select>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {(() => {
                            // DEFINITIVO: Calcular exatamente os últimos N dias
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            
                            // Data final: ONTEM (último dia completo)
                            const endDate = new Date(today);
                            endDate.setDate(today.getDate() - 1);
                            
                            // Data inicial: N dias antes de ontem
                            // Para 7 dias: se ontem=24, então início=24-6=18. Dias: 18,19,20,21,22,23,24 = 7 dias
                            const startDate = new Date(endDate);
                            startDate.setDate(endDate.getDate() - (metricsDays - 1));
                            
                            const startStr = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                            const endStr = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                            
                            // Verificação dos dias
                            const diffTime = endDate.getTime() - startDate.getTime();
                            const actualDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            
                            console.log(`[TOOLTIP-DEFINITIVO] Período: ${startStr} até ${endStr}`, {
                              hoje: today.getDate(),
                              ontem: endDate.getDate(),
                              inicio: startDate.getDate(),
                              diasSelecionados: metricsDays,
                              diasCalculados: actualDays,
                              correto: actualDays === metricsDays ? '✅' : '❌'
                            });
                            
                            return `Período: ${startStr} até ${endStr} (exatos ${metricsDays} dias)`;
                          })()}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Ads List - Only show when expanded */}
            {adsExpanded && (
              <div className="divide-y divide-slate-200">
                {filteredAds.map((ad) => (
                  <div
                    key={ad.ad_id}
                    className={`p-6 hover:bg-slate-50 transition-colors duration-200 ${
                      selectedAds.has(ad.ad_id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleAdSelection(ad.ad_id)}
                        className="flex-shrink-0"
                      >
                        {selectedAds.has(ad.ad_id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 hover:text-blue-600" />
                        )}
                      </button>

                      {ad.creative_thumb && (
                        <img
                          src={ad.creative_thumb}
                          alt="Creative"
                          className="w-16 h-16 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                        />
                      )}

                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">
                          {ad.ad_name || `Anúncio ${ad.ad_id}`}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600">
                          <div>
                            <span className="font-medium">Meta:</span> {ad.adset_optimization_goal ? (
                              OPTIMIZATION_GOALS_PT[ad.adset_optimization_goal?.toUpperCase()] || 
                              OPTIMIZATION_GOALS_PT[ad.adset_optimization_goal] || 
                              ad.adset_optimization_goal
                            ) : 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Objetivo:</span> {ad.objective ? (
                              OBJECTIVES_PT[ad.objective?.toUpperCase()] || 
                              OBJECTIVES_PT[ad.objective] || 
                              ad.objective
                            ) : 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">ID:</span> {ad.ad_id}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            ad.effective_status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {ad.effective_status === 'ACTIVE' ? 'Ativo' : ad.effective_status}
                          </span>
                          {ad.creative_id && (
                            <span className="text-xs text-slate-500">
                              Creative ID: {ad.creative_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Minimized state with creative thumbnails - SMALLER IMAGES */}
            {!adsExpanded && (
              <div className="p-6">
                <div className="text-center mb-4">
                  <Target className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600 mb-3">
                    {filteredAds.length} anúncios encontrados. Visualize miniaturas abaixo.
                  </p>
                  <button
                    onClick={() => setAdsExpanded(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Expandir Lista de Anúncios
                  </button>
                </div>

                {/* Creative Thumbnails Grid - VERY SMALL in a single line */}
                <div className="flex flex-wrap justify-center items-center gap-1 max-w-5xl mx-auto overflow-x-auto pb-2">
                  {filteredAds.slice(0, 40).map((ad) => (
                    <div
                      key={ad.ad_id}
                      className="relative group cursor-pointer flex-shrink-0"
                      title={ad.ad_name || `Anúncio ${ad.ad_id}`}
                      onClick={() => setAdsExpanded(true)}
                    >
                      {ad.creative_thumb ? (
                        <img
                          src={ad.creative_thumb}
                          alt="Creative"
                          className="w-8 h-8 rounded object-cover bg-slate-100 border border-slate-200 group-hover:border-blue-400 transition-colors group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded border border-slate-200 group-hover:border-blue-400 flex items-center justify-center transition-colors group-hover:scale-110">
                          <span className="text-slate-400 text-xs">📱</span>
                        </div>
                      )}
                      {selectedAds.has(ad.ad_id) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs leading-none">✓</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredAds.length > 40 && (
                    <div 
                      className="w-12 h-8 bg-slate-100 rounded border border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors flex-shrink-0"
                      onClick={() => setAdsExpanded(true)}
                    >
                      <div className="text-center">
                        <span className="text-slate-600 text-xs font-medium">+{filteredAds.length - 40}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions for Minimized View */}
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center space-x-2 text-sm text-slate-600">
                    <span>💡 Dica:</span>
                    <span>Use os filtros acima para refinar a busca antes de expandir</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scroll Navigation */}
        {filteredAds.length > 10 && (
          <div className="fixed bottom-6 right-6 flex flex-col space-y-2 z-40">
            <button
              onClick={scrollToTop}
              className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              title="Ir para o topo"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              onClick={scrollToBottom}
              className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              title="Ir para o final"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Debug info for filter issues */}
        {!loading && ads.length > 0 && filteredAds.length === 0 && !showMetrics && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Filter className="w-4 h-4 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-yellow-800">Nenhum anúncio encontrado</h3>
            </div>
            <div className="text-sm mb-4 space-y-1">
              <p><strong>Total de anúncios:</strong> {ads.length}</p>
              <p><strong>Após filtros:</strong> {filteredAds.length}</p>
              {searchTerm && (
                <p><strong>Busca:</strong> "{searchTerm}"</p>
              )}
              {selectedOptimizationGoal && (
                <div>
                  <p><strong>Meta selecionada:</strong> {selectedOptimizationGoal}</p>
                  <p><strong>Anúncios com esta meta:</strong> {ads.filter(ad => 
                    ad.adset_optimization_goal === selectedOptimizationGoal ||
                    ad.adset_optimization_goal?.toUpperCase() === selectedOptimizationGoal.toUpperCase()
                  ).length}</p>
                </div>
              )}
              {selectedObjective && (
                <p><strong>Objetivo selecionado:</strong> {selectedObjective}</p>
              )}
            </div>
            
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedOptimizationGoal('');
                setSelectedObjective('');
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}

        

        {/* Batch Progress Display */}
        {batchProgress.processing && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-1">
                  Processamento em Lotes - Alto Volume
                </h3>
                <p className="text-blue-700 text-sm">
                  Processando {selectedAds.size} anúncios em lotes inteligentes para melhor performance
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Lote {batchProgress.current + 1} de {batchProgress.total}</span>
                <span>{Math.round(((batchProgress.current + 1) / batchProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((batchProgress.current + 1) / batchProgress.total) * 100}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-blue-700">Processados: {Object.keys(batchResults).filter(k => batchResults[k]?.ok).length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  <span className="text-blue-700">Em andamento...</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-slate-300 rounded-full"></span>
                  <span className="text-blue-700">Restantes: {selectedAds.size - Object.keys(batchResults).length}</span>
                </div>
              </div>
              <div className="text-xs text-blue-600 text-center">
                💡 Sistema otimizado para alto volume - processamento pode levar alguns minutos
              </div>
            </div>
          </div>
        )}

        {/* Metrics Error Display */}
        {metricsError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-1">
                  {metricsError.includes('Processamento parcial') ? 'Processamento Parcial' : 'Erro ao Carregar Métricas'}
                </h3>
                <p className="text-red-700 text-sm">
                  {metricsError}
                </p>
              </div>
              <button
                onClick={() => setMetricsError(null)}
                className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"
                title="Fechar erro"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setMetricsError(null);
                  fetchMetricsData();
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                disabled={batchProgress.processing}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tentar Novamente</span>
              </button>
              
              {selectedAds.size > 50 && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
                  <span>💡</span>
                  <span>Dica: Para {selectedAds.size} anúncios, considere usar lotes menores ou aguardar o processamento completo</span>
                </div>
              )}
              
              <button
                onClick={() => {
                  setMetricsError(null);
                  setShowMetrics(false);
                  setSelectedAds(new Set());
                }}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                disabled={batchProgress.processing}
              >
                Cancelar Métricas
              </button>
            </div>
          </div>
        )}

        {/* Metrics View */}
        {showMetrics && Object.keys(metrics).length > 0 && (
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Ads List - Sidebar flexível */}
            <div className="xl:w-80 xl:flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-4 max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Anúncios Selecionados ({selectedAds.size})
                    </h3>
                    <div className="flex items-center space-x-2">
                      {selectedAds.size > 6 && (
                        <button
                          onClick={() => setSelectedAdsExpanded(!selectedAdsExpanded)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                          title={selectedAdsExpanded ? "Minimizar lista" : "Expandir lista"}
                        >
                          {selectedAdsExpanded ? (
                            <>
                              <Minus className="w-4 h-4" />
                              <span>Minimizar</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>Expandir</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={clearAllMetricsSelection}
                        className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center space-x-1"
                        title="Limpar toda a seleção"
                      >
                        <X className="w-4 h-4" />
                        <span>Limpar Todos</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">Métricas dos últimos {metricsDays} dias</p>
                </div>
                
                {/* Compact view when minimized and many ads */}
                {!selectedAdsExpanded && selectedAds.size > 6 ? (
                  <div className="p-4">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-sm text-slate-600 mb-2">
                        <strong>{selectedAds.size} anúncios</strong> selecionados para análise
                      </div>
                      <div className="flex flex-wrap gap-1 justify-center mb-3">
                        {Array.from(selectedAds).slice(0, 8).map(adId => {
                          const ad = ads.find(a => a.ad_id === adId);
                          if (!ad) return null;
                          return (
                            <div
                              key={adId}
                              className="relative group"
                              title={ad.ad_name || `Anúncio ${ad.ad_id}`}
                            >
                              {ad.creative_thumb ? (
                                <img
                                  src={ad.creative_thumb}
                                  alt="Creative"
                                  className="w-6 h-6 rounded object-cover bg-slate-100"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                                  <span className="text-xs text-blue-600">📊</span>
                                </div>
                              )}
                              <button
                                onClick={() => removeAdFromMetrics(adId)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                        {selectedAds.size > 8 && (
                          <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-600">
                            +{selectedAds.size - 8}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedAdsExpanded(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Ver lista completa ↓
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 overflow-y-auto max-h-96">
                    {Array.from(selectedAds).map(adId => {
                      const ad = ads.find(a => a.ad_id === adId);
                      if (!ad) return null;
                      
                      return (
                        <div key={adId} className="p-3 hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center space-x-3">
                            {ad.creative_thumb && (
                              <img
                                src={ad.creative_thumb}
                                alt="Creative"
                                className="w-8 h-8 rounded-md object-cover bg-slate-100 flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-slate-900 truncate text-sm">
                                {ad.ad_name || `Anúncio ${ad.ad_id}`}
                              </h4>
                              <p className="text-xs text-slate-500 truncate font-mono">{ad.ad_id}</p>
                            </div>
                            <button
                              onClick={() => removeAdFromMetrics(adId)}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-all flex-shrink-0"
                              title="Remover da seleção"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Metrics Table - Área principal flexível */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Métricas ({metricsDays} dias) - {filteredMetrics().length} resultados
                      </h3>
                      {metricsLoading && (
                        <div className="flex items-center space-x-2 text-blue-600">
                          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          <span className="text-sm">Atualizando...</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <button
                          onClick={() => setShowColumnSelector(!showColumnSelector)}
                          className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                          title="Selecionar colunas visíveis"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Colunas ({visibleColumns.size})</span>
                          {showColumnSelector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        
                        {showColumnSelector && (
                          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-20 py-3">
                            <div className="px-4 pb-2 border-b border-slate-200">
                              <h4 className="font-medium text-slate-900 text-sm">Colunas Visíveis</h4>
                              <p className="text-xs text-slate-500 mt-1">Marque as métricas que deseja ver</p>
                            </div>
                            <div className="max-h-64 overflow-y-auto py-2">
                              {availableColumns.map(column => (
                                <label
                                  key={column.id}
                                  className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    console.log(`[COLUMN-CLICK] Clicked on column: ${column.id}`);
                                    toggleColumnVisibility(column.id);
                                  }}
                                >
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="checkbox"
                                      checked={visibleColumns.has(column.id)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        console.log(`[COLUMN-CHECKBOX] Checkbox changed for: ${column.id}, checked: ${e.target.checked}`);
                                        toggleColumnVisibility(column.id);
                                      }}
                                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">{column.name}</span>
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {visibleColumns.has(column.id) ? '✓' : '○'}
                                  </div>
                                </label>
                              ))}
                            </div>
                            <div className="px-4 pt-2 border-t border-slate-200 flex justify-between">
                              <button
                                onClick={() => {
                                  console.log('[COLUMN-SELECT-ALL] Selecting all columns');
                                  const allAllowed = new Set(availableColumns.map(c => c.id));
                                  console.log('[COLUMN-SELECT-ALL] All allowed:', Array.from(allAllowed));
                                  setVisibleColumns(allAllowed);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Todas
                              </button>
                              <button
                                onClick={() => {
                                  console.log('[COLUMN-SELECT-ESSENTIALS] Selecting essential columns');
                                  const essentials = ['spend', 'impressions', 'ctr', 'cpa'].filter(col => 
                                    availableColumns.some(ac => ac.id === col)
                                  );
                                  console.log('[COLUMN-SELECT-ESSENTIALS] Essentials:', essentials);
                                  setVisibleColumns(new Set(essentials));
                                }}
                                className="text-xs text-slate-600 hover:text-slate-700 font-medium"
                              >
                                Essenciais
                              </button>
                              <button
                                onClick={() => setShowColumnSelector(false)}
                                className="text-xs text-slate-500 hover:text-slate-700"
                              >
                                Fechar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setShowMetrics(false);
                          setSortBy('');
                          setMetricFilters({});
                          setCheckedAdsInMetrics(new Set());
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Selection Controls for Metrics */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={selectAllVisibleInMetrics}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        {filteredMetrics().length === checkedAdsInMetrics.size && 
                         filteredMetrics().every(([adId]) => checkedAdsInMetrics.has(adId)) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {checkedAdsInMetrics.size > 0 ? `${checkedAdsInMetrics.size} marcados` : 'Marcar todos visíveis'}
                        </span>
                      </button>
                      
                      {checkedAdsInMetrics.size > 0 && (
                        <span className="text-sm text-slate-600">
                          para criar nova seleção
                        </span>
                      )}
                    </div>

                    {checkedAdsInMetrics.size > 0 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCheckedAdsInMetrics(new Set())}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          Limpar marcações
                        </button>
                        <button
                          onClick={() => setShowMetricsSelectionCreator(true)}
                          className="flex items-center space-x-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          <Save className="w-4 h-4" />
                          <span>Criar Seleção ({checkedAdsInMetrics.size})</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metric Filters - Collapsible */}
                <div className="bg-slate-50 border-b border-slate-200">
                  <button
                    onClick={() => setShowMetricFilters(!showMetricFilters)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-slate-700">Filtros por Faixa de Valor</h4>
                      {Object.keys(metricFilters).some(key => metricFilters[key]?.min !== undefined || metricFilters[key]?.max !== undefined) && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          {Object.keys(metricFilters).filter(key => metricFilters[key]?.min !== undefined || metricFilters[key]?.max !== undefined).length} ativo{Object.keys(metricFilters).filter(key => metricFilters[key]?.min !== undefined || metricFilters[key]?.max !== undefined).length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {Object.keys(metricFilters).some(key => metricFilters[key]?.min !== undefined || metricFilters[key]?.max !== undefined) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMetricFilters({});
                          }}
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                        >
                          Limpar
                        </button>
                      )}
                      {showMetricFilters ? (
                        <Minus className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Plus className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>
                  
                  {showMetricFilters && (
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {['spend', 'impressions', 'link_clicks', 'ctr', 'cost_per_link_click', 'cpm', 'landing_page_views', 'cpa', 'results', 'revenue', 'roas'].map((metric) => (
                          <div key={metric} className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">
                              {metric === 'spend' ? 'Gasto' :
                               metric === 'impressions' ? 'Impressões' :
                               metric === 'link_clicks' ? 'Cliques no Link' :
                               metric === 'ctr' ? 'CTR (%)' :
                               metric === 'cost_per_link_click' ? 'CPC' :
                               metric === 'cpm' ? 'CPM' :
                               metric === 'landing_page_views' ? 'LPVs' :
                               metric === 'cpa' ? 'CPA' :
                               metric === 'results' ? 'Resultados' :
                               metric === 'revenue' ? 'Valor Conv.' :
                               metric === 'roas' ? 'ROAS' : metric}
                            </label>
                            <div className="flex space-x-1">
                              <input
                                type="number"
                                placeholder="Min"
                                value={metricFilters[metric]?.min || ''}
                                onChange={(e) => updateMetricFilter(metric, 'min', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                placeholder="Max"
                                value={metricFilters[metric]?.max || ''}
                                onChange={(e) => updateMetricFilter(metric, 'max', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="overflow-x-auto max-h-[70vh] relative w-full">
                  <table className="w-full min-w-full table-auto">
                    <thead className="sticky top-0 z-10 bg-white shadow-sm">
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-700 w-8 bg-white">
                          <button
                            onClick={selectAllVisibleInMetrics}
                            className="flex items-center justify-center w-full"
                          >
                            {filteredMetrics().length === checkedAdsInMetrics.size && 
                             filteredMetrics().every(([adId]) => checkedAdsInMetrics.has(adId)) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-slate-700 min-w-[160px] bg-white">Anúncio</th>
                        {visibleColumns.has('spend') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('spend')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>Gasto</span>
                              {sortBy === 'spend' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                        {visibleColumns.has('impressions') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('impressions')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>Impressões</span>
                              {sortBy === 'impressions' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                        {visibleColumns.has('link_clicks') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('link_clicks')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>Cliques</span>
                              {sortBy === 'link_clicks' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                        {visibleColumns.has('ctr') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('ctr')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>CTR</span>
                              {sortBy === 'ctr' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                        {visibleColumns.has('cost_per_link_click') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('cost_per_link_click')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>CPC</span>
                              {sortBy === 'cost_per_link_click' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                        {visibleColumns.has('cpm') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('cpm')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>CPM</span>
                              {sortBy === 'cpm' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                        {visibleColumns.has('landing_page_views') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('landing_page_views')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>LPVs</span>
                              {sortBy === 'landing_page_views' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                        {visibleColumns.has('cpa') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('cpa')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>CPA</span>
                              {sortBy === 'cpa' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                        {visibleColumns.has('results') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('results')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>Resultados</span>
                              {sortBy === 'results' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                        {visibleColumns.has('revenue') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('revenue')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>Valor Conv.</span>
                              {sortBy === 'revenue' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                        {visibleColumns.has('roas') && (
                          <th className="text-right py-3 px-2 text-sm font-medium text-slate-700 bg-white">
                            <button
                              onClick={() => handleSortMetric('roas')}
                              className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                            >
                              <span>ROAS</span>
                              {sortBy === 'roas' && (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMetrics().map(([adId, data]) => {
                        const ad = ads.find(a => a.ad_id === adId);
                        if (!data.ok) return null;
                        
                        const m = data.metrics;
                        
                        
                        return (
                          <tr key={adId} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-2 text-sm">
                              <button
                                onClick={() => toggleAdCheckInMetrics(adId)}
                                className="flex items-center justify-center w-full"
                              >
                                {checkedAdsInMetrics.has(adId) ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-3 text-sm min-w-[160px]">
                              <div className="flex items-center space-x-3 max-w-[160px]">
                                {ad?.creative_thumb && (
                                  <div className="flex-shrink-0">
                                    <img
                                      src={ad.creative_thumb}
                                      alt="Creative"
                                      className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                                    />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <div className="font-medium text-slate-900 truncate">
                                    {ad?.ad_name || `Anúncio ${adId}`}
                                  </div>
                                  <div className="text-xs text-slate-500 truncate">{adId}</div>
                                  <button
                                    onClick={() => {
                                      setPreviewAd(ad);
                                      setShowPreview(true);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center mt-1 cursor-pointer truncate"
                                    title="Ver preview do anúncio"
                                    style={{ textDecoration: 'none', fontWeight: '600', background: 'none', border: 'none', padding: 0 }}
                                  >
                                    📖 Ver Preview
                                  </button>
                                </div>
                              </div>
                            </td>
                            {visibleColumns.has('spend') && (
                              <td className="py-3 px-2 text-sm text-right font-medium">
                                {formatMetricValue(m?.spend, 'currency')}
                              </td>
                            )}
                            {visibleColumns.has('impressions') && (
                              <td className="py-3 px-2 text-sm text-right">
                                {formatMetricValue(m?.impressions, 'number')}
                              </td>
                            )}
                            {visibleColumns.has('link_clicks') && (
                              <td className="py-3 px-2 text-sm text-right">
                                {formatMetricValue(m?.link_clicks || m?.inline_link_clicks, 'number')}
                              </td>
                            )}
                            {visibleColumns.has('ctr') && (
                              <td className="py-3 px-2 text-sm text-right">
                                {formatMetricValue(m?.ctr, 'percentage')}
                              </td>
                            )}
                            {visibleColumns.has('cost_per_link_click') && (
                              <td className="py-3 px-2 text-sm text-right">
                                {formatMetricValue(m?.cost_per_link_click || m?.cost_per_inline_link_click, 'currency')}
                              </td>
                            )}
                            {visibleColumns.has('cpm') && (
                              <td className="py-3 px-2 text-sm text-right">
                                {formatMetricValue(m?.cpm, 'currency')}
                              </td>
                            )}
                            {visibleColumns.has('landing_page_views') && (
                              <td className="py-3 px-2 text-sm text-right">
                                {formatMetricValue(m?.landing_page_views, 'number')}
                              </td>
                            )}
                            {visibleColumns.has('cpa') && (
                              <td className="py-3 px-2 text-sm text-right">
                                {formatMetricValue(m?.cpa, 'currency')}
                              </td>
                            )}
                            {visibleColumns.has('results') && (
                              <td className="py-3 px-2 text-sm text-right">
                                {formatMetricValue(m?.results || 0, 'number')}
                              </td>
                            )}
                            {visibleColumns.has('revenue') && (
                              <td className="py-3 px-2 text-sm text-right">
                                {formatMetricValue(m?.revenue, 'currency')}
                              </td>
                            )}
                            {visibleColumns.has('roas') && (
                              <td className="py-3 px-2 text-sm text-right">
                                {m?.roas ? (m.roas.toFixed(2) + 'x') : '-'}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        

        

        

        {/* No Account Selected */}
        {!loading && !selectedAccount && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Selecione uma conta de anúncios
            </h3>
            <p className="text-slate-600">
              Escolha uma conta de anúncios acima para visualizar os anúncios ativos.
            </p>
          </div>
        )}

        {/* No Ads Found - Enhanced with better instructions */}
        {!loading && selectedAccount && filteredAds.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              {ads.length === 0 ? 'Conta precisa ser sincronizada' : 'Nenhum anúncio encontrado'}
            </h3>
            <p className="text-slate-600 mb-6">
              {ads.length === 0 
                ? `A conta "${selectedAccount.account_name}" ainda não foi sincronizada. Clique em "Atualizar Anúncios" para importar os anúncios ativos.`
                : 'Nenhum anúncio corresponde aos filtros aplicados. Tente ajustar os filtros ou limpar a busca.'
              }
            </p>
            {ads.length === 0 && selectedAccount && (
              <div className="space-y-4">
                <button
                  onClick={() => handleUpdateAll()}
                  disabled={updatingAll}
                  className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  <RefreshCw className={`w-6 h-6 mr-3 ${updatingAll ? 'animate-spin' : ''}`} />
                  {updatingAll ? 'Sincronizando...' : 'Atualizar Anúncios'}
                </button>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
                  <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Como funciona:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Importa anúncios ativos diretamente da plataforma</li>
                    <li>• Sincroniza campanhas e métricas automaticamente</li>
                    <li>• Processo leva 30-60 segundos normalmente</li>
                    <li>• Dados ficam salvos para acesso rápido</li>
                  </ul>
                </div>
                
                <p className="text-xs text-slate-500">
                  Status da conta: {selectedAccount.sync_status === 'pending' ? 'Aguardando primeira sincronização' : 
                           selectedAccount.sync_status === 'success' ? 'Sincronizada com sucesso' :
                           selectedAccount.sync_status === 'error' ? 'Erro na última sincronização' :
                           'Status desconhecido'}
                  {lastSyncTime && selectedAccount.sync_status === 'success' && (
                    <span className="block mt-1">
                      Última sincronização: {formatTimestamp(lastSyncTime)}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        
      </main>

      {/* ROBUST Preview Modal with Enhanced Error Handling */}
      {showPreview && previewAd && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📱</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Preview do Anúncio
                  </h3>
                  <p className="text-sm text-slate-500">
                    {previewAd.ad_name || `Anúncio ${previewAd.ad_id}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewAd(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                title="Fechar preview"
              >
                ×
              </button>
            </div>
            
            {/* Content */}
            <div className="flex flex-col lg:flex-row h-[calc(95vh-120px)]">
              {/* Preview Frame - Takes most space */}
              <div className="flex-1 bg-slate-50 relative">
                <iframe
                  src={`/api/meta/ads/preview/by-slug/${slug}/html?ad_id=${previewAd.ad_id}`}
                  className="w-full h-full border-0"
                  title={`Preview do anúncio ${previewAd.ad_name || previewAd.ad_id}`}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
                  loading="lazy"
                  onLoad={(e) => {
                    console.log('[PREVIEW-SUCCESS] Preview carregado com sucesso para:', previewAd.ad_id);
                    // Remove loading indicator when iframe loads
                    const loadingEl = e.currentTarget.parentElement?.querySelector('.preview-loading');
                    if (loadingEl) {
                      loadingEl.remove();
                    }
                    
                    // Add success indicator
                    const successEl = document.createElement('div');
                    successEl.className = 'absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs z-10';
                    successEl.textContent = '✅ Preview carregado';
                    e.currentTarget.parentElement?.appendChild(successEl);
                    
                    // Remove success indicator after 3 seconds
                    setTimeout(() => {
                      if (successEl.parentElement) {
                        successEl.parentElement.removeChild(successEl);
                      }
                    }, 3000);
                  }}
                  onError={(e) => {
                    console.error('[PREVIEW-ERROR] Erro ao carregar preview para:', previewAd.ad_id, e);
                    
                    // Remove loading indicator
                    const loadingEl = e.currentTarget.parentElement?.querySelector('.preview-loading');
                    if (loadingEl) {
                      loadingEl.remove();
                    }
                    
                    // Show enhanced error with fallback options
                    const errorEl = document.createElement('div');
                    errorEl.className = 'absolute inset-0 flex items-center justify-center bg-red-50';
                    errorEl.innerHTML = `
                      <div class="text-center p-8">
                        <div class="text-6xl mb-6">⚠️</div>
                        <h3 class="text-xl font-semibold text-red-700 mb-4">Preview Temporariamente Indisponível</h3>
                        <p class="text-red-600 text-sm mb-6 max-w-md">
                          Não foi possível carregar o preview deste anúncio no momento. 
                          Isso pode acontecer devido a limitações temporárias da API do Meta.
                        </p>
                        <div class="space-y-3">
                          <button onclick="window.open('/api/meta/ads/preview/by-slug/${slug}/html?ad_id=${previewAd.ad_id}', '_blank')" 
                                  class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                            🔗 Tentar em Nova Aba
                          </button>
                          <button onclick="document.querySelector('iframe[title*=\\"Preview do anúncio\\"]').src = document.querySelector('iframe[title*=\\"Preview do anúncio\\"]').src" 
                                  class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                            🔄 Recarregar Preview
                          </button>
                          <p class="text-xs text-gray-500 mt-4">
                            💡 Dica: O preview pode funcionar melhor em nova aba
                          </p>
                        </div>
                      </div>
                    `;
                    e.currentTarget.parentElement?.appendChild(errorEl);
                  }}
                />
                
                {/* Enhanced Loading indicator with timeout */}
                <div className="preview-loading absolute inset-0 flex items-center justify-center bg-white">
                  <div className="text-center">
                    <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                    <p className="text-slate-600 font-medium">Carregando preview...</p>
                    <p className="text-slate-500 text-sm mt-2">Aguarde enquanto buscamos o anúncio do Meta</p>
                    <div className="mt-4 px-4 py-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700">
                        ⏱️ Se demorar mais de 10 segundos, tente abrir em nova aba
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Auto-timeout for loading */}
                <script dangerouslySetInnerHTML={{
                  __html: `
                    setTimeout(() => {
                      const loadingEl = document.querySelector('.preview-loading');
                      if (loadingEl) {
                        loadingEl.innerHTML = \`
                          <div class="text-center p-6">
                            <div class="text-4xl mb-4">⏰</div>
                            <h3 class="text-lg font-semibold text-amber-700 mb-2">Preview está demorando...</h3>
                            <p class="text-amber-600 text-sm mb-4">O preview pode estar sobrecarregado</p>
                            <button onclick="window.open('/api/meta/ads/preview/by-slug/${slug}/html?ad_id=${previewAd.ad_id}', '_blank')" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                              🔗 Abrir em Nova Aba
                            </button>
                          </div>
                        \`;
                      }
                    }, 10000);
                  `
                }} />
              </div>
              
              {/* Enhanced Sidebar with ad info */}
              <div className="lg:w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Ad Info */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                      <span>📊</span>
                      <span>Informações do Anúncio</span>
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">ID:</span>
                        <span className="font-mono text-slate-900">{previewAd.ad_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          previewAd.effective_status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {previewAd.effective_status === 'ACTIVE' ? 'Ativo' : previewAd.effective_status}
                        </span>
                      </div>
                      {previewAd.creative_id && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Creative ID:</span>
                          <span className="font-mono text-slate-900 text-xs">{previewAd.creative_id}</span>
                        </div>
                      )}
                      {previewAd.campaign_name && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Campanha:</span>
                          <span className="text-slate-900 text-xs truncate">{previewAd.campaign_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Enhanced Actions */}
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                      <span>🔧</span>
                      <span>Ações</span>
                    </h4>
                    <div className="space-y-3">
                      <a
                        href={`/api/meta/ads/preview/by-slug/${slug}/html?ad_id=${previewAd.ad_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <span>🔗</span>
                        <span>Abrir em nova aba</span>
                      </a>
                      
                      <button
                        onClick={() => {
                          console.log('[PREVIEW-RELOAD] Recarregando preview para:', previewAd.ad_id);
                          // Reload iframe with fresh timestamp
                          const iframe = document.querySelector('iframe[title*="Preview do anúncio"]') as HTMLIFrameElement;
                          if (iframe) {
                            const baseUrl = `/api/meta/ads/preview/by-slug/${slug}/html?ad_id=${previewAd.ad_id}`;
                            iframe.src = `${baseUrl}&t=${Date.now()}`;
                            
                            // Show reloading indicator
                            const parent = iframe.parentElement;
                            if (parent) {
                              const reloadingEl = document.createElement('div');
                              reloadingEl.className = 'preview-loading absolute inset-0 flex items-center justify-center bg-white';
                              reloadingEl.innerHTML = `
                                <div class="text-center">
                                  <div class="inline-block animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mb-4"></div>
                                  <p class="text-slate-600 font-medium">🔄 Recarregando preview...</p>
                                </div>
                              `;
                              parent.appendChild(reloadingEl);
                            }
                          }
                        }}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <span>🔄</span>
                        <span>Recarregar Preview</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          const iframe = document.querySelector('iframe[title*="Preview do anúncio"]') as HTMLIFrameElement;
                          if (iframe && iframe.contentWindow) {
                            iframe.contentWindow.location.reload();
                          }
                        }}
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <span>⚡</span>
                        <span>Refresh Interno</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Enhanced Help Text */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-600 text-sm">💡</span>
                      <div>
                        <h5 className="text-blue-900 font-medium text-sm mb-1">Sobre o Preview</h5>
                        <p className="text-blue-700 text-xs leading-relaxed mb-2">
                          Este preview mostra como o anúncio aparece nas redes sociais. O conteúdo é obtido diretamente do Meta Business.
                        </p>
                        <p className="text-blue-600 text-xs font-medium">
                          ⚠️ Se o preview falhar, tente abrir em nova aba - é mais estável.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Troubleshooting */}
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <span className="text-amber-600 text-sm">🔧</span>
                      <div>
                        <h5 className="text-amber-900 font-medium text-sm mb-1">Problemas?</h5>
                        <div className="text-amber-700 text-xs leading-relaxed space-y-1">
                          <p>• Preview lento: Abra em nova aba</p>
                          <p>• Tela branca: Use "Recarregar Preview"</p>
                          <p>• Erro persistente: O anúncio pode ter restrições</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600 flex items-center space-x-2">
                <span>Preview em tempo real do Meta Business</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Sistema online"></div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    console.log('[PREVIEW-CLOSE] Fechando preview para:', previewAd.ad_id);
                    setShowPreview(false);
                    setPreviewAd(null);
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAccountManager && slug && (
        <AdAccountManager
          clientSlug={slug}
          onClose={() => setShowAccountManager(false)}
          onAccountsChanged={() => {
            // Refresh current account data if it's selected
            if (selectedAccount) {
              fetchAds(selectedAccount.id).catch(error => {
                console.error('Error refreshing ads after account change:', error);
              });
            }
          }}
        />
      )}

      {showSelectionCreator && slug && selectedAds.size > 0 && (
        <SelectionCreator
          selectedAds={filteredAds.filter(ad => selectedAds.has(ad.ad_id))}
          clientSlug={slug}
          onClose={() => setShowSelectionCreator(false)}
          onSaved={() => {
            setSelectedAds(new Set());
            setShowMetrics(false);
            setMetrics({});
          }}
        />
      )}

      {showMetricsSelectionCreator && slug && checkedAdsInMetrics.size > 0 && (
        <SelectionCreator
          selectedAds={filteredAds.filter(ad => checkedAdsInMetrics.has(ad.ad_id))}
          clientSlug={slug}
          onClose={() => setShowMetricsSelectionCreator(false)}
          onSaved={() => {
            setCheckedAdsInMetrics(new Set());
            // Keep the original metrics view open
          }}
        />
      )}
    </div>
  );
}
