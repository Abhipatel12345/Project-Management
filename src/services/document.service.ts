import api from './api';
import {
  DocumentItem,
  DocumentListQueryParams,
  DocumentListResponse,
  DocumentSummary,
} from '@/types/document.types';

const STORAGE_KEY = 'pdm_documents_vault_v1';

// Seed initial 30 default documents across automotive engineering domains
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
    title: '800V SiC Inverter E/E Architecture Schematic',
    project: 'PROJ-0003',
    document_type: 'Specification',
    version: 'v3.0',
    uploaded_by: 'E/E Architect',
    upload_date: '2026-08-03',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Inverter_EE_Schematic_v3.pdf',
    file_size: 8900000,
    description: 'Electrical and electronics block diagram for traction inverter power stage.',
  },
  {
    name: 'DOC-2026-00007',
    title: 'High Voltage Wiring Harness Routing Installation Guide',
    project: 'PROJ-0002',
    document_type: 'Process',
    version: 'v1.0',
    uploaded_by: 'Manufacturing Engineer',
    upload_date: '2026-08-04',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'HV_Harness_Routing_v1.0.pdf',
    file_size: 6700000,
    description: 'Assembly station work instructions for underbody high voltage cable installation.',
  },
  {
    name: 'DOC-2026-00008',
    title: 'Autonomous Radar Sensor Calibration Protocol',
    project: 'PROJ-0005',
    document_type: 'Testing',
    version: 'v2.0',
    uploaded_by: 'ADAS Calibration Lead',
    upload_date: '2026-08-06',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Sensor_Calibration_Test_v2.0.pdf',
    file_size: 4200000,
    description: 'End-of-line radar alignment and target reflectivity test procedure.',
  },
  {
    name: 'DOC-2026-00009',
    title: 'OEM Customer Technical Requirement Specification (CTRS)',
    project: 'PROJ-0001',
    document_type: 'Customer',
    version: 'Rev 4.0',
    uploaded_by: 'Program Manager',
    upload_date: '2026-07-28',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'OEM_CTRS_Rev4.pdf',
    file_size: 11500000,
    description: 'Customer specified technical requirements and baseline target matrix.',
  },
  {
    name: 'DOC-2026-00010',
    title: 'Active Suspension ECU Software Design Spec',
    project: 'PROJ-0006',
    document_type: 'Engineering',
    version: 'v2.0',
    uploaded_by: 'Controls Engineer',
    upload_date: '2026-08-02',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Active_Suspension_SW_Spec_v2.pdf',
    file_size: 7800000,
    description: 'Software architecture specification for active damper CAN-FD controller.',
  },
  {
    name: 'DOC-2026-00011',
    title: 'Brake-by-Wire Hydraulic Actuator 3D CAD Model',
    project: 'PROJ-0007',
    document_type: 'Design',
    version: 'v1.0',
    uploaded_by: 'CAD Engineer',
    upload_date: '2026-08-04',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Brake_By_Wire_3D_CAD_v1.step',
    file_size: 22400000,
    description: '3D CAD step assembly model for electro-hydraulic braking module.',
  },
  {
    name: 'DOC-2026-00012',
    title: 'Steering Column Torque Sensor IMDS Material Compliance',
    project: 'PROJ-0008',
    document_type: 'Quality',
    version: 'v1.0',
    uploaded_by: 'Compliance Specialist',
    upload_date: '2026-08-01',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Steering_Torque_IMDS_Data.xml',
    file_size: 1200000,
    description: 'International Material Data System chemical composition compliance filing.',
  },
  {
    name: 'DOC-2026-00013',
    title: 'Body Stamping Die Tooling Design Manual',
    project: 'PROJ-0009',
    document_type: 'Process',
    version: 'v1.5',
    uploaded_by: 'Tooling Director',
    upload_date: '2026-08-06',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Body_Stamping_Die_Manual.pdf',
    file_size: 15600000,
    description: 'Tooling die maintenance and springback compensation operating manual.',
  },
  {
    name: 'DOC-2026-00014',
    title: 'Instrument Cluster Anti-Reflective Optical Test Report',
    project: 'PROJ-0010',
    document_type: 'Testing',
    version: 'v1.0',
    uploaded_by: 'Optics Engineer',
    upload_date: '2026-08-08',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Cluster_Glass_Optics_Report.pdf',
    file_size: 3400000,
    description: 'Spectrophotometer glare and light transmission test results.',
  },
  {
    name: 'DOC-2026-00015',
    title: 'Cabin HEPA Filter Efficiency Validation Protocol',
    project: 'PROJ-0011',
    document_type: 'Testing',
    version: 'v1.1',
    uploaded_by: 'HVAC Specialist',
    upload_date: '2026-08-09',
    status: 'Under Review',
    review_status: 'In Review',
    file_name: 'Cabin_HEPA_Validation_Plan.docx',
    file_size: 2800000,
    description: 'ISO 29463 particulate filtration testing protocol for vehicle cabin air.',
  },
  {
    name: 'DOC-2026-00016',
    title: 'Front Matrix LED Headlamp Thermal Simulation',
    project: 'PROJ-0012',
    document_type: 'Engineering',
    version: 'v2.2',
    uploaded_by: 'Thermal Engineer',
    upload_date: '2026-08-01',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Matrix_Headlamp_Thermal_FEA.pdf',
    file_size: 9400000,
    description: 'Ansys Fluent thermal CFD simulation for 120W LED heatsink design.',
  },
  {
    name: 'DOC-2026-00017',
    title: 'Rear Lightbar Ray Tracing Optical Simulation',
    project: 'PROJ-0013',
    document_type: 'Design',
    version: 'v1.0',
    uploaded_by: 'Lighting Designer',
    upload_date: '2026-08-03',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Tail_Lightbar_Raytracing.pdf',
    file_size: 11200000,
    description: 'Speos light guide ray tracing simulation and uniformity analysis.',
  },
  {
    name: 'DOC-2026-00018',
    title: 'Pyrotechnic Pretensioner Safety Reliability Manual',
    project: 'PROJ-0014',
    document_type: 'Specification',
    version: 'v1.3',
    uploaded_by: 'Safety Engineer',
    upload_date: '2026-08-07',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Pretensioner_Safety_Manual.pdf',
    file_size: 4800000,
    description: 'Hazardous materials handling and deployment safety protocol.',
  },
  {
    name: 'DOC-2026-00019',
    title: 'Stator Water Jacket Casting DFM Inspection Plan',
    project: 'PROJ-0015',
    document_type: 'APQP',
    version: 'v1.0',
    uploaded_by: 'Quality Lead',
    upload_date: '2026-08-05',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Stator_Jacket_DFM_Inspection.pdf',
    file_size: 6100000,
    description: 'X-ray CT scan porosity inspection plan for motor stator housing.',
  },
  {
    name: 'DOC-2026-00020',
    title: 'Oil Cooler Vacuum Braze Leak Test Procedure',
    project: 'PROJ-0016',
    document_type: 'Quality',
    version: 'v1.0',
    uploaded_by: 'Quality Inspector',
    upload_date: '2026-08-06',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Oil_Cooler_Braze_Leak_SOP.pdf',
    file_size: 1900000,
    description: 'Standard Operating Procedure for helium mass spectrometer leak testing.',
  },
  {
    name: 'DOC-2026-00021',
    title: 'Heat Pump Electronic Expansion Valve Control Mapping',
    project: 'PROJ-0017',
    document_type: 'Specification',
    version: 'v2.0',
    uploaded_by: 'Systems Engineer',
    upload_date: '2026-08-04',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Heat_Pump_Expansion_Valve_Mapping.xlsx',
    file_size: 3100000,
    description: 'Stepper motor position lookup table versus refrigerant superheat.',
  },
  {
    name: 'DOC-2026-00022',
    title: '5G Telematics Control Unit FCC/CE Regulatory Dossier',
    project: 'PROJ-0018',
    document_type: 'Customer',
    version: 'v1.0',
    uploaded_by: 'Regulatory Manager',
    upload_date: '2026-08-07',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'TCU_5G_Regulatory_Dossier.pdf',
    file_size: 14800000,
    description: 'Global wireless type approval certification documents.',
  },
  {
    name: 'DOC-2026-00023',
    title: 'Automotive Cybersecurity Threat Assessment (ISO 21434)',
    project: 'PROJ-0019',
    document_type: 'Engineering',
    version: 'v1.2',
    uploaded_by: 'Security Officer',
    upload_date: '2026-08-02',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Cybersecurity_TARA_Report_ISO21434.pdf',
    file_size: 5900000,
    description: 'Threat Analysis and Risk Assessment for connected vehicle gateway.',
  },
  {
    name: 'DOC-2026-00024',
    title: 'Charge Port Weather Seal EPDM Material Spec',
    project: 'PROJ-0020',
    document_type: 'Quality',
    version: 'v1.0',
    uploaded_by: 'Materials Engineer',
    upload_date: '2026-08-06',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Charge_Port_Seal_Material_Spec.pdf',
    file_size: 2300000,
    description: 'EPDM rubber elastomeric properties and UV aging test limits.',
  },
  {
    name: 'DOC-2026-00025',
    title: 'Electric Power Steering Motor Cogging Test Procedure',
    project: 'PROJ-0021',
    document_type: 'Testing',
    version: 'v1.0',
    uploaded_by: 'Test Engineer',
    upload_date: '2026-08-04',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'EPS_Motor_Cogging_Test_Procedure.pdf',
    file_size: 3700000,
    description: 'Dynamometer setup and torque transducer sampling procedure.',
  },
  {
    name: 'DOC-2026-00026',
    title: 'Side Curtain Airbag -40C Cold Deployment Video Log',
    project: 'PROJ-0022',
    document_type: 'Testing',
    version: 'v1.0',
    uploaded_by: 'Crash Test Lead',
    upload_date: '2026-08-08',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Side_Airbag_Cold_Deployment_Video.mp4',
    file_size: 45000000,
    description: 'High-speed camera deployment video recording at 5000 fps.',
  },
  {
    name: 'DOC-2026-00027',
    title: 'Driver Monitoring System 940nm IR LED Spectrum Spec',
    project: 'PROJ-0023',
    document_type: 'Specification',
    version: 'v1.1',
    uploaded_by: 'Optoelectronics Lead',
    upload_date: '2026-08-08',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'DMS_IR_LED_Spectrum_Spec.pdf',
    file_size: 2900000,
    description: 'Eye safety IEC 62471 compliance and spectral emission specification.',
  },
  {
    name: 'DOC-2026-00028',
    title: 'TPMS Receiver Antenna Sensitivity & EMC Test Plan',
    project: 'PROJ-0024',
    document_type: 'Testing',
    version: 'v1.0',
    uploaded_by: 'RF Test Lead',
    upload_date: '2026-08-09',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'TPMS_EMC_Sensitivity_Plan.pdf',
    file_size: 4100000,
    description: 'CISPR 25 class 5 radiated emissions test plan.',
  },
  {
    name: 'DOC-2026-00029',
    title: 'Sunroof Cable Drive NVH Acoustic Measurement Data',
    project: 'PROJ-0025',
    document_type: 'Design',
    version: 'v1.0',
    uploaded_by: 'NVH Engineer',
    upload_date: '2026-08-05',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Sunroof_NVH_Benchmark_Data.csv',
    file_size: 8900000,
    description: 'Sound pressure level measurements across operating temperature range.',
  },
  {
    name: 'DOC-2026-00030',
    title: 'Wireless BMS Node Mesh Network Protocol Spec',
    project: 'PROJ-0030',
    document_type: 'Specification',
    version: 'v2.0',
    uploaded_by: 'Network Architect',
    upload_date: '2026-08-10',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'wBMS_Mesh_Protocol_Spec.pdf',
    file_size: 6300000,
    description: 'Time-synchronized channel hopping protocol specification for battery nodes.',
  },
];

// Helper to save documents to LocalStorage
const saveLocalDocuments = (docs: DocumentItem[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch {
    // ignore local storage error
  }
};

// Helper to retrieve documents from LocalStorage
const getLocalDocuments = (): DocumentItem[] => {
  if (typeof window === 'undefined') return getInitialDocuments();
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length >= 30) return parsed;
    }
  } catch {
    // fallback
  }
  const initial = getInitialDocuments();
  saveLocalDocuments(initial);
  return initial;
};

export const documentService = {
  /**
   * Get paginated, filtered list of documents
   */
  async getDocuments(params: DocumentListQueryParams = {}): Promise<DocumentListResponse> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 100;

    // Try fetching from Project Documents API or Documents API
    try {
      let url = '/api/documents';
      if (params.project && params.project !== 'ALL') {
        url = `/api/projects/${encodeURIComponent(params.project)}/documents`;
      }

      const qParams = new URLSearchParams();
      if (params.search) qParams.append('search', params.search);
      if (params.document_type) qParams.append('document_type', params.document_type);
      if (params.status) qParams.append('status', params.status);
      if (params.page) qParams.append('page', String(params.page));
      if (params.pageSize) qParams.append('pageSize', String(params.pageSize));

      const fullUrl = `${url}?${qParams.toString()}`;
      const res = await api.get<any>(fullUrl);

      if (res && res.documents) {
        return {
          documents: res.documents,
          totalCount: res.totalCount ?? res.documents.length,
          page,
          pageSize,
          summary: res.summary || {
            totalDocuments: res.documents.length,
            projectDocuments: res.documents.length,
            recentlyAdded: res.documents.length,
            requiringReview: 0,
          },
        };
      }
    } catch {
      // fallback to local documents
    }

    let allDocs: DocumentItem[] = getLocalDocuments();

    // Filter by project
    let filtered = [...allDocs];
    if (params.project && params.project !== 'ALL') {
      const normProj = params.project.toLowerCase().trim();
      filtered = filtered.filter((d) => {
        const dp = (d.project || '').toLowerCase().trim();
        return dp === normProj || dp.includes(normProj) || normProj.includes(dp);
      });
    }

    // Compute Base Project Scope Summary
    const summary: DocumentSummary = {
      totalDocuments: filtered.length,
      projectDocuments: filtered.filter((d) => d.project && d.project !== 'Global Vault').length,
      recentlyAdded: filtered.filter((d) => d.upload_date && d.upload_date >= '2026-08-01').length,
      requiringReview: filtered.filter((d) => d.status === 'Under Review' || d.review_status === 'In Review' || d.review_status === 'Pending Review').length,
    };

    // Filter by type
    if (params.document_type && params.document_type !== 'ALL') {
      filtered = filtered.filter((d) => d.document_type === params.document_type);
    }

    // Filter by status
    if (params.status && params.status !== 'ALL') {
      if (params.status === 'Approved') {
        filtered = filtered.filter((d) => d.status === 'Approved' || d.review_status === 'Approved');
      } else if (params.status === 'Under Review') {
        filtered = filtered.filter(
          (d) => d.status === 'Under Review' || d.review_status === 'In Review' || d.review_status === 'Pending Review'
        );
      }
    }

    // Filter by search query
    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          (d.file_name && d.file_name.toLowerCase().includes(q)) ||
          (d.description && d.description.toLowerCase().includes(q))
      );
    }

    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedDocs = filtered.slice(startIndex, startIndex + pageSize);

    return {
      documents: paginatedDocs,
      totalCount,
      page,
      pageSize,
      summary,
    };
  },

  /**
   * Add new document to vault
   */
  async uploadDocument(doc: Partial<DocumentItem>): Promise<DocumentItem> {
    try {
      let targetUrl = '/api/documents';
      if (doc.project && doc.project !== 'ALL' && doc.project !== 'Global Vault') {
        targetUrl = `/api/projects/${encodeURIComponent(doc.project)}/documents`;
      }
      const res = await api.post<any>(targetUrl, doc);
      if (res?.document) {
        return res.document;
      }
      if (res?.name) {
        return res;
      }
    } catch {
      // fallback
    }

    const docs = getLocalDocuments();
    const newDoc: DocumentItem = {
      name: doc.name || `DOC-2026-${String(docs.length + 1).padStart(5, '0')}`,
      title: doc.title || doc.file_name || 'Untitled Engineering Document',
      project: doc.project || 'PROJ-0001',
      document_type: doc.document_type || 'Engineering',
      version: doc.version || 'v1.0',
      uploaded_by: doc.uploaded_by || 'Administrator',
      upload_date: new Date().toISOString().split('T')[0],
      status: doc.status || 'Approved',
      review_status: 'Approved',
      file_name: doc.file_name || 'document.pdf',
      file_size: doc.file_size || 2048000,
      description: doc.description || '',
      notes: doc.notes || '',
    };

    const updated = [newDoc, ...docs];
    saveLocalDocuments(updated);
    return newDoc;
  },

  async createDocument(doc: Partial<DocumentItem>): Promise<DocumentItem> {
    return this.uploadDocument(doc);
  },

  async updateDocument(name: string, data: Partial<DocumentItem>): Promise<DocumentItem> {
    const docs = getLocalDocuments();
    const doc = docs.find((d) => d.name === name);
    if (!doc) throw new Error('Document not found');
    Object.assign(doc, data);
    saveLocalDocuments(docs);
    return doc;
  },

  async deleteDocument(name: string): Promise<void> {
    try {
      await api.delete(`/api/documents?name=${encodeURIComponent(name)}`);
    } catch {
      // ignore
    }
    const docs = getLocalDocuments().filter((d) => d.name !== name);
    saveLocalDocuments(docs);
  },

  /**
   * Download exact document attachment binary from server and trigger browser download
   */
  async downloadDocument(projectId?: string, docId?: string, fileName?: string): Promise<void> {
    if (!docId) throw new Error('Document ID is required for download.');
    const targetUrl = projectId && projectId !== 'ALL' && projectId !== 'Global Vault'
      ? `/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(docId)}/download`
      : `/api/documents/${encodeURIComponent(docId)}/download`;

    const res = await fetch(targetUrl, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      let errMessage = `Download failed with status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson._error_message) errMessage = errJson._error_message;
        else if (errJson.message) errMessage = errJson.message;
      } catch {
        // response was not JSON
      }
      throw new Error(errMessage);
    }

    const blob = await res.blob();
    const downloadFileName = fileName || `${docId}.pdf`;

    // Trigger native browser download via temporary object URL
    const blobUrl = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = downloadFileName;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },
};

export default documentService;
