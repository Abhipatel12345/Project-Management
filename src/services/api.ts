import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const getErpUrl = (): string => {
  if (typeof window !== 'undefined') {
    // In browser: use relative path to route through Next.js proxy rewrites, avoiding CORS
    return '';
  }
  return process.env.NEXT_PUBLIC_ERP_URL || 'https://demo.erpnext.com';
};

const getApiKey = (): string => {
  return process.env.NEXT_PUBLIC_API_KEY || '';
};

const getApiSecret = (): string => {
  return process.env.NEXT_PUBLIC_API_SECRET || '';
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

// Request Interceptor: Attach base URL and Authorization token dynamically
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
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401, 403, 500, and format ERPNext server messages
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    let errorMessage = 'An error occurred while connecting to the ERPNext server';
    const status = error.response?.status;

    if (error.response) {
      const resData = error.response.data;
      const serverMessages = resData?._server_messages;
      const exception = resData?.exception;
      const message = resData?.message;
      const errorMsg = resData?._error_message;

      if (errorMsg && typeof errorMsg === 'string') {
        errorMessage = errorMsg.replace(/<[^>]*>?/gm, '').trim();
      } else if (serverMessages) {
        try {
          const parsed = typeof serverMessages === 'string' ? JSON.parse(serverMessages) : serverMessages;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const inner = typeof parsed[0] === 'string' ? JSON.parse(parsed[0]) : parsed[0];
            const rawMsg = inner.message || inner.exc || inner.title || serverMessages;
            errorMessage = String(rawMsg).replace(/<[^>]*>?/gm, '').trim();
          }
        } catch {
          errorMessage = typeof serverMessages === 'string' ? serverMessages.replace(/<[^>]*>?/gm, '').trim() : errorMessage;
        }
      } else if (exception) {
        const lastPart = exception.split(':').pop()?.trim() || exception;
        errorMessage = lastPart.replace(/<[^>]*>?/gm, '').trim();
      } else if (message && typeof message === 'string' && message !== 'Invalid Request' && message !== 'Bad Request') {
        errorMessage = message.replace(/<[^>]*>?/gm, '').trim();
      } else if (status === 401) {
        errorMessage = 'Invalid username/password or session expired. Please sign in to ERPNext.';
      } else if (status === 403) {
        errorMessage = 'Access denied. You do not have permission for this resource.';
      } else if (status === 500) {
        errorMessage = 'ERPNext internal server error. Please check server logs.';
      } else {
        errorMessage = `HTTP Error ${status}: ${error.response.statusText || 'Bad Request'}`;
      }
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
