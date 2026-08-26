import api from './api';
import {
  PROJECT_CONNECTIONS,
  ConnectionCountResult,
  ConnectionRecordsResponse,
  ConnectionRecordItem,
} from '@/types/connection.types';

export const projectConnectionsService = {
  /**
   * Fetch live count for a single DocType linked to a Project ID
   */
  async getConnectionCount(
    projectId: string,
    doctype: string,
    label: string,
    group: string,
    projectField: string = 'project',
    alternativeProjectField?: string
  ): Promise<ConnectionCountResult> {
    if (!projectId || !doctype) {
      return {
        doctype,
        label,
        group,
        count: 0,
        status: 'success',
      };
    }

    const tryFetchWithField = async (fieldToUse: string): Promise<number> => {
      const filters = JSON.stringify([[fieldToUse, '=', projectId]]);
      const fields = JSON.stringify(['name']);
      const url = `/api/resource/${encodeURIComponent(doctype)}?filters=${encodeURIComponent(
        filters
      )}&fields=${encodeURIComponent(fields)}&limit_page_length=9999`;

      const response = await api.get<{ data: any[] }>(url);
      return Array.isArray(response.data) ? response.data.length : 0;
    };

    try {
      const count = await tryFetchWithField(projectField);
      return {
        doctype,
        label,
        group,
        count,
        status: 'success',
      };
    } catch (err: any) {
      const errStr = String(err?.message || err);
      
      // Fallback: If primary projectField is not permitted and an alternative exists, try it
      if (alternativeProjectField && (errStr.includes('Field not permitted') || errStr.includes('Invalid field'))) {
        try {
          const count = await tryFetchWithField(alternativeProjectField);
          return {
            doctype,
            label,
            group,
            count,
            status: 'success',
          };
        } catch (altErr: any) {
          // fall through to error handling below
        }
      }

      // General fallback if field not permitted: query all records
      if (errStr.includes('Field not permitted') || errStr.includes('417') || errStr.includes('DataError')) {
        try {
          const url = `/api/resource/${encodeURIComponent(doctype)}?fields=${encodeURIComponent(
            JSON.stringify(['name'])
          )}&limit_page_length=500`;
          const response = await api.get<{ data: any[] }>(url);
          const count = Array.isArray(response.data) ? response.data.length : 0;
          return {
            doctype,
            label,
            group,
            count,
            status: 'success',
          };
        } catch {
          // continue
        }
      }

      if (errStr.includes('403') || errStr.includes('Permission') || errStr.includes('Access denied')) {
        return {
          doctype,
          label,
          group,
          count: null,
          status: 'permission_denied',
          errorMessage: 'Permission denied',
        };
      }

      if (errStr.includes('404') || errStr.includes('DoesNotExistError') || errStr.includes('not found')) {
        return {
          doctype,
          label,
          group,
          count: null,
          status: 'not_found',
          errorMessage: 'DocType unavailable',
        };
      }

      return {
        doctype,
        label,
        group,
        count: null,
        status: 'error',
        errorMessage: errStr.length > 60 ? `${errStr.substring(0, 57)}...` : errStr,
      };
    }
  },

  /**
   * Fetch counts for ALL 14 DocTypes across all 5 groups in parallel
   */
  async getAllConnectionCounts(projectId: string): Promise<Record<string, ConnectionCountResult>> {
    const allItems = PROJECT_CONNECTIONS.flatMap((g) =>
      g.items.map((item) => ({ ...item, group: g.group }))
    );

    const promises = allItems.map((item) =>
      this.getConnectionCount(
        projectId,
        item.doctype,
        item.label,
        item.group,
        item.projectField,
        item.alternativeProjectField
      )
    );

    const results = await Promise.all(promises);

    const countsMap: Record<string, ConnectionCountResult> = {};
    results.forEach((res) => {
      countsMap[res.doctype] = res;
    });

    return countsMap;
  },

  /**
   * Fetch paginated list of related records for a given DocType and Project ID
   */
  async getConnectionRecords(
    projectId: string,
    doctype: string,
    projectField: string = 'project',
    alternativeProjectField?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ConnectionRecordsResponse> {
    const limitStart = (page - 1) * pageSize;
    
    const getFieldsForDocType = (dt: string): string[] => {
      switch (dt) {
        case 'Material Request':
          return ['name', 'title', 'status', 'docstatus', 'material_request_type', 'transaction_date', 'schedule_date', 'creation', 'modified', 'owner'];
        case 'BOM':
          return ['name', 'item', 'item_name', 'docstatus', 'is_active', 'project', 'quantity', 'creation', 'modified', 'owner'];
        case 'Task':
          return ['name', 'subject', 'status', 'priority', 'exp_start_date', 'exp_end_date', 'project', 'creation', 'modified'];
        case 'Sales Order':
        case 'Delivery Note':
        case 'Sales Invoice':
          return ['name', 'customer', 'status', 'docstatus', 'delivery_date', 'posting_date', 'grand_total', 'creation', 'modified'];
        case 'Purchase Order':
        case 'Purchase Receipt':
        case 'Purchase Invoice':
          return ['name', 'supplier', 'status', 'docstatus', 'schedule_date', 'posting_date', 'grand_total', 'creation', 'modified'];
        case 'Stock Entry':
          return ['name', 'stock_entry_type', 'docstatus', 'posting_date', 'creation', 'modified'];
        default:
          return ['name', 'title', 'subject', 'status', 'docstatus', 'creation', 'modified', 'owner'];
      }
    };

    const fetchFields = getFieldsForDocType(doctype);

    const tryQuery = async (fieldToUse?: string, fieldsToUse: string[] = fetchFields) => {
      const filters = fieldToUse ? JSON.stringify([[fieldToUse, '=', projectId]]) : undefined;
      let url = `/api/resource/${encodeURIComponent(doctype)}?fields=${encodeURIComponent(
        JSON.stringify(fieldsToUse)
      )}&limit_start=${limitStart}&limit_page_length=${pageSize}&order_by=${encodeURIComponent(
        'modified desc'
      )}`;
      if (filters) {
        url += `&filters=${encodeURIComponent(filters)}`;
      }

      const response = await api.get<{ data: ConnectionRecordItem[] }>(url);
      return response.data || [];
    };

    try {
      let records: ConnectionRecordItem[] = [];
      try {
        records = await tryQuery(projectField);
      } catch (err: any) {
        const errStr = String(err?.message || err);
        if (alternativeProjectField) {
          try {
            records = await tryQuery(alternativeProjectField);
          } catch {
            records = await tryQuery(undefined);
          }
        } else if (errStr.includes('Field not permitted') || errStr.includes('417') || errStr.includes('DataError')) {
          try {
            records = await tryQuery(undefined);
          } catch {
            records = await tryQuery(undefined, ['name']);
          }
        } else {
          throw err;
        }
      }

      let totalCount = records.length;
      if (records.length === pageSize || page > 1) {
        totalCount = Math.max(page * pageSize, records.length + limitStart);
      }

      return {
        doctype,
        records,
        totalCount,
        page,
        pageSize,
      };
    } catch (error: any) {
      console.error(`[ERPNext Connection Service] Error fetching ${doctype} records:`, error);
      return {
        doctype,
        records: [],
        totalCount: 0,
        page,
        pageSize,
      };
    }
  },

  /**
   * Create a new record in ERPNext with linked Project ID
   */
  async createConnectionRecord(
    doctype: string,
    data: Record<string, any>
  ): Promise<ConnectionRecordItem> {
    try {
      const payload = { ...data };

      // Ensure required child table rows for Material Request in ERPNext
      if (doctype === 'Material Request' && (!payload.items || payload.items.length === 0)) {
        payload.items = [
          {
            item_code: payload.item_code || payload.item || 'RAW-MAT-001',
            qty: Number(payload.qty) || 1,
            schedule_date: payload.schedule_date || new Date().toISOString().split('T')[0],
            uom: 'Nos',
          },
        ];
      }

      // Ensure required child table rows for BOM in ERPNext
      if (doctype === 'BOM' && (!payload.items || payload.items.length === 0)) {
        payload.items = [
          {
            item_code: 'PART-001',
            qty: 1,
            uom: 'Nos',
            rate: 50,
          },
        ];
      }

      const url = `/api/resource/${encodeURIComponent(doctype)}`;
      const response = await api.post<{ data: ConnectionRecordItem }>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error(`[ERPNext Connection Service] Error creating ${doctype} record:`, error);
      throw error;
    }
  },

  /**
   * Fetch standard ERPNext Item Master records for item dropdown selects
   */
  async getErpItems(): Promise<{ name: string; item_name: string; item_group?: string; stock_uom?: string }[]> {
    try {
      const fields = JSON.stringify(['name', 'item_name', 'item_group', 'stock_uom']);
      const url = `/api/resource/Item?fields=${encodeURIComponent(fields)}&limit_page_length=500&order_by=name%20asc`;
      const response = await api.get<{ data: any[] }>(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      console.warn('[ERPNext Connection Service] Could not fetch Items:', err);
      return [];
    }
  },

  /**
   * Submit a Draft record in ERPNext (transition docstatus: 0 -> docstatus: 1)
   */
  async submitConnectionRecord(
    doctype: string,
    name: string
  ): Promise<ConnectionRecordItem> {
    try {
      const url = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
      const response = await api.put<{ data: ConnectionRecordItem }>(url, { docstatus: 1 });
      return response.data;
    } catch (error: any) {
      console.error(`[ERPNext Connection Service] Error submitting ${doctype} ${name}:`, error);
      throw error;
    }
  },
};

export default projectConnectionsService;
