// Sistema Inteligente de Gerenciamento de Rate Limits
// Funciona com qualquer plataforma que use rate limits

interface RateLimitInfo {
  platform: string;
  accountId: string;
  limitType: 'user' | 'app' | 'hourly' | 'daily';
  resetTime: Date;
  requestsRemaining: number;
  maxRequests: number;
}

interface RateLimitState {
  isLimited: boolean;
  resetTime: Date | null;
  waitTime: number; // milliseconds
  requestsRemaining: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

class RateLimitManager {
  private static instance: RateLimitManager;
  private rateLimits = new Map<string, RateLimitInfo>();
  private backoffMultipliers = new Map<string, number>();
  
  private constructor() {}
  
  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }
  
  // Analyzes error and determines rate limit state
  analyzeRateLimit(
    platform: string,
    accountId: string,
    errorCode: number,
    errorMessage: string,
    headers: Headers
  ): RateLimitState {
    const key = `${platform}_${accountId}`;
    const message = (errorMessage || '').toLowerCase();
    
    // Reset multiplier on successful requests (called elsewhere)
    if (!this.backoffMultipliers.has(key)) {
      this.backoffMultipliers.set(key, 1);
    }
    
    // Check for various rate limit indicators
    let isRateLimit = false;
    let limitType: 'user' | 'app' | 'hourly' | 'daily' = 'user';
    let severity: 'low' | 'medium' | 'high' = 'medium';
    let baseWaitTime = 300000; // 5 minutes default
    
    // Meta/Facebook specific patterns
    if (platform === 'meta') {
      if (errorCode === 17 || message.includes('user request limit reached')) {
        isRateLimit = true;
        limitType = 'user';
        severity = 'high';
        baseWaitTime = 3600000; // 1 hour
      } else if (errorCode === 80004 || message.includes('application request limit reached')) {
        isRateLimit = true;
        limitType = 'app';
        severity = 'medium';
        baseWaitTime = 1800000; // 30 minutes
      } else if (errorCode === 613 || message.includes('calls per hour exceeded')) {
        isRateLimit = true;
        limitType = 'hourly';
        severity = 'medium';
        baseWaitTime = 3600000; // 1 hour
      }
    }
    
    // Generic rate limit patterns (any platform)
    if (errorCode === 429 || message.includes('too many requests') || message.includes('rate limit')) {
      isRateLimit = true;
      severity = 'low';
      baseWaitTime = 300000; // 5 minutes
    }
    
    if (!isRateLimit) {
      return {
        isLimited: false,
        resetTime: null,
        waitTime: 0,
        requestsRemaining: -1,
        severity: 'low',
        message: 'No rate limit detected'
      };
    }
    
    // Calculate intelligent wait time
    const retryAfter = headers.get('retry-after');
    let waitTime = baseWaitTime;
    
    if (retryAfter) {
      const retrySeconds = parseInt(retryAfter);
      if (!isNaN(retrySeconds)) {
        waitTime = retrySeconds * 1000;
      }
    }
    
    // Apply backoff multiplier for repeated rate limits
    const currentMultiplier = this.backoffMultipliers.get(key) || 1;
    waitTime *= currentMultiplier;
    
    // Update multiplier for next time (max 4x)
    this.backoffMultipliers.set(key, Math.min(currentMultiplier * 1.5, 4));
    
    // Cap wait times to reasonable limits
    const maxWait = severity === 'high' ? 7200000 : 3600000; // 2h or 1h max
    waitTime = Math.min(waitTime, maxWait);
    waitTime = Math.max(waitTime, 60000); // Min 1 minute
    
    const resetTime = new Date(Date.now() + waitTime);
    
    // Store rate limit info
    this.rateLimits.set(key, {
      platform,
      accountId,
      limitType,
      resetTime,
      requestsRemaining: 0,
      maxRequests: limitType === 'user' ? 200 : limitType === 'app' ? 4800 : 1000
    });
    
    // Generate user-friendly message
    const waitMinutes = Math.ceil(waitTime / 60000);
    let userMessage = '';
    
    switch (limitType) {
      case 'user':
        userMessage = `Rate limit do usuário (${errorCode}): Esta conta específica atingiu o limite. Aguarde ${waitMinutes} minutos.`;
        break;
      case 'app':
        userMessage = `Rate limit da aplicação (${errorCode}): Muitas contas sincronizando. Aguarde ${waitMinutes} minutos.`;
        break;
      case 'hourly':
        userMessage = `Limite por hora excedido (${errorCode}): Aguarde ${waitMinutes} minutos para reset.`;
        break;
      default:
        userMessage = `Rate limit detectado (${errorCode}): Aguarde ${waitMinutes} minutos.`;
    }
    
    return {
      isLimited: true,
      resetTime,
      waitTime,
      requestsRemaining: 0,
      severity,
      message: userMessage
    };
  }
  
  // Check if account is currently rate limited
  isAccountLimited(platform: string, accountId: string): RateLimitState | null {
    const key = `${platform}_${accountId}`;
    const rateLimitInfo = this.rateLimits.get(key);
    
    if (!rateLimitInfo) {
      return null;
    }
    
    const now = new Date();
    if (now >= rateLimitInfo.resetTime) {
      // Rate limit has expired
      this.rateLimits.delete(key);
      this.backoffMultipliers.delete(key);
      return null;
    }
    
    // Still rate limited
    const waitTime = rateLimitInfo.resetTime.getTime() - now.getTime();
    const waitMinutes = Math.ceil(waitTime / 60000);
    
    return {
      isLimited: true,
      resetTime: rateLimitInfo.resetTime,
      waitTime,
      requestsRemaining: rateLimitInfo.requestsRemaining,
      severity: rateLimitInfo.limitType === 'user' ? 'high' : 'medium',
      message: `Conta ainda em rate limit. ${waitMinutes} minutos restantes.`
    };
  }
  
  // Mark successful request (resets backoff)
  markSuccess(platform: string, accountId: string): void {
    const key = `${platform}_${accountId}`;
    this.backoffMultipliers.set(key, 1); // Reset multiplier on success
    
    // Clean up old rate limit if it exists and has passed
    const rateLimitInfo = this.rateLimits.get(key);
    if (rateLimitInfo && new Date() >= rateLimitInfo.resetTime) {
      this.rateLimits.delete(key);
    }
  }
  
  // Get all current rate limits (for monitoring)
  getAllRateLimits(): { [key: string]: RateLimitInfo } {
    const now = new Date();
    const active: { [key: string]: RateLimitInfo } = {};
    
    for (const [key, info] of this.rateLimits.entries()) {
      if (now < info.resetTime) {
        active[key] = info;
      } else {
        // Clean up expired limits
        this.rateLimits.delete(key);
        this.backoffMultipliers.delete(key);
      }
    }
    
    return active;
  }
  
  // Smart wait with user feedback
  async smartWait(
    waitTimeMs: number,
    context: string,
    progressCallback?: (elapsed: number, total: number, message: string) => void
  ): Promise<void> {
    if (waitTimeMs <= 0) return;
    
    const startTime = Date.now();
    const updateInterval = Math.min(30000, waitTimeMs / 10); // Update every 30s or 10% of wait time
    let elapsed = 0;
    
    console.log(`[RATE-LIMIT-WAIT] Starting smart wait: ${Math.ceil(waitTimeMs/60000)} minutes for ${context}`);
    
    while (elapsed < waitTimeMs) {
      const waitChunk = Math.min(updateInterval, waitTimeMs - elapsed);
      await new Promise(resolve => setTimeout(resolve, waitChunk));
      elapsed = Date.now() - startTime;
      
      const remaining = Math.ceil((waitTimeMs - elapsed) / 60000);
      const progress = (elapsed / waitTimeMs) * 100;
      
      if (remaining > 0 && progressCallback) {
        progressCallback(elapsed, waitTimeMs, `Aguardando rate limit: ${remaining} min restantes`);
      }
      
      console.log(`[RATE-LIMIT-WAIT] Progress: ${Math.round(progress)}% - ${remaining}min remaining`);
    }
    
    console.log(`[RATE-LIMIT-WAIT] ✅ Smart wait completed for ${context}`);
  }
}

export const rateLimitManager = RateLimitManager.getInstance();
