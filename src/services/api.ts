import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const getErpUrl = (): string => {
  if (typeof window !== 'undefined') {
    // In browser: use relative path to route through Next.js proxy rewrites, avoiding CORS
    return '';
  }
  return process.env.NEXT_PUBLIC_ERP_URL || 'http://localhost:8080';
};

const getApiKey = (): string => {
  return process.env.NEXT_PUBLIC_API_KEY || '';
};

const getApiSecret = (): string => {
  return process.env.NEXT_PUBLIC_API_SECRET || '';
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

// Create base Axios instance with cookie credentials enabled
const axiosClient: AxiosInstance = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 20000,
});

// Request Interceptor: Attach base URL, Authorization token, and CSRF token dynamically
axiosClient.interceptors.request.use(
  (config) => {
    const url = getErpUrl();
    const apiKey = getApiKey();
    const apiSecret = getApiSecret();

    if (url && !config.baseURL) {
      config.baseURL = url;
    }

    if (apiKey && apiSecret) {
      config.headers.Authorization = `token ${apiKey}:${apiSecret}`;
      // Disable withCredentials for API token authentication so browser session cookies
      // (like sid or csrf_token from ERPNext desk) do not trigger Frappe CSRFTokenError.
      config.withCredentials = false;
    }

    if (typeof window !== 'undefined') {
      const csrfToken =
        getCookie('csrf_token') ||
        (window as any).csrf_token ||
        (window as any).frappe?.csrf_token;

      if (csrfToken && csrfToken !== 'guest') {
        config.headers['X-Frappe-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const isGenericMsg = (msg: string | null | undefined): boolean => {
  if (!msg || typeof msg !== 'string') return true;
  const lower = msg.toLowerCase().trim();
  return lower === 'invalid request' || lower === 'bad request' || lower === 'error';
};

const extractErpErrorMessage = (resData: any, status?: number): string => {
  if (!resData) return `ERPNext REST API Error (${status || 'Unknown'})`;

  // Specific handling for CSRFTokenError
  if (resData.exc_type === 'CSRFTokenError' || (typeof resData === 'string' && resData.includes('CSRFTokenError'))) {
    return 'Session security token expired or invalid (CSRFTokenError). Please refresh the page to reload session credentials.';
  }

  // If resData is a string (e.g. raw HTML or plain message)
  if (typeof resData === 'string') {
    const cleaned = resData.replace(/<[^>]*>?/gm, '').trim();
    if (cleaned && !isGenericMsg(cleaned)) return cleaned;
  }

  // 1. Try _server_messages
  if (resData._server_messages) {
    try {
      const parsed = typeof resData._server_messages === 'string'
        ? JSON.parse(resData._server_messages)
        : resData._server_messages;

      if (Array.isArray(parsed) && parsed.length > 0) {
        const item = typeof parsed[0] === 'string' ? JSON.parse(parsed[0]) : parsed[0];
        const msg = item.message || item.exc || item.title;
        if (msg && typeof msg === 'string') {
          const cleaned = msg.replace(/<[^>]*>?/gm, '').trim();
          if (cleaned && !isGenericMsg(cleaned)) return cleaned;
        }
      }
    } catch {
      // ignore JSON parse errors and continue
    }
  }

  // 2. Try exception string (e.g. "frappe.exceptions.ValidationError: Priority cannot be \"Critical\"...")
  if (resData.exception && typeof resData.exception === 'string') {
    const excStr = resData.exception.replace(/<[^>]*>?/gm, '').trim();
    if (excStr.includes(':')) {
      const parts = excStr.split(':');
      const detail = parts.slice(1).join(':').trim();
      if (detail && !isGenericMsg(detail)) return detail;
    }
    if (excStr && !isGenericMsg(excStr)) return excStr;
  }

  // 3. Try _error_message
  if (resData._error_message && typeof resData._error_message === 'string') {
    const cleaned = resData._error_message.replace(/<[^>]*>?/gm, '').trim();
    if (cleaned && !isGenericMsg(cleaned)) return cleaned;
  }

  // 4. Try message field
  if (resData.message) {
    if (typeof resData.message === 'string') {
      const cleaned = resData.message.replace(/<[^>]*>?/gm, '').trim();
      if (cleaned && !isGenericMsg(cleaned)) return cleaned;
    } else if (typeof resData.message === 'object') {
      try {
        return JSON.stringify(resData.message);
      } catch {
        // ignore
      }
    }
  }

  // 5. Try exc field (array of stack traces)
  if (Array.isArray(resData.exc) && resData.exc.length > 0) {
    const firstExc = resData.exc[0];
    if (typeof firstExc === 'string') {
      const lines = firstExc.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const valErrLine = lines.find((l: string) => l.includes('ValidationError:') || l.includes('Error:'));
      if (valErrLine) {
        const cleaned = valErrLine.replace(/<[^>]*>?/gm, '').trim();
        if (cleaned) return cleaned;
      }
    }
  }

  if (status === 401) return 'Invalid username/password or session expired. Please sign in to ERPNext.';
  if (status === 403) return 'Access denied. You do not have permission for this resource.';
  if (status === 500) return 'ERPNext internal server error. Please check server logs.';

  // Fallback: If resData has structure, stringify it instead of masking with generic "Bad Request"
  if (typeof resData === 'object') {
    try {
      const strData = JSON.stringify(resData);
      if (strData !== '{}') return `ERPNext Error (${status || 'Unknown'}): ${strData}`;
    } catch {
      // ignore
    }
  }

  return `ERPNext REST API Error (${status || 'Unknown'}): Request failed`;
};

// Response Interceptor: Handle 401, 403, 500, and format ERPNext server messages
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    let errorMessage = 'An error occurred while connecting to the ERPNext server';
    const status = error.response?.status;

    if (error.response) {
      const resData = error.response.data;
      console.warn('[ERPNext API Warning Interceptor]', {
        status,
        url: error.config?.url,
        method: error.config?.method,
        data: resData,
      });

      errorMessage = extractErpErrorMessage(resData, status);
    } else if (error.request) {
      errorMessage = 'No response received from ERPNext server. Please check network or target ERP URL.';
    } else {
      errorMessage = error.message || errorMessage;
    }

    // Auto-redirect on 401 if in browser environment and not on /login
    if (status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?session_expired=true';
    }

    return Promise.reject(new Error(errorMessage));
  }
);

// Generic Reusable API Methods Interface
export interface ApiClientService {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  getInstance(): AxiosInstance;
}

export const api: ApiClientService = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await axiosClient.get(url, config);
    return response.data;
  },

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await axiosClient.post(url, data, config);
    return response.data;
  },

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await axiosClient.put(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await axiosClient.delete(url, config);
    return response.data;
  },

  getInstance(): AxiosInstance {
    return axiosClient;
  },
};

export default api;
