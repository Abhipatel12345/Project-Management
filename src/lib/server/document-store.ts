import fs from 'fs';
import path from 'path';
import { DocumentItem, DocumentListQueryParams, DocumentListResponse, DocumentSummary } from '@/types/document.types';
import {
  uploadDocumentFile,
  retrieveDocumentFile,
  deleteDocumentFile,
  getMimeType,
  RetrievedFileResult,
} from './file-storage';
import { createErpDoc, updateErpDoc, deleteErpDoc, fetchErpResource } from './erp-client';

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE_PATH = path.join(DATA_DIR, 'documents.json');

// In-memory cache for serverless environments
let inMemoryDocs: DocumentItem[] | null = null;

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
  if (inMemoryDocs && inMemoryDocs.length > 0) {
    return inMemoryDocs;
  }
  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf-8');
      inMemoryDocs = JSON.parse(raw);
      return inMemoryDocs || getSeedDocuments();
    }
  } catch (err) {
    console.error('Error reading documents.json, using seed documents:', err);
  }
  inMemoryDocs = getSeedDocuments();
  return inMemoryDocs;
};

export const writeDocumentsFile = (docs: DocumentItem[]): void => {
  inMemoryDocs = docs;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(docs, null, 2), 'utf-8');
  } catch {
    // Filesystem may be read-only in Vercel serverless functions
  }
};

/**
 * Fetch ERPNext PDM Document and File records for a project
 */
export const syncErpNextProjectDocuments = async (projectId: string): Promise<DocumentItem[]> => {
  if (!projectId || projectId === 'Global Vault' || projectId === 'Global_Vault') {
    return [];
  }
  try {
    const erpUrl = process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083';
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
    const apiSecret = process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';
    const headers = { Authorization: `token ${apiKey}:${apiSecret}` };

    const erpDocs: DocumentItem[] = [];

    // 1. Authoritative fetch from ERPNext 'PDM Document' DocType
    try {
      const pdmFilters: any[] = [];
      if (projectId && projectId !== 'ALL') {
        pdmFilters.push(['project', '=', projectId]);
      }
      const erpPdmRecords = await fetchErpResource<any>('PDM Document', {
        filters: pdmFilters,
        fields: [
          'name',
          'title',
          'project',
          'document_type',
          'version',
          'status',
          'file_url',
          'file_name',
          'file_size',
          'mime_type',
          'uploaded_by',
          'upload_date',
          'description',
          'notes',
          'creation',
          'owner',
        ],
        order_by: 'creation desc',
        limit: 200,
      });

      for (const p of erpPdmRecords) {
        const fileName = p.file_name || (p.file_url ? path.basename(p.file_url) : `${p.title}.pdf`);
        erpDocs.push({
          name: p.name,
          title: p.title || fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          project: p.project || projectId,
          document_type: p.document_type || 'Other',
          version: p.version || 'v1.0',
          uploaded_by: p.uploaded_by || p.owner || 'Administrator',
          upload_date: p.upload_date ? p.upload_date.split(' ')[0] : (p.creation ? p.creation.split(' ')[0] : new Date().toISOString().split('T')[0]),
          status: (p.status as any) || 'Approved',
          review_status: p.status === 'Under Review' ? 'In Review' : (p.status === 'Approved' ? 'Approved' : 'Pending Review'),
          file_name: fileName,
          file_size: p.file_size || 1024,
          mime_type: p.mime_type || getMimeType(fileName),
          file_url: p.file_url || (p.project ? `/api/projects/${encodeURIComponent(p.project)}/documents/${encodeURIComponent(p.name)}/download` : undefined),
          storage_type: 'local',
          description: p.description || '',
          notes: p.notes || '',
        });
      }
    } catch (pdmErr) {
      console.warn(`[Document Store] Error fetching ERPNext PDM Document records for ${projectId}:`, pdmErr);
    }

    // 2. Fetch File records attached to Project (only if not already mapped from PDM Document)
    if (projectId && projectId !== 'ALL') {
      const fileFilters = JSON.stringify([
        ['attached_to_doctype', '=', 'Project'],
        ['attached_to_name', '=', projectId],
      ]);
      const fileFields = JSON.stringify([
        'name',
        'file_name',
        'file_url',
        'file_size',
        'creation',
        'owner',
        'attached_to_field',
      ]);
      const fileUrl = `${erpUrl}/api/resource/File?filters=${encodeURIComponent(fileFilters)}&fields=${encodeURIComponent(fileFields)}&order_by=creation desc&limit_page_length=100`;

      const fileRes = await fetch(fileUrl, { headers });
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        const files: any[] = fileData.data || [];

        for (const f of files) {
          const fileName = f.file_name || (f.file_url ? path.basename(f.file_url) : 'document.pdf');
          const alreadyInPdm = erpDocs.some(
            (d) => d.file_url === f.file_url || (f.file_name && d.file_name === f.file_name)
          );
          if (!alreadyInPdm) {
            erpDocs.push({
              name: f.name,
              title: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
              project: projectId,
              document_type: 'Other',
              version: 'v1.0',
              uploaded_by: f.owner || 'Administrator',
              upload_date: f.creation ? f.creation.split(' ')[0] : new Date().toISOString().split('T')[0],
              status: 'Approved',
              review_status: 'Approved',
              file_name: fileName,
              file_size: f.file_size || 1024,
              mime_type: getMimeType(fileName),
              file_url: f.file_url,
              storage_type: 'local',
            });
          }
        }
      }

      // 3. Fetch Project record to check custom_upload_document
      const projRes = await fetch(`${erpUrl}/api/resource/Project/${encodeURIComponent(projectId)}`, { headers });
      if (projRes.ok) {
        const projData = await projRes.json();
        const customDocUrl = projData.data?.custom_upload_document;
        if (customDocUrl && !erpDocs.some((d) => d.file_url === customDocUrl)) {
          const fileName = path.basename(customDocUrl);
          erpDocs.unshift({
            name: `DOC-${projectId}-MAIN`,
            title: `${projData.data?.project_name || projectId} Uploaded Document`,
            project: projectId,
            document_type: 'Other',
            version: 'v1.0',
            uploaded_by: projData.data?.owner || 'Administrator',
            upload_date: projData.data?.creation ? projData.data.creation.split(' ')[0] : new Date().toISOString().split('T')[0],
            status: 'Approved',
            review_status: 'Approved',
            file_name: fileName,
            file_size: 2048,
            mime_type: getMimeType(fileName),
            file_url: customDocUrl,
            storage_type: 'local',
          });
        }
      }
    }

    return erpDocs;
  } catch (err) {
    console.warn(`[Document Store] Error fetching ERPNext project files for ${projectId}:`, err);
    return [];
  }
};

export const getDocumentsByProject = async (
  projectId: string,
  searchParams?: DocumentListQueryParams
): Promise<DocumentListResponse> => {
  const allDocs = readDocumentsFile();
  const normProject = (projectId || '').toLowerCase().trim();

  // Fetch live ERPNext records (including PDM Document records) for this project
  const erpDocs = await syncErpNextProjectDocuments(projectId);

  // Merge store documents and live ERPNext documents
  const combinedDocs = [...allDocs];
  let hasChanges = false;

  for (const ed of erpDocs) {
    const existingIdx = combinedDocs.findIndex(
      (d) =>
        d.name === ed.name ||
        (d.project === ed.project && d.file_name && ed.file_name && d.file_name === ed.file_name) ||
        (d.title && ed.title && d.title.trim().toLowerCase() === ed.title.trim().toLowerCase() && d.project === ed.project) ||
        (ed.file_url && d.file_url && d.file_url === ed.file_url)
    );

    if (existingIdx !== -1) {
      const existing = combinedDocs[existingIdx];
      // Keep authoritative saved document_type
      const finalDocType = (ed.document_type && ed.document_type !== 'Other')
        ? ed.document_type
        : (existing.document_type || ed.document_type || 'Other');

      combinedDocs[existingIdx] = {
        ...existing,
        ...ed,
        document_type: finalDocType,
        name: existing.name || ed.name,
      };
    } else {
      combinedDocs.unshift(ed);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    writeDocumentsFile(combinedDocs);
  }

  let filtered = combinedDocs.filter((d) => {
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

  if (searchParams?.task && searchParams.task !== 'ALL') {
    const taskNorm = searchParams.task.toLowerCase().trim();
    filtered = filtered.filter(
      (d) =>
        (d.task && d.task.toLowerCase().trim() === taskNorm) ||
        (d.entity_type === 'Task' && d.entity_id && d.entity_id.toLowerCase().trim() === taskNorm) ||
        (d.description && d.description.toLowerCase().includes(taskNorm))
    );
  }

  if (searchParams?.entity_type && searchParams.entity_type !== 'ALL') {
    filtered = filtered.filter((d) => d.entity_type === searchParams.entity_type);
  }

  if (searchParams?.entity_id && searchParams.entity_id !== 'ALL') {
    const entNorm = searchParams.entity_id.toLowerCase().trim();
    filtered = filtered.filter((d) => d.entity_id && d.entity_id.toLowerCase().trim() === entNorm);
  }

  if (searchParams?.search && searchParams.search.trim() !== '') {
    const q = searchParams.search.toLowerCase().trim();
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        (d.file_name && d.file_name.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.task && d.task.toLowerCase().includes(q))
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
 * Save a document record and store the physical file in object storage (Vercel Blob / local / ERPNext)
 */
export const saveDocument = async (doc: Partial<DocumentItem>): Promise<DocumentItem> => {
  const allDocs = readDocumentsFile();
  const nextNum = allDocs.length + 1;
  const docId = doc.name || `DOC-2026-${String(nextNum).padStart(5, '0')}`;
  const projectId = doc.project || 'Global Vault';
  const cleanFileName = path.basename(doc.file_name || `${doc.title || 'document'}.pdf`);
  const mime = doc.mime_type || getMimeType(cleanFileName);

  let fileBuffer: Buffer | null = null;
  const rawData = doc.file_data || doc.file_url;

  if (rawData && rawData.startsWith('data:')) {
    const base64Index = rawData.indexOf(';base64,');
    if (base64Index !== -1) {
      fileBuffer = Buffer.from(rawData.slice(base64Index + 8), 'base64');
    } else {
      const commaIdx = rawData.indexOf(',');
      const rawPayload = commaIdx !== -1 ? rawData.slice(commaIdx + 1) : rawData;
      fileBuffer = Buffer.from(decodeURIComponent(rawPayload), 'utf-8');
    }
  }

  let storageInfo: {
    storageType: 'vercel-blob' | 'local' | 'inline';
    storageKey?: string;
    blobUrl?: string;
    filePath?: string;
    fileSize: number;
    mimeType: string;
  } = {
    storageType: (doc.storage_type || 'local') as 'vercel-blob' | 'local' | 'inline',
    storageKey: doc.storage_key,
    blobUrl: doc.blob_url,
    filePath: doc.file_path,
    fileSize: doc.file_size || (fileBuffer ? fileBuffer.length : 1024),
    mimeType: mime,
  };

  if (fileBuffer) {
    const uploaded = await uploadDocumentFile({
      projectId,
      documentId: docId,
      fileName: cleanFileName,
      buffer: fileBuffer,
      mimeType: mime,
    });
    storageInfo = uploaded;
  }

  const finalFileUrl =
    storageInfo.blobUrl ||
    doc.file_url ||
    `/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(docId)}/download`;

  const exactDocType = doc.document_type || 'Other';

  const newDoc: DocumentItem = {
    name: docId,
    title: doc.title || cleanFileName,
    project: projectId,
    document_type: exactDocType,
    version: doc.version || 'v1.0',
    uploaded_by: doc.uploaded_by || 'Administrator',
    upload_date: doc.upload_date || new Date().toISOString().split('T')[0],
    status: doc.status || 'Approved',
    review_status: doc.review_status || 'Approved',
    file_name: cleanFileName,
    file_size: storageInfo.fileSize,
    mime_type: storageInfo.mimeType,
    storage_type: storageInfo.storageType,
    storage_key: storageInfo.storageKey,
    blob_url: storageInfo.blobUrl,
    file_path: storageInfo.filePath,
    file_url: finalFileUrl,
    description: doc.description || '',
    notes: doc.notes || '',
    task: doc.task,
    entity_type: doc.entity_type,
    entity_id: doc.entity_id,
  };

  const existingIdx = allDocs.findIndex((d) => d.name === newDoc.name);
  if (existingIdx !== -1) {
    allDocs[existingIdx] = { ...allDocs[existingIdx], ...newDoc };
  } else {
    allDocs.unshift(newDoc);
  }

  writeDocumentsFile(allDocs);

  // Authoritative ERPNext Sync: persist to PDM Document DocType
  createErpDoc('PDM Document', {
    title: newDoc.title,
    project: (newDoc.project && newDoc.project !== 'Global Vault' && !newDoc.project.startsWith('GLOBAL')) ? newDoc.project : null,
    document_type: exactDocType,
    version: newDoc.version || 'v1.0',
    status: newDoc.status || 'Approved',
    file_url: newDoc.file_url || '',
    file_name: newDoc.file_name || '',
    file_size: newDoc.file_size || 0,
    mime_type: newDoc.mime_type || '',
    uploaded_by: newDoc.uploaded_by || 'Administrator',
    upload_date: newDoc.upload_date ? newDoc.upload_date.replace('T', ' ').replace('Z', '').split('.')[0] : null,
    description: newDoc.description || '',
    notes: newDoc.notes || '',
  }).catch((err) => console.warn('[DocumentStore] Failed to sync PDM Document to ERPNext:', err.message));

  return newDoc;
};

/**
 * Update an existing document's metadata (e.g. document_type, title, version, status)
 * Authoritatively persists changes to both local store and ERPNext PDM Document
 */
export const updateDocumentItem = async (
  name: string,
  data: Partial<DocumentItem>
): Promise<DocumentItem> => {
  const allDocs = readDocumentsFile();
  const existingIdx = allDocs.findIndex(
    (d) => d.name === name || (data.file_name && d.file_name === data.file_name) || (data.title && d.title === data.title)
  );

  if (existingIdx === -1) {
    throw new Error(`Document ${name} not found`);
  }

  const existing = allDocs[existingIdx];
  const updatedDocType = data.document_type !== undefined && data.document_type.trim() !== ''
    ? data.document_type
    : existing.document_type;

  const updated: DocumentItem = {
    ...existing,
    title: data.title !== undefined ? data.title : existing.title,
    document_type: updatedDocType,
    version: data.version !== undefined ? data.version : existing.version,
    status: data.status !== undefined ? data.status : existing.status,
    review_status: data.review_status !== undefined ? data.review_status : existing.review_status,
    description: data.description !== undefined ? data.description : existing.description,
    notes: data.notes !== undefined ? data.notes : existing.notes,
    project: data.project !== undefined ? data.project : existing.project,
    file_name: data.file_name !== undefined ? data.file_name : existing.file_name,
    uploaded_by: data.uploaded_by !== undefined ? data.uploaded_by : existing.uploaded_by,
    upload_date: existing.upload_date, // preserve original upload date
  };

  allDocs[existingIdx] = updated;
  writeDocumentsFile(allDocs);

  // Authoritative ERPNext Sync: Update in PDM Document DocType
  try {
    let erpDocName: string | null = null;
    const byTitle = await fetchErpResource<any>('PDM Document', {
      filters: [['title', '=', existing.title]],
      limit: 1,
    });
    if (byTitle.length > 0) {
      erpDocName = byTitle[0].name;
    } else {
      const byName = await fetchErpResource<any>('PDM Document', {
        filters: [['name', '=', name]],
        limit: 1,
      });
      if (byName.length > 0) {
        erpDocName = byName[0].name;
      }
    }

    if (erpDocName) {
      await updateErpDoc('PDM Document', erpDocName, {
        title: updated.title,
        document_type: updated.document_type,
        version: updated.version,
        status: updated.status,
        description: updated.description,
        notes: updated.notes,
      });
    } else {
      await createErpDoc('PDM Document', {
        title: updated.title,
        project: (updated.project && updated.project !== 'Global Vault' && !updated.project.startsWith('GLOBAL')) ? updated.project : null,
        document_type: updated.document_type,
        version: updated.version || 'v1.0',
        status: updated.status || 'Approved',
        file_url: updated.file_url || '',
        file_name: updated.file_name || '',
        file_size: updated.file_size || 0,
        mime_type: updated.mime_type || '',
        uploaded_by: updated.uploaded_by || 'Administrator',
        upload_date: updated.upload_date ? updated.upload_date.replace('T', ' ').replace('Z', '').split('.')[0] : null,
        description: updated.description || '',
        notes: updated.notes || '',
      });
    }
  } catch (err: any) {
    console.warn('[DocumentStore] Failed to sync update to ERPNext PDM Document:', err.message);
  }

  return updated;
};

/**
 * Retrieves the stored binary file buffer, filename, and mime type for download
 */
export const getDocumentBinary = async (
  projectId: string,
  docId: string
): Promise<{ buffer: Buffer; fileName: string; mimeType: string; fileSize: number; document: DocumentItem } | null> => {
  const allDocs = readDocumentsFile();
  const normProj = (projectId || '').toLowerCase().trim();
  const normDoc = (docId || '').toLowerCase().trim();

  let doc = allDocs.find((d) => {
    const isDocMatch = d.name.toLowerCase() === normDoc || (d.file_name && d.file_name.toLowerCase() === normDoc);
    if (!isDocMatch) return false;
    if (!projectId || projectId === 'ALL' || projectId === 'Global Vault') return true;
    const docProj = (d.project || '').toLowerCase().trim();
    return docProj === normProj || docProj.includes(normProj) || normProj.includes(docProj);
  });

  // If not found in local memory, check live ERPNext Project files
  if (!doc && projectId && projectId !== 'Global Vault') {
    const erpDocs = await syncErpNextProjectDocuments(projectId);
    doc = erpDocs.find((d) => d.name.toLowerCase() === normDoc || (d.file_name && d.file_name.toLowerCase() === normDoc));
  }

  if (!doc) return null;

  const result: RetrievedFileResult | null = await retrieveDocumentFile(doc);
  if (!result) return null;

  return {
    buffer: result.buffer,
    fileName: result.fileName,
    mimeType: result.mimeType,
    fileSize: result.fileSize,
    document: doc,
  };
};

export const deleteDocument = async (name: string): Promise<boolean> => {
  const allDocs = readDocumentsFile();
  const doc = allDocs.find((d) => d.name === name);
  const filtered = allDocs.filter((d) => d.name !== name);
  if (filtered.length !== allDocs.length) {
    writeDocumentsFile(filtered);
    if (doc) {
      await deleteDocumentFile(doc);
    }
    // Delete in ERPNext PDM Document
    try {
      const existingErpDocs = await fetchErpResource<any>('PDM Document', {
        filters: doc ? [['title', '=', doc.title]] : [['name', '=', name]],
        limit: 1,
      });
      const erpName = existingErpDocs.length > 0 ? existingErpDocs[0].name : name;
      await deleteErpDoc('PDM Document', erpName);
    } catch (err: any) {
      console.warn('[DocumentStore] Failed to delete PDM Document in ERPNext:', err.message);
    }
    return true;
  }
  return false;
};

export { getMimeType };
