import { prisma } from "../src/lib/prisma";

export async function ensureFoodPackagesSeeded() {
  const days = await prisma.tournamentDay.findMany({ orderBy: { id: "asc" } });
  const seeded = [];

  const defaultDays = days.length > 0 ? days : [
    { date: "OCT 18", dayNumber: "Day 1" },
    { date: "OCT 19", dayNumber: "Day 2" },
    { date: "OCT 20", dayNumber: "Day 3" },
    { date: "OCT 21", dayNumber: "Day 4" },
  ];

  for (const d of defaultDays) {
    const pkg = await prisma.foodPackage.upsert({
      where: { date: d.date },
      update: {
        dayNumber: d.dayNumber,
        name: `${d.dayNumber} Championship Food Package`,
        components: "Breakfast, Lunch, Evening Snacks, Dinner",
        status: "ACTIVE",
      },
      create: {
        date: d.date,
        dayNumber: d.dayNumber,
        name: `${d.dayNumber} Championship Food Package`,
        components: "Breakfast, Lunch, Evening Snacks, Dinner",
        status: "ACTIVE",
      },
    });
    seeded.push(pkg);
  }

  return seeded;
}

if (require.main === module) {
  ensureFoodPackagesSeeded()
    .then((pkgs) => {
      console.log("Successfully seeded Food Packages:", pkgs);
    })
    .catch((err) => {
      console.error("Food package seed error:", err);
    })
    .finally(() => prisma.$disconnect());
}
