import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";
import { generateParticipantQr } from "@/lib/qr/service";

export interface AthleteInput {
  name: string;
  email?: string;
  mobile: string;
  photoUrl?: string;
  aadhaarNumber?: string;
  aadhaarUrl?: string;
  bedId?: string;
}

export interface ManagerInput {
  name?: string;
  email?: string;
  mobile?: string;
  photoUrl?: string;
  aadhaarNumber?: string;
  aadhaarUrl?: string;
  bedId?: string;
}

/**
 * POST /api/registration/team-contingent
 * Registers a full university team contingent (5 athletes + Team Manager) in a single atomic transaction.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const {
        state,
        institution,
        institutionId,
        teamName,
        managerName,
        managerPhone,
        managerEmail,
        managerPhotoUrl,
        managerAadhaarNumber,
        managerAadhaarUrl,
        managerBedId,
        manager, // Optional structured manager object
        athletes, // Array of 5 athletes
        paymentMethod = "CASH",
        utr,
        feePerAthlete = 500, // ₹500 per athlete (₹2,500 total per team contingent)
        combinedPdf, // Single combined PDF for entire squad
      } = body;

      // 1. Mandatory Validations
      if (!state || !institution) {
        return NextResponse.json(
          { success: false, error: "State and University / Institution are required." },
          { status: 400 }
        );
      }

      if (!Array.isArray(athletes) || athletes.length === 0) {
        return NextResponse.json(
          { success: false, error: "Athletes squad list is required." },
          { status: 400 }
        );
      }

      // Validate all provided athletes
      for (let i = 0; i < athletes.length; i++) {
        const a = athletes[i];
        if (!a.name || !a.name.trim() || !a.mobile || !a.mobile.trim()) {
          return NextResponse.json(
            {
              success: false,
              error: `Athlete ${i + 1} is missing mandatory Full Name or Mobile Number.`,
            },
            { status: 400 }
          );
        }
      }

      if (paymentMethod === "UPI" && (!utr || !utr.trim())) {
        return NextResponse.json(
          { success: false, error: "UPI Transaction Reference (UTR) is strictly required for UPI payment." },
          { status: 400 }
        );
      }

      const cleanState = state.trim();
      const cleanInst = institution.trim();
      const cleanTeamName = teamName?.trim() || `${cleanInst} Badminton Contingent`;
      const finalManagerName = manager?.name || managerName || "";
      const finalManagerPhone = manager?.mobile || managerPhone || "";
      const finalManagerEmail = manager?.email || managerEmail || "";
      const finalManagerPhoto = manager?.photoUrl || managerPhotoUrl || null;
      const finalManagerAadhaar = manager?.aadhaarNumber || managerAadhaarNumber || "";
      const finalManagerAadhaarUrl = manager?.aadhaarUrl || managerAadhaarUrl || null;
      const finalManagerBedId = manager?.bedId || managerBedId || null;

      const totalAmount = athletes.length * feePerAthlete;

      // 2. Atomic Transaction
      const result = await prisma.$transaction(async (tx) => {
        // A. Create or Find University Team
        const teamCount = await tx.team.count();
        const teamCode = `TM-SZ-${String(teamCount + 1).padStart(3, "0")}`;
        const teamQrToken = `sz26_qr_tm_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

        const team = await tx.team.create({
          data: {
            teamCode,
            name: cleanTeamName,
            institution: cleanInst,
            state: cleanState,
            managerName: finalManagerName.trim() || null,
            managerPhone: finalManagerPhone.trim() || null,
            captainName: athletes[0]?.name?.trim() || null,
            status: "COMPLETED",
            teamQrToken,
          },
        });

        // B. If Manager Name/Phone provided, register Manager as Official Participant/Team Member
        let createdManager: any = null;
        if (finalManagerName.trim()) {
          const mgrCount = await tx.participant.count();
          const mgrPlayerId = `SZWBT26-M-${String(mgrCount + 1).padStart(5, "0")}`;

          const mgrParticipant = await tx.participant.create({
            data: {
              playerId: mgrPlayerId,
              name: finalManagerName.trim(),
              email: finalManagerEmail.trim().toLowerCase() || null,
              phone: finalManagerPhone.trim() || "—",
              institution: cleanInst,
              institutionId: institutionId || null,
              state: cleanState,
              category: "Contingent Management",
              gender: "FEMALE",
              photoUrl: finalManagerPhoto,
              status: "APPROVED",
            },
          });

          // Link manager to team
          await tx.teamMember.create({
            data: {
              teamId: team.id,
              participantId: mgrParticipant.id,
              role: "MANAGER",
            },
          });

          // Generate QR Pass for Manager
          const mgrQr = await generateParticipantQr(mgrParticipant.id, context.user.email, { db: tx });

          // Record Aadhaar Document if provided
          if (finalManagerAadhaar.trim() || finalManagerAadhaarUrl) {
            await tx.document.create({
              data: {
                participantId: mgrParticipant.id,
                type: "AADHAAR",
                fileName: `Aadhaar_${mgrParticipant.name.replace(/\s+/g, "_")}.pdf`,
                filePath: finalManagerAadhaarUrl || `aadhaar://${finalManagerAadhaar.trim()}`,
                status: "VERIFIED",
                capturedBy: context.user.email,
              },
            });
          }

          // Allocate Manager Bed if provided
          let mgrBedInfo: any = null;
          if (finalManagerBedId) {
            const bed = await tx.bed.findUnique({
              where: { id: finalManagerBedId },
              include: { room: { include: { hostel: true, floor: true } } },
            });

            if (bed && bed.status === "AVAILABLE") {
              await tx.accommodationAllocation.create({
                data: {
                  bedId: bed.id,
                  participantId: mgrParticipant.id,
                  teamId: team.id,
                  allocatedBy: context.user.email,
                  status: "ACTIVE",
                },
              });

              await tx.bed.update({
                where: { id: bed.id },
                data: { status: "OCCUPIED" },
              });

              mgrBedInfo = {
                bedNumber: bed.bedNumber,
                roomNumber: bed.room.roomNumber,
                hostel: bed.room.hostel.name,
                floor: bed.room.floor?.name || bed.room.floorNumber || "Floor 01",
              };
            }
          }

          createdManager = {
            id: mgrParticipant.id,
            playerId: mgrParticipant.playerId,
            name: mgrParticipant.name,
            email: mgrParticipant.email,
            phone: mgrParticipant.phone,
            role: "MANAGER",
            institution: mgrParticipant.institution,
            state: mgrParticipant.state,
            photoUrl: mgrParticipant.photoUrl,
            aadhaarNumber: finalManagerAadhaar.trim() || null,
            qrToken: mgrQr.token,
            bed: mgrBedInfo,
          };
        }

        // C. Create Each Participant & Bed Allocation & QR Pass
        const createdParticipants: any[] = [];

        for (let i = 0; i < athletes.length; i++) {
          const a = athletes[i];
          const participantCount = await tx.participant.count();
          const playerId = `SZWBT26-P-${String(participantCount + 1).padStart(6, "0")}`;

          const participant = await tx.participant.create({
            data: {
              playerId,
              name: a.name.trim(),
              email: a.email?.trim().toLowerCase() || null,
              phone: a.mobile.trim(),
              institution: cleanInst,
              institutionId: institutionId || null,
              state: cleanState,
              category: i < 2 ? "Women's Singles" : "Women's Doubles",
              gender: "FEMALE",
              photoUrl: a.photoUrl || null,
              status: "PENDING",
            },
          });

          // Link to team
          await tx.teamMember.create({
            data: {
              teamId: team.id,
              participantId: participant.id,
              role: i === 0 ? "CAPTAIN" : "PLAYER",
            },
          });

          // Generate QR Pass immediately
          const qrResult = await generateParticipantQr(participant.id, context.user.email, { db: tx });

          // Record Aadhaar Document if provided
          if (a.aadhaarNumber?.trim() || a.aadhaarUrl) {
            await tx.document.create({
              data: {
                participantId: participant.id,
                type: "AADHAAR",
                fileName: `Aadhaar_${participant.name.replace(/\s+/g, "_")}.pdf`,
                filePath: a.aadhaarUrl || `aadhaar://${a.aadhaarNumber.trim()}`,
                status: "VERIFIED",
                capturedBy: context.user.email,
              },
            });
          }

          // Allocate Bed if provided
          let bedInfo: any = null;
          if (a.bedId) {
            const bed = await tx.bed.findUnique({
              where: { id: a.bedId },
              include: { room: { include: { hostel: true, floor: true } } },
            });

            if (bed && bed.status === "AVAILABLE") {
              await tx.accommodationAllocation.create({
                data: {
                  bedId: bed.id,
                  participantId: participant.id,
                  teamId: team.id,
                  allocatedBy: context.user.email,
                  status: "ACTIVE",
                },
              });

              await tx.bed.update({
                where: { id: bed.id },
                data: { status: "OCCUPIED" },
              });

              bedInfo = {
                bedNumber: bed.bedNumber,
                roomNumber: bed.room.roomNumber,
                hostel: bed.room.hostel.name,
                floor: bed.room.floor?.name || bed.room.floorNumber || "Floor 01",
              };
            }
          }

          createdParticipants.push({
            id: participant.id,
            playerId: participant.playerId,
            name: participant.name,
            email: participant.email,
            phone: participant.phone,
            role: i === 0 ? "CAPTAIN" : "ATHLETE",
            institution: participant.institution,
            state: participant.state,
            category: participant.category,
            photoUrl: participant.photoUrl,
            aadhaarNumber: a.aadhaarNumber?.trim() || null,
            qrToken: qrResult.token,
            bed: bedInfo,
          });
        }

        // D. Record Payment Transaction
        const txn = await tx.paymentTransaction.create({
          data: {
            category: "REGISTRATION",
            entityType: "TEAM",
            entityId: team.id,
            amount: totalAmount,
            method: paymentMethod,
            utr: paymentMethod === "UPI" ? utr.trim() : null,
            operatorEmail: context.user.email,
            receiptNumber: `REC-SZ26-${Date.now().toString().slice(-6)}`,
            status: "SUCCESS",
            notes: `Full contingent registration payment for ${cleanInst} (${athletes.length} athletes @ ₹${feePerAthlete})`,
          },
        });

        // E. Create Fee Ledger
        await tx.feeLedger.create({
          data: {
            category: "REGISTRATION",
            entityType: "TEAM",
            teamId: team.id,
            amountDue: totalAmount,
            amountPaid: totalAmount,
            balance: 0,
            status: "PAID",
          },
        });

        return {
          team,
          manager: createdManager,
          participants: createdParticipants,
          payment: txn,
        };
      });

      // 3. Audit Logging
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "TEAM_REGISTERED",
        resourceType: "team",
        resourceId: result.team.id,
        metadata: {
          teamCode: result.team.teamCode,
          institution: cleanInst,
          athleteCount: result.participants.length,
          managerName: finalManagerName || null,
          totalAmount,
          paymentMethod,
          operator: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully registered full contingent for ${cleanInst} (${result.participants.length} athletes + Manager).`,
        data: result,
      });
    } catch (error: any) {
      console.error("[POST /api/registration/team-contingent] Error:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Failed to register team contingent." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.REGISTRATION_CREATE],
  }
);
