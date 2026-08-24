import fs from 'fs';
import path from 'path';
import { put, del } from '@vercel/blob';
import { DocumentItem } from '@/types/document.types';

/**
 * Checks if Vercel Blob storage is configured and should be used
 */
export const isBlobStorageEnabled = (): boolean => {
  const mode = process.env.DOCUMENT_STORAGE;
  if (mode === 'local') return false;
  if (mode === 'vercel-blob') return true;
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
};

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

/**
 * Generates an in-memory sample document buffer for seed / mock documents
 */
export const createSampleBuffer = (fileName: string, title: string): Buffer => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') {
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 65 >>
stream
BT /F1 14 Tf 50 700 Td (${title.replace(/[\(\)\\]/g, '')}) ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
330
%%EOF`;
    return Buffer.from(pdfContent, 'utf-8');
  } else if (ext === 'step' || ext === 'stp') {
    return Buffer.from(
      `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('PDM CAD Model: ${title}'),'2;1');\nFILE_NAME('${fileName}','2026-08-01',('Lead Engineer'),('Automotive PDM'),'Inteva APQP','AutoCAD','');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN'));\nENDSEC;\nDATA;\n#1=APPLICATION_CONTEXT('automotive mechanical design');\nENDSEC;\nEND-ISO-10303-21;\n`,
      'utf-8'
    );
  } else if (ext === 'xlsx' || ext === 'docx' || ext === 'zip') {
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const comment = Buffer.from(`\n${title} (Automotive PDM Document Archive)`, 'utf-8');
    return Buffer.concat([zipHeader, comment]);
  }
  return Buffer.from(`Product Development Management Document\nTitle: ${title}\nFile: ${fileName}\nDate: 2026-08-01\n`, 'utf-8');
};

export interface StoredFileResult {
  storageType: 'vercel-blob' | 'local' | 'inline';
  storageKey?: string;
  blobUrl?: string;
  filePath?: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Uploads a file buffer to persistent storage (Vercel Blob or local dev filesystem)
 */
export async function uploadDocumentFile(params: {
  projectId: string;
  documentId: string;
  fileName: string;
  buffer: Buffer;
  mimeType?: string;
}): Promise<StoredFileResult> {
  const { projectId, documentId, fileName, buffer } = params;
  const cleanFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeProj = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDocId = documentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const mime = params.mimeType || getMimeType(cleanFileName);

  const storageKey = `documents/${safeProj}/${safeDocId}/${cleanFileName}`;

  // Production: Vercel Blob
  if (isBlobStorageEnabled()) {
    try {
      const blob = await put(storageKey, buffer, {
        access: 'public',
        contentType: mime,
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return {
        storageType: 'vercel-blob',
        storageKey: blob.pathname,
        blobUrl: blob.url,
        fileSize: buffer.length,
        mimeType: mime,
      };
    } catch (err) {
      console.warn('Vercel Blob upload failed, falling back to local/memory storage:', err);
    }
  }

  // Local development: statically scoped to .data/uploads
  if (process.env.NODE_ENV !== 'production') {
    try {
      const targetDir = path.join(process.cwd(), '.data', 'uploads', 'projects', safeProj, safeDocId);
      if (!fs.existsSync(/*turbopackIgnore: true*/ targetDir)) {
        fs.mkdirSync(/*turbopackIgnore: true*/ targetDir, { recursive: true });
      }
      const targetFilePath = path.join(targetDir, cleanFileName);
      fs.writeFileSync(/*turbopackIgnore: true*/ targetFilePath, buffer);
      const relFilePath = `.data/uploads/projects/${safeProj}/${safeDocId}/${cleanFileName}`;

      return {
        storageType: 'local',
        storageKey: storageKey,
        filePath: relFilePath,
        fileSize: buffer.length,
        mimeType: mime,
      };
    } catch {
      // Fallback
    }
  }

  // Serverless / Memory fallback
  return {
    storageType: 'inline',
    storageKey: storageKey,
    fileSize: buffer.length,
    mimeType: mime,
  };
}

export interface RetrievedFileResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Retrieves the stored binary file buffer from Vercel Blob, local disk, or inline memory
 */
export async function retrieveDocumentFile(doc: DocumentItem): Promise<RetrievedFileResult | null> {
  const fileName = doc.file_name || `${doc.title || 'document'}.pdf`;
  const mimeType = doc.mime_type || getMimeType(fileName);

  // 1. Check Vercel Blob URL / Storage Key
  const blobTargetUrl = doc.blob_url || (doc.file_url && doc.file_url.startsWith('http') ? doc.file_url : null);
  if (blobTargetUrl && (blobTargetUrl.includes('vercel-storage.com') || blobTargetUrl.startsWith('http'))) {
    try {
      const res = await fetch(blobTargetUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        return { buffer, fileName, mimeType, fileSize: buffer.length };
      }
    } catch (err) {
      console.error('Error fetching file from Vercel Blob:', err);
    }
  }

  // 2. Check inline base64 data URL
  if (doc.file_data && doc.file_data.startsWith('data:')) {
    const base64Index = doc.file_data.indexOf(';base64,');
    if (base64Index !== -1) {
      const buffer = Buffer.from(doc.file_data.slice(base64Index + 8), 'base64');
      return { buffer, fileName, mimeType, fileSize: buffer.length };
    }
  }

  // 3. Check legacy / local development file (only in non-production environments)
  if (process.env.NODE_ENV !== 'production' && doc.file_path) {
    const cleanRel = path.normalize(doc.file_path).replace(/^(\.\.[\/\\])+/, '');
    const localTarget = path.join(process.cwd(), cleanRel);
    if (fs.existsSync(/*turbopackIgnore: true*/ localTarget)) {
      try {
        const buffer = fs.readFileSync(/*turbopackIgnore: true*/ localTarget);
        return { buffer, fileName, mimeType, fileSize: buffer.length };
      } catch {
        // Read failed
      }
    }
  }

  // 4. Sample / seed document fallback generated dynamically in memory
  const sampleBuf = createSampleBuffer(fileName, doc.title || fileName);
  return { buffer: sampleBuf, fileName, mimeType, fileSize: sampleBuf.length };
}

/**
 * Delete a document from persistent storage
 */
export async function deleteDocumentFile(doc: DocumentItem): Promise<void> {
  // If Blob storage
  if (doc.blob_url || (doc.storage_key && isBlobStorageEnabled())) {
    try {
      await del(doc.blob_url || doc.storage_key || '', {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch (err) {
      console.warn('Error deleting from Vercel Blob:', err);
    }
  }

  // If local file in development
  if (process.env.NODE_ENV !== 'production' && doc.file_path) {
    const cleanRel = path.normalize(doc.file_path).replace(/^(\.\.[\/\\])+/, '');
    const localTarget = path.join(process.cwd(), cleanRel);
    if (fs.existsSync(/*turbopackIgnore: true*/ localTarget)) {
      try {
        fs.unlinkSync(/*turbopackIgnore: true*/ localTarget);
      } catch {
        // ignore
      }
    }
  }
}
