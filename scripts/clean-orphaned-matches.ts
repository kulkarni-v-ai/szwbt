import { prisma } from "../src/lib/prisma";

async function main() {
  const orphaned = await prisma.match.findMany({
    where: { publicMatchNumber: null },
    select: { id: true, matchNumber: true, category: true, dayId: true }
  });
  console.log("ORPHANED MATCHES:", orphaned);

  if (orphaned.length > 0) {
    const deleted = await prisma.match.deleteMany({
      where: { publicMatchNumber: null }
    });
    console.log(`Deleted ${deleted.count} orphaned non-tournament matches.`);
  }

  const remaining = await prisma.match.count();
  console.log("REMAINING OFFICIAL MATCHES:", remaining);
}

main().finally(() => prisma.$disconnect());
