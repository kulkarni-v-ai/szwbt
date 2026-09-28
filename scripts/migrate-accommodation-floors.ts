import { prisma } from "../src/lib/prisma";

async function migrateAccommodation() {
  console.log("Migrating accommodation records to dynamic configuration model...");

  // 1. Update hostels to have code and status
  const hostels = await prisma.hostel.findMany();
  for (const h of hostels) {
    await prisma.hostel.update({
      where: { id: h.id },
      data: {
        code: h.code || h.id.toUpperCase(),
        status: h.status || "ACTIVE",
        genderAllowed: h.genderAllowed || (h.id.includes("VINDHYA") ? "MALE" : "FEMALE"),
        description: h.description || `${h.name} Residential Wing`,
      },
    });
  }

  // 2. Create Floor records for each hostel based on distinct floorNumber in existing rooms
  const rooms = await prisma.room.findMany();
  for (const r of rooms) {
    const floorName = r.floorNumber || "Ground Floor";
    let floorNumberOrder = 0;
    if (floorName.includes("01") || floorName.includes("1")) floorNumberOrder = 1;
    else if (floorName.includes("02") || floorName.includes("2")) floorNumberOrder = 2;
    else if (floorName.includes("03") || floorName.includes("3")) floorNumberOrder = 3;
    else if (floorName.includes("04") || floorName.includes("4")) floorNumberOrder = 4;

    const floor = await prisma.floor.upsert({
      where: {
        hostelId_name: {
          hostelId: r.hostelId,
          name: floorName,
        },
      },
      update: {
        floorNumber: floorNumberOrder,
      },
      create: {
        hostelId: r.hostelId,
        name: floorName,
        floorNumber: floorNumberOrder,
        status: "ACTIVE",
      },
    });

    // Link room to floor
    await prisma.room.update({
      where: { id: r.id },
      data: {
        floorId: floor.id,
        status: r.status || "ACTIVE",
        displayName: r.displayName || r.roomNumber,
      },
    });
  }

  console.log("Migration completed successfully.");
}

migrateAccommodation()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
