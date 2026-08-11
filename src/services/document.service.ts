import api from './api';
import {
  DocumentItem,
  DocumentListQueryParams,
  DocumentListResponse,
  DocumentSummary,
} from '@/types/document.types';

const STORAGE_KEY = 'pdm_documents_vault_v1';

// Seed initial default documents if none exist
const getInitialDocuments = (): DocumentItem[] => [
  {
    name: 'DOC-2026-00001',
    title: 'Door Handle Assembly CAD Specification & Drawing Set',
    project: 'PROJ-0001',
    document_type: 'Engineering',
    version: 'v2.1',
    uploaded_by: 'Administrator',
    upload_date: '2026-08-01',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Door_Handle_CAD_v2.1.step',
    file_size: 14200000,
    description: 'Final CAD 3D surface model and GD&T tolerance drawings for exterior latch assembly.',
    notes: 'Approved by Lead Body Systems Engineer.',
  },
  {
    name: 'DOC-2026-00002',
    title: 'EV Powertrain Cooling Loop DFMEA & Risk Register',
    project: 'PROJ-0002',
    document_type: 'APQP',
    version: 'v1.4',
    uploaded_by: 'Administrator',
    upload_date: '2026-08-05',
    status: 'Under Review',
    review_status: 'In Review',
    file_name: 'EV_Cooling_DFMEA_v1.4.pdf',
    file_size: 3800000,
    description: 'Design Failure Mode Effects Analysis for high voltage thermal management loop.',
    notes: 'Requires sign-off from Thermal Safety Manager.',
  },
  {
    name: 'DOC-2026-00003',
    title: 'PPAP Level 3 Quality Control Plan & Gauge R&R',
    project: 'PROJ-0001',
    document_type: 'Quality',
    version: 'v1.0',
    uploaded_by: 'Quality Lead',
    upload_date: '2026-08-08',
    status: 'Draft',
    review_status: 'Pending Review',
    file_name: 'PPAP_L3_Control_Plan.xlsx',
    file_size: 2100000,
    description: 'Production Part Approval Process Level 3 documentation and measurement system analysis.',
  },
];

const getStoredDocuments = (): DocumentItem[] => {
  if (typeof window === 'undefined') return getInitialDocuments();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialDocuments();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialDocuments();
  }
};

const saveStoredDocuments = (docs: DocumentItem[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch {
      // fallback
    }
  }
};

export const documentService = {
  async getDocuments(params: DocumentListQueryParams = {}): Promise<DocumentListResponse> {
    let localDocs = getStoredDocuments();
    let remoteDocs: DocumentItem[] = [];

    // Try fetching from ERPNext File DocType
    try {
      const response = await api.get<{ data: any[] }>(
        '/api/resource/File?fields=["name","file_name","file_url","file_size","attached_to_doctype","attached_to_name","owner","creation","modified"]&limit_page_length=100'
      );
      if (response?.data && Array.isArray(response.data)) {
        remoteDocs = response.data.map((f: any) => ({
          name: f.name,
          title: f.file_name || f.name,
          project: f.attached_to_name || '',
          document_type: 'Engineering',
          version: 'v1.0',
          uploaded_by: f.owner || 'System',
          upload_date: f.creation ? f.creation.split(' ')[0] : undefined,
          status: 'Approved' as const,
          review_status: 'Approved' as const,
          file_url: f.file_url,
          file_name: f.file_name,
          file_size: f.file_size,
        }));
      }
    } catch {
      // non-blocking fallback
    }

    // Merge remote and local documents
    const map = new Map<string, DocumentItem>();
    localDocs.forEach((d) => map.set(d.name, d));
    remoteDocs.forEach((d) => {
      if (!map.has(d.name)) map.set(d.name, d);
    });

    let docs = Array.from(map.values());

    // Apply filtering
    if (params.project && params.project !== 'ALL') {
      docs = docs.filter((d) => d.project === params.project);
    }

    if (params.status && params.status !== 'ALL') {
      docs = docs.filter((d) => d.status === params.status);
    }

    if (params.document_type && params.document_type !== 'ALL') {
      docs = docs.filter((d) => d.document_type === params.document_type);
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          (d.project && d.project.toLowerCase().includes(q)) ||
          (d.uploaded_by && d.uploaded_by.toLowerCase().includes(q))
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const summary: DocumentSummary = {
      totalDocuments: docs.length,
      projectDocuments: docs.filter((d) => d.project && d.project !== '').length,
      recentlyAdded: docs.filter((d) => d.upload_date && d.upload_date >= todayStr.substring(0, 7)).length,
      requiringReview: docs.filter(
        (d) => d.status === 'Under Review' || d.review_status === 'In Review' || d.review_status === 'Pending Review'
      ).length,
    };

    return {
      documents: docs,
      totalCount: docs.length,
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      summary,
    };
  },

  async createDocument(data: Partial<DocumentItem>): Promise<DocumentItem> {
    const nextId = `DOC-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const newDoc: DocumentItem = {
      name: nextId,
      title: data.title || 'Untitled Document',
      project: data.project || '',
      document_type: data.document_type || 'Engineering',
      version: data.version || 'v1.0',
      uploaded_by: data.uploaded_by || 'Administrator',
      upload_date: new Date().toISOString().split('T')[0],
      status: data.status || 'Draft',
      review_status: data.review_status || 'Pending Review',
      file_name: data.file_name,
      file_size: data.file_size,
      description: data.description || '',
      notes: data.notes || '',
    };

    // Try creating File record in ERPNext
    try {
      await api.post('/api/resource/File', {
        file_name: newDoc.file_name || `${newDoc.title}.pdf`,
        attached_to_doctype: 'Project',
        attached_to_name: newDoc.project || undefined,
        is_private: 0,
      });
    } catch {
      // non-blocking fallback
    }

    // Persist locally
    const docs = getStoredDocuments();
    docs.unshift(newDoc);
    saveStoredDocuments(docs);

    return newDoc;
  },

  async updateDocument(name: string, data: Partial<DocumentItem>): Promise<DocumentItem> {
    const docs = getStoredDocuments();
    const index = docs.findIndex((d) => d.name === name);
    let updated: DocumentItem;

    if (index !== -1) {
      docs[index] = { ...docs[index], ...data, modified: new Date().toISOString() };
      updated = docs[index];
    } else {
      updated = {
        name,
        title: data.title || 'Document',
        document_type: data.document_type || 'Engineering',
        version: data.version || 'v1.0',
        uploaded_by: 'Administrator',
        status: data.status || 'Approved',
        review_status: data.review_status || 'Approved',
        ...data,
      };
      docs.unshift(updated);
    }

    saveStoredDocuments(docs);
    return updated;
  },

  async deleteDocument(name: string): Promise<void> {
    try {
      await api.delete(`/api/resource/File/${encodeURIComponent(name)}`);
    } catch {
      // non-blocking
    }
    const docs = getStoredDocuments().filter((d) => d.name !== name);
    saveStoredDocuments(docs);
  },
};

export default documentService;
