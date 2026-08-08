export interface ERPNextResponse<T> {
  data: T;
}

export interface ERPNextListResponse<T> {
  data: T[];
}

export interface ERPNextFilter {
  field: string;
  operator: '=' | '!=' | 'like' | 'in' | '>' | '<' | '>=' | '<=';
  value: string | number | boolean | string[];
}

export interface ERPNextListParams {
  fields?: string[];
  filters?: ERPNextFilter[] | [string, string, any][];
  limit_start?: number;
  limit_page_length?: number;
  order_by?: string;
  group_by?: string;
}

export interface ERPNextErrorResponse {
  exception?: string;
  exc?: string;
  message?: string;
  _server_messages?: string;
}
