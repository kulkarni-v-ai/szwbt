import { NextRequest, NextResponse } from "next/server";
import { UserContext } from "@/lib/rbac/service";
import { ROLES } from "@/lib/rbac/roles";
import { prisma } from "@/lib/prisma";

export interface AuthorizedTeamSummary {
  id: string;
  teamCode: string;
  name: string;
  institution: string;
  state: string;
  status: string;
  managerName: string | null;
  captainName: string | null;
}

export interface TeamAuthResult {
  authorizedTeams: AuthorizedTeamSummary[];
  selectedTeamId: string | null;
  errorResponse?: NextResponse;
}

/**
 * Authoritatively resolves the authorized teams for an authenticated user.
 * Strictly verifies that any requested teamId belongs to the manager's authorized scope.
 * Never trusts client input without backend verification.
 */
export async function resolveAuthorizedTeam(
  req: NextRequest,
  context: UserContext
): Promise<TeamAuthResult> {
  const isSuperAdmin = context.roles.includes(ROLES.SUPER_ADMIN);
  const isTeamManager = context.roles.includes(ROLES.TEAM_MANAGER);

  if (!isSuperAdmin && !isTeamManager) {
    return {
      authorizedTeams: [],
      selectedTeamId: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Only authorized Team Managers or Tournament Administrators can access this portal.",
        },
        { status: 403 }
      ),
    };
  }

  let teams: AuthorizedTeamSummary[] = [];

  if (isSuperAdmin) {
    // Super Admin has clearance across all teams
    const allTeams = await prisma.team.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        teamCode: true,
        name: true,
        institution: true,
        state: true,
        status: true,
        managerName: true,
        captainName: true,
      },
    });
    teams = allTeams;
  } else {
    // Resolve teams authorized strictly for this Team Manager
    const userTeamId = context.user.teamId;
    const userEmail = context.user.email;

    // Search by teamId or teamCode or manager participant
    const teamConditions: any[] = [];

    if (userTeamId) {
      // Support comma-separated IDs if manager assigned multiple teams
      const idList = userTeamId.split(",").map((s) => s.trim()).filter(Boolean);
      teamConditions.push({ id: { in: idList } });
      teamConditions.push({ teamCode: { in: idList } });
    }

    // Also match by member email where role is MANAGER
    if (userEmail) {
      teamConditions.push({
        members: {
          some: {
            role: "MANAGER",
            participant: { email: userEmail },
          },
        },
      });
    }

    if (teamConditions.length > 0) {
      teams = await prisma.team.findMany({
        where: { OR: teamConditions },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          teamCode: true,
          name: true,
          institution: true,
          state: true,
          status: true,
          managerName: true,
          captainName: true,
        },
      });
    }
  }

  // Handle requested teamId if supplied in query params or headers
  const requestedTeamId = req.nextUrl.searchParams.get("teamId") || req.nextUrl.searchParams.get("id");

  if (requestedTeamId) {
    // Find matching authorized team
    const matched = teams.find(
      (t) => t.id === requestedTeamId || t.teamCode === requestedTeamId
    );

    if (!matched) {
      return {
        authorizedTeams: teams,
        selectedTeamId: null,
        errorResponse: NextResponse.json(
          {
            success: false,
            error: "403 Forbidden: You are not authorized to inspect or manage this team.",
          },
          { status: 403 }
        ),
      };
    }

    return {
      authorizedTeams: teams,
      selectedTeamId: matched.id,
    };
  }

  // If no teamId parameter supplied, default to the first authorized team
  const defaultTeamId = teams.length > 0 ? teams[0].id : null;

  return {
    authorizedTeams: teams,
    selectedTeamId: defaultTeamId,
  };
}
