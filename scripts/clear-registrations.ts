import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function clearHardcodedRegistrations() {
  console.log("============================================================");
  console.log("REMOVING ALL HARDCODED / MOCK PARTICIPANT REGISTRATIONS");
  console.log("============================================================");

  // 1. Unlink participant from Users
  const userUnlink = await prisma.user.updateMany({
    where: { participantId: { not: null } },
    data: { participantId: null },
  });
  console.log(`Unlinked participantId from ${userUnlink.count} user accounts.`);

  // 2. Clear Documents
  const delDocs = await prisma.document.deleteMany({});
  console.log(`Deleted ${delDocs.count} uploaded/hardcoded registration documents.`);

  // 3. Clear Team Memberships
  const delMembers = await prisma.teamMember.deleteMany({});
  console.log(`Deleted ${delMembers.count} team member registrations.`);

  // 4. Clear Accommodation Allocations & Reset Beds to AVAILABLE
  const delAlloc = await prisma.accommodationAllocation.deleteMany({});
  console.log(`Deleted ${delAlloc.count} bed allocations.`);

  const resetBeds = await prisma.bed.updateMany({
    data: { status: "AVAILABLE" },
  });
  console.log(`Reset ${resetBeds.count} beds back to AVAILABLE.`);

  // 5. Clear Transport Passenger Bookings
  const delTransport = await prisma.transportPassenger.deleteMany({});
  console.log(`Deleted ${delTransport.count} transport passenger bookings.`);

  // 6. Clear Fee Ledgers
  const delLedgers = await prisma.feeLedger.deleteMany({});
  console.log(`Deleted ${delLedgers.count} fee ledgers.`);

  // 7. Clear QR Passes
  const delQr = await prisma.qrPass.deleteMany({});
  console.log(`Deleted ${delQr.count} participant/team QR access passes.`);

  // 8. Clear Food Package Assignments & Meal Consumptions
  const delFoodCons = await prisma.foodConsumption.deleteMany({});
  console.log(`Deleted ${delFoodCons.count} food consumption records.`);

  const delFoodAssign = await prisma.foodPackageAssignment.deleteMany({});
  console.log(`Deleted ${delFoodAssign.count} food package assignments.`);

  // 9. Delete ALL Participants
  const delParts = await prisma.participant.deleteMany({});
  console.log(`Deleted ${delParts.count} hardcoded participant registrations.`);

  console.log("============================================================");
  console.log("SUCCESS: All hardcoded registrations cleared.");
  console.log("Total active participants in DB: 0 (Fresh portal registration ready)");
  console.log("============================================================");
}

if (require.main === module) {
  clearHardcodedRegistrations()
    .catch((err) => {
      console.error("Error clearing registrations:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
