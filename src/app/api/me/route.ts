import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/rbac/guard";
import { logAuditEvent } from "@/lib/rbac/audit";
import { ROLE_DEFINITIONS, RoleName } from "@/lib/rbac/roles";

// Strictly forbidden fields for self-service profile update
const FORBIDDEN_ESCALATION_KEYS = [
  "role",
  "roles",
  "userRoles",
  "permission",
  "permissions",
  "isAdmin",
  "accessLevel",
  "isActive",
  "status",
  "userId",
  "participantId",
  "teamId",
  "officialId",
  "password",
  "passwordHash",
  "targetUrl",
  "badge",
  "id",
  "email",
  "sessionVersion",
];

function sanitizeString(str: string): string {
  // Strip HTML tags and suspicious script/SQL injection patterns
  return str
    .replace(/<[^>]*>?/gm, "")
    .replace(/['";\\]/g, "")
    .trim();
}

/**
 * Derives user's authorized modules from their active permissions and roles
 */
function deriveAuthorizedModules(roles: string[], permissions: string[]): string[] {
  const modules = new Set<string>();

  if (roles.includes("SUPER_ADMIN")) {
    return [
      "System Administration",
      "Tournament Operations",
      "Registration & Athlete Desk",
      "Hostel & Accommodation Logistics",
      "Fleet & Transport Logistics",
      "Finance & Treasury Ledgers",
      "Match Officiating & Scoring",
      "Tournament Communications",
      "Reports & Analytics Center",
      "Participant Support Desk",
    ];
  }

  if (permissions.includes("admin:read") || permissions.includes("system:configure")) {
    modules.add("System Administration");
  }
  if (permissions.includes("match:create") || permissions.includes("match:read")) {
    modules.add("Tournament Operations");
  }
  if (permissions.includes("registration:read") || permissions.includes("participant:read")) {
    modules.add("Registration & Athlete Desk");
  }
  if (permissions.includes("accommodation:read")) {
    modules.add("Hostel & Accommodation Logistics");
  }
  if (permissions.includes("transport:read")) {
    modules.add("Fleet & Transport Logistics");
  }
  if (permissions.includes("finance:read") || permissions.includes("payment:read")) {
    modules.add("Finance & Treasury Ledgers");
  }
  if (permissions.includes("scoring:read") || permissions.includes("scoring:submit")) {
    modules.add("Match Officiating & Scoring");
  }
  if (permissions.includes("announcement:read") || permissions.includes("announcement:create")) {
    modules.add("Tournament Communications");
  }
  if (permissions.includes("reports:read")) {
    modules.add("Reports & Analytics Center");
  }

  // Role-specific operational modules
  if (roles.includes("TEAM_MANAGER")) {
    modules.add("Team Management Hub");
  }
  if (roles.includes("PARTICIPANT")) {
    modules.add("Athlete Personal Portal");
  }
  if (roles.includes("VOLUNTEER")) {
    modules.add("Volunteer Field Operations");
  }
  if (roles.includes("SUPPORT_STAFF")) {
    modules.add("Participant Support Desk");
  }

  return Array.from(modules);
}

/**
 * GET /api/me
 * Authoritative self-service profile data for the authenticated user.
 * Identity is derived strictly from server-side session token.
 */
export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { context } = authResult;
  const userId = context.user.id;

  try {
    // 1. Fetch user core record
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preference: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: User account is inactive or not found." },
        { status: 403 }
      );
    }

    // 2. Format assigned roles with metadata (Read-only)
    const assignedRoles = user.userRoles.map((ur) => {
      const def = ROLE_DEFINITIONS[ur.role.name as RoleName];
      return {
        roleKey: ur.role.name,
        displayName: def?.displayName || ur.role.displayName || ur.role.name,
        description: def?.description || ur.role.description || "Authorized tournament role.",
        assignedAt: ur.createdAt,
      };
    });

    // 3. Authorized modules list (presentation-level permissions)
    const authorizedModules = deriveAuthorizedModules(context.roles, context.permissions);

    // 4. Ensure preference record exists
    let preference = user.preference;
    if (!preference) {
      preference = await prisma.userPreference.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          tournamentAnnounce: true,
          matchUpdates: true,
          accommodationUpdates: true,
          transportUpdates: true,
          supportUpdates: true,
          systemNotifications: true,
          channelInApp: true,
          channelEmail: true,
          channelSms: false,
          channelPush: false,
        },
      });
    }

    // 5. Active sessions count & status
    const activeSessionsCount = await prisma.userSession.count({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
    });

    // 6. Tournament Identity Context
    let tournamentContext: Record<string, any> | null = null;

    // A) Participant athlete context
    if (user.participantId) {
      const participant = await prisma.participant.findFirst({
        where: {
          OR: [
            { id: user.participantId },
            { playerId: user.participantId },
            { email: user.email },
          ],
        },
        include: {
          teamMemberships: {
            include: {
              team: true,
            },
          },
          bedAllocations: {
            where: { status: "ACTIVE" },
            include: {
              bed: {
                include: {
                  room: {
                    include: {
                      hostel: true,
                    },
                  },
                },
              },
            },
          },
          transportBookings: {
            include: {
              trip: {
                include: {
                  route: true,
                },
              },
            },
          },
          documents: {
            select: {
              id: true,
              type: true,
              fileName: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      if (participant) {
        // Query upcoming matches for this participant
        const matches = await prisma.match.findMany({
          where: {
            OR: [
              { playerA: { contains: participant.name, mode: "insensitive" } },
              { playerB: { contains: participant.name, mode: "insensitive" } },
              { institutionA: { contains: participant.institution, mode: "insensitive" } },
              { institutionB: { contains: participant.institution, mode: "insensitive" } },
            ],
          },
          take: 4,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            matchNumber: true,
            dayId: true,
            time: true,
            court: true,
            category: true,
            playerA: true,
            institutionA: true,
            playerB: true,
            institutionB: true,
            scoreA: true,
            scoreB: true,
            status: true,
            winner: true,
          },
        });

        const activeBed = participant.bedAllocations[0];
        const activeTransport = participant.transportBookings[0];
        const teamMembership = participant.teamMemberships[0];

        tournamentContext = {
          type: "PARTICIPANT",
          playerId: participant.playerId,
          category: participant.category,
          gender: participant.gender,
          status: participant.status,
          institution: participant.institution,
          state: participant.state,
          qrCodeToken: participant.qrCode || `sz26_qr_pt_${participant.playerId}`,
          team: teamMembership
            ? {
                teamCode: teamMembership.team.teamCode,
                name: teamMembership.team.name,
                institution: teamMembership.team.institution,
                role: teamMembership.role,
                managerName: teamMembership.team.managerName,
                status: teamMembership.team.status,
              }
            : null,
          accommodation: activeBed
            ? {
                status: activeBed.status,
                hostel: activeBed.bed.room.hostel.name,
                room: activeBed.bed.room.roomNumber,
                bed: activeBed.bed.bedNumber,
                checkInDate: activeBed.checkInDate,
              }
            : null,
          transport: activeTransport
            ? {
                tripCode: activeTransport.trip.tripCode,
                routeName: activeTransport.trip.routeName || activeTransport.trip.route?.name,
                pickupPoint: activeTransport.pickupPoint || activeTransport.trip.pickupPoint,
                scheduledTime: activeTransport.trip.scheduledTime,
                scheduledDate: activeTransport.trip.scheduledDate,
                boardingStatus: activeTransport.boardingStatus,
                isComplimentary: true, // ZERO TRANSPORT PAYMENT RULE
              }
            : null,
          documents: participant.documents.map((d) => ({
            id: d.id,
            type: d.type,
            fileName: d.fileName,
            status: d.status,
            createdAt: d.createdAt,
          })),
          matches,
        };
      }
    }

    // B) Team Manager context (if not already handled or if manager)
    if (!tournamentContext && user.teamId) {
      const team = await prisma.team.findFirst({
        where: {
          OR: [{ id: user.teamId }, { teamCode: user.teamId }],
        },
        include: {
          members: {
            include: {
              participant: {
                select: {
                  id: true,
                  playerId: true,
                  name: true,
                  category: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (team) {
        tournamentContext = {
          type: "TEAM_MANAGER",
          teamCode: team.teamCode,
          name: team.name,
          institution: team.institution,
          state: team.state,
          managerName: team.managerName,
          managerPhone: team.managerPhone,
          captainName: team.captainName,
          status: team.status,
          teamQrToken: team.teamQrToken || `sz26_qr_tm_${team.teamCode}`,
          memberCount: team.members.length,
          members: team.members.map((m) => ({
            playerId: m.participant.playerId,
            name: m.participant.name,
            role: m.role,
            category: m.participant.category,
            status: m.participant.status,
          })),
        };
      }
    }

    // C) Staff context
    if (!tournamentContext) {
      tournamentContext = {
        type: "STAFF",
        badge: user.badge || "OFFICIAL DESK",
        targetPortal: user.targetUrl || "/admin",
        assignedModules: authorizedModules,
      };
    }

    // 7. Security summary
    const security = {
      authProvider: "SZWBT Central Identity Provider (OIDC / Keycloak SSO)",
      accountStatus: user.isActive ? "ACTIVE" : "SUSPENDED",
      lastLoginAt: user.lastLoginAt || user.createdAt,
      activeSessionsCount: Math.max(1, activeSessionsCount),
      sessionVersion: user.sessionVersion,
      twoFactorStatus: "MANAGED BY IDENTITY PROVIDER",
    };

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || null,
        institution: user.institution || null,
        state: user.state || null,
        badge: user.badge,
        targetUrl: user.targetUrl,
        createdAt: user.createdAt,
        accountStatus: user.isActive ? "ACTIVE" : "SUSPENDED",
      },
      roles: assignedRoles,
      authorizedModules,
      tournamentContext,
      preferences: preference,
      security,
    });
  } catch (error: any) {
    console.error("[PROFILE GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: "500 Internal Server Error: Failed to load profile telemetry." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/me
 * Self-service update of permitted profile fields (name, phone, state, institution).
 * Privilege escalation (role, permissions, status) is strictly blocked with HTTP 400.
 */
export async function PATCH(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { context } = authResult;
  const userId = context.user.id;

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "400 Bad Request: Malformed JSON payload." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "400 Bad Request: Request body must be an object." },
        { status: 400 }
      );
    }

    // 1. Strict Privilege Escalation Protection (Section 23 & 24)
    for (const key of FORBIDDEN_ESCALATION_KEYS) {
      if (key in body) {
        return NextResponse.json(
          {
            success: false,
            error: `400 Bad Request: Field '${key}' cannot be modified. Role, permission, and account privilege escalation is strictly prohibited.`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Validate permitted fields
    const updates: {
      name?: string;
      phone?: string | null;
      state?: string | null;
      institution?: string | null;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 100) {
        return NextResponse.json(
          { success: false, error: "400 Bad Request: Name must be between 2 and 100 characters." },
          { status: 400 }
        );
      }
      updates.name = sanitizeString(body.name);
    }

    if (body.phone !== undefined) {
      if (body.phone === null || body.phone === "") {
        updates.phone = null;
      } else {
        if (typeof body.phone !== "string") {
          return NextResponse.json(
            { success: false, error: "400 Bad Request: Phone must be a string." },
            { status: 400 }
          );
        }
        const cleanPhone = sanitizeString(body.phone);
        // Valid international/Indian phone format
        if (!/^[+]?[0-9\s-]{7,20}$/.test(cleanPhone)) {
          return NextResponse.json(
            { success: false, error: "400 Bad Request: Invalid telephone number format." },
            { status: 400 }
          );
        }
        updates.phone = cleanPhone;
      }
    }

    if (body.state !== undefined) {
      if (body.state === null || body.state === "") {
        updates.state = null;
      } else {
        if (typeof body.state !== "string" || body.state.trim().length > 80) {
          return NextResponse.json(
            { success: false, error: "400 Bad Request: State must be under 80 characters." },
            { status: 400 }
          );
        }
        updates.state = sanitizeString(body.state);
      }
    }

    if (body.institution !== undefined) {
      if (body.institution === null || body.institution === "") {
        updates.institution = null;
      } else {
        if (typeof body.institution !== "string" || body.institution.trim().length > 120) {
          return NextResponse.json(
            { success: false, error: "400 Bad Request: Institution must be under 120 characters." },
            { status: 400 }
          );
        }
        updates.institution = sanitizeString(body.institution);
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "400 Bad Request: No permitted editable fields provided." },
        { status: 400 }
      );
    }

    // 3. Persist user updates to PostgreSQL
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    // 4. If user is linked to a Participant, keep participant record in sync
    if (updatedUser.participantId) {
      const partUpdates: any = {};
      if (updates.name) partUpdates.name = updates.name;
      if (updates.phone !== undefined) partUpdates.phone = updates.phone;
      if (updates.state) partUpdates.state = updates.state;
      if (updates.institution) partUpdates.institution = updates.institution;

      if (Object.keys(partUpdates).length > 0) {
        await prisma.participant.updateMany({
          where: {
            OR: [
              { id: updatedUser.participantId },
              { playerId: updatedUser.participantId },
              { email: updatedUser.email },
            ],
          },
          data: partUpdates,
        });
      }
    }

    // 5. Immutable Audit Log
    await logAuditEvent({
      actorUserId: updatedUser.id,
      actorEmail: updatedUser.email,
      action: "PROFILE_UPDATED",
      resourceType: "user",
      resourceId: updatedUser.id,
      metadata: {
        updatedFields: Object.keys(updates),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        institution: updatedUser.institution,
        state: updatedUser.state,
        badge: updatedUser.badge,
        targetUrl: updatedUser.targetUrl,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[PROFILE PATCH ERROR]", error);
    return NextResponse.json(
      { success: false, error: "500 Internal Server Error: Failed to save profile updates." },
      { status: 500 }
    );
  }
}
