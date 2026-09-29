import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function initBracketSlots() {
  console.log("Initializing 120 official tournament bracket slots (Pools A, B, C, D x 30 slots)...");

  const pools = ["A", "B", "C", "D"] as const;

  for (const pool of pools) {
    for (let slot = 1; slot <= 30; slot++) {
      const isByeToFinal = slot === 1;
      const isByeR1 = slot === 2 || slot === 17 || slot === 30;
      const seed = slot === 1 ? (pool === "A" ? 1 : pool === "B" ? 2 : pool === "C" ? 3 : 4) : null;

      // Upsert slot
      const existing = await (prisma as any).bracketSlotAssignment.findUnique({
        where: {
          pool_slot: { pool, slot },
        },
      });

      if (!existing) {
        await (prisma as any).bracketSlotAssignment.create({
          data: {
            pool,
            slot,
            teamId: null,
            teamCode: null,
            teamNumber: null,
            teamName: null,
            state: null,
            seed,
            isByeToFinal,
            isByeR1,
          },
        });
      } else {
        // Reset to clean unassigned state
        await (prisma as any).bracketSlotAssignment.update({
          where: { id: existing.id },
          data: {
            teamId: null,
            teamCode: null,
            teamNumber: null,
            teamName: null,
            state: null,
            seed,
            isByeToFinal,
            isByeR1,
            assignedAt: null,
            assignedBy: null,
          },
        });
      }
    }
  }

  const count = await (prisma as any).bracketSlotAssignment.count();
  console.log(`Successfully initialized ${count} bracket slots (all clean & unassigned).`);
}

if (require.main === module) {
  initBracketSlots().catch(console.error).finally(() => prisma.$disconnect());
}
