// Debug helper to check environment variables
export function debugEnv(env: any) {
  console.log('Environment variables debug:', {
    CRYPTO_KEY: env.CRYPTO_KEY ? `Available (${env.CRYPTO_KEY.length} chars)` : 'Missing',
    CRYPTO_IV: env.CRYPTO_IV ? `Available (${env.CRYPTO_IV.length} chars)` : 'Missing',
    GRAPH_API_VER: env.GRAPH_API_VER || 'Missing',
    DB: env.DB ? 'Available' : 'Missing'
  });
  
  return {
    hasKey: !!env.CRYPTO_KEY,
    hasIv: !!env.CRYPTO_IV,
    keyLength: env.CRYPTO_KEY?.length || 0,
    ivLength: env.CRYPTO_IV?.length || 0
  };
}
