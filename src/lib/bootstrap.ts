import { db } from "@/db";
import { permissions, rolePermissions, roles, users } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { hashPassword } from "./security";

const BASE_ROLES = [
  "super_admin",
  "admin",
  "moderator",
  "editor",
  "registered_user",
  "guest",
] as const;

const BASE_PERMISSIONS = [
  "content:read",
  "content:create",
  "content:update",
  "content:delete",
  "live:manage",
  "users:manage",
  "comments:moderate",
  "ads:manage",
  "analytics:view",
  "settings:manage",
] as const;

const ROLE_MATRIX: Record<(typeof BASE_ROLES)[number], string[]> = {
  super_admin: [...BASE_PERMISSIONS],
  admin: [
    "content:read",
    "content:create",
    "content:update",
    "content:delete",
    "live:manage",
    "users:manage",
    "comments:moderate",
    "ads:manage",
    "analytics:view",
  ],
  moderator: ["content:read", "comments:moderate", "analytics:view"],
  editor: ["content:read", "content:create", "content:update"],
  registered_user: ["content:read"],
  guest: ["content:read"],
};

export async function ensurePlatformBootstrap(): Promise<void> {
  for (const roleName of BASE_ROLES) {
    await db
      .insert(roles)
      .values({ name: roleName, description: `${roleName} role`, isSystem: true })
      .onConflictDoNothing();
  }

  for (const permissionKey of BASE_PERMISSIONS) {
    await db
      .insert(permissions)
      .values({ key: permissionKey, description: `${permissionKey} permission` })
      .onConflictDoNothing();
  }

  const allRoles = await db.select().from(roles);
  const allPermissions = await db.select().from(permissions);

  for (const role of allRoles) {
    const permissionKeys = ROLE_MATRIX[role.name as keyof typeof ROLE_MATRIX] ?? [];
    for (const key of permissionKeys) {
      const permission = allPermissions.find((p) => p.key === key);
      if (!permission) continue;

      await db
        .insert(rolePermissions)
        .values({ roleId: role.id, permissionId: permission.id })
        .onConflictDoNothing();
    }
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@asverse.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@123456";

  const superAdminRole = allRoles.find((role) => role.name === "super_admin");
  if (!superAdminRole) return;

  const adminPasswordHash = await hashPassword(adminPassword);
  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

  if (!existingAdmin[0]) {
    await db.insert(users).values({
      email: adminEmail,
      username: "asverse_admin",
      displayName: "ASVerse Super Admin",
      passwordHash: adminPasswordHash,
      roleId: superAdminRole.id,
      status: "active",
    });
  } else {
    await db
      .update(users)
      .set({
        roleId: superAdminRole.id,
        passwordHash: adminPasswordHash,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingAdmin[0].id));
  }

  await db
    .update(users)
    .set({ status: "blocked", updatedAt: new Date() })
    .where(ne(users.email, adminEmail));
}
