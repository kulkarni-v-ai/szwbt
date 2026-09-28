import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";
import { generateParticipantQr } from "@/lib/qr/service";

/**
 * POST /api/registration/participants
 * Creates an individual participant record under the selected university/team.
 *
 * CRITICAL REQUIREMENT (Section 4):
 * QR MUST BE GENERATED IMMEDIATELY AFTER PARTICIPANT CREATION.
 * Do NOT wait for documents, verification, or payment!
 *
 * Enforces:
 * - Required fields: fullName, email, mobile, state, institution
 * - NO Date of Birth or Roll Number
 * - Immediate QR pass creation with opaque reference
 * - Audit logging
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const {
        fullName,
        email,
        mobile,
        state,
        institution,
        institutionId,
        photoUrl,
        teamId,
        category = "Women's Singles",
        gender = "FEMALE",
        role = "PLAYER",
      } = body;

      // 1. Mandatory Validations
      if (!fullName || !mobile || !state || !institution) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation failed: Full Name, Mobile Number, State, and Institution are required.",
          },
          { status: 400 }
        );
      }

      const cleanName = fullName.trim();
      const cleanPhone = mobile.trim();
      const cleanEmail = email?.trim().toLowerCase() || null;
      const cleanState = state.trim();
      const cleanInst = institution.trim();

      // 2. Duplicate Check
      const existing = await prisma.participant.findFirst({
        where: {
          OR: [
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
            { phone: cleanPhone, name: { equals: cleanName, mode: "insensitive" } },
          ],
        },
        include: {
          teamMemberships: { include: { team: true } },
          qrPasses: { where: { status: "ACTIVE" } },
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            error: `Participant ${cleanName} is already registered (${existing.playerId}).`,
            existingParticipant: {
              id: existing.id,
              playerId: existing.playerId,
              name: existing.name,
              institution: existing.institution,
              status: existing.status,
              qrToken: existing.qrCode || existing.qrPasses[0]?.token,
            },
          },
          { status: 409 }
        );
      }

      // 3. Create Participant & Immediate QR in Transaction
      const result = await prisma.$transaction(async (tx) => {
        // Generate canonical Player ID
        const count = await tx.participant.count();
        const playerId = `SZWBT26-P-${String(count + 1).padStart(6, "0")}`;

        const participant = await tx.participant.create({
          data: {
            playerId,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            institution: cleanInst,
            institutionId: institutionId || null,
            state: cleanState,
            category,
            gender,
            photoUrl: photoUrl || null,
            status: "PENDING", // Participant Details Saved -> Documents Pending
          },
        });

        // Link to Team if teamId provided
        let targetTeam: any = null;
        if (teamId) {
          targetTeam = await tx.team.findUnique({ where: { id: teamId } });
          if (targetTeam) {
            await tx.teamMember.create({
              data: {
                teamId: targetTeam.id,
                participantId: participant.id,
                role: role || "PLAYER",
              },
            });
          }
        }

        // 4. CRITICAL: Generate Participant QR IMMEDIATELY through web portal
        const qrResult = await generateParticipantQr(participant.id, context.user.email, { db: tx });

        return {
          participant,
          targetTeam,
          qr: qrResult,
        };
      });

      // 5. Audit Logging
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "PARTICIPANT_CREATED",
        resourceType: "participant",
        resourceId: result.participant.id,
        metadata: {
          playerId: result.participant.playerId,
          name: result.participant.name,
          institution: cleanInst,
          teamId: result.targetTeam?.id || null,
          qrToken: result.qr.token,
          operator: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Participant record created and accreditation QR generated immediately.",
        participant: {
          id: result.participant.id,
          playerId: result.participant.playerId,
          name: result.participant.name,
          email: result.participant.email,
          phone: result.participant.phone,
          institution: result.participant.institution,
          state: result.participant.state,
          category: result.participant.category,
          gender: result.participant.gender,
          status: result.participant.status,
          teamId: result.targetTeam?.id || null,
          teamCode: result.targetTeam?.teamCode || "INDEPENDENT",
          teamName: result.targetTeam?.name || "Independent Contingent",
        },
        qr: {
          token: result.qr.token,
          qrPassId: result.qr.qrPassId,
          qrPayload: result.qr.qrPayload,
          isGeneratedImmediately: true,
        },
      });
    } catch (err: any) {
      console.error("[REGISTRATION_PARTICIPANTS_POST_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.PARTICIPANT_CREATE],
  }
);
