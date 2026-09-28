import { seedRbacData } from "../src/lib/rbac/seed";
import { prisma } from "../src/lib/prisma";

async function main() {
  await seedRbacData();
}

main()
  .catch((e) => {
    console.error("RBAC seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
