import { Router, Request, Response } from 'express';
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
communityRouter.get('/', async (_req: Request, res: Response) => {
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

    let project = await CommunityProject.findOne({ projectId: INITIAL_COMMUNITY.id });
    let members = await CommunityMember.find().sort({ memberId: 1 });

    // If empty, auto-seed
    if (!project || members.length === 0) {
      const { seedDatabase } = await import('../seed/seedData');
      await seedDatabase();
      project = await CommunityProject.findOne({ projectId: INITIAL_COMMUNITY.id });
      members = await CommunityMember.find().sort({ memberId: 1 });
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
  } catch (error: any) {
    console.error('[CommunityRoute] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve community data: ' + error.message
    });
  }
});

/**
 * PATCH /api/community/members/:id/status
 * Update a member's participation lifecycle status (e.g. withdraw or re-admit)
 */
communityRouter.patch('/members/:id/status', async (req: Request, res: Response) => {
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
    const { status, operatorName } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Member id is required.' });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    // Find member by memberId or _id
    const member = await CommunityMember.findOne({
      $or: [{ memberId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

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
      actor: operatorName || 'RWA Coordinator Console'
    });

    return res.json({
      success: true,
      data: updated,
      previousStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CommunityRoute] Status update error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update member status: ' + error.message
    });
  }
});

/**
 * POST /api/community/reset
 * Reset community cohort to initial state (for repeatable testing and demonstrations)
 */
communityRouter.post('/reset', async (_req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      await ensureDbConnected();
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB is disconnected. Community cohort cannot be reset in database.',
        database: 'disconnected'
      });
    }

    await CommunityMember.deleteMany({});
    await CommunityProject.deleteMany({});

    const { seedDatabase } = await import('../seed/seedData');
    await seedDatabase();

    await logAuditEvent({
      action: 'COHORT_RESET',
      category: 'system',
      details: 'Community cohort was restored to initial seed state.',
      actor: 'Admin / Demonstration Controller'
    });

    return res.json({
      success: true,
      message: 'Community roster and project successfully restored to initial state.',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to reset community cohort: ' + error.message
    });
  }
});
