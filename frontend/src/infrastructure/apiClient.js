const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function normalizeBaseUrl(value) {
  const baseUrl = String(value || '').trim().replace(/\/$/, '');
  if (!baseUrl) return '';
  if (/^https?:\/\//i.test(baseUrl)) return baseUrl;
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?/i.test(baseUrl);
  return `${local ? 'http' : 'https'}://${baseUrl}`;
}

async function request(baseUrl, path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!baseUrl) throw new ApiError('La URL del servicio no está configurada.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...options, signal: controller.signal });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = typeof payload === 'object' ? payload.error : payload;
      throw new ApiError(message || `El servicio respondió con código ${response.status}.`, response.status);
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('El servicio tardó demasiado en responder.');
    if (error instanceof ApiError) throw error;
    throw new ApiError('No fue posible conectar con el servicio de análisis.');
  } finally {
    clearTimeout(timeout);
  }
}

export function createApiClient(rawBaseUrl) {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  return {
    baseUrl,
    health: () => request(baseUrl, '/health', {}, 8_000),
    submit: (text) => request(baseUrl, '/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }, 120_000),
    getJob: (jobId) => request(baseUrl, `/jobs/${jobId}`),
    retryJob: (jobId) => request(baseUrl, `/jobs/${jobId}/retry`, { method: 'POST' }, 120_000),
  };
}
