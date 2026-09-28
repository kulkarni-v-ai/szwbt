import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";
import { UserContext } from "@/lib/rbac/service";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export interface QrResolutionResult {
  valid: boolean;
  code?: "QR_VALID" | "QR_INVALID" | "QR_REVOKED" | "ACCESS_DENIED";
  error?: string;
  qrType?: "PARTICIPANT" | "TEAM";
  token?: string;
  data?: any;
}

/**
 * Generates an opaque, secure, non-PII QR pass token for a participant.
 * Immediately creates and activates the QrPass database record.
 */
export async function generateParticipantQr(
  participantId: string,
  createdByEmail?: string,
  options?: { regenerate?: boolean; db?: any }
): Promise<{ token: string; qrPassId: string; qrPayload: string }> {
  const db = options?.db || prisma;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Invalidate previous active QrPasses if regenerating
  if (options?.regenerate) {
    const activePasses = await db.qrPass.findMany({
      where: { participantId, status: "ACTIVE" },
    });
    for (const p of activePasses) {
      await db.qrPass.update({
        where: { id: p.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedReason: "REGENERATED_BY_OPERATOR",
        },
      });
      await logAuditEvent({
        actorEmail: createdByEmail || "system@szwbt2026.edu",
        action: "QR_REVOKED",
        resourceType: "participant",
        resourceId: participantId,
        metadata: { token: p.token, reason: "Regeneration requested" },
      });
    }
  }

  // Generate secure opaque random token: sz26_p_<crypto_hex>
  const randomHex = crypto.randomBytes(16).toString("hex");
  const token = `sz26_part_${randomHex}`;
  const qrPayload = `${appUrl}/q/${token}`;

  // Persist QrPass entity
  const qrPass = await db.qrPass.create({
    data: {
      token,
      qrType: "PARTICIPANT",
      status: "ACTIVE",
      participantId,
      createdBy: createdByEmail || null,
    },
  });

  // Keep legacy Participant.qrCode in sync for backward compatibility
  await db.participant.update({
    where: { id: participantId },
    data: { qrCode: token },
  });

  // Audit Log
  await logAuditEvent({
    actorEmail: createdByEmail || "system@szwbt2026.edu",
    action: options?.regenerate ? "QR_REGENERATED" : "QR_GENERATED",
    resourceType: "participant",
    resourceId: participantId,
    metadata: {
      token,
      qrPassId: qrPass.id,
      qrType: "PARTICIPANT",
    },
  });

  return {
    token,
    qrPassId: qrPass.id,
    qrPayload,
  };
}

/**
 * Generates an opaque, secure, non-PII QR pass token for an institution/team.
 */
export async function generateTeamQr(
  teamId: string,
  createdByEmail?: string,
  options?: { regenerate?: boolean; db?: any }
): Promise<{ token: string; qrPassId: string; qrPayload: string }> {
  const db = options?.db || prisma;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (options?.regenerate) {
    const activePasses = await db.qrPass.findMany({
      where: { teamId, status: "ACTIVE" },
    });
    for (const p of activePasses) {
      await db.qrPass.update({
        where: { id: p.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedReason: "REGENERATED_BY_OPERATOR",
        },
      });
      await logAuditEvent({
        actorEmail: createdByEmail || "system@szwbt2026.edu",
        action: "QR_REVOKED",
        resourceType: "team",
        resourceId: teamId,
        metadata: { token: p.token, reason: "Regeneration requested" },
      });
    }
  }

  const randomHex = crypto.randomBytes(16).toString("hex");
  const token = `sz26_team_${randomHex}`;
  const qrPayload = `${appUrl}/q/${token}`;

  const qrPass = await db.qrPass.create({
    data: {
      token,
      qrType: "TEAM",
      status: "ACTIVE",
      teamId,
      createdBy: createdByEmail || null,
    },
  });

  await db.team.update({
    where: { id: teamId },
    data: { teamQrToken: token },
  });

  await logAuditEvent({
    actorEmail: createdByEmail || "system@szwbt2026.edu",
    action: options?.regenerate ? "QR_REGENERATED" : "QR_GENERATED",
    resourceType: "team",
    resourceId: teamId,
    metadata: {
      token,
      qrPassId: qrPass.id,
      qrType: "TEAM",
    },
  });

  return {
    token,
    qrPassId: qrPass.id,
    qrPayload,
  };
}

/**
 * Revokes an existing QR pass with audit logging.
 */
export async function revokeQrPass(
  token: string,
  revokedByEmail: string,
  reason: string = "MANUALLY_REVOKED"
): Promise<{ success: boolean; message: string }> {
  const pass = await prisma.qrPass.findUnique({ where: { token } });
  if (!pass) {
    return { success: false, message: "QR token not found." };
  }

  await prisma.qrPass.update({
    where: { id: pass.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });

  await logAuditEvent({
    actorEmail: revokedByEmail,
    action: "QR_REVOKED",
    resourceType: pass.qrType === "PARTICIPANT" ? "participant" : "team",
    resourceId: pass.participantId || pass.teamId || pass.id,
    metadata: { token, reason },
  });

  return { success: true, message: "QR pass has been successfully revoked." };
}

/**
 * Resolves an opaque QR token in an operation-scoped manner.
 * Enforces RBAC clearance and returns ONLY data required for that specific operation.
 * NEVER returns full unredacted PII across unauthorized domains.
 */
export async function resolveQrOperation(
  rawInput: string,
  operation: "REGISTRATION" | "ACCOMMODATION" | "TRANSPORT" | "DOCUMENT_SCANNING",
  context: UserContext
): Promise<QrResolutionResult> {
  const trimmed = rawInput.trim();
  // Strip domain URL prefix if scanned full URL: https://szwbt.edu/q/<token>
  const token = trimmed.includes("/q/") ? trimmed.split("/q/")[1].split("?")[0].trim() : trimmed;

  // 1. Look up QrPass in database
  let qrPass: any = await prisma.qrPass.findUnique({
    where: { token },
    include: {
      participant: {
        include: {
          teamMemberships: { include: { team: true } },
          bedAllocations: {
            where: { status: "ACTIVE" },
            include: { bed: { include: { room: { include: { hostel: true } } } } },
          },
          documents: true,
          foodAssignments: {
            include: { foodPackage: true },
          },
        },
      },
      team: {
        include: {
          members: {
            include: {
              participant: {
                include: {
                  bedAllocations: {
                    where: { status: "ACTIVE" },
                    include: { bed: { include: { room: { include: { hostel: true } } } } },
                  },
                  foodAssignments: {
                    include: { foodPackage: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // 1b. Fallback lookup for legacy tokens or playerId
  if (!qrPass) {
    const participant = await prisma.participant.findFirst({
      where: {
        OR: [
          { qrCode: token },
          { playerId: { equals: token, mode: "insensitive" } },
          { id: token },
        ],
      },
      include: {
        teamMemberships: { include: { team: true } },
        bedAllocations: {
          where: { status: "ACTIVE" },
          include: { bed: { include: { room: { include: { hostel: true } } } } },
        },
        documents: true,
        foodAssignments: {
          include: { foodPackage: true },
        },
      },
    });

    if (participant) {
      // Upsert back to QrPass for persistence
      qrPass = await prisma.qrPass.upsert({
        where: { token: participant.qrCode || `sz26_part_${participant.id}` },
        update: { participantId: participant.id, status: "ACTIVE" },
        create: {
          token: participant.qrCode || `sz26_part_${participant.id}`,
          qrType: "PARTICIPANT",
          status: "ACTIVE",
          participantId: participant.id,
          createdBy: context.user.email,
        },
        include: {
          participant: {
            include: {
              teamMemberships: { include: { team: true } },
              bedAllocations: {
                where: { status: "ACTIVE" },
                include: { bed: { include: { room: { include: { hostel: true } } } } },
              },
              documents: true,
              foodAssignments: {
                include: { foodPackage: true },
              },
            },
          },
          team: {
            include: {
              members: {
                include: {
                  participant: {
                    include: {
                      bedAllocations: {
                        where: { status: "ACTIVE" },
                        include: { bed: { include: { room: { include: { hostel: true } } } } },
                      },
                      foodAssignments: {
                        include: { foodPackage: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    } else {
      // Check legacy team QR token or teamCode
      const team = await prisma.team.findFirst({
        where: {
          OR: [
            { teamQrToken: token },
            { teamCode: { equals: token, mode: "insensitive" } },
            { id: token },
          ],
        },
        include: {
          members: {
            include: {
              participant: {
                include: {
                  bedAllocations: {
                    where: { status: "ACTIVE" },
                    include: { bed: { include: { room: { include: { hostel: true } } } } },
                  },
                  foodAssignments: {
                    include: { foodPackage: true },
                  },
                },
              },
            },
          },
        },
      });

      if (team) {
        qrPass = await prisma.qrPass.upsert({
          where: { token: team.teamQrToken || `sz26_team_${team.id}` },
          update: { teamId: team.id, status: "ACTIVE" },
          create: {
            token: team.teamQrToken || `sz26_team_${team.id}`,
            qrType: "TEAM",
            status: "ACTIVE",
            teamId: team.id,
            createdBy: context.user.email,
          },
          include: {
            participant: true as any,
            team: {
              include: {
                members: {
                  include: {
                    participant: {
                      include: {
                        bedAllocations: {
                          where: { status: "ACTIVE" },
                          include: { bed: { include: { room: { include: { hostel: true } } } } },
                        },
                        foodAssignments: {
                          include: { foodPackage: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }
    }
  }

  // 2. Validate QR exists
  if (!qrPass) {
    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "QR_ACCESS_DENIED",
      resourceType: "qr_pass",
      metadata: { token, reason: "INVALID_TOKEN", operation },
    });
    return {
      valid: false,
      code: "QR_INVALID",
      error: "INVALID QR: The scanned pass could not be identified.",
    };
  }

  // 3. Check if QR is revoked
  if (qrPass.status === "REVOKED") {
    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "QR_ACCESS_DENIED",
      resourceType: "qr_pass",
      resourceId: qrPass.id,
      metadata: { token, reason: "REVOKED_TOKEN", revokedAt: qrPass.revokedAt, operation },
    });
    return {
      valid: false,
      code: "QR_REVOKED",
      error: "QR NO LONGER VALID: This accreditation pass has been revoked or superseded.",
    };
  }

  // 4. Enforce Operation-Specific RBAC & Sanitize Data Scope
  if (operation === "ACCOMMODATION") {
    const hasAccommodationAccess =
      context.roles.includes("SUPER_ADMIN") ||
      context.roles.includes("ACCOMMODATION_STAFF") ||
      context.permissions.includes(PERMISSIONS.ACCOMMODATION_READ);

    if (!hasAccommodationAccess) {
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "QR_ACCESS_DENIED",
        resourceType: "accommodation",
        metadata: { token, reason: "INSUFFICIENT_CLEARANCE" },
      });
      return {
        valid: false,
        code: "ACCESS_DENIED",
        error: "ACCESS DENIED: Insufficient clearance for accommodation desk resolution.",
      };
    }

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "QR_SCANNED",
      resourceType: "accommodation",
      resourceId: qrPass.id,
      metadata: { token, operation: "ACCOMMODATION", qrType: qrPass.qrType },
    });

    // Return ONLY accommodation & food relevant fields.
    // NEVER expose private documents or financial payment ledgers!
    if (qrPass.qrType === "PARTICIPANT" && qrPass.participant) {
      const p = qrPass.participant;
      const activeBed = p.bedAllocations[0];
      const isFemale = (p.gender || "FEMALE").toUpperCase() === "FEMALE";
      const team = p.teamMemberships[0]?.team;

      return {
        valid: true,
        code: "QR_VALID",
        qrType: "PARTICIPANT",
        token,
        data: {
          participantId: p.id,
          playerId: p.playerId,
          name: p.name,
          institution: p.institution,
          state: p.state,
          gender: p.gender || "FEMALE",
          registrationStatus: p.status,
          teamId: team?.id || null,
          teamCode: team?.teamCode || "INDEPENDENT",
          teamName: team?.name || "Independent Contingent",
          eligibleHostelId: isFemale ? "SHALMALA" : "VINDHYA",
          eligibleHostelName: isFemale ? "Shalmala Hostel" : "Vindhya Boys Hostel",
          isAllocated: !!activeBed,
          allocation: activeBed
            ? {
                allocationId: activeBed.id,
                hostelId: activeBed.bed.room.hostelId,
                hostelName: activeBed.bed.room.hostel.name,
                floorNumber: activeBed.bed.room.floorNumber,
                roomNumber: activeBed.bed.room.roomNumber,
                bedNumber: activeBed.bed.bedNumber,
                checkInDate: activeBed.checkInDate,
              }
            : null,
          foodAssignments: p.foodAssignments.map((fa: any) => ({
            id: fa.id,
            packageId: fa.packageId,
            date: fa.foodPackage?.date || "—",
            dayNumber: fa.foodPackage?.dayNumber || "—",
            packageName: fa.foodPackage?.name || "Day Food Package",
            status: fa.status,
            assignedAt: fa.assignedAt,
          })),
        },
      };
    } else if (qrPass.qrType === "TEAM" && qrPass.team) {
      const t = qrPass.team;
      const members = t.members.map((m: any) => {
        const p = m.participant;
        const activeBed = p.bedAllocations?.[0];
        const isFemale = (p.gender || "FEMALE").toUpperCase() === "FEMALE";
        return {
          id: p.id,
          playerId: p.playerId,
          name: p.name,
          role: m.role || p.category || "PLAYER",
          gender: p.gender || "FEMALE",
          eligibleHostelId: isFemale ? "SHALMALA" : "VINDHYA",
          eligibleHostelName: isFemale ? "Shalmala Hostel" : "Vindhya Boys Hostel",
          isAllocated: !!activeBed,
          allocation: activeBed
            ? {
                allocationId: activeBed.id,
                hostelId: activeBed.bed.room.hostelId,
                hostelName: activeBed.bed.room.hostel.name,
                floorNumber: activeBed.bed.room.floorNumber,
                roomNumber: activeBed.bed.room.roomNumber,
                bedNumber: activeBed.bed.bedNumber,
              }
            : null,
          foodAssignments: (p.foodAssignments || []).map((fa: any) => ({
            id: fa.id,
            packageId: fa.packageId,
            date: fa.foodPackage?.date || "—",
            dayNumber: fa.foodPackage?.dayNumber || "—",
            status: fa.status,
          })),
        };
      });

      return {
        valid: true,
        code: "QR_VALID",
        qrType: "TEAM",
        token,
        data: {
          teamId: t.id,
          teamCode: t.teamCode,
          teamName: t.name,
          institution: t.institution,
          state: t.state,
          managerName: t.managerName,
          managerPhone: t.managerPhone,
          status: t.status,
          members,
        },
      };
    }
  }

  if (operation === "REGISTRATION") {
    const hasRegAccess =
      context.roles.includes("SUPER_ADMIN") ||
      context.roles.includes("REGISTRATION_STAFF") ||
      context.permissions.includes(PERMISSIONS.REGISTRATION_READ);

    if (!hasRegAccess) {
      return {
        valid: false,
        code: "ACCESS_DENIED",
        error: "ACCESS DENIED: Insufficient clearance for registration desk verification.",
      };
    }

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "QR_SCANNED",
      resourceType: "registration",
      resourceId: qrPass.id,
      metadata: { token, operation: "REGISTRATION" },
    });

    if (qrPass.participant) {
      const p = qrPass.participant;
      const verifiedDocs = p.documents.filter((d: any) => d.status === "VERIFIED").length;
      return {
        valid: true,
        code: "QR_VALID",
        qrType: "PARTICIPANT",
        token,
        data: {
          participantId: p.id,
          playerId: p.playerId,
          name: p.name,
          email: p.email,
          phone: p.phone,
          institution: p.institution,
          state: p.state,
          status: p.status,
          documentsCount: p.documents.length,
          verifiedDocumentsCount: verifiedDocs,
          documents: p.documents.map((d: any) => ({
            id: d.id,
            type: d.type,
            status: d.status,
            fileName: d.fileName,
          })),
        },
      };
    }
  }

  if (operation === "TRANSPORT") {
    const hasTransportAccess =
      context.roles.includes("SUPER_ADMIN") ||
      context.roles.includes("TRANSPORT_STAFF") ||
      context.permissions.includes(PERMISSIONS.TRANSPORT_BOARDING);

    if (!hasTransportAccess) {
      return {
        valid: false,
        code: "ACCESS_DENIED",
        error: "ACCESS DENIED: Insufficient clearance for transport scanning.",
      };
    }

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "QR_SCANNED",
      resourceType: "transport",
      resourceId: qrPass.id,
      metadata: { token, operation: "TRANSPORT" },
    });

    const p = qrPass.participant;
    return {
      valid: true,
      code: "QR_VALID",
      qrType: qrPass.qrType as "PARTICIPANT" | "TEAM",
      token,
      data: {
        participantId: p?.id || null,
        playerId: p?.playerId || null,
        name: p?.name || qrPass.team?.name || "Passenger",
        institution: p?.institution || qrPass.team?.institution,
        boardingEligible: true,
        // STRICT ZERO PAYMENT POLICY: No payment, fare, or ledger fields returned
      },
    };
  }

  if (operation === "DOCUMENT_SCANNING") {
    const hasScannerAccess =
      context.roles.includes("SUPER_ADMIN") ||
      context.roles.includes("DOCUMENT_SCANNER") ||
      context.permissions.includes(PERMISSIONS.DOCUMENT_UPLOAD);

    if (!hasScannerAccess) {
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "QR_ACCESS_DENIED",
        resourceType: "document",
        metadata: { token, reason: "INSUFFICIENT_CLEARANCE", operation },
      });
      return {
        valid: false,
        code: "ACCESS_DENIED",
        error: "ACCESS DENIED: Insufficient clearance for document scanning.",
      };
    }

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "QR_SCANNED",
      resourceType: "document",
      resourceId: qrPass.id,
      metadata: { token, operation: "DOCUMENT_SCANNING", qrType: qrPass.qrType },
    });

    if (qrPass.participant) {
      const p = qrPass.participant;
      return {
        valid: true,
        code: "QR_VALID",
        qrType: "PARTICIPANT",
        token,
        data: {
          participantId: p.id,
          playerId: p.playerId,
          name: p.name,
          institution: p.institution,
          state: p.state,
          photoUrl: (p as any).photoUrl || null,
          registrationStatus: p.status,
          documents: p.documents.map((d: any) => ({
            id: d.id,
            type: d.type,
            status: d.status,
            fileName: d.fileName,
            capturedBy: d.capturedBy,
            updatedAt: d.updatedAt,
          })),
          // NEVER expose: email, phone, payment, accommodation to scanner
        },
      };
    }
  }

  return {
    valid: false,
    code: "QR_INVALID",
    error: "Unsupported operation type.",
  };
}
