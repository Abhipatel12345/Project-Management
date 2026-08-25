import fs from 'fs';
import path from 'path';
import {
  DesignReview,
  DesignReviewListQueryParams,
  DesignReviewListResponse,
  DesignReviewSummary,
  ReviewFinding,
} from '@/types/design-review.types';
import { PDMUserSession } from '@/types/auth.types';
import { saveDocument, readDocumentsFile } from './document-store';
import { saveAuditRecord } from './audit-store';

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE_PATH = path.join(DATA_DIR, 'design_reviews.json');

let inMemoryReviews: DesignReview[] | null = null;

const getInitialSeedReviews = (): DesignReview[] => {
  const reviewTypes = [
    'Concept Review',
    'Detailed Design Review',
    'Design Validation Review',
    'Tooling Sign-off Review',
  ];

  const projects = [
    'PROJ-0001', 'PROJ-0002', 'PROJ-0003', 'PROJ-0004', 'PROJ-0005',
    'PROJ-0006', 'PROJ-0007', 'PROJ-0008', 'PROJ-0009', 'PROJ-0010',
    'PROJ-0011', 'PROJ-0012', 'PROJ-0013', 'PROJ-0014', 'PROJ-0015',
    'PROJ-0016', 'PROJ-0017', 'PROJ-0018', 'PROJ-0019', 'PROJ-0020',
    'PROJ-0021', 'PROJ-0022', 'PROJ-0023', 'PROJ-0024', 'PROJ-0025',
    'PROJ-0026', 'PROJ-0027', 'PROJ-0028', 'PROJ-0029', 'PROJ-0030',
  ];

  const titles = [
    'Door Handle Exterior Surface Concept & Ergonomics Review',
    'EV Battery Pack Thermal Manifold Detailed Design Review',
    '800V SiC Inverter PCB Layout & Creepage Distance Review',
    'Underbody Battery Tray Side Impact Crash FEA Review',
    'Autonomous Radar Alignment Bracket GD&T Stackup Review',
    'Active Suspension ECU Control Loop C++ Firmware Review',
    'Brake-by-Wire Electro-Hydraulic Pressure Valve Review',
    'Steering Column Torque Sensor EMC Shielding Review',
    'Fender Stamping Die Surface Springback Compensation Review',
    'Instrument Cluster Anti-Glare Glass Optics Review',
    'Cabin HEPA Air Purifier Filter Flow Pressure Drop Review',
    'Matrix LED Headlamp Aluminum Heatsink Thermal CFD Review',
    'Rear Tail Lightbar Acrylic Light Guide Speos Simulation',
    'Seat Belt Pyrotechnic Pretensioner Deployment Safety Review',
    'Electric Motor Stator Water Jacket Cooling Sleeve Review',
    'Dual-Clutch Transmission Oil Cooler Braze Leak Review',
    'Thermal Heat Pump Refrigerant Valve Stepper Control Review',
    '5G TCU Cellular Antenna Impedance & Radiation Review',
    'Cybersecurity Gateway ISO 21434 Threat Analysis Review',
    'Charge Port Motorized Door Ice Breaking Force Review',
    'Electric Power Steering Motor Cogging Torque Harmonic Review',
    'Side Curtain Airbag -40C Cold Temperature Inflation Review',
    'Driver Monitoring Camera 940nm IR LED Eye Safety Review',
    'TPMS Receiver 433MHz Antenna Radiated Immunity Review',
    'Panoramic Sunroof Cable Drive Acoustic Vibration Review',
    'Rain-Sensing Wiper Pantograph Linkage Durability Review',
    'AVAS External Acoustic Speaker Harmonic Distortion Review',
    'UWB Smart Key Fob Distance Ranging Accuracy Review',
    'High-Pressure Washer Pump Motor Thermal Protection Review',
    'Wireless BMS Node 2.4GHz Mesh Network Latency Review',
  ];

  return projects.map((proj, idx) => {
    const num = idx + 1;
    const isCompleted = num % 2 === 0;
    const isInProgress = num % 3 === 0 && !isCompleted;
    const status: DesignReview['status'] = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Planned';
    const approvalStatus: DesignReview['approval_status'] = isCompleted ? 'Approved' : isInProgress ? 'Under Review' : 'Pending';

    return {
      name: `DR-2026-${String(num).padStart(5, '0')}`,
      title: titles[idx],
      project: proj,
      review_type: reviewTypes[idx % 4],
      review_date: `2026-08-${String(1 + (num % 28)).padStart(2, '0')}`,
      reviewer: idx % 2 === 0 ? 'Lead Systems Architect' : 'Chief Quality Engineer',
      participants: ['Administrator', 'Design Lead', 'Quality Specialist', 'Manufacturing Engineer'],
      status,
      approval_status: approvalStatus,
      description: `Formal engineering design review for ${titles[idx]}.`,
      notes: isCompleted ? 'Design approved with zero critical blocking items.' : 'Action items logged in findings section.',
      documents: [
        {
          id: `DOC-2026-${String(num).padStart(5, '0')}`,
          name: `DOC-2026-${String(num).padStart(5, '0')}`,
          file_name: `${titles[idx].split(' ')[0]}_Design_Spec.pdf`,
          file_url: `/api/documents/DOC-2026-${String(num).padStart(5, '0')}/download`,
          file_size: 2400 + num * 50,
          mime_type: 'application/pdf',
          uploaded_by: 'Administrator',
          uploaded_at: `2026-08-${String(1 + (num % 28)).padStart(2, '0')}`,
        },
      ],
      findings: [
        {
          id: `FND-${num}01`,
          description: `Verify tolerance clearance for ${titles[idx].split(' ')[0]} sub-assembly.`,
          severity: num % 4 === 0 ? 'Critical' : num % 3 === 0 ? 'High' : 'Medium',
          assigned_to: 'Mechanical Lead',
          due_date: '2026-08-25',
          status: isCompleted ? 'Resolved' : 'In Progress',
          comments: isCompleted ? 'GD&T drawing updated.' : 'Simulation in progress.',
        },
      ],
    };
  });
};

export function loadAllDesignReviews(): DesignReview[] {
  if (inMemoryReviews && inMemoryReviews.length > 0) {
    return inMemoryReviews;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryReviews = parsed;
        return inMemoryReviews;
      }
    }
  } catch (err) {
    console.error('Error reading design_reviews.json:', err);
  }

  const initial = getInitialSeedReviews();
  saveAllDesignReviews(initial);
  return initial;
}

export function saveAllDesignReviews(reviews: DesignReview[]) {
  inMemoryReviews = reviews;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(reviews, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving design_reviews.json:', err);
  }
}

/**
 * Hydrates a Design Review with all associated documents from both the review record
 * and document-store.ts (documents with entity_type='DesignReview' and entity_id=review.name)
 */
export function hydrateReviewDocuments(review: DesignReview): DesignReview {
  const allDocs = readDocumentsFile();
  const reviewNameNorm = review.name.toLowerCase().trim();

  // Find linked documents in document-store
  const linkedStoreDocs = allDocs.filter((d) => {
    if (d.entity_type === 'DesignReview' && d.entity_id && d.entity_id.toLowerCase().trim() === reviewNameNorm) {
      return true;
    }
    if ((d as any).design_review && (d as any).design_review.toLowerCase().trim() === reviewNameNorm) {
      return true;
    }
    return false;
  });

  const existingDocs = review.documents || [];
  const mergedDocs = [...existingDocs];

  for (const sd of linkedStoreDocs) {
    const alreadyPresent = mergedDocs.some((d) => d.id === sd.name || d.name === sd.name || (d.file_name === sd.file_name && d.file_name));
    if (!alreadyPresent) {
      mergedDocs.push({
        id: sd.name,
        name: sd.name,
        file_name: sd.file_name || sd.title || 'document.pdf',
        file_url: `/api/documents/${encodeURIComponent(sd.name)}/download`,
        file_size: sd.file_size,
        mime_type: sd.mime_type,
        uploaded_by: sd.uploaded_by,
        uploaded_at: sd.upload_date,
      });
    }
  }

  // Ensure download_url and clean file_url for each document
  const normalizedDocs = mergedDocs.map((doc) => {
    const docId = doc.id || doc.name;
    const downloadUrl = `/api/documents/${encodeURIComponent(docId)}/download`;
    return {
      ...doc,
      id: docId,
      name: docId,
      file_url: doc.file_url || downloadUrl,
      download_url: downloadUrl,
    };
  });

  return {
    ...review,
    documents: normalizedDocs,
  };
}

export function getDesignReviewByName(name: string): DesignReview | null {
  const reviews = loadAllDesignReviews();
  const norm = name.toLowerCase().trim();
  const review = reviews.find((r) => r.name.toLowerCase().trim() === norm || r.title.toLowerCase().trim() === norm);
  if (!review) return null;
  return hydrateReviewDocuments(review);
}

export async function saveOrUpdateDesignReview(
  data: Partial<DesignReview>,
  uploadedFiles?: { name: string; size: number; dataUrl?: string; mimeType?: string }[],
  session?: PDMUserSession | null
): Promise<DesignReview> {
  const reviews = loadAllDesignReviews();
  const isExisting = !!data.name && reviews.some((r) => r.name === data.name);
  const uploaderName = session?.fullName || session?.username || session?.email || 'Administrator';
  const todayStr = new Date().toISOString().split('T')[0];

  let review: DesignReview;
  let isNew = false;

  if (isExisting) {
    review = reviews.find((r) => r.name === data.name)!;
    Object.assign(review, data);
    review.modified = new Date().toISOString();
  } else {
    isNew = true;
    const nextNum = reviews.length + 1;
    const reviewId = data.name || `DR-2026-${String(nextNum).padStart(5, '0')}`;
    review = {
      name: reviewId,
      title: data.title || 'Untitled Design Review',
      project: data.project || 'PROJ-0001',
      review_type: data.review_type || 'Concept Review',
      review_date: data.review_date || todayStr,
      reviewer: data.reviewer || 'Lead Engineer',
      participants: data.participants || ['Administrator'],
      status: data.status || 'Planned',
      approval_status: data.approval_status || 'Pending',
      description: data.description || '',
      notes: data.notes || '',
      documents: data.documents ? [...data.documents] : [],
      findings: data.findings ? [...data.findings] : [],
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      owner: uploaderName,
    };
    reviews.unshift(review);
  }

  // Process and permanently link uploaded files
  if (uploadedFiles && uploadedFiles.length > 0) {
    review.documents = review.documents || [];

    for (const file of uploadedFiles) {
      if (!file.name) continue;

      try {
        const savedDoc = await saveDocument({
          title: file.name,
          project: review.project || 'GLOBAL',
          document_type: 'Design',
          version: 'v1.0',
          uploaded_by: uploaderName,
          upload_date: todayStr,
          file_name: file.name,
          file_size: file.size,
          file_data: file.dataUrl,
          mime_type: file.mimeType || 'application/pdf',
          entity_type: 'DesignReview',
          entity_id: review.name,
          status: 'Approved',
          review_status: 'Approved',
          description: `Attached document for Design Review "${review.title}" (${review.name})`,
        });

        const docRecord = {
          id: savedDoc.name,
          name: savedDoc.name,
          file_name: file.name,
          file_url: `/api/documents/${encodeURIComponent(savedDoc.name)}/download`,
          download_url: `/api/documents/${encodeURIComponent(savedDoc.name)}/download`,
          file_size: savedDoc.file_size,
          mime_type: savedDoc.mime_type,
          uploaded_by: uploaderName,
          uploaded_at: new Date().toISOString(),
        };

        const existingDocIdx = review.documents.findIndex((d) => d.id === docRecord.id || d.name === docRecord.name || (d.file_name === file.name && d.file_name));
        if (existingDocIdx !== -1) {
          review.documents[existingDocIdx] = docRecord;
        } else {
          review.documents.push(docRecord);
        }
      } catch (uploadErr) {
        console.error(`Error saving uploaded file "${file.name}" for Design Review ${review.name}:`, uploadErr);
      }
    }
  }

  saveAllDesignReviews(reviews);

  // Log Audit Action
  saveAuditRecord({
    project_id: review.project || 'GLOBAL',
    user_id: session?.email || session?.username || 'admin',
    user_name: uploaderName,
    role: session?.role || 'admin',
    action: isNew ? 'Design Review Created' : 'Design Review Updated',
    entity_type: 'DesignReview',
    entity_id: review.name,
    description: `${isNew ? 'Created' : 'Updated'} Design Review "${review.title}" (${review.name}) with ${review.documents?.length || 0} attached documents.`,
  });

  return hydrateReviewDocuments(review);
}

export function deleteDesignReview(name: string): boolean {
  const reviews = loadAllDesignReviews();
  const initialLength = reviews.length;
  const filtered = reviews.filter((r) => r.name !== name);
  if (filtered.length !== initialLength) {
    saveAllDesignReviews(filtered);
    return true;
  }
  return false;
}
