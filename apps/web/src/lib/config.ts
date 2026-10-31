/**
 * Runtime config injected by the API via /config.js (see apps/api main.ts).
 * Values come from the API's environment, so they can change without a
 * rebuild of the web bundle.
 */
export interface RuntimeConfig {
  googleMapsApiKey: string;
}

declare global {
  interface Window {
    __CAMPSIGHT_CONFIG__?: Partial<RuntimeConfig>;
  }
}

export const config: RuntimeConfig = {
  googleMapsApiKey: window.__CAMPSIGHT_CONFIG__?.googleMapsApiKey || '',
};
