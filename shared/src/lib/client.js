import axios from 'axios';

export class ApiRequestError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function createClient({ baseURL, tokenKey = 'ecomedu_token', onUnauthorized }) {
  const http = axios.create({ baseURL, timeout: 30000 });

  const getToken = () => {
    try {
      return localStorage.getItem(tokenKey);
    } catch {
      return null;
    }
  };

  http.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  const normalize = (err) => {
    const status = err.response?.status;
    if (status === 401 && getToken()) (onUnauthorized || (() => window.dispatchEvent(new Event('ecomedu:unauthorized'))))();
    const data = err.response?.data;
    const fieldMessage = data?.errors?.[0] ? `${data.errors[0].field ? `${data.errors[0].field}: ` : ''}${data.errors[0].message}` : null;
    const message = !err.response ? 'Cannot reach the server. Check your connection.' : fieldMessage && data.message === 'Validation failed' ? fieldMessage : data?.message || 'Something went wrong';
    return new ApiRequestError(message, status, data?.errors);
  };

  const request = async (method, url, { params, data, ...rest } = {}) => {
    try {
      const res = await http.request({ method, url, params, data, ...rest });
      return { data: res.data?.data ?? null, meta: res.data?.meta ?? null };
    } catch (err) {
      throw normalize(err);
    }
  };

  return {
    http,
    baseURL,
    tokenKey,
    getToken,
    setToken: (token) => {
      try {
        if (token) localStorage.setItem(tokenKey, token);
        else localStorage.removeItem(tokenKey);
      } catch {
        /* storage unavailable */
      }
    },
    get: (url, params) => request('get', url, { params }),
    post: (url, data) => request('post', url, { data }),
    patch: (url, data) => request('patch', url, { data }),
    put: (url, data) => request('put', url, { data }),
    delete: (url) => request('delete', url),
    upload: async (kind, file, onProgress) => {
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await http.post(`/uploads/${kind}`, form, { onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / (e.total || 1)) * 100)) });
        return res.data.data;
      } catch (err) {
        throw normalize(err);
      }
    },
    download: async (url, filename, params) => {
      try {
        const res = await http.get(url, { params, responseType: 'blob' });
        const href = URL.createObjectURL(res.data);
        const link = document.createElement('a');
        link.href = href;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(href);
      } catch (err) {
        throw normalize(err);
      }
    },
  };
}

export const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null && value !== 'all'));
