// Cliente HTTP único de la aplicación.
//
// Centraliza el contrato que ya define el backend:
// - Colecciones: { data: [], pagination: {} }
// - Recurso individual: { <recurso>: {} }
// - Errores: { status: 'error', message, details: [{ field, message }] }
//
// El access token vive en memoria y se persiste en localStorage para sobrevivir
// a un recargado. El refresh token NO se guarda aquí: viaja en la cookie
// httpOnly `refresh_token` que emite el backend, restringida a `/api/auth`.

const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api';
const STORAGE_KEY = 'provepuentec.accessToken';

let accessToken = localStorage.getItem(STORAGE_KEY) || null;

export const getAccessToken = () => accessToken;

export function setAccessToken(token) {
  accessToken = token || null;
  if (token) localStorage.setItem(STORAGE_KEY, token);
  else localStorage.removeItem(STORAGE_KEY);
}

// Error de API con la forma que devuelve el backend. `details` conserva los
// errores por campo de express-validator para pintarlos junto al input.
export class ApiError extends Error {
  constructor(message, { status, details = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  // Mapa { campo: mensaje } para los formularios.
  get fieldErrors() {
    return this.details.reduce((acc, item) => {
      if (item && item.field) acc[item.field] = item.message;
      return acc;
    }, {});
  }
}

const buildUrl = (path, params) => {
  const url = `${API_PREFIX}${path}`;
  if (!params) return url;

  // Los valores vacíos no se envían: el backend trata `?q=` distinto de omitirlo.
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, value);
  }
  const query = search.toString();
  return query ? `${url}?${query}` : url;
};

async function parseBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

// Un único refresh en vuelo: si varias peticiones caducan a la vez, todas
// esperan la misma renovación en lugar de disparar una cada una.
let refreshing = null;

function refreshSession() {
  if (!refreshing) {
    refreshing = fetch(`${API_PREFIX}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: '{}',
    })
      .then(async (response) => {
        if (!response.ok) throw new ApiError('Sesión expirada', { status: 401 });
        const body = await parseBody(response);
        setAccessToken(body?.accessToken || null);
        return body;
      })
      .catch((error) => {
        setAccessToken(null);
        throw error;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function send(method, path, { body, params, auth = false, retry = true } = {}) {
  const headers = {};
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    credentials: 'include',
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 en una petición autenticada: se intenta renovar una sola vez y repetir.
  if (response.status === 401 && auth && retry) {
    try {
      await refreshSession();
    } catch {
      throw new ApiError('Tu sesión ha expirado. Inicia sesión de nuevo.', { status: 401 });
    }
    return send(method, path, { body, params, auth, retry: false });
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(payload?.message || 'Ha ocurrido un error inesperado', {
      status: response.status,
      details: payload?.details || [],
    });
  }

  return payload;
}

export const http = {
  get: (path, options) => send('GET', path, options),
  post: (path, body, options) => send('POST', path, { ...options, body }),
  patch: (path, body, options) => send('PATCH', path, { ...options, body }),
  delete: (path, options) => send('DELETE', path, options),
  refreshSession,
};
