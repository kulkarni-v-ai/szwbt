import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const {
        // Step 01: Participant
        fullName,
        email,
        mobile,
        state,
        institution,
        // Step 02: Team
        teamId,
        isCreatingTeam,
        newTeamName,
        managerName,
        managerPhone,
        managerEmail,
        captainName,
        members,
        // Step 03: Documents
        documents,
        // Step 04: Payment
        paymentMethod, // "CASH" | "UPI"
        amountReceived,
        utr,
        feeAmount = 2500,
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

      // If UPI, UTR is required
      if (paymentMethod === "UPI" && (!utr || !utr.trim())) {
        return NextResponse.json(
          {
            success: false,
            error: "UPI Transaction Reference (UTR) is strictly required for UPI payments.",
          },
          { status: 400 }
        );
      }

      const cleanName = fullName.trim();
      const cleanPhone = mobile.trim();
      const cleanEmail = email?.trim().toLowerCase() || null;
      const cleanInst = institution.trim();
      const cleanState = state.trim();

      // 2. Execute Transaction
      const result = await prisma.$transaction(async (tx) => {
        // Generate canonical Player ID
        const count = await tx.participant.count();
        const playerId = `SZ-2026-${String(count + 101).padStart(3, "0")}`;

        // Create Participant
        const participant = await tx.participant.create({
          data: {
            playerId,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            institution: cleanInst,
            state: cleanState,
            category: "Women's Singles",
            status: "APPROVED",
          },
        });

        // Team Handling
        let targetTeamId = teamId;
        let targetTeam: any = null;

        if (isCreatingTeam && newTeamName) {
          const teamCount = await tx.team.count();
          const teamCode = `TM-SZ-${String(teamCount + 101).padStart(3, "0")}`;
          // Generate secure opaque QR token (NO PII or raw sensitive data encoded)
          const opaqueQrToken = `sz26_qr_tm_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

          targetTeam = await tx.team.create({
            data: {
              teamCode,
              name: newTeamName.trim(),
              institution: cleanInst,
              state: cleanState,
              managerName: managerName || null,
              managerPhone: managerPhone || null,
              captainName: captainName || cleanName,
              status: "COMPLETED",
              teamQrToken: opaqueQrToken,
            },
          });
          targetTeamId = targetTeam.id;
        } else if (teamId) {
          targetTeam = await tx.team.findUnique({ where: { id: teamId } });
          if (targetTeam && !targetTeam.teamQrToken) {
            const opaqueQrToken = `sz26_qr_tm_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
            targetTeam = await tx.team.update({
              where: { id: teamId },
              data: { teamQrToken: opaqueQrToken, status: "COMPLETED" },
            });
          }
        }

        // Link Participant to Team
        if (targetTeamId) {
          await tx.teamMember.upsert({
            where: {
              teamId_participantId: {
                teamId: targetTeamId,
                participantId: participant.id,
              },
            },
            update: { role: captainName === cleanName ? "CAPTAIN" : "PLAYER" },
            create: {
              teamId: targetTeamId,
              participantId: participant.id,
              role: captainName === cleanName ? "CAPTAIN" : "PLAYER",
            },
          });
        }

        // Additional Team Members
        if (targetTeamId && Array.isArray(members)) {
          for (const m of members) {
            if (m.name && m.name !== cleanName) {
              // Create member participant if not already existing
              let memberPart = await tx.participant.findFirst({
                where: { OR: [{ email: m.email }, { phone: m.phone }] },
              });
              if (!memberPart) {
                const memberCount = await tx.participant.count();
                memberPart = await tx.participant.create({
                  data: {
                    playerId: `SZ-2026-${String(memberCount + 101).padStart(3, "0")}`,
                    name: m.name.trim(),
                    email: m.email?.trim() || null,
                    phone: m.phone?.trim() || null,
                    institution: m.institution || cleanInst,
                    state: cleanState,
                    category: "Women's Singles",
                    status: "APPROVED",
                  },
                });
              }

              await tx.teamMember.upsert({
                where: {
                  teamId_participantId: {
                    teamId: targetTeamId,
                    participantId: memberPart.id,
                  },
                },
                update: { role: m.role || "PLAYER" },
                create: {
                  teamId: targetTeamId,
                  participantId: memberPart.id,
                  role: m.role || "PLAYER",
                },
              });
            }
          }
        }

        // Documents Handling
        if (Array.isArray(documents)) {
          for (const doc of documents) {
            if (doc.type && doc.status === "READY") {
              await tx.document.create({
                data: {
                  participantId: participant.id,
                  type: doc.type,
                  fileName: doc.fileName || `${doc.type.toLowerCase()}.jpg`,
                  filePath: doc.url || `/uploads/secure/${participant.id}/${doc.type.toLowerCase()}.jpg`,
                  fileSize: doc.fileSize || 1024,
                  mimeType: doc.mimeType || "image/jpeg",
                  status: "VERIFIED",
                  capturedBy: context.user.email,
                },
              });
            }
          }
        }

        // Payment Handling (Separated completely into REGISTRATION category)
        const numericAmount = parseFloat(amountReceived) || 0;
        const internalTxnId = `TXN-REG-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        const payment = await tx.paymentTransaction.create({
          data: {
            category: "REGISTRATION",
            entityType: "PARTICIPANT",
            entityId: participant.id,
            amount: numericAmount,
            method: paymentMethod || "CASH",
            utr: paymentMethod === "UPI" ? (utr || "").trim() : null,
            internalTxnId,
            operatorEmail: context.user.email,
            status: "SUCCESS",
            receiptNumber: `RCP-REG-${Date.now().toString().slice(-6)}`,
            notes: `Registration desk entry for ${cleanName} (${participant.playerId})`,
          },
        });

        return { participant, targetTeam, payment };
      });

      // 3. Tamper-Evident Audit Logging
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "REGISTRATION_COMPLETED",
        resourceType: "registration",
        resourceId: result.participant.id,
        metadata: {
          playerId: result.participant.playerId,
          athleteName: cleanName,
          institution: cleanInst,
          teamCode: result.targetTeam?.teamCode || null,
          paymentMethod: body.paymentMethod,
          amountPaid: body.amountReceived,
          utr: body.paymentMethod === "UPI" ? body.utr : undefined,
          operator: context.user.name,
        },
      });

      if (result.targetTeam?.teamQrToken) {
        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "TEAM_QR_GENERATED",
          resourceType: "team",
          resourceId: result.targetTeam.id,
          metadata: {
            teamCode: result.targetTeam.teamCode,
            teamName: result.targetTeam.name,
            qrToken: result.targetTeam.teamQrToken,
            operator: context.user.name,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Registration completed successfully.",
        participantId: result.participant.id,
        playerId: result.participant.playerId,
        athleteName: result.participant.name,
        teamId: result.targetTeam?.id || null,
        teamCode: result.targetTeam?.teamCode || null,
        teamName: result.targetTeam?.name || "Independent",
        teamQrToken: result.targetTeam?.teamQrToken || null,
        payment: {
          txnId: result.payment.internalTxnId,
          amount: result.payment.amount,
          method: result.payment.method,
          receiptNumber: result.payment.receiptNumber,
        },
      });
    } catch (err: any) {
      console.error("Registration completion error:", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.REGISTRATION_CREATE],
  }
);
