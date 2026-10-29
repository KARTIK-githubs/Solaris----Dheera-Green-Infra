import { Router, Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { isDbConnected, ensureDbConnected } from '../config/db';

export const auditRouter = Router();

/**
 * GET /api/audit-logs
 * Fetch the append-only audit trail (sorted by timestamp descending).
 * NOTE: Unrestricted public POST endpoint has been removed to safeguard audit integrity.
 * All audit records are emitted internally by server lifecycle, assessment, and solver operations.
 */
auditRouter.get('/', async (_req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      await ensureDbConnected();
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB is disconnected.',
        database: 'disconnected'
      });
    }

    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    return res.json({
      success: true,
      data: logs,
      count: logs.length,
      semantics: 'append-only',
      isSynthetic: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit ledger: ' + error.message
    });
  }
});
