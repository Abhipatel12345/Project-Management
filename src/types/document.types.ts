export type DocumentType =
  | 'Engineering'
  | 'Design'
  | 'Specification'
  | 'Quality'
  | 'Testing'
  | 'APQP'
  | 'Process'
  | 'Customer'
  | 'Other';

export type DocumentStatus =
  | 'Draft'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Archived';

export type DocumentReviewStatus =
  | 'Pending Review'
  | 'In Review'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested';

export interface DocumentItem {
  name: string; // Document ID / ERPNext File name
  title: string;
  project?: string;
  document_type: DocumentType | string;
  version: string;
  uploaded_by: string;
  upload_date?: string;
  status: DocumentStatus;
  review_status: DocumentReviewStatus;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_path?: string;
  mime_type?: string;
  storage_key?: string;
  blob_url?: string;
  storage_type?: 'vercel-blob' | 'local' | 'inline';
  file_data?: string;
  description?: string;
  notes?: string;
  modified?: string;
  owner?: string;
}

export interface DocumentSummary {
  totalDocuments: number;
  projectDocuments: number;
  recentlyAdded: number;
  requiringReview: number;
}

export interface DocumentListQueryParams {
  project?: string;
  search?: string;
  document_type?: string;
  status?: string;
  review_status?: string;
  page?: number;
  pageSize?: number;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: DocumentSummary;
}
