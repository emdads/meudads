// Compatibility layer for cross-platform functionality

import { EnvironmentUtils } from './env';

// Response wrapper that works across platforms
export class UniversalResponse {
  private response: any;
  private platform: string;
  
  constructor(response: any) {
    this.response = response;
    this.platform = EnvironmentUtils.getEnvironment().deployment.platform;
  }
  
  json(data: any, status = 200) {
    if (this.platform === 'cloudflare') {
      // Hono/Cloudflare style
      return this.response.json(data, status);
    } else if (this.platform === 'vercel') {
      // Next.js API routes style
      this.response.status(status);
      return this.response.json(data);
    } else {
      // Generic response
      return { status, data };
    }
  }
  
  text(content: string, status = 200) {
    if (this.platform === 'cloudflare') {
      return this.response.text(content, status);
    } else if (this.platform === 'vercel') {
      this.response.status(status);
      return this.response.send(content);
    } else {
      return { status, content };
    }
  }
  
  html(content: string, status = 200) {
    if (this.platform === 'cloudflare') {
      return this.response.html(content, status);
    } else if (this.platform === 'vercel') {
      this.response.status(status);
      this.response.setHeader('Content-Type', 'text/html');
      return this.response.send(content);
    } else {
      return { status, content, type: 'text/html' };
    }
  }
  
  redirect(url: string, status = 302) {
    if (this.platform === 'cloudflare') {
      return this.response.redirect(url, status);
    } else if (this.platform === 'vercel') {
      this.response.status(status);
      this.response.setHeader('Location', url);
      return this.response.end();
    } else {
      return { status, redirect: url };
    }
  }
  
  setHeader(name: string, value: string) {
    if (this.platform === 'vercel') {
      this.response.setHeader(name, value);
    }
    // Cloudflare/Hono handles headers differently in the response object
    return this;
  }
  
  setCookie(name: string, value: string, options: any = {}) {
    if (this.platform === 'cloudflare') {
      // Use Hono's setCookie
      const { setCookie } = require('hono/cookie');
      return setCookie(this.response, name, value, options);
    } else if (this.platform === 'vercel') {
      // Set cookie header for Next.js
      const cookieString = `${name}=${value}; ${Object.entries(options)
        .map(([key, val]) => `${key}=${val}`)
        .join('; ')}`;
      this.response.setHeader('Set-Cookie', cookieString);
    }
    return this;
  }
}

// Request wrapper that works across platforms
export class UniversalRequest {
  private request: any;
  private platform: string;
  
  constructor(request: any) {
    this.request = request;
    this.platform = EnvironmentUtils.getEnvironment().deployment.platform;
  }
  
  get method(): string {
    if (this.platform === 'cloudflare') {
      return this.request.method;
    } else if (this.platform === 'vercel') {
      return this.request.method;
    }
    return 'GET';
  }
  
  get url(): string {
    if (this.platform === 'cloudflare') {
      return this.request.url;
    } else if (this.platform === 'vercel') {
      return this.request.url || '';
    }
    return '';
  }
  
  get headers(): Record<string, string> {
    if (this.platform === 'cloudflare') {
      const headers: Record<string, string> = {};
      this.request.headers.forEach((value: string, key: string) => {
        headers[key.toLowerCase()] = value;
      });
      return headers;
    } else if (this.platform === 'vercel') {
      return this.request.headers || {};
    }
    return {};
  }
  
  header(name: string): string | undefined {
    return this.headers[name.toLowerCase()];
  }
  
  async json(): Promise<any> {
    if (this.platform === 'cloudflare') {
      return await this.request.json();
    } else if (this.platform === 'vercel') {
      return this.request.body || {};
    }
    return {};
  }
  
  async text(): Promise<string> {
    if (this.platform === 'cloudflare') {
      return await this.request.text();
    } else if (this.platform === 'vercel') {
      return this.request.body || '';
    }
    return '';
  }
  
  param(name: string): string | undefined {
    if (this.platform === 'cloudflare') {
      // Assume Hono-style params
      return (this.request as any).param?.(name);
    } else if (this.platform === 'vercel') {
      // Next.js query params
      return this.request.query?.[name];
    }
    return undefined;
  }
  
  query(name: string): string | undefined {
    if (this.platform === 'cloudflare') {
      const url = new URL(this.request.url);
      return url.searchParams.get(name) || undefined;
    } else if (this.platform === 'vercel') {
      return this.request.query?.[name];
    }
    return undefined;
  }
  
  getCookie(name: string): string | undefined {
    const cookieHeader = this.header('cookie');
    if (!cookieHeader) return undefined;
    
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) return value;
    }
    return undefined;
  }
}

// Universal logger that works across platforms
export class UniversalLogger {
  private prefix: string;
  
  constructor(prefix = '[APP]') {
    this.prefix = prefix;
  }
  
  log(message: string, data?: any) {
    if (EnvironmentUtils.isDevelopment()) {
      console.log(`${this.prefix} ${message}`, data || '');
    } else {
      // In production, you might want to send to external logging service
      console.log(`${this.prefix} ${message}`);
    }
  }
  
  error(message: string, error?: Error) {
    console.error(`${this.prefix} ERROR: ${message}`, error || '');
    
    // In production, send to error tracking service
    if (EnvironmentUtils.isProduction()) {
      // Send to Sentry, LogRocket, etc.
    }
  }
  
  warn(message: string, data?: any) {
    console.warn(`${this.prefix} WARN: ${message}`, data || '');
  }
  
  debug(message: string, data?: any) {
    if (EnvironmentUtils.isDevelopment()) {
      console.debug(`${this.prefix} DEBUG: ${message}`, data || '');
    }
  }
}

// Universal crypto utilities that work across platforms
export class UniversalCrypto {
  static async generateUUID(): Promise<string> {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    } else {
      // Fallback implementation
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  }
  
  static async hash(data: string, algorithm = 'SHA-256'): Promise<string> {
    if (typeof crypto !== 'undefined' && (crypto as any).subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await (crypto as any).subtle.digest(algorithm, dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback - not secure, only for development
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    }
  }
  
  static async encrypt(data: string, key: string, iv: string): Promise<string> {
    // This is a simplified implementation - use a proper crypto library in production
    if (EnvironmentUtils.isCloudflare()) {
      // Use Cloudflare's Web Crypto API
      const encoder = new TextEncoder();
      const keyBuffer = encoder.encode(key.slice(0, 32));
      const ivBuffer = encoder.encode(iv.slice(0, 16));
      const dataBuffer = encoder.encode(data);
      
      const cryptoKey = await (crypto as any).subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-CBC' },
        false,
        ['encrypt']
      );
      
      const encrypted = await (crypto as any).subtle.encrypt(
        { name: 'AES-CBC', iv: ivBuffer },
        cryptoKey,
        dataBuffer
      );
      
      const encryptedArray = Array.from(new Uint8Array(encrypted));
      return encryptedArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // For Node.js environments, you'd use the 'crypto' module
      // For now, return base64 encoded (not secure!)
      return Buffer.from(data).toString('base64');
    }
  }
  
  static async decrypt(encryptedData: string, key: string, iv: string): Promise<string> {
    // This is a simplified implementation
    if (EnvironmentUtils.isCloudflare()) {
      // Implement proper decryption using Web Crypto API
      // This is complex and depends on your encryption format
      throw new Error('Decryption not implemented for this environment');
    } else {
      // For Node.js environments, you'd use the 'crypto' module
      // For now, assume base64 encoded
      try {
        return Buffer.from(encryptedData, 'base64').toString('utf8');
      } catch {
        return encryptedData; // Return as-is if not base64
      }
    }
  }
}

// Universal fetch that handles timeouts and retries
export class UniversalFetch {
  static async fetch(url: string, options: any = {}, retries = 3): Promise<Response> {
    const timeout = options.timeout || 30000;
    
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return response;
        } else if (response.status >= 500 && i < retries - 1) {
          // Retry on server errors
          await this.delay(1000 * (i + 1));
          continue;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay(1000 * (i + 1));
      }
    }
    
    throw new Error('Max retries reached');
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export default logger instance
export const logger = new UniversalLogger('[MEUDADS]');

// Export utilities for easy access
export const crypto = UniversalCrypto;
export const http = UniversalFetch;

// Platform detection utilities
export const platform = {
  isCloudflare: () => EnvironmentUtils.isCloudflare(),
  isVercel: () => EnvironmentUtils.isVercel(),
  isDevelopment: () => EnvironmentUtils.isDevelopment(),
  isProduction: () => EnvironmentUtils.isProduction(),
  getDatabaseType: () => EnvironmentUtils.getDatabasePlatform(),
  getBaseUrl: () => EnvironmentUtils.getBaseUrl()
};
