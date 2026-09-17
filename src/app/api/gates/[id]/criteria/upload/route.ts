import { NextRequest, NextResponse } from 'next/server';
import { getGateByName, saveOrUpdateGate } from '@/lib/server/gate-store';
import { saveAuditRecord } from '@/lib/server/audit-store';
import { uploadDocumentFile } from '@/lib/server/file-storage';
import { PDMUserSession } from '@/types/auth.types';
import { GateCriterion, CriterionStatus } from '@/types/gate.types';
import { getAccessibleProjectIdsForTeamMember } from '@/lib/server/rbac-scoping';

export const dynamic = 'force-dynamic';

function getSessionFromRequest(req: NextRequest): PDMUserSession | null {
  try {
    const cookie = req.cookies.get('pdm_session')?.value;
    if (!cookie) return null;
    const jsonStr = Buffer.from(cookie, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Valid session required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const gateName = decodeURIComponent(id || '');
    const gate = getGateByName(gateName);

    if (!gate) {
      return NextResponse.json(
        { _error_message: `Gate "${gateName}" not found.` },
        { status: 404 }
      );
    }

    // RBAC check: Check if user has permission to upload/modify criteria on this project & gate
    if (session.role === 'teammember') {
      const accessibleProjects = await getAccessibleProjectIdsForTeamMember(session);
      if (gate.project && !accessibleProjects.has(gate.project)) {
        return NextResponse.json(
          {
            _error_message: `403 Forbidden: You do not have access to project "${gate.project}" for this gate.`,
          },
          { status: 403 }
        );
      }
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const criteriaJson = formData.get('criteria') as string | null;

    if (!file && !criteriaJson) {
      return NextResponse.json(
        { _error_message: 'Missing checklist file or criteria data.' },
        { status: 400 }
      );
    }

    let parsedRows: Array<{
      name: string;
      description?: string;
      is_required?: boolean;
      status?: CriterionStatus;
      responsible_person?: string;
      due_date?: string;
      comments?: string;
    }> = [];

    if (criteriaJson) {
      try {
        parsedRows = JSON.parse(criteriaJson);
      } catch (e: any) {
        return NextResponse.json(
          { _error_message: `Invalid criteria JSON: ${e.message}` },
          { status: 400 }
        );
      }
    }

    const fileName = file?.name || 'Gate_Checklist.xlsx';

    // Store physical file if provided
    let fileUrl: string | undefined = undefined;
    if (file) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const stored = await uploadDocumentFile({
          projectId: gate.project || 'General',
          documentId: `CHECKLIST-${gate.name}-${Date.now()}`,
          fileName,
          buffer,
        });
        fileUrl = stored.blobUrl || (stored.filePath ? `/files/${encodeURIComponent(fileName)}` : undefined);
      } catch (uploadErr) {
        console.warn('[Checklist Upload] File storage warning:', uploadErr);
      }
    }

    // Server-Side Duplicate Check & Deduplication against current Gate
    const existingCriteria = gate.criteria || [];
    const existingNameSet = new Set(
      existingCriteria.map((c) => (c.name || '').toLowerCase().trim()).filter(Boolean)
    );

    const newlyAddedCriteria: GateCriterion[] = [];
    let skippedDuplicateCount = 0;

    for (const row of parsedRows) {
      const cleanName = (row.name || '').trim();
      if (!cleanName) continue;

      const normName = cleanName.toLowerCase();
      if (existingNameSet.has(normName)) {
        skippedDuplicateCount++;
        continue;
      }

      existingNameSet.add(normName);

      const newCriterion: GateCriterion = {
        id: `CRT-${Math.floor(1000 + Math.random() * 9000)}`,
        name: cleanName,
        description: (row.description || '').trim(),
        is_required: row.is_required !== undefined ? Boolean(row.is_required) : true,
        status: row.status || 'In Progress',
        responsible_person: (row.responsible_person || '').trim() || gate.gate_owner,
        due_date: row.due_date || gate.planned_date,
        comments: row.comments ? String(row.comments).trim() : undefined,
        source_file: fileName,
      };

      newlyAddedCriteria.push(newCriterion);
    }

    // Update Gate Record
    gate.criteria = [...existingCriteria, ...newlyAddedCriteria];
    gate.checklist_source_file = fileName;
    if (fileUrl) {
      gate.checklist_source_file_url = fileUrl;
    }

    const updatedGate = saveOrUpdateGate(gate);

    // Record Audit Trail
    saveAuditRecord({
      project_id: gate.project || 'General',
      user_id: session.email || session.username,
      user_name: session.fullName || session.username,
      role: session.role,
      action: 'Imported Gate Checklist via Excel',
      entity_type: 'Gate',
      entity_id: gate.name,
      description: `Uploaded checklist Excel "${fileName}" for Gate ${gate.name} (${gate.project}). Created ${newlyAddedCriteria.length} criteria, skipped ${skippedDuplicateCount} duplicate items.`,
    });

    return NextResponse.json({
      success: true,
      message: `Checklist imported successfully. ${newlyAddedCriteria.length} items created. ${skippedDuplicateCount} duplicate items skipped.`,
      createdCount: newlyAddedCriteria.length,
      skippedCount: skippedDuplicateCount,
      sourceFile: fileName,
      sourceFileUrl: fileUrl,
      gate: updatedGate,
    });
  } catch (error: any) {
    console.error('[Checklist Upload API Error]:', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to upload gate checklist' },
      { status: 500 }
    );
  }
}
