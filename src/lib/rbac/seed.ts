/**
 * RBAC Database Seeder & Bootstrapper
 * Seeds Permissions, Roles, RolePermissions, and Authorized Users.
 */

import { prisma } from "@/lib/prisma";
import { ALL_PERMISSIONS } from "./permissions";
import { ROLES, ROLE_DEFINITIONS } from "./roles";

export async function seedRbacData() {
  console.log("=== SEEDING AUTHORITATIVE RBAC DATA ===");

  // 1. Seed Permissions
  console.log(`Seeding ${ALL_PERMISSIONS.length} granular permissions...`);
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
      create: {
        code: perm.code,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
    });
  }

  // 2. Seed Roles and Role-Permissions
  console.log("Seeding system roles & role-permission mappings...");
  for (const [roleName, roleDef] of Object.entries(ROLE_DEFINITIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {
        displayName: roleDef.displayName,
        description: roleDef.description,
        isSystem: true,
      },
      create: {
        name: roleName,
        displayName: roleDef.displayName,
        description: roleDef.description,
        isSystem: true,
      },
    });

    // Clear existing permissions for this role to avoid stale bindings
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Link default permissions
    for (const permCode of roleDef.defaultPermissions) {
      const perm = await prisma.permission.findUnique({
        where: { code: permCode },
      });

      if (perm) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  // 3. Seed Authorized System Users & Multi-Role Bindings
  const usersToSeed = [
    {
      email: "admin@szwbt2026.edu",
      name: "Root Administrator",
      badge: "LEVEL 04 ROOT",
      targetUrl: "/admin",
      roles: [ROLES.SUPER_ADMIN],
    },
    {
      email: "registration@szwbt2026.edu",
      name: "Priya Rao (Registration)",
      badge: "DESK 02 CHIEF",
      targetUrl: "/register",
      roles: [ROLES.REGISTRATION_STAFF],
    },
    {
      email: "hostel@szwbt2026.edu",
      name: "Hostel Logistics Officer",
      badge: "RESIDENCE ADVISOR",
      targetUrl: "/admin/accommodation",
      roles: [ROLES.ACCOMMODATION_STAFF],
    },
    {
      email: "transport@szwbt2026.edu",
      name: "Fleet Transport Manager",
      badge: "FLEET CONTROL",
      targetUrl: "/admin/transport",
      roles: [ROLES.TRANSPORT_STAFF],
    },
    {
      email: "finance@szwbt2026.edu",
      name: "Treasury Auditor",
      badge: "TREASURY OFFICER",
      targetUrl: "/admin/finance",
      roles: [ROLES.FINANCE_STAFF],
    },
    {
      email: "umpire@szwbt2026.edu",
      name: "Chief Umpire Ramesh",
      badge: "BWF TECHNICAL",
      targetUrl: "/official",
      officialId: "official-court-01",
      roles: [ROLES.MATCH_OFFICIAL],
    },
    {
      email: "team@szwbt2026.edu",
      name: "Rajesh Kumar (BLR Manager)",
      badge: "UNIVERSITY DESK",
      targetUrl: "/team",
      teamId: "team-blr-warriors",
      roles: [ROLES.TEAM_MANAGER],
    },
    {
      email: "player@szwbt2026.edu",
      name: "Ananya Sharma",
      badge: "PLAYER HUD",
      targetUrl: "/dashboard",
      participantId: "p1-ananya-sharma",
      roles: [ROLES.PARTICIPANT],
    },
    {
      email: "volunteer@szwbt2026.edu",
      name: "Arena Field Volunteer",
      badge: "MOBILE FIELD",
      targetUrl: "/volunteer",
      roles: [ROLES.VOLUNTEER],
    },
    {
      email: "ops@szwbt2026.edu",
      name: "KLE Tech Arena Operations Controller",
      badge: "FIELD COMMAND",
      targetUrl: "/operations",
      roles: [ROLES.OPERATIONS_STAFF],
    },
    {
      email: "organizer@szwbt2026.edu",
      name: "Tournament Secretariat",
      badge: "SZWBT SECRETARIAT",
      targetUrl: "/organizer",
      roles: [ROLES.ORGANIZER],
    },
    {
      email: "techops@szwbt2026.edu",
      name: "Technical Operations Lead",
      badge: "TECHOPS COMMAND",
      targetUrl: "/operations",
      roles: [ROLES.OPERATIONS_STAFF, ROLES.TOURNAMENT_ADMIN],
    },
    {
      email: "scanner@szwbt2026.edu",
      name: "Document Scanner Officer",
      badge: "DOC SCANNER 01",
      targetUrl: "/scanner",
      roles: [ROLES.DOCUMENT_SCANNER, ROLES.REGISTRATION_STAFF],
    },
    {
      email: "documents@szwbt2026.edu",
      name: "Document Verification Lead",
      badge: "DOC VERIFICATION",
      targetUrl: "/scanner",
      roles: [ROLES.DOCUMENT_SCANNER, ROLES.REGISTRATION_STAFF],
    },
    // Multi-Role Demonstration (Supports Multiple Roles per User)
    {
      email: "priya.multirole@szwbt2026.edu",
      name: "Priya Rao (Dual Desk Staff)",
      badge: "DUAL DESK OPS",
      targetUrl: "/register",
      roles: [ROLES.REGISTRATION_STAFF, ROLES.ACCOMMODATION_STAFF],
    },
    {
      email: "lead.multirole@szwbt2026.edu",
      name: "Suresh Patil (Lead Controller)",
      badge: "CONTROLLER",
      targetUrl: "/admin",
      roles: [ROLES.TOURNAMENT_ADMIN, ROLES.FINANCE_STAFF],
    },
  ];

  // Default secure password
  const defaultPassword = "szwbt2026pass";

  for (const u of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        badge: u.badge,
        targetUrl: u.targetUrl,
        participantId: (u as any).participantId || null,
        teamId: (u as any).teamId || null,
        officialId: (u as any).officialId || null,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: defaultPassword,
        badge: u.badge,
        targetUrl: u.targetUrl,
        participantId: (u as any).participantId || null,
        teamId: (u as any).teamId || null,
        officialId: (u as any).officialId || null,
        isActive: true,
      },
    });

    // Clear existing user roles
    await prisma.userRole.deleteMany({
      where: { userId: user.id },
    });

    // Assign multiple roles
    for (const roleName of u.roles) {
      const role = await prisma.role.findUnique({
        where: { name: roleName },
      });

      if (role) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }
    }
  }

  console.log("=== RBAC DATA SEEDING COMPLETE ===");
}
