import { CommunityProject } from '../models/CommunityProject';
import { CommunityMember } from '../models/CommunityMember';
import { logAuditEvent } from '../services/auditService';
import { INITIAL_COMMUNITY } from '../../src/data/mockData';

/**
 * Idempotent database seeder for Solaris local development & testing.
 * Seeds Gulmohar Enclave RWA cohort with synthetic demo records if not already populated.
 */
export async function seedDatabase(): Promise<{ projectSeeded: boolean; membersSeeded: number }> {
  let projectSeeded = false;
  let membersSeeded = 0;

  // 1. Seed Project Document
  const existingProject = await CommunityProject.findOne({ projectId: INITIAL_COMMUNITY.id });
  if (!existingProject) {
    const project = new CommunityProject({
      projectId: INITIAL_COMMUNITY.id,
      name: INITIAL_COMMUNITY.name,
      location: INITIAL_COMMUNITY.location,
      coordinatorName: INITIAL_COMMUNITY.coordinatorName,
      coordinatorRole: INITIAL_COMMUNITY.coordinatorRole,
      status: INITIAL_COMMUNITY.status,
      currentStep: INITIAL_COMMUNITY.currentStep,
      totalSteps: INITIAL_COMMUNITY.totalSteps,
      proposedCapacityKw: INITIAL_COMMUNITY.proposedCapacityKw,
      totalRoofAreaSqFt: INITIAL_COMMUNITY.totalRoofAreaSqFt,
      shadowFreePercentage: INITIAL_COMMUNITY.shadowFreePercentage,
      grossOutlayInr: INITIAL_COMMUNITY.grossOutlayInr,
      subsidyEligibleInr: INITIAL_COMMUNITY.subsidyEligibleInr,
      netTargetInr: INITIAL_COMMUNITY.netTargetInr,
      totalCommittedInr: INITIAL_COMMUNITY.totalCommittedInr,
      committedMembersCount: INITIAL_COMMUNITY.committedMembersCount,
      totalEligibleFlats: INITIAL_COMMUNITY.totalEligibleFlats,
      isSynthetic: true // Server-enforced synthetic demo flag
    });
    await project.save();
    projectSeeded = true;
  }

  // 2. Seed Community Members
  const existingMemberCount = await CommunityMember.countDocuments();
  if (existingMemberCount === 0) {
    const memberDocs = INITIAL_COMMUNITY.members.map((m) => ({
      memberId: m.id,
      flatNumber: m.flatNumber,
      tower: m.tower,
      ownerName: m.ownerName,
      caNumber: m.caNumber,
      sanctionedLoadKw: m.sanctionedLoadKw,
      monthlyConsumptionKwh: m.monthlyConsumptionKwh,
      monthlyBillInr: m.monthlyBillInr,
      maxUpfrontBudgetInr: m.maxUpfrontBudgetInr,
      allocatedKw: m.allocatedKw,
      allocationPercentage: m.allocationPercentage,
      allocatedKwhPerMonth: m.allocatedKwhPerMonth,
      depositPaidInr: m.depositPaidInr,
      status: m.status,
      consentSigned: m.consentSigned,
      tier: m.tier,
      isSynthetic: true // Server-enforced synthetic demo flag
    }));

    await CommunityMember.insertMany(memberDocs);
    membersSeeded = memberDocs.length;

    await logAuditEvent({
      action: 'SYSTEM_INITIALIZATION',
      category: 'system',
      details: `Initialized database with ${membersSeeded} synthetic member records for Gulmohar Enclave cohort.`,
      actor: 'Database Seeder'
    });
  }

  return { projectSeeded, membersSeeded };
}
