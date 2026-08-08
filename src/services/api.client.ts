import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_ERPNEXT_URL || 'https://demo.erpnext.com';
const apiKey = process.env.NEXT_PUBLIC_ERPNEXT_API_KEY || '';
const apiSecret = process.env.NEXT_PUBLIC_ERPNEXT_API_SECRET || '';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (apiKey && apiSecret) {
      config.headers.Authorization = `token ${apiKey}:${apiSecret}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?._server_messages ||
      error.message ||
      'An unexpected ERPNext API error occurred';
    
    console.error('[ERPNext API Error]:', message);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
