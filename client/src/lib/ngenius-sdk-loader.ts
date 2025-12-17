import { apiRequest } from "./queryClient";

interface SDKConfig {
  enabled: boolean;
  apiKey: string;
  outletRef: string;
  sdkUrl: string;
  mode: string;
}

let sdkConfigPromise: Promise<SDKConfig> | null = null;
let sdkScriptPromise: Promise<void> | null = null;
let cachedConfig: SDKConfig | null = null;

export async function fetchSDKConfig(): Promise<SDKConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  if (!sdkConfigPromise) {
    sdkConfigPromise = apiRequest('GET', '/api/ngenius/sdk-config')
      .then(res => res.json())
      .then(config => {
        cachedConfig = config;
        return config;
      });
  }
  
  return sdkConfigPromise;
}

export async function loadSDKScript(sdkUrl: string): Promise<void> {
  if (window.NI) {
    return Promise.resolve();
  }
  
  if (!sdkScriptPromise) {
    sdkScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${sdkUrl}"]`);
      if (existingScript) {
        if (window.NI) {
          resolve();
        } else {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Failed to load SDK')));
        }
        return;
      }
      
      const script = document.createElement('script');
      script.src = sdkUrl;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load NGenius SDK'));
      document.head.appendChild(script);
    });
  }
  
  return sdkScriptPromise;
}

export async function preloadNGeniusSDK(): Promise<{ config: SDKConfig; ready: boolean }> {
  try {
    const config = await fetchSDKConfig();
    
    if (!config.enabled) {
      return { config, ready: false };
    }
    
    await loadSDKScript(config.sdkUrl);
    
    return { config, ready: !!window.NI };
  } catch (error) {
    console.error('Failed to preload NGenius SDK:', error);
    throw error;
  }
}

export function isSDKReady(): boolean {
  return !!window.NI;
}

export function getCachedConfig(): SDKConfig | null {
  return cachedConfig;
}

declare global {
  interface Window {
    NI?: any;
  }
}
