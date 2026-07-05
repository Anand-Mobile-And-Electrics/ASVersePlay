import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit(input: {
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    details: input.details ?? {},
  });
}
