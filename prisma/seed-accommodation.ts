/**
 * Authoritative Accommodation Database Seeder
 * Seeds Shalmala Hostel & Vindhya Boys Hostel with EXACTLY 5 BEDS per room.
 */

import { prisma } from "../src/lib/prisma";

export async function seedAccommodationData() {
  console.log("=== SEEDING AUTHORITATIVE ACCOMMODATION DATA (5-BED PER ROOM) ===");

  // 1. Shalmala Hostel
  const shalmala = await prisma.hostel.upsert({
    where: { id: "SHALMALA" },
    update: {
      name: "Shalmala Hostel",
      genderAllowed: "FEMALE",
      totalFloors: 3,
    },
    create: {
      id: "SHALMALA",
      name: "Shalmala Hostel",
      genderAllowed: "FEMALE",
      totalFloors: 3,
    },
  });

  // 2. Vindhya Boys Hostel
  const vindhya = await prisma.hostel.upsert({
    where: { id: "VINDHYA" },
    update: {
      name: "Vindhya Boys Hostel",
      genderAllowed: "MALE",
      totalFloors: 2,
    },
    create: {
      id: "VINDHYA",
      name: "Vindhya Boys Hostel",
      genderAllowed: "MALE",
      totalFloors: 2,
    },
  });

  const hostelConfigs = [
    {
      hostelId: shalmala.id,
      floors: [
        { floorNumber: "GROUND FLOOR", rooms: ["S-101", "S-102", "S-103", "S-104"] },
        { floorNumber: "FLOOR 01", rooms: ["S-201", "S-202", "S-203", "S-204"] },
        { floorNumber: "FLOOR 02", rooms: ["S-301", "S-302", "S-303", "S-304"] },
      ],
    },
    {
      hostelId: vindhya.id,
      floors: [
        { floorNumber: "GROUND FLOOR", rooms: ["V-101", "V-102", "V-103", "V-104"] },
        { floorNumber: "FLOOR 01", rooms: ["V-201", "V-202", "V-203", "V-204"] },
      ],
    },
  ];

  const bedLabels = ["BED 01", "BED 02", "BED 03", "BED 04", "BED 05"];

  for (const config of hostelConfigs) {
    for (const floor of config.floors) {
      for (const roomNumber of floor.rooms) {
        const room = await prisma.room.upsert({
          where: {
            hostelId_roomNumber: {
              hostelId: config.hostelId,
              roomNumber,
            },
          },
          update: {
            floorNumber: floor.floorNumber,
            capacity: 5, // STRICT 5-BED CAPACITY
          },
          create: {
            hostelId: config.hostelId,
            floorNumber: floor.floorNumber,
            roomNumber,
            capacity: 5,
          },
        });

        // Seed exactly 5 beds for this room
        for (const bedNumber of bedLabels) {
          await prisma.bed.upsert({
            where: {
              roomId_bedNumber: {
                roomId: room.id,
                bedNumber,
              },
            },
            update: {},
            create: {
              roomId: room.id,
              bedNumber,
              status: "AVAILABLE",
            },
          });
        }
      }
    }
  }

  // Link any existing participants to test allocations
  const participant1 = await prisma.participant.findFirst({
    where: { gender: "FEMALE" },
  });

  const team1 = await prisma.team.findFirst();

  if (participant1) {
    const targetRoom = await prisma.room.findFirst({
      where: { hostelId: "SHALMALA", roomNumber: "S-101" },
      include: { beds: true },
    });

    if (targetRoom && targetRoom.beds.length >= 2) {
      const bed1 = targetRoom.beds[0];
      const bed2 = targetRoom.beds[1];

      // Set Bed 1 OCCUPIED with Participant 1
      await prisma.bed.update({
        where: { id: bed1.id },
        data: { status: "OCCUPIED" },
      });

      // Clear any existing allocation for this bed
      await prisma.accommodationAllocation.deleteMany({
        where: { bedId: bed1.id },
      });

      await prisma.accommodationAllocation.create({
        data: {
          bedId: bed1.id,
          participantId: participant1.id,
          teamId: team1?.id || null,
          allocatedBy: "hostel@szwbt2026.edu",
          status: "ACTIVE",
        },
      });

      // Update participant hostel & room
      await prisma.participant.update({
        where: { id: participant1.id },
        data: {
          hostel: "Shalmala Hostel",
          room: "S-101 (BED 01)",
        },
      });

      // Set Bed 2 as RESERVED
      await prisma.bed.update({
        where: { id: bed2.id },
        data: { status: "RESERVED" },
      });
    }
  }

  console.log("=== ACCOMMODATION SEED COMPLETED ===");
}

if (require.main === module) {
  seedAccommodationData()
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
