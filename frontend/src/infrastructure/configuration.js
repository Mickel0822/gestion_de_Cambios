import { normalizeBaseUrl } from './apiClient';

const API_URL_KEY = 'analyticore_api_url';

export function getInitialApiUrl() {
  const configured = localStorage.getItem(API_URL_KEY) || import.meta.env.VITE_API_URL;
  if (configured) return normalizeBaseUrl(configured);
  return import.meta.env.DEV ? 'http://localhost:5000' : '';
}

export function persistApiUrl(value) {
  const normalized = normalizeBaseUrl(value);
  localStorage.setItem(API_URL_KEY, normalized);
  return normalized;
}
