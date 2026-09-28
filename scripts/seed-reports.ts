import { prisma } from "../src/lib/prisma";
import { ROLES, ROLE_DEFINITIONS } from "../src/lib/rbac/roles";
import { PERMISSIONS } from "../src/lib/rbac/permissions";

async function main() {
  console.log("Seeding Reports & Analytics Center Data...");

  // 1. Ensure REPORTS_STAFF role exists
  const reportsRoleDef = ROLE_DEFINITIONS.REPORTS_STAFF;
  const reportsRole = await prisma.role.upsert({
    where: { name: ROLES.REPORTS_STAFF },
    update: {
      displayName: reportsRoleDef.displayName,
      description: reportsRoleDef.description,
    },
    create: {
      name: ROLES.REPORTS_STAFF,
      displayName: reportsRoleDef.displayName,
      description: reportsRoleDef.description,
      isSystem: true,
    },
  });

  // Attach permissions to REPORTS_STAFF in DB
  for (const permCode of reportsRoleDef.defaultPermissions) {
    const perm = await prisma.permission.upsert({
      where: { code: permCode },
      update: {},
      create: {
        code: permCode,
        resource: permCode.split(":")[0],
        action: permCode.split(":")[1] || "read",
        description: `Permission ${permCode}`,
      },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: reportsRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: reportsRole.id,
        permissionId: perm.id,
      },
    });
  }

  // 2. Upsert Reports Staff User
  const reportsUser = await prisma.user.upsert({
    where: { email: "reports@szwbt2026.edu" },
    update: {
      name: "SZWBT Analytics & Reporting Lead",
      badge: "ANALYTICS COMMAND",
      targetUrl: "/admin/reports",
      isActive: true,
    },
    create: {
      email: "reports@szwbt2026.edu",
      name: "SZWBT Analytics & Reporting Lead",
      passwordHash: "szwbt2026pass",
      badge: "ANALYTICS COMMAND",
      targetUrl: "/admin/reports",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: reportsUser.id,
        roleId: reportsRole.id,
      },
    },
    update: {},
    create: {
      userId: reportsUser.id,
      roleId: reportsRole.id,
    },
  });

  // Ensure Official record exists for login routing
  await prisma.official.upsert({
    where: { email: "reports@szwbt2026.edu" },
    update: {
      name: "SZWBT Analytics & Reporting Lead",
      role: "REPORTS_STAFF",
      badge: "ANALYTICS COMMAND",
      password: "szwbt2026pass",
      targetUrl: "/admin/reports",
      description: "Championship reporting matrices, statistical exports, and operational cross-module analytics.",
    },
    create: {
      email: "reports@szwbt2026.edu",
      name: "SZWBT Analytics & Reporting Lead",
      role: "REPORTS_STAFF",
      badge: "ANALYTICS COMMAND",
      password: "szwbt2026pass",
      targetUrl: "/admin/reports",
      description: "Championship reporting matrices, statistical exports, and operational cross-module analytics.",
    },
  });

  // 3. Seed Initial Saved Reports
  const initialSavedReports = [
    {
      name: "State Participant Roster & Document Readiness",
      reportType: "PARTICIPANTS",
      filters: JSON.stringify({ category: "Women's Singles", status: "APPROVED" }),
      columns: JSON.stringify(["playerId", "name", "institution", "state", "status", "createdAt"]),
      sort: JSON.stringify({ field: "createdAt", order: "desc" }),
      ownerEmail: "reports@szwbt2026.edu",
    },
    {
      name: "Hostel Bed Occupancy & Capacity Audit",
      reportType: "ACCOMMODATION",
      filters: JSON.stringify({ status: "AVAILABLE" }),
      columns: JSON.stringify(["hostelName", "roomNumber", "bedNumber", "status", "genderAllowed"]),
      sort: JSON.stringify({ field: "roomNumber", order: "asc" }),
      ownerEmail: "reports@szwbt2026.edu",
    },
    {
      name: "Complimentary Shuttle Fleet Dispatch Log",
      reportType: "TRANSPORT",
      filters: JSON.stringify({ status: "SCHEDULED" }),
      columns: JSON.stringify(["tripCode", "routeName", "scheduledTime", "vehicleNo", "driverName", "status"]),
      sort: JSON.stringify({ field: "scheduledTime", order: "asc" }),
      ownerEmail: "reports@szwbt2026.edu",
    },
  ];

  for (const sr of initialSavedReports) {
    const existing = await prisma.savedReport.findFirst({
      where: { name: sr.name, ownerEmail: sr.ownerEmail },
    });
    if (!existing) {
      await prisma.savedReport.create({ data: sr });
    }
  }

  console.log("✓ Reports & Analytics Center Data Seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding reports portal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
