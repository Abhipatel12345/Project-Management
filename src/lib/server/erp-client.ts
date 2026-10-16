/**
 * Centralized Server-Side ERPNext REST Client
 * Authoritative interface for interacting directly with ERPNext DocTypes
 */

export const getErpUrl = (): string => {
  return (process.env.ERP_URL || process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
};

export const getApiKey = (): string => {
  return process.env.ERP_API_KEY || process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
};

export const getApiSecret = (): string => {
  return process.env.ERP_API_SECRET || process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';
};

export const getAuthHeaders = (): Record<string, string> => {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `token ${getApiKey()}:${getApiSecret()}`,
  };
};

export async function fetchErpResource<T = any>(
  docType: string,
  options: {
    filters?: any[];
    fields?: string[];
    limit?: number;
    order_by?: string;
  } = {}
): Promise<T[]> {
  const erpUrl = getErpUrl();
  const headers = getAuthHeaders();
  const params = new URLSearchParams();

  if (options.filters && options.filters.length > 0) {
    params.set('filters', JSON.stringify(options.filters));
  }
  if (options.fields && options.fields.length > 0) {
    params.set('fields', JSON.stringify(options.fields));
  } else {
    params.set('fields', JSON.stringify(['*']));
  }
  if (options.limit) {
    params.set('limit_page_length', String(options.limit));
  } else {
    params.set('limit_page_length', '1000');
  }
  if (options.order_by) {
    params.set('order_by', options.order_by);
  }

  const url = `${erpUrl}/api/resource/${encodeURIComponent(docType)}?${params.toString()}`;
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[erpClient] fetchErpResource error for ${docType}: ${res.status}`, errText);
    throw new Error(`ERPNext ${docType} fetch failed: ${res.status}`);
  }
  const json = await res.json();
  return (json.data || []) as T[];
}

export async function getErpDoc<T = any>(docType: string, name: string): Promise<T> {
  const erpUrl = getErpUrl();
  const headers = getAuthHeaders();
  const url = `${erpUrl}/api/resource/${encodeURIComponent(docType)}/${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[erpClient] getErpDoc error for ${docType}/${name}: ${res.status}`, errText);
    throw new Error(`ERPNext ${docType}/${name} not found: ${res.status}`);
  }
  const json = await res.json();
  return (json.data || json) as T;
}

export async function createErpDoc<T = any>(docType: string, data: any): Promise<T> {
  const erpUrl = getErpUrl();
  const headers = getAuthHeaders();
  const url = `${erpUrl}/api/resource/${encodeURIComponent(docType)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[erpClient] createErpDoc error for ${docType}: ${res.status}`, errText);
    throw new Error(`Failed to create ${docType}: ${errText}`);
  }
  const json = await res.json();
  return (json.data || json) as T;
}

export async function updateErpDoc<T = any>(docType: string, name: string, data: any): Promise<T> {
  const erpUrl = getErpUrl();
  const headers = getAuthHeaders();
  const url = `${erpUrl}/api/resource/${encodeURIComponent(docType)}/${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[erpClient] updateErpDoc error for ${docType}/${name}: ${res.status}`, errText);
    throw new Error(`Failed to update ${docType}/${name}: ${errText}`);
  }
  const json = await res.json();
  return (json.data || json) as T;
}

export async function deleteErpDoc(docType: string, name: string): Promise<boolean> {
  const erpUrl = getErpUrl();
  const headers = getAuthHeaders();
  const url = `${erpUrl}/api/resource/${encodeURIComponent(docType)}/${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[erpClient] deleteErpDoc error for ${docType}/${name}: ${res.status}`, errText);
    throw new Error(`Failed to delete ${docType}/${name}: ${errText}`);
  }
  return true;
}
