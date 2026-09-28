import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

interface CsvRow {
  institution_code: string;
  university_name: string;
  state: string;
  city?: string;
  district?: string;
  status?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

function parseCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    if (values.every((v) => !v)) continue; // skip empty lines
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

/**
 * POST /api/admin/institutions/upload
 * Step 1: Upload CSV, validate, return preview. Does NOT commit to DB.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { csvContent, fileName = "institutions.csv", mode = "UPSERT" } = body;

      if (!csvContent || typeof csvContent !== "string") {
        return NextResponse.json(
          { success: false, error: "CSV content is required." },
          { status: 400 }
        );
      }

      // Parse CSV
      const { headers, rows } = parseCsv(csvContent);
      
      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "CSV file is empty or contains only headers." },
          { status: 400 }
        );
      }

      // Validate required headers
      const requiredHeaders = ["university_name", "state"];
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
      if (missingHeaders.length > 0) {
        return NextResponse.json(
          { success: false, error: `Missing required CSV headers: ${missingHeaders.join(", ")}` },
          { status: 400 }
        );
      }

      // Validate rows
      const errors: ValidationError[] = [];
      const validRows: CsvRow[] = [];
      const seenCodes = new Set<string>();
      const seenNameState = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // 1-indexed + header row

        const universityName = (row.university_name || "").trim();
        const state = (row.state || "").trim();
        const code = (row.institution_code || "").trim();

        if (!universityName) {
          errors.push({ row: rowNum, field: "university_name", message: "University Name is empty." });
          continue;
        }

        if (!state) {
          errors.push({ row: rowNum, field: "state", message: "State is empty." });
          continue;
        }

        // Check duplicate codes within CSV
        if (code) {
          if (seenCodes.has(code.toUpperCase())) {
            errors.push({ row: rowNum, field: "institution_code", message: `Duplicate institution code: ${code}` });
            continue;
          }
          seenCodes.add(code.toUpperCase());
        }

        // Check duplicate name+state within CSV
        const nameStateKey = `${universityName.toLowerCase()}||${state.toLowerCase()}`;
        if (seenNameState.has(nameStateKey)) {
          errors.push({ row: rowNum, field: "university_name", message: `Duplicate university/state combination: ${universityName}, ${state}` });
          continue;
        }
        seenNameState.add(nameStateKey);

        // Generate code if not provided
        const finalCode = code || `AUTO_${state.substring(0, 3).toUpperCase()}${String(i + 1).padStart(3, "0")}`;

        validRows.push({
          institution_code: finalCode,
          university_name: universityName,
          state,
          city: (row.city || "").trim() || undefined,
          district: (row.district || "").trim() || undefined,
          status: (row.status || "ACTIVE").trim().toUpperCase(),
        });
      }

      // Check against existing DB records
      let newCount = 0;
      let existingCount = 0;

      for (const vr of validRows) {
        const existing = await prisma.institution.findFirst({
          where: {
            OR: [
              { institutionCode: vr.institution_code },
              { name: { equals: vr.university_name, mode: "insensitive" }, state: { equals: vr.state, mode: "insensitive" } },
            ],
          },
        });
        if (existing) {
          existingCount++;
        } else {
          newCount++;
        }
      }

      // Create import record
      const importRecord = await prisma.institutionImport.create({
        data: {
          fileName,
          uploadedBy: context.user.email,
          mode,
          totalRows: rows.length,
          status: errors.length > 0 ? "FAILED" : "PREVIEWING",
          failedCount: errors.length,
          errorReport: errors.length > 0 ? JSON.stringify(errors) : null,
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "INSTITUTION_CSV_UPLOADED",
        resourceType: "institution",
        resourceId: importRecord.id,
        metadata: { fileName, totalRows: rows.length, errors: errors.length, newCount, existingCount },
      });

      if (errors.length > 0) {
        return NextResponse.json({
          success: false,
          error: `CSV validation failed: ${errors.length} rows contain errors.`,
          importId: importRecord.id,
          totalRows: rows.length,
          validCount: validRows.length,
          errorCount: errors.length,
          errors: errors.slice(0, 50),
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "CSV validated successfully. Review preview and confirm import.",
        importId: importRecord.id,
        fileName,
        totalRows: rows.length,
        validCount: validRows.length,
        newCount,
        existingCount,
        invalidCount: errors.length,
        preview: validRows.slice(0, 20),
        mode,
      });
    } catch (err: any) {
      console.error("[INSTITUTION_UPLOAD_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.INSTITUTION_MANAGE],
  }
);
