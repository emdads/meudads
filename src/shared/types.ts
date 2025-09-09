import { z } from "zod";

// Schema for syncing Meta ads
export const SyncMetaQuerySchema = z.object({
  days: z.string().optional().default("30").transform((val) => {
    const num = parseInt(val);
    return isNaN(num) ? 30 : Math.min(Math.max(num, 1), 90);
  }),
});

export type SyncMetaQuery = z.infer<typeof SyncMetaQuerySchema>;

export interface ClientData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Campaign status options
export const CAMPAIGN_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DELETED: 'DELETED',
  ARCHIVED: 'ARCHIVED'
} as const;

// Ad status options
export const AD_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DELETED: 'DELETED',
  ARCHIVED: 'ARCHIVED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  DISAPPROVED: 'DISAPPROVED',
  PREAPPROVED: 'PREAPPROVED',
  PENDING_BILLING_INFO: 'PENDING_BILLING_INFO',
  CAMPAIGN_PAUSED: 'CAMPAIGN_PAUSED',
  ADSET_PAUSED: 'ADSET_PAUSED'
} as const;

// Meta objectives mapping to Portuguese
export const OBJECTIVES_PT: Record<string, string> = {
  'APP_INSTALLS': 'Instalações do App',
  'BRAND_AWARENESS': 'Reconhecimento da Marca',
  'CONVERSIONS': 'Conversões',
  'EVENT_RESPONSES': 'Respostas de Evento',
  'LEAD_GENERATION': 'Geração de Leads',
  'LINK_CLICKS': 'Cliques no Link',
  'LOCAL_AWARENESS': 'Reconhecimento Local',
  'MESSAGES': 'Mensagens',
  'OUTCOME_AWARENESS': 'Reconhecimento',
  'OUTCOME_ENGAGEMENT': 'Engajamento',
  'OUTCOME_LEADS': 'Leads',
  'OUTCOME_SALES': 'Vendas',
  'OUTCOME_TRAFFIC': 'Tráfego',
  'PAGE_LIKES': 'Curtidas da Página',
  'POST_ENGAGEMENT': 'Engajamento da Publicação',
  'PRODUCT_CATALOG_SALES': 'Vendas do Catálogo',
  'REACH': 'Alcance',
  'STORE_VISITS': 'Visitas à Loja',
  'VIDEO_VIEWS': 'Visualizações de Vídeo',
  'WEBSITE_CONVERSIONS': 'Conversões do Site'
};

// Meta optimization goals mapping to Portuguese
export const OPTIMIZATION_GOALS_PT: Record<string, string> = {
  'AD_RECALL_LIFT': 'Recordação do Anúncio',
  'APP_INSTALLS': 'Instalações do App',
  'BRAND_AWARENESS': 'Reconhecimento da Marca',
  'CLICKS': 'Cliques',
  'CONVERSATIONS': 'Conversas',
  'DERIVED_EVENTS': 'Eventos Personalizados',
  'ENGAGED_USERS': 'Usuários Engajados',
  'EVENT_RESPONSES': 'Respostas de Evento',
  'IMPRESSIONS': 'Impressões',
  'IN_APP_VALUE': 'Valor no App',
  'LANDING_PAGE_VIEWS': 'Visualizações da Página',
  'LEAD_GENERATION': 'Geração de Leads',
  'LINK_CLICKS': 'Cliques no Link',
  'NONE': 'Nenhum',
  'OFFSITE_CONVERSIONS': 'Compras',
  'PAGE_LIKES': 'Curtidas da Página',
  'POST_ENGAGEMENT': 'Engajamento com o Post',
  'QUALITY_CALL': 'Chamadas de Qualidade',
  'QUALITY_LEAD': 'Leads de Qualidade',
  'REACH': 'Alcance',
  'REPLIES': 'Respostas',
  'RETURN_ON_AD_SPEND': 'ROAS',
  'SOCIAL_IMPRESSIONS': 'Impressões Sociais',
  'THRUPLAY': 'ThruPlay',
  'VALUE': 'Valor',
  'VISIT_INSTAGRAM_PROFILE': 'Visitas ao Perfil do Instagram',
  // Adicionar mais variações comuns da API Meta
  'MOBILE_APP_INSTALLS': 'Instalações do App',
  'MOBILE_APP_ENGAGEMENT': 'Engajamento no App',
  'PURCHASE': 'Compras',
  'ADD_TO_CART': 'Adicionar ao Carrinho',
  'INITIATE_CHECKOUT': 'Iniciar Checkout',
  'ADD_PAYMENT_INFO': 'Adicionar Pagamento',
  'COMPLETE_REGISTRATION': 'Registros',
  'SEARCH': 'Pesquisas',
  'VIEW_CONTENT': 'Visualizar Conteúdo',
  'ADD_TO_WISHLIST': 'Lista de Desejos',
  'CONTACT': 'Contatos',
  'CUSTOMIZE_PRODUCT': 'Personalizar Produto',
  'FIND_LOCATION': 'Encontrar Localização',
  'SCHEDULE': 'Agendamentos',
  'START_TRIAL': 'Iniciar Teste',
  'SUBMIT_APPLICATION': 'Enviar Candidatura',
  'SUBSCRIBE': 'Inscrições',
  'MESSAGING_CONVERSATIONS_STARTED': 'Conversas Iniciadas',
  // Variações de case e formatação
  'LANDING_PAGE_VIEW': 'Visualizações da Página',
  'OFFSITE_CONVERSION': 'Compras',
  'WEBSITE_PURCHASE': 'Compras no Site',
  'WEBSITE_LEADS': 'Leads do Site',
  'WEBSITE_REGISTRATIONS': 'Registros no Site',
  'CATALOGUE_SALES': 'Vendas do Catálogo',
  'CATALOG_SALES': 'Vendas do Catálogo',
  'STORE_VISIT': 'Visitas à Loja',
  'APP_ENGAGEMENT': 'Engajamento no App',
  'MESSAGING_PURCHASE_CONVERSION': 'Compras via Mensagem',
  'MESSAGING_APPOINTMENT_CONVERSION': 'Agendamentos via Mensagem',
  // Consolidar todas as variações de visitas ao perfil para um nome só
  'PROFILE_VISIT': 'Visitas ao Perfil do Instagram',
  'PROFILE_VISITS': 'Visitas ao Perfil do Instagram',
  'VISIT_PROFILE': 'Visitas ao Perfil do Instagram'
};

// Portuguese day names for date formatting
export const DAYS_PT = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 
  'quinta-feira', 'sexta-feira', 'sábado'
];

// Portuguese month names for date formatting
export const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

// Default spending threshold for campaigns (in BRL)
export const DEFAULT_SPENDING_THRESHOLD = 100;

// Selection types
export const SELECTION_TYPES = {
  PAUSE: 'pause',
  OPTIMIZE: 'optimize',
  SCALE: 'scale',
  REVIEW: 'review',
  DELETE: 'delete'
} as const;

export type SelectionType = typeof SELECTION_TYPES[keyof typeof SELECTION_TYPES];

// Selection types in Portuguese
export const SELECTION_TYPES_PT: Record<SelectionType, string> = {
  'pause': 'Pausar',
  'optimize': 'Otimizar',
  'scale': 'Escalar',
  'review': 'Revisar',
  'delete': 'Excluir'
};

// Validation schemas
export const EmailSchema = z.string().email('Email deve ter um formato válido');
export const SlugSchema = z.string().min(2, 'Slug deve ter pelo menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens');
export const PasswordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

// Ad network platforms
export const AD_PLATFORMS = {
  META: 'meta',
  GOOGLE: 'google',
  TIKTOK: 'tiktok',
  PINTEREST: 'pinterest',
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  SNAPCHAT: 'snapchat'
} as const;

export type AdPlatform = typeof AD_PLATFORMS[keyof typeof AD_PLATFORMS];

// Platform names in Portuguese
export const AD_PLATFORMS_PT: Record<AdPlatform, string> = {
  'meta': 'Meta (Facebook/Instagram)',
  'google': 'Google Ads',
  'tiktok': 'TikTok Ads',
  'pinterest': 'Pinterest Ads',
  'linkedin': 'LinkedIn Ads',
  'twitter': 'Twitter Ads',
  'snapchat': 'Snapchat Ads'
};

// Common error messages in Portuguese
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Este campo é obrigatório',
  INVALID_EMAIL: 'Email deve ter um formato válido',
  INVALID_PASSWORD: 'Senha deve ter pelo menos 6 caracteres',
  INVALID_SLUG: 'Slug deve conter apenas letras minúsculas, números e hífens',
  NETWORK_ERROR: 'Erro de conexão. Tente novamente.',
  UNAUTHORIZED: 'Você não tem permissão para realizar esta ação',
  NOT_FOUND: 'Item não encontrado',
  SERVER_ERROR: 'Erro interno do servidor'
};

// Success messages in Portuguese
export const SUCCESS_MESSAGES = {
  SAVED: 'Dados salvos com sucesso',
  CREATED: 'Item criado com sucesso',
  UPDATED: 'Item atualizado com sucesso',
  DELETED: 'Item excluído com sucesso',
  SYNCED: 'Sincronização realizada com sucesso'
};

// API response types
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Date range types
export interface DateRange {
  start: Date;
  end: Date;
}

// Metrics types
export interface AdMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas?: number;
}

// Chart data types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Export commonly used types
