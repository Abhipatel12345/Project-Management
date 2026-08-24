import fs from 'fs';
import path from 'path';
import { DocumentItem, DocumentListQueryParams, DocumentListResponse, DocumentSummary } from '@/types/document.types';

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE_PATH = path.join(DATA_DIR, 'documents.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

export const getMimeType = (fileName?: string): string => {
  if (!fileName) return 'application/octet-stream';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'step':
    case 'stp':
      return 'application/step';
    case 'dwg':
      return 'application/acad';
    case 'csv':
      return 'text/csv; charset=utf-8';
    case 'txt':
    case 'log':
      return 'text/plain; charset=utf-8';
    case 'json':
      return 'application/json';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'svg':
      return 'image/svg+xml';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
};

const ensureDirectoryExists = (dir: string = DATA_DIR) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Creates a minimal valid sample file buffer for seed documents if not uploaded yet
 */
const createSampleBuffer = (fileName: string, title: string): Buffer => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') {
    // Minimal valid PDF binary
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 75 >>
stream
BT
/F1 18 Tf
50 700 Td
(${title.replace(/[\(\)]/g, '')}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000369 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
448
%%EOF`;
    return Buffer.from(pdfContent, 'utf-8');
  } else if (ext === 'step' || ext === 'stp') {
    return Buffer.from(
      `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('PDM CAD Model: ${title}'),'2;1');\nFILE_NAME('${fileName}','2026-08-01',('Lead Engineer'),('Automotive PDM'),'Inteva APQP','AutoCAD','');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN'));\nENDSEC;\nDATA;\n#1=APPLICATION_CONTEXT('automotive mechanical design');\nENDSEC;\nEND-ISO-10303-21;\n`,
      'utf-8'
    );
  } else if (ext === 'xlsx' || ext === 'docx' || ext === 'zip') {
    // Standard ZIP header PK\x03\x04
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const comment = Buffer.from(`\n${title} (Automotive PDM Document Archive)`, 'utf-8');
    return Buffer.concat([zipHeader, comment]);
  }
  return Buffer.from(`Product Development Management Document\nTitle: ${title}\nFile: ${fileName}\nDate: 2026-08-01\n`, 'utf-8');
};

const getSeedDocuments = (): DocumentItem[] => [
  {
    name: 'DOC-2026-00001',
    title: 'Door Handle Assembly CAD Specification & Drawing Set',
    project: 'PROJ-0043',
    document_type: 'Engineering',
    version: 'v2.1',
    uploaded_by: 'Administrator',
    upload_date: '2026-08-01',
    status: 'Approved',
    review_status: 'Approved',
    file_name: 'Door_Handle_CAD_v2.1.step',
    file_size: 14200,
    mime_type: 'application/step',
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
    file_size: 3800,
    mime_type: 'application/pdf',
    description: 'Design Failure Mode Effects Analysis for high voltage thermal management loop.',
    notes: 'Requires sign-off from Thermal Safety Manager.',
  },
  {
    name: 'DOC-2026-00003',
    title: 'PPAP Level 3 Quality Control Plan & Gauge R&R',
    project: 'PROJ-0043',
    document_type: 'Quality',
    version: 'v1.0',
    uploaded_by: 'Quality Lead',
    upload_date: '2026-08-08',
    status: 'Under Review',
    review_status: 'Pending Review',
    file_name: 'PPAP_L3_Control_Plan.xlsx',
    file_size: 2100,
    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
    file_size: 18500,
    mime_type: 'application/pdf',
    description: 'Finite element analysis and impact energy absorption report for underbody tray.',
  },
];

export const readDocumentsFile = (): DocumentItem[] => {
  try {
    ensureDirectoryExists(DATA_DIR);
    if (!fs.existsSync(FILE_PATH)) {
      const seed = getSeedDocuments();
      fs.writeFileSync(FILE_PATH, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading documents.json:', err);
    return getSeedDocuments();
  }
};

export const writeDocumentsFile = (docs: DocumentItem[]): void => {
  try {
    ensureDirectoryExists(DATA_DIR);
    fs.writeFileSync(FILE_PATH, JSON.stringify(docs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing documents.json:', err);
  }
};

export const getDocumentsByProject = (projectId: string, searchParams?: DocumentListQueryParams): DocumentListResponse => {
  const allDocs = readDocumentsFile();
  const normProject = (projectId || '').toLowerCase().trim();

  let filtered = allDocs.filter((d) => {
    if (!projectId || projectId === 'ALL') return true;
    const docProj = (d.project || '').toLowerCase().trim();
    return docProj === normProject || docProj.includes(normProject) || normProject.includes(docProj);
  });

  const summary: DocumentSummary = {
    totalDocuments: filtered.length,
    projectDocuments: filtered.filter((d) => d.project && d.project !== 'Global Vault').length,
    recentlyAdded: filtered.filter((d) => d.upload_date && d.upload_date >= '2026-08-01').length,
    requiringReview: filtered.filter(
      (d) => d.status === 'Under Review' || d.review_status === 'In Review' || d.review_status === 'Pending Review'
    ).length,
  };

  if (searchParams?.document_type && searchParams.document_type !== 'ALL') {
    filtered = filtered.filter((d) => d.document_type === searchParams.document_type);
  }

  if (searchParams?.status && searchParams.status !== 'ALL') {
    if (searchParams.status === 'Approved') {
      filtered = filtered.filter((d) => d.status === 'Approved' || d.review_status === 'Approved');
    } else if (searchParams.status === 'Under Review') {
      filtered = filtered.filter(
        (d) => d.status === 'Under Review' || d.review_status === 'In Review' || d.review_status === 'Pending Review'
      );
    }
  }

  if (searchParams?.search && searchParams.search.trim() !== '') {
    const q = searchParams.search.toLowerCase().trim();
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        (d.file_name && d.file_name.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }

  const page = searchParams?.page || 1;
  const pageSize = searchParams?.pageSize || 100;
  const startIndex = (page - 1) * pageSize;
  const paginatedDocs = filtered.slice(startIndex, startIndex + pageSize);

  return {
    documents: paginatedDocs,
    totalCount: filtered.length,
    page,
    pageSize,
    summary,
  };
};

/**
 * Save a document record and store the actual binary file to disk
 */
export const saveDocument = (doc: Partial<DocumentItem>): DocumentItem => {
  const allDocs = readDocumentsFile();
  const nextNum = allDocs.length + 1;
  const docId = doc.name || `DOC-2026-${String(nextNum).padStart(5, '0')}`;
  const projectId = doc.project || 'Global Vault';
  const cleanFileName = path.basename(doc.file_name || `${doc.title || 'document'}.pdf`);
  const mime = doc.mime_type || getMimeType(cleanFileName);

  // Setup project storage directory: .data/uploads/projects/<projectId>/<docId>/
  const safeProj = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetDir = path.join(UPLOADS_DIR, 'projects', safeProj, safeDocId);
  ensureDirectoryExists(targetDir);

  const diskFilePath = path.join(targetDir, cleanFileName);
  const relFilePath = path.join('.data', 'uploads', 'projects', safeProj, safeDocId, cleanFileName);

  let fileBuffer: Buffer | null = null;
  const rawData = doc.file_data || doc.file_url;

  if (rawData && rawData.startsWith('data:')) {
    // Decode base64 Data URL
    const base64Index = rawData.indexOf(';base64,');
    if (base64Index !== -1) {
      const base64Str = rawData.slice(base64Index + 8);
      fileBuffer = Buffer.from(base64Str, 'base64');
    } else {
      const commaIdx = rawData.indexOf(',');
      const rawPayload = commaIdx !== -1 ? rawData.slice(commaIdx + 1) : rawData;
      fileBuffer = Buffer.from(decodeURIComponent(rawPayload), 'utf-8');
    }
  }

  // If no buffer was passed, create sample content
  if (!fileBuffer) {
    if (!fs.existsSync(diskFilePath)) {
      fileBuffer = createSampleBuffer(cleanFileName, doc.title || cleanFileName);
    }
  }

  if (fileBuffer) {
    fs.writeFileSync(diskFilePath, fileBuffer);
  }

  const finalFileSize = fileBuffer ? fileBuffer.length : (fs.existsSync(diskFilePath) ? fs.statSync(diskFilePath).size : (doc.file_size || 1024));

  const newDoc: DocumentItem = {
    name: docId,
    title: doc.title || cleanFileName,
    project: projectId,
    document_type: doc.document_type || 'Engineering',
    version: doc.version || 'v1.0',
    uploaded_by: doc.uploaded_by || 'Administrator',
    upload_date: doc.upload_date || new Date().toISOString().split('T')[0],
    status: doc.status || 'Approved',
    review_status: doc.review_status || 'Approved',
    file_name: cleanFileName,
    file_size: finalFileSize,
    mime_type: mime,
    file_path: relFilePath,
    file_url: `/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(docId)}/download`,
    description: doc.description || '',
    notes: doc.notes || '',
  };

  const existingIdx = allDocs.findIndex((d) => d.name === newDoc.name);
  if (existingIdx !== -1) {
    allDocs[existingIdx] = { ...allDocs[existingIdx], ...newDoc };
  } else {
    allDocs.unshift(newDoc);
  }

  writeDocumentsFile(allDocs);
  return newDoc;
};

/**
 * Retrieves the stored binary file buffer, filename, and mime type for download
 */
export const getDocumentBinary = (
  projectId: string,
  docId: string
): { buffer: Buffer; fileName: string; mimeType: string; fileSize: number; document: DocumentItem } | null => {
  const allDocs = readDocumentsFile();
  const normProj = (projectId || '').toLowerCase().trim();
  const normDoc = (docId || '').toLowerCase().trim();

  const doc = allDocs.find((d) => {
    const isDocMatch = d.name.toLowerCase() === normDoc || (d.file_name && d.file_name.toLowerCase() === normDoc);
    if (!isDocMatch) return false;
    if (!projectId || projectId === 'ALL' || projectId === 'Global Vault') return true;
    const docProj = (d.project || '').toLowerCase().trim();
    return docProj === normProj || docProj.includes(normProj) || normProj.includes(docProj);
  });

  if (!doc) return null;

  const fileName = doc.file_name || `${doc.title || 'document'}.pdf`;
  const mimeType = doc.mime_type || getMimeType(fileName);

  // Check stored disk path
  if (doc.file_path) {
    const absPath = path.isAbsolute(doc.file_path) ? doc.file_path : path.join(process.cwd(), doc.file_path);
    if (fs.existsSync(absPath)) {
      const buffer = fs.readFileSync(absPath);
      return { buffer, fileName, mimeType, fileSize: buffer.length, document: doc };
    }
  }

  // Check standard project upload path
  const safeProj = (doc.project || 'Global_Vault').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDocId = doc.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const stdPath = path.join(UPLOADS_DIR, 'projects', safeProj, safeDocId, fileName);
  if (fs.existsSync(stdPath)) {
    const buffer = fs.readFileSync(stdPath);
    return { buffer, fileName, mimeType, fileSize: buffer.length, document: doc };
  }

  // Check data URL fallback
  if (doc.file_url && doc.file_url.startsWith('data:')) {
    const base64Index = doc.file_url.indexOf(';base64,');
    if (base64Index !== -1) {
      const base64Str = doc.file_url.slice(base64Index + 8);
      const buffer = Buffer.from(base64Str, 'base64');
      return { buffer, fileName, mimeType, fileSize: buffer.length, document: doc };
    }
  }

  // Create sample buffer if seed document
  const buffer = createSampleBuffer(fileName, doc.title || fileName);
  ensureDirectoryExists(path.dirname(stdPath));
  fs.writeFileSync(stdPath, buffer);

  return { buffer, fileName, mimeType, fileSize: buffer.length, document: doc };
};

export const deleteDocument = (name: string): boolean => {
  const allDocs = readDocumentsFile();
  const doc = allDocs.find((d) => d.name === name);
  const filtered = allDocs.filter((d) => d.name !== name);
  if (filtered.length !== allDocs.length) {
    writeDocumentsFile(filtered);
    if (doc?.file_path) {
      const absPath = path.isAbsolute(doc.file_path) ? doc.file_path : path.join(process.cwd(), doc.file_path);
      if (fs.existsSync(absPath)) {
        try {
          fs.unlinkSync(absPath);
        } catch {
          // ignore
        }
      }
    }
    return true;
  }
  return false;
};
