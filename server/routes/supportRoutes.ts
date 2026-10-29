import { Router, Request, Response } from 'express';
import { ServiceRequest } from '../models/ServiceRequest';
import { logAuditEvent } from '../services/auditService';
import { isDbConnected, ensureDbConnected } from '../config/db';

export const supportRouter = Router();

/**
 * POST /api/support/requests
 * Submit a customer maintenance / service request. Persists directly to MongoDB.
 */
supportRouter.post('/requests', async (req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      await ensureDbConnected();
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB is disconnected. Service request cannot be saved.',
        database: 'disconnected'
      });
    }

    const {
      customerName,
      consumerNumber,
      propertyAddress,
      category,
      description,
      urgency,
      preferredDate
    } = req.body;

    if (!customerName || !consumerNumber || !description) {
      return res.status(400).json({
        success: false,
        error: 'customerName, consumerNumber, and description are required fields.'
      });
    }

    const ticketCount = await ServiceRequest.countDocuments();
    const ticketId = `SR-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(3, '0')}`;

    const newRequest = new ServiceRequest({
      ticketId,
      customerName,
      consumerNumber,
      propertyAddress: propertyAddress || 'Gulmohar Enclave, New Delhi',
      category: category || 'general',
      description,
      urgency: urgency || 'medium',
      preferredDate: preferredDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      status: 'submitted',
      isSynthetic: true
    });

    await newRequest.save();

    await logAuditEvent({
      action: 'SERVICE_REQUEST_SUBMITTED',
      category: 'lifecycle',
      details: `Customer ${customerName} (CA #${consumerNumber}) submitted ticket ${ticketId} [${category || 'general'}].`,
      actor: customerName
    });

    return res.status(201).json({
      success: true,
      data: newRequest,
      message: `Service request ${ticketId} registered with Dheera Green Infra.`
    });
  } catch (error: any) {
    console.error('[SupportRoute] Error creating service request:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit service request.'
    });
  }
});

/**
 * GET /api/support/requests
 * Fetch service requests, optionally filtered by consumerNumber.
 */
supportRouter.get('/requests', async (req: Request, res: Response) => {
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

    const { consumerNumber } = req.query;
    const filter: any = {};
    if (consumerNumber && typeof consumerNumber === 'string') {
      filter.consumerNumber = consumerNumber;
    }

    const requests = await ServiceRequest.find(filter).sort({ createdAt: -1 });

    // If empty in MongoDB, seed initial representative customer requests
    if (requests.length === 0) {
      const initialRequests = [
        {
          ticketId: `SR-${new Date().getFullYear()}-001`,
          customerName: 'Rohit Rao',
          consumerNumber: '102948211',
          propertyAddress: 'Flat 301, Tower A, Gulmohar Enclave, Saket, New Delhi',
          category: 'panel_cleaning',
          description: 'Quarterly post-monsoon panel cleaning and dust removal for 6.8 kWp rooftop array.',
          urgency: 'low',
          preferredDate: '2026-11-05',
          status: 'technician_assigned',
          assignedEngineer: 'SunPro Field Services (Eng. Sumit Kumar)',
          isSynthetic: true
        },
        {
          ticketId: `SR-${new Date().getFullYear()}-002`,
          customerName: 'Rohit Rao',
          consumerNumber: '102948211',
          propertyAddress: 'Flat 301, Tower A, Gulmohar Enclave, Saket, New Delhi',
          category: 'metering',
          description: 'Bi-directional net meter generation display sync verification with BRPL billing ledger.',
          urgency: 'medium',
          preferredDate: '2026-10-15',
          status: 'resolved',
          assignedEngineer: 'BRPL Sub-Division Telemetry Desk',
          resolutionNotes: 'Check meter communication verified. Bi-directional export registers matching billing statements.',
          isSynthetic: true
        }
      ];

      await ServiceRequest.insertMany(initialRequests);
      const seeded = await ServiceRequest.find(filter).sort({ createdAt: -1 });
      return res.json({
        success: true,
        data: seeded
      });
    }

    return res.json({
      success: true,
      data: requests
    });
  } catch (error: any) {
    console.error('[SupportRoute] Error fetching service requests:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch service requests.'
    });
  }
});

/**
 * PATCH /api/support/requests/:ticketId/status
 * Update the status of a service request (Employee workspace action).
 */
supportRouter.patch('/requests/:ticketId/status', async (req: Request, res: Response) => {
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

    const { ticketId } = req.params;
    const { status, assignedEngineer, resolutionNotes, operatorName } = req.body;

    const request = await ServiceRequest.findOne({ ticketId });
    if (!request) {
      return res.status(404).json({
        success: false,
        error: `Service request with ticketId '${ticketId}' not found.`
      });
    }

    if (status) request.status = status;
    if (assignedEngineer) request.assignedEngineer = assignedEngineer;
    if (resolutionNotes) request.resolutionNotes = resolutionNotes;

    await request.save();

    await logAuditEvent({
      action: 'SERVICE_REQUEST_UPDATED',
      category: 'lifecycle',
      details: `Ticket ${ticketId} updated to '${status}'. Assigned to: ${assignedEngineer || 'Unassigned'}.`,
      actor: operatorName || 'Dheera Green Staff'
    });

    return res.json({
      success: true,
      data: request
    });
  } catch (error: any) {
    console.error('[SupportRoute] Error updating service request:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update service request.'
    });
  }
});
