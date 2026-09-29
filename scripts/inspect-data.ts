import { prisma } from "../src/lib/prisma";

async function main() {
  const m49 = await prisma.match.findUnique({
    where: { publicMatchNumber: "M049" },
  });
  console.log("M049:", m49);

  if (m49?.sourceAPositionId) {
    const posA = await prisma.fixturePosition.findUnique({
      where: { id: m49.sourceAPositionId },
    });
    console.log("POS A:", posA);
  }
}

main().finally(() => prisma.$disconnect());
