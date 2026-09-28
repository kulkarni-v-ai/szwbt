import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding System Settings Data...");

  const defaultSettings = [
    {
      key: "tournament.name",
      value: "South Zone Women's Badminton Championship 2026",
      category: "TOURNAMENT",
      description: "Official championship tournament title",
      isPublic: true,
    },
    {
      key: "tournament.dates",
      value: "October 18 - 21, 2026",
      category: "TOURNAMENT",
      description: "Official tournament dates",
      isPublic: true,
    },
    {
      key: "tournament.venue",
      value: "Dr. Prabhakar Kore Indoor Stadium, KLE Technological University, Hubballi, Karnataka",
      category: "TOURNAMENT",
      description: "Host campus and arena location",
      isPublic: true,
    },
    {
      key: "registration.entryFee",
      value: "2500",
      category: "REGISTRATION",
      description: "Official registration fee per team/athlete entry in INR",
      isPublic: false,
    },
    {
      key: "registration.paymentMethods",
      value: "CASH,UPI",
      category: "REGISTRATION",
      description: "Allowed desk payment options (UPI requires UTR)",
      isPublic: false,
    },
    {
      key: "accommodation.defaultRoomCapacity",
      value: "5",
      category: "ACCOMMODATION",
      description: "Default configured beds per hostel room in Shalmala and Vindhya",
      isPublic: false,
    },
    {
      key: "transport.farePolicy",
      value: "COMPLIMENTARY_ZERO_PAYMENT",
      category: "TRANSPORT",
      description: "Championship charter: University shuttle fleet is free for accredited personnel",
      isPublic: true,
    },
    {
      key: "system.maintenanceMode",
      value: "false",
      category: "SECURITY",
      description: "Global maintenance mode flag",
      isPublic: false,
    },
    {
      key: "notifications.broadcastChannels",
      value: "IN_APP,EMAIL,SMS",
      category: "NOTIFICATIONS",
      description: "Enabled communication dispatch channels",
      isPublic: false,
    },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: s,
      create: s,
    });
  }

  console.log("✓ System Settings Seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding system settings:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
