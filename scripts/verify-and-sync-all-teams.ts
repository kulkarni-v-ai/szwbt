import { PrismaClient } from "@prisma/client";
import {
  POOL_A_ROSTER,
  POOL_B_ROSTER,
  POOL_C_ROSTER,
  POOL_D_ROSTER,
  TeamSlot,
} from "../src/components/tournament/OfficialPoolBracket";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Map state codes to full state names
const STATE_MAP: Record<string, string> = {
  TN: "Tamil Nadu",
  KAR: "Karnataka",
  KL: "Kerala",
  AP: "Andhra Pradesh",
  TS: "Telangana",
  PY: "Puducherry",
};

export async function syncAllTournamentTeams() {
  console.log("============================================================");
  console.log("VERIFYING & PUSHING ALL TOURNAMENT TEAMS TO POSTGRESQL DB");
  console.log("============================================================");

  // 1. Check existing DB counts
  const initialTeamCount = await prisma.team.count();
  const initialInstCount = await prisma.institution.count();
  console.log(`Current DB State: ${initialTeamCount} teams, ${initialInstCount} institutions.`);

  // 2. Aggregate all Pool rosters
  const poolRosters: { pool: string; roster: TeamSlot[] }[] = [
    { pool: "A", roster: POOL_A_ROSTER },
    { pool: "B", roster: POOL_B_ROSTER },
    { pool: "C", roster: POOL_C_ROSTER },
    { pool: "D", roster: POOL_D_ROSTER },
  ];

  let syncedCount = 0;
  let createdInstCount = 0;

  for (const { pool, roster } of poolRosters) {
    for (const item of roster) {
      const fullState = STATE_MAP[item.state] || item.state;
      const teamCode = `TM-${pool}-${String(item.slot).padStart(2, "0")}`; // e.g. TM-A-01 to TM-A-30
      const instCode = `INST-${pool}-${String(item.slot).padStart(2, "0")}`;

      // A. Upsert Institution
      await prisma.institution.upsert({
        where: {
          name_state: {
            name: item.name,
            state: fullState,
          },
        },
        update: {
          institutionCode: instCode,
          status: "ACTIVE",
        },
        create: {
          institutionCode: instCode,
          name: item.name,
          state: fullState,
          status: "ACTIVE",
        },
      });
      createdInstCount++;

      // B. Upsert Team
      // Check if team already exists by name or code
      const existingTeam = await prisma.team.findFirst({
        where: {
          OR: [{ teamCode }, { name: item.name }],
        },
      });

      if (existingTeam) {
        await prisma.team.update({
          where: { id: existingTeam.id },
          data: {
            teamCode,
            name: item.name,
            institution: item.name,
            state: fullState,
            status: "COMPLETED",
          },
        });
      } else {
        await prisma.team.create({
          data: {
            teamCode,
            name: item.name,
            institution: item.name,
            state: fullState,
            status: "COMPLETED",
            managerName: `Manager (${item.name.slice(0, 20)})`,
            managerPhone: `+91 98450 ${String(10000 + item.slot).slice(-5)}`,
            captainName: `Captain (${item.name.slice(0, 20)})`,
            captainPhone: `+91 98451 ${String(10000 + item.slot).slice(-5)}`,
            teamQrToken: `SZ26-TEAM-${pool}-${String(item.slot).padStart(2, "0")}`,
          },
        });
      }
      syncedCount++;
    }
  }

  // 3. Final verification query
  const finalTeamCount = await prisma.team.count();
  const finalInstCount = await prisma.institution.count();

  console.log("\n============================================================");
  console.log("DATABASE SYNC COMPLETE!");
  console.log(`Teams in DB: ${finalTeamCount}`);
  console.log(`Institutions in DB: ${finalInstCount}`);
  console.log("All Pool A, B, C, D tournament teams are actively pushed and saved to DB.");
  console.log("============================================================");

  // Print Pool A sample from DB
  const poolASample = await prisma.team.findMany({
    where: { teamCode: { startsWith: "TM-A-" } },
    take: 5,
    orderBy: { teamCode: "asc" },
  });
  console.log("\nSample Pool A Teams stored in PostgreSQL:");
  poolASample.forEach((t) => console.log(` - [${t.teamCode}] ${t.name} (${t.state})`));
}

if (require.main === module) {
  syncAllTournamentTeams()
    .catch((err) => {
      console.error("Error syncing teams:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
