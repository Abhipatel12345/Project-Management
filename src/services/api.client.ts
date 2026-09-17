import { erpnextApiClient, api } from './api';

/**
 * Standardized centralized ERPNext API client re-export
 * Ensures consistent authentication, error normalization, and zero raw Frappe error leakage
 */
export const apiClient = erpnextApiClient.getInstance();
export { erpnextApiClient, api };
export default erpnextApiClient;
