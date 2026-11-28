import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { actor, limitAccountOperation, requireRole } from '../auth/access';
import { ServiceRequest, type IServiceRequest } from '../models/ServiceRequest';
import { logAuditEvent } from '../services/auditService';
import { onlyKeys, text } from '../validation';

export const supportRouter = Router();

const categories: IServiceRequest['category'][] = [
  'inverter', 'inverter_inspection', 'panel_cleaning', 'wiring_grid', 'metering',
  'meter_billing', 'structural_check', 'general', 'general_support'
];
const priorities: IServiceRequest['urgency'][] = ['low', 'routine', 'medium', 'high', 'urgent', 'critical'];
const statuses: IServiceRequest['status'][] = [
  'submitted', 'open', 'under_review', 'technician_assigned', 'in_progress', 'resolved', 'closed'
];

supportRouter.post('/requests', limitAccountOperation('support', 10), async (req, res, next) => {
  const { consumerNumber, propertyAddress, category = 'general', description, urgency = 'medium', preferredDate } = req.body ?? {};
  if (!onlyKeys(req.body, ['consumerNumber', 'propertyAddress', 'category', 'description', 'urgency', 'preferredDate'])
    || !text(consumerNumber, 16) || !/^\d{5,16}$/.test(consumerNumber)
    || !text(propertyAddress, 250) || !text(description, 2000)
    || !categories.includes(category) || !priorities.includes(urgency)
    || (preferredDate !== undefined && (typeof preferredDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)
      || !Number.isFinite(Date.parse(preferredDate)) || new Date(preferredDate).toISOString().slice(0, 10) !== preferredDate))) {
    return res.status(400).json({ success: false, error: 'Invalid service request details.' });
  }

  const account = actor(res);
  const ticketId = `SR-${new Date().getFullYear()}-${randomUUID()}`;
  try {
    const request = await ServiceRequest.create({
      ownerId: account.id, customerName: account.name, ticketId,
      consumerNumber, propertyAddress, category, description, urgency, preferredDate, status: 'submitted'
    });

    await logAuditEvent({
      action: 'SERVICE_REQUEST_SUBMITTED',
      category: 'lifecycle',
      details: `Ticket ${ticketId} submitted.`,
      actor: account.id
    });

    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

supportRouter.get('/requests', async (req, res, next) => {
  const account = actor(res);
  const filter: { ownerId: string | { $type: 'objectId' }; consumerNumber?: string } = {
    ownerId: account.role === 'customer' ? account.id : { $type: 'objectId' }
  };
  const { consumerNumber } = req.query;
  if (Object.keys(req.query).some(key => key !== 'consumerNumber')) {
    return res.status(400).json({ success: false, error: 'Invalid search parameters.' });
  }
  if (consumerNumber !== undefined) {
    if (typeof consumerNumber !== 'string' || !/^\d{5,16}$/.test(consumerNumber)) {
      return res.status(400).json({ success: false, error: 'Invalid consumer number.' });
    }
    filter.consumerNumber = consumerNumber;
  }
  try {
    const requests = await ServiceRequest.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

supportRouter.patch('/requests/:ticketId/status', requireRole('employee', 'admin'), async (req, res, next) => {
  const { ticketId } = req.params;
  const { status, assignedEngineer, resolutionNotes } = req.body ?? {};
  if (!/^SR-\d{4}-(?:[a-f\d-]{36}|\d{3,12})$/.test(ticketId)
    || !onlyKeys(req.body, ['status', 'assignedEngineer', 'resolutionNotes'])
    || !statuses.includes(status)
    || (assignedEngineer !== undefined && !text(assignedEngineer, 120, 0))
    || (resolutionNotes !== undefined && !text(resolutionNotes, 2000, 0))) {
    return res.status(400).json({ success: false, error: 'Invalid ticket update.' });
  }

  try {
    const updates = { status, assignedEngineer, resolutionNotes };
    const request = await ServiceRequest.findOneAndUpdate(
      { ticketId, ownerId: { $type: 'objectId' } }, updates, { returnDocument: 'after', runValidators: true }
    );
    if (!request) return res.status(404).json({ success: false, error: 'Service request not found.' });

    await logAuditEvent({
      action: 'SERVICE_REQUEST_UPDATED',
      category: 'lifecycle',
      details: `Ticket ${ticketId} moved to ${status}.`,
      actor: actor(res).id
    });
    return res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});
