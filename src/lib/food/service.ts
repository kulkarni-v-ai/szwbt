import { prisma } from "@/lib/prisma";

export async function ensureFoodPackagesSeeded() {
  const days = await prisma.tournamentDay.findMany({ orderBy: { id: "asc" } });
  const seeded = [];

  const defaultDays = days.length > 0 ? days : [
    { date: "18 JAN", dayNumber: "Day 1" },
    { date: "19 JAN", dayNumber: "Day 2" },
    { date: "20 JAN", dayNumber: "Day 3" },
    { date: "21 JAN", dayNumber: "Day 4" },
  ];

  for (const d of defaultDays) {
    const pkg = await prisma.foodPackage.upsert({
      where: { date: d.date },
      update: {
        dayNumber: d.dayNumber,
        name: `${d.dayNumber} Championship Food Package`,
        components: "Breakfast, Lunch, Snacks, Dinner",
        status: "ACTIVE",
      },
      create: {
        date: d.date,
        dayNumber: d.dayNumber,
        name: `${d.dayNumber} Championship Food Package`,
        components: "Breakfast, Lunch, Snacks, Dinner",
        status: "ACTIVE",
      },
    });
    seeded.push(pkg);
  }

  return seeded;
}
