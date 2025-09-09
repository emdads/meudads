// Platform registry for multi-platform ad management
import { BasePlatform, PlatformConfig } from './base';
import { MetaPlatform } from './meta';
import { GoogleAdsPlatform } from './google';
import { PinterestPlatform } from './pinterest';
import { TikTokPlatform } from './tiktok';

// Registry of all supported platforms
export const PLATFORMS: Record<string, BasePlatform> = {
  meta: new MetaPlatform(),
  google: new GoogleAdsPlatform(),
  pinterest: new PinterestPlatform(),
  tiktok: new TikTokPlatform()
};

// Platform configurations
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  meta: {
    id: 'meta',
    name: 'Meta Ads',
    syncSupported: true,
    metricsSupported: true,
    pauseSupported: true,
    reactivateSupported: true
  },
  google: {
    id: 'google',
    name: 'Google Ads',
    syncSupported: true,
    metricsSupported: true,
    pauseSupported: false, // Not fully implemented yet
    reactivateSupported: false
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest Ads',
    syncSupported: true,
    metricsSupported: true,
    pauseSupported: true,
    reactivateSupported: true
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok Ads',
    syncSupported: true,
    metricsSupported: true,
    pauseSupported: true,
    reactivateSupported: true
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn Ads',
    syncSupported: false,
    metricsSupported: false,
    pauseSupported: false,
    reactivateSupported: false
  }
};

export function getPlatform(platformId: string): BasePlatform | null {
  return PLATFORMS[platformId] || null;
}

export function isPlatformSupported(platformId: string, feature: keyof PlatformConfig): boolean {
  const config = PLATFORM_CONFIGS[platformId];
  if (!config) return false;
  
  if (feature === 'syncSupported') return config.syncSupported;
  if (feature === 'metricsSupported') return config.metricsSupported;
  if (feature === 'pauseSupported') return config.pauseSupported;
  if (feature === 'reactivateSupported') return config.reactivateSupported;
  
  return false;
}

export function getSupportedPlatforms(feature?: keyof PlatformConfig): PlatformConfig[] {
  const platforms = Object.values(PLATFORM_CONFIGS);
  
  if (!feature) return platforms;
  
  return platforms.filter(platform => {
    if (feature === 'syncSupported') return platform.syncSupported;
    if (feature === 'metricsSupported') return platform.metricsSupported;
    if (feature === 'pauseSupported') return platform.pauseSupported;
    return false;
  });
}

// Export platform classes for direct use if needed
export { BasePlatform, MetaPlatform, GoogleAdsPlatform, PinterestPlatform, TikTokPlatform };
export type { PlatformConfig, SyncResult, MetricsResult, AdMetrics } from './base';
