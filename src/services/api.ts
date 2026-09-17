import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Server/Client Base URL Resolver
 * In browser: Always use relative path ('') to route through Next.js proxy endpoints (/api/...)
 * In server-side Node: Use configured ERP_URL / NEXT_PUBLIC_ERP_URL
 */
const getErpUrl = (): string => {
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.env.ERP_URL || process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083';
};

const getApiKey = (): string => {
  return process.env.ERP_API_KEY || process.env.NEXT_PUBLIC_API_KEY || '';
};

const getApiSecret = (): string => {
  return process.env.ERP_API_SECRET || process.env.NEXT_PUBLIC_API_SECRET || '';
};

/**
 * Centralized Axios instance for all ERPNext communication.
 * Browser requests route to local Next.js proxy with local PDM credentials (pdm_session cookie).
 * The server proxy injects the ERPNext API token securely, preventing secret leakage and cookie conflicts.
 */
const axiosClient: AxiosInstance = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 25000,
});

// Request Interceptor: Attach base URL and server-side token when running on Node.js
axiosClient.interceptors.request.use(
  (config) => {
    const url = getErpUrl();
    if (url && !config.baseURL) {
      config.baseURL = url;
    }

    const isLocalApi =
      config.url?.startsWith('/api/') ||
      (!config.url?.startsWith('http://') && !config.url?.startsWith('https://'));

    if (typeof window !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // When running server-side (Node.js), attach configured API token directly
    if (typeof window === 'undefined') {
      const apiKey = getApiKey();
      const apiSecret = getApiSecret();
      if (apiKey && apiSecret) {
        config.headers.Authorization = `token ${apiKey}:${apiSecret}`;
      }
    }

    // Attach PDM User context header if available in browser localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('pdm_user_session');
        if (storedUser) {
          config.headers['x-pdm-user'] = encodeURIComponent(storedUser);
        }
      } catch {
        // ignore storage access issues
      }

      // Ensure withCredentials is true only for local PDM API calls,
      // avoiding sending browser cookies directly to foreign ERPNext URLs.
      config.withCredentials = isLocalApi;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Check if a message is a raw Frappe / ERPNext internal system error
 */
const isRawFrappeSystemError = (msg: string): boolean => {
  if (!msg || typeof msg !== 'string') return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes('reportview.get') ||
    lower.includes('not whitelisted') ||
    lower.includes('method not allowed') ||
    lower.includes('login to access') ||
    lower.includes('you are not permitted to access this resource') ||
    lower.includes('permissionerror') ||
    lower.includes('csrftokenerror') ||
    lower.includes('traceback (most recent call last)') ||
    lower.includes('frappe.exceptions') ||
    lower.includes('doesnotexisterror')
  );
};

const isGenericMsg = (msg: string | null | undefined): boolean => {
  if (!msg || typeof msg !== 'string') return true;
  const lower = msg.toLowerCase().trim();
  return lower === 'invalid request' || lower === 'bad request' || lower === 'error' || lower === 'request failed';
};

/**
 * Normalized application-level error extractor.
 * Converts raw Frappe / ERPNext responses into clean, user-friendly messages.
 * Never leaks raw traceback, whitelisting, or desk internal messages to the UI.
 */
export const normalizeApiError = (resData: any, status?: number): string => {
  // 1. Map HTTP status codes directly for authentication & authorization
  if (status === 401) {
    return 'Your ERPNext authentication session has expired. Please sign in again.';
  }
  if (status === 403) {
    return 'You do not have permission to access this data.';
  }
  if (status === 404) {
    return 'The requested resource was not found.';
  }
  if (status === 429) {
    return 'Too many requests. Please try again in a few moments.';
  }
  if (status && status >= 500) {
    return 'The ERPNext server is temporarily unavailable. Please try again later.';
  }

  if (!resData) {
    return `An error occurred while connecting to the ERPNext server (${status || 'Unknown'})`;
  }

  // Handle specific session or CSRF failures
  if (
    resData.exc_type === 'CSRFTokenError' ||
    resData.exc_type === 'PermissionError' ||
    (typeof resData === 'string' && (resData.includes('CSRFTokenError') || resData.includes('PermissionError')))
  ) {
    return 'Your ERPNext authentication session has expired. Please sign in again.';
  }

  // Parse server messages if available
  let candidateMessage = '';

  if (resData._server_messages) {
    try {
      const parsed = typeof resData._server_messages === 'string'
        ? JSON.parse(resData._server_messages)
        : resData._server_messages;

      if (Array.isArray(parsed) && parsed.length > 0) {
        const item = typeof parsed[0] === 'string' ? JSON.parse(parsed[0]) : parsed[0];
        const msg = item.message || item.exc || item.title;
        if (msg && typeof msg === 'string') {
          candidateMessage = msg.replace(/<[^>]*>?/gm, '').trim();
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // Try custom error message
  if (!candidateMessage && resData._error_message && typeof resData._error_message === 'string') {
    candidateMessage = resData._error_message.replace(/<[^>]*>?/gm, '').trim();
  }

  // Try error field
  if (!candidateMessage && resData.error && typeof resData.error === 'string') {
    candidateMessage = resData.error.replace(/<[^>]*>?/gm, '').trim();
  }

  // Try message field
  if (!candidateMessage && resData.message) {
    if (typeof resData.message === 'string') {
      candidateMessage = resData.message.replace(/<[^>]*>?/gm, '').trim();
    } else if (typeof resData.message === 'object' && resData.message.message) {
      candidateMessage = String(resData.message.message).replace(/<[^>]*>?/gm, '').trim();
    }
  }

  // Try exception string
  if (!candidateMessage && resData.exception && typeof resData.exception === 'string') {
    const excStr = resData.exception.replace(/<[^>]*>?/gm, '').trim();
    if (excStr.includes(':')) {
      candidateMessage = excStr.split(':').slice(1).join(':').trim();
    } else {
      candidateMessage = excStr;
    }
  }

  // If candidate is a raw Frappe system/whitelisting error, sanitize to clean user message
  if (isRawFrappeSystemError(candidateMessage)) {
    if (candidateMessage.toLowerCase().includes('not whitelisted') || candidateMessage.toLowerCase().includes('login to access')) {
      return 'Your ERPNext authentication session has expired. Please sign in again.';
    }
    return 'You do not have permission to access this data.';
  }

  // If candidate is a valid domain validation message (e.g. unique project name), return it
  if (candidateMessage && !isGenericMsg(candidateMessage)) {
    return candidateMessage;
  }

  return 'An unexpected error occurred while communicating with ERPNext.';
};

// Response Interceptor: Handle 401, 403, 500, and format ERPNext server messages
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const status = error.response?.status;
    const resData = error.response?.data;

    // Developer logging with raw diagnostic payload
    console.warn('[ERPNext API Diagnostic Log]', {
      status,
      url: error.config?.url,
      method: error.config?.method,
      data: resData,
      rawError: error.message,
    });

    let sanitizedMessage = 'An error occurred while connecting to the ERPNext server.';

    if (error.response) {
      sanitizedMessage = normalizeApiError(resData, status);
    } else if (error.request) {
      sanitizedMessage = 'No response received from ERPNext server. Please check network connection.';
    } else {
      sanitizedMessage = error.message && !isRawFrappeSystemError(error.message)
        ? error.message
        : sanitizedMessage;
    }

    // Auto-redirect on 401 if in browser environment and on session auth check
    if (status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const requestUrl = error.config?.url || '';
      const isAuthCheck =
        requestUrl.includes('/api/auth/pdm-session') ||
        requestUrl.includes('frappe.auth.get_logged_user');
      if (isAuthCheck) {
        window.location.href = '/login?session_expired=true';
      }
    }

    return Promise.reject(new Error(sanitizedMessage));
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

export const erpnextApiClient: ApiClientService = {
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

// Backwards-compatible export alias
export const api: ApiClientService = erpnextApiClient;
export default erpnextApiClient;
