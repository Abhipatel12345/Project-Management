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
    status: 'Under Review',
    review_status: 'Pending Review',
    file_name: 'PPAP_L3_Control_Plan.xlsx',
    file_size: 2100000,
    description: 'Production Part Approval Process Level 3 documentation and measurement system analysis.',
  },
  {
    name: 'DOC-2026-00004',
    title: 'Battery Enclosure Crash Safety Structural Simulation Report',
    project: 'PROJ-0002',
    document_type: 'Testing',
    version: 'v1.2',
    uploaded_by: 'CAE Specialist',
    upload_date: '2026-08-10',
    status: 'Under Review',
    review_status: 'In Review',
    file_name: 'FEA_Crash_Sim_v1.2.pdf',
    file_size: 18500000,
    description: 'Finite element analysis and impact energy absorption report for underbody tray.',
  },
  {
    name: 'DOC-2026-00005',
    title: 'Interior Door Panel Sub-Assembly DFM Guidelines',
    project: 'PROJ-0001',
    document_type: 'Design',
    version: 'v1.1',
    uploaded_by: 'Lead Designer',
    upload_date: '2026-08-02',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Door_Panel_DFM_v1.1.pdf',
    file_size: 5400000,
    description: 'Design for Manufacturing guidelines for injection molded interior trim components.',
  },
  {
    name: 'DOC-2026-00006',
    title: 'Electric Drive Unit Inverter E/E Architecture Schematic',
    project: 'PROJ-0003',
    document_type: 'Specification',
    version: 'v3.0',
    uploaded_by: 'System Architect',
    upload_date: '2026-08-04',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Inverter_EE_Schematic_v3.pdf',
    file_size: 8900000,
    description: 'High power 800V SiC inverter circuit schematics and PCB layout specifications.',
  },
  {
    name: 'DOC-2026-00007',
    title: 'High Voltage Wiring Harness Routing & Installation Guide',
    project: 'PROJ-0002',
    document_type: 'Process',
    version: 'v1.0',
    uploaded_by: 'Process Engineer',
    upload_date: '2026-08-06',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'HV_Harness_Routing_v1.0.pdf',
    file_size: 4200000,
    description: 'Standard operating procedure for chassis wiring harness attachment points.',
  },
  {
    name: 'DOC-2026-00008',
    title: 'Autonomous Sensor Calibration & Alignment Test Protocol',
    project: 'PROJ-0003',
    document_type: 'Testing',
    version: 'v2.0',
    uploaded_by: 'Validation Lead',
    upload_date: '2026-08-09',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Sensor_Calibration_Test_v2.0.pdf',
    file_size: 6700000,
    description: 'End of line radar and camera sensor calibration procedures.',
  },
  {
    name: 'DOC-2026-00009',
    title: 'Customer Technical Requirement Specification (CTRS) Rev 4',
    project: 'PROJ-0001',
    document_type: 'Customer',
    version: 'v4.0',
    uploaded_by: 'Program Manager',
    upload_date: '2026-08-11',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'OEM_CTRS_Rev4.pdf',
    file_size: 11200000,
    description: 'OEM customer contract technical specifications and performance targets.',
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
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length < 9) {
      const initial = getInitialDocuments();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
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

    let allDocs = Array.from(map.values());

    // Apply project filter to derive base list for project scope
    let baseDocs = allDocs;
    if (params.project && params.project !== 'ALL') {
      baseDocs = allDocs.filter((d) => d.project === params.project);
    }

    // Calculate Summary on baseDocs (UNFILTERED by status/type/search)
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7);
    const summary: DocumentSummary = {
      totalDocuments: baseDocs.length,
      projectDocuments: baseDocs.filter((d) => d.project && d.project !== '').length,
      recentlyAdded: baseDocs.filter((d) => d.upload_date && d.upload_date >= currentMonth).length,
      requiringReview: baseDocs.filter(
        (d) => d.status === 'Under Review' || d.review_status === 'In Review' || d.review_status === 'Pending Review'
      ).length,
    };

    // Apply status, type, search filters for table presentation
    let docs = baseDocs;

    if (params.status && params.status !== 'ALL') {
      if (params.status === 'Under Review') {
        docs = docs.filter(
          (d) => d.status === 'Under Review' || d.review_status === 'In Review' || d.review_status === 'Pending Review'
        );
      } else {
        docs = docs.filter((d) => d.status === params.status);
      }
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
