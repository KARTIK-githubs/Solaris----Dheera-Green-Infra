import { actor } from '../auth/access';
import { onlyKeys, text } from '../validation';
import { Router, Request, Response, NextFunction } from 'express';
import { CommunityProject } from '../models/CommunityProject';
import { CommunityMember } from '../models/CommunityMember';
import { logAuditEvent } from '../services/auditService';
import { INITIAL_COMMUNITY } from '../../src/data/mockData';
import { isDbConnected, ensureDbConnected } from '../config/db';

export const communityRouter = Router();

const VALID_STATUSES = ['signed_deposited', 'kyc_verified', 'pending_invite', 'withdrawn'] as const;

/**
 * GET /api/community
 * Fetch the community project header and all participant roster members
 */
communityRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isDbConnected()) {
      await ensureDbConnected();
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB is disconnected. Start MongoDB on 127.0.0.1:27017 to access persisted community roster.',
        database: 'disconnected'
      });
    }

    const project = await CommunityProject.findOne({ projectId: INITIAL_COMMUNITY.id });
    const members = await CommunityMember.find().sort({ memberId: 1 });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Community roster has not been configured.' });
    }

    const activeMembers = members.filter(m => m.status !== 'withdrawn');
    const committedMembers = members.filter(m => m.status === 'signed_deposited' || m.status === 'kyc_verified');
    const totalCommittedInr = committedMembers.reduce((sum, m) => sum + m.depositPaidInr, 0);

    return res.json({
      success: true,
      data: {
        project,
        members,
        stats: {
          totalEligibleFlats: members.length,
          activeCount: activeMembers.length,
          withdrawnCount: members.length - activeMembers.length,
          committedMembersCount: committedMembers.length,
          totalCommittedInr
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/community/members/:id/status
 * Update a member's participation lifecycle status (e.g. withdraw or re-admit)
 */
communityRouter.patch('/members/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isDbConnected()) {
      await ensureDbConnected();
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB is disconnected. Member status updates cannot be saved.',
        database: 'disconnected'
      });
    }

    const { id } = req.params;
    const { status } = req.body ?? {};

    if (!text(id, 64) || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ success: false, error: 'Member id is required.' });
    }

    if (!onlyKeys(req.body, ['status']) || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid member status.'
      });
    }

    // Find member by memberId or _id
    const match = /^[0-9a-fA-F]{24}$/.test(id)
      ? { $or: [{ memberId: id }, { _id: id }] }
      : { memberId: id };
    const member = await CommunityMember.findOne(match);

    if (!member) {
      return res.status(404).json({ success: false, error: `Member with id '${id}' not found.` });
    }

    const previousStatus = member.status;
    member.status = status;
    const updated = await member.save();

    // Internal append-only audit event
    await logAuditEvent({
      action: status === 'withdrawn' ? 'MEMBER_WITHDRAWAL' : 'MEMBER_STATUS_UPDATE',
      category: 'lifecycle',
      details: `Member ${member.flatNumber} (${member.ownerName}) transitioned from '${previousStatus}' to '${status}'.`,
      actor: actor(res).id
    });

    return res.json({
      success: true,
      data: updated,
      previousStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// A database-wide reset is not available through the application API.
communityRouter.post('/reset', (_req, res) => {
  res.status(410).json({ success: false, error: 'Community reset is unavailable through the API.' });
});
