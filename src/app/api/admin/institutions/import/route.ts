import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/admin/institutions/import
 * Step 2: Confirm and execute the import after preview approval.
 * Performs UPSERT within a database transaction.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { importId, csvContent, mode = "UPSERT" } = body;

      if (!csvContent) {
        return NextResponse.json(
          { success: false, error: "CSV content is required for import execution." },
          { status: 400 }
        );
      }

      // Parse CSV again for the actual import
      const lines = csvContent.split(/\r?\n/).filter((l: string) => l.trim());
      if (lines.length < 2) {
        return NextResponse.json(
          { success: false, error: "CSV must contain headers and at least one data row." },
          { status: 400 }
        );
      }

      const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/"/g, ""));
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v: string) => v.trim().replace(/^"|"$/g, ""));
        if (values.every((v: string) => !v)) continue;
        const row: Record<string, string> = {};
        headers.forEach((h: string, idx: number) => { row[h] = values[idx] || ""; });
        rows.push(row);
      }

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      // Execute in transaction
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const universityName = (row.university_name || "").trim();
          const state = (row.state || "").trim();
          const code = (row.institution_code || "").trim() || `AUTO_${state.substring(0, 3).toUpperCase()}${String(i + 1).padStart(3, "0")}`;
          const city = (row.city || "").trim() || null;
          const district = (row.district || "").trim() || null;
          const status = (row.status || "ACTIVE").trim().toUpperCase();

          if (!universityName || !state) {
            skippedCount++;
            continue;
          }

          try {
            await tx.institution.upsert({
              where: { institutionCode: code },
              update: {
                name: universityName,
                state,
                city,
                district,
                status: ["ACTIVE", "INACTIVE"].includes(status) ? status : "ACTIVE",
              },
              create: {
                institutionCode: code,
                name: universityName,
                state,
                city,
                district,
                status: ["ACTIVE", "INACTIVE"].includes(status) ? status : "ACTIVE",
              },
            });

            // Check if it was insert or update
            const existing = await tx.institution.findUnique({ where: { institutionCode: code } });
            if (existing && existing.createdAt.getTime() === existing.updatedAt.getTime()) {
              createdCount++;
            } else {
              updatedCount++;
            }
          } catch (err) {
            failedCount++;
          }
        }
      });

      // Update import record
      if (importId) {
        await prisma.institutionImport.update({
          where: { id: importId },
          data: {
            status: failedCount > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
            createdCount,
            updatedCount,
            skippedCount,
            failedCount,
          },
        }).catch(() => {});
      }

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "INSTITUTION_IMPORT_CONFIRMED",
        resourceType: "institution",
        resourceId: importId || "direct",
        metadata: { mode, createdCount, updatedCount, skippedCount, failedCount },
      });

      return NextResponse.json({
        success: true,
        message: `Import completed: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed.`,
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
      });
    } catch (err: any) {
      console.error("[INSTITUTION_IMPORT_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.INSTITUTION_MANAGE],
  }
);
