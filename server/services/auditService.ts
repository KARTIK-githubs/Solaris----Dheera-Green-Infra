import { AuditLog, IAuditLog } from '../models/AuditLog';

export interface CreateAuditEntryInput {
  action: string;
  category: 'statutory' | 'allocation' | 'lifecycle' | 'security' | 'system';
  details: string;
  actor?: string;
}

/**
 * Internal append-only audit logger.
 * Can only be called by server operations (not via unrestricted public POST endpoints).
 */
export async function logAuditEvent(entry: CreateAuditEntryInput): Promise<IAuditLog> {
  try {
    const log = new AuditLog({
      timestamp: new Date(),
      action: entry.action,
      category: entry.category,
      details: entry.details,
      actor: entry.actor || 'System Engine',
      isSynthetic: true // Always server-enforced
    });
    return await log.save();
  } catch (err: any) {
    console.error('[AuditService] Failed to append audit log:', err.message);
    throw err;
  }
}
