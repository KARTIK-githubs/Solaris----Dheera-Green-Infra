import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../services/apiClient';

interface ServiceTicket {
  ticketId: string;
  customerName: string;
  consumerNumber: string;
  propertyAddress: string;
  category: 'panel_cleaning' | 'inverter_inspection' | 'meter_billing' | 'structural_check' | 'general_support';
  description: string;
  urgency: 'routine' | 'medium' | 'urgent';
  preferredDate?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedEngineer?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export const SupportPage: React.FC = () => {
  const { currentUser, workspaceMode } = useApp();

  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState<ServiceTicket['category']>('panel_cleaning');
  const [urgency, setUrgency] = useState<ServiceTicket['urgency']>('routine');
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [description, setDescription] = useState('');

  // Staff action state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<ServiceTicket['status']>('in_progress');
  const [assignedEngineer, setAssignedEngineer] = useState('Er. Ankit Sharma');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.getServiceRequests();
      if (res.success && Array.isArray(res.data)) {
        setTickets(res.data);
      } else {
        setLoadError(res.error || 'Failed to load tickets from server');
      }
    } catch (err: any) {
      console.error('Failed to load service tickets', err);
      setLoadError(err.message || 'Service request endpoint unreachable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage('Please provide a brief description of the service required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiClient.createServiceRequest({
        customerName: currentUser.name,
        consumerNumber: currentUser.consumerNumber,
        propertyAddress: 'Pocket 2, Sector B, Vasant Kunj, New Delhi 110070',
        category,
        description: description.trim(),
        urgency,
        preferredDate
      });

      if (res.success && res.data) {
        setSuccessMessage(`Service request ${res.data.ticketId} created successfully. Our service team will contact you within 24 hours.`);
        setDescription('');
        fetchTickets();
      } else {
        setErrorMessage(res.error || 'Failed to submit service request. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(`Error submitting request: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTicket = async (ticketId: string) => {
    try {
      const res = await apiClient.updateServiceRequestStatus(ticketId, {
        status: newStatus,
        assignedEngineer,
        resolutionNotes
      });
      if (res.success) {
        setSelectedTicketId(null);
        setResolutionNotes('');
        fetchTickets();
      } else {
        alert(`Update failed: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error updating ticket: ${err.message}`);
    }
  };

  const getCategoryLabel = (cat: ServiceTicket['category']) => {
    switch (cat) {
      case 'panel_cleaning':
        return 'Panel Cleaning & Wash';
      case 'inverter_inspection':
        return 'Inverter Inspection & Health';
      case 'meter_billing':
        return 'Net-Metering & Billing';
      case 'structural_check':
        return 'Structural & Civil Audit';
      default:
        return 'General Technical Support';
    }
  };

  const filteredTickets = workspaceMode === 'customer'
    ? tickets.filter(t => t.consumerNumber === currentUser.consumerNumber || t.customerName === currentUser.name)
    : tickets;

  return (
    <div className="flex flex-col w-full px-4 pb-16 space-y-6 max-w-5xl mx-auto animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-[#e2f0f9] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#9af4d8]/60 text-[#00725d] text-[11px] font-semibold mb-1">
            <span className="material-symbols-outlined text-[14px]">support_agent</span>
            <span>Dheera Green O&amp;M Support Desk · SLA 24 Hours</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#002620] tracking-tight font-bold">
            {workspaceMode === 'customer' ? 'Maintenance & Customer Support' : 'Dheera Green Service Tickets Queue'}
          </h1>
          <p className="text-xs sm:text-sm text-[#404846]">
            {workspaceMode === 'customer'
              ? 'Schedule routine panel cleaning, request technician inspection, or report net-metering discrepancies directly to Dheera Green Infra.'
              : 'Central operations dispatch desk for reviewing customer service requests, assigning field engineers, and updating ticket lifecycles.'}
          </p>
        </div>

        {/* Contact Strip */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="tel:+911149827100"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#c0c8c5]/60 hover:bg-[#f4faff] text-xs font-semibold text-[#002620] shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-[#006b57]">phone_in_talk</span>
            <span>+91 11 4982 7100</span>
          </a>
        </div>
      </div>

      {/* Emergency Assistance Notice */}
      <div className="bg-[#f4faff] border border-[#e2f0f9] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[#006b57] text-[20px] shrink-0 mt-0.5">handyman</span>
          <div>
            <strong className="text-[#002620] block">5-Year Comprehensive Warranty Active</strong>
            <span className="text-[#404846]">
              All routine maintenance visits, inverter firmware diagnostics, and bi-annual panel soiling wash are included with zero service fee under your Dheera Green contract.
            </span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-[#d1fae5] text-[#065f46] font-bold text-[11px] shrink-0 self-start sm:self-auto">
          Zero Out-of-Pocket Fee
        </span>
      </div>

      {/* Form & List Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Customer Ticket Submission Form */}
        {workspaceMode === 'customer' && (
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-[#e2f0f9] shadow-sm space-y-4">
            <h2 className="font-headline text-base font-bold text-[#002620] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006b57]">add_task</span>
              <span>Submit a Service Request</span>
            </h2>

            {successMessage && (
              <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl text-xs text-[#065f46] flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-[#059669]">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-xl text-xs text-[#991b1b] flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-[#dc2626]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#002620] mb-1">Service Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceTicket['category'])}
                  className="w-full px-3 py-2 rounded-lg border border-[#cbd2ca] bg-white text-xs text-[#002620] focus:outline-none focus:ring-1 focus:ring-[#006b57]"
                >
                  <option value="panel_cleaning">Scheduled Panel Cleaning &amp; Soiling Wash</option>
                  <option value="inverter_inspection">Inverter Fault or Generation Anomaly</option>
                  <option value="meter_billing">Net-Metering / DISCOM Export Discrepancy</option>
                  <option value="structural_check">Mounting Structure &amp; Waterproofing Inspection</option>
                  <option value="general_support">General System Query / Annual Health Check</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#002620] mb-1">Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as ServiceTicket['urgency'])}
                    className="w-full px-3 py-2 rounded-lg border border-[#cbd2ca] bg-white text-xs text-[#002620] focus:outline-none focus:ring-1 focus:ring-[#006b57]"
                  >
                    <option value="routine">Routine (3–5 Days)</option>
                    <option value="medium">Medium (48 Hours)</option>
                    <option value="urgent">Urgent (24 Hours)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#002620] mb-1">Preferred Date</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#cbd2ca] bg-white text-xs text-[#002620] focus:outline-none focus:ring-1 focus:ring-[#006b57]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#002620] mb-1">Description &amp; Observed Symptoms</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Inverter LED blinking yellow, or request seasonal panel cleaning after dust storm..."
                  className="w-full px-3 py-2 rounded-lg border border-[#cbd2ca] bg-white text-xs text-[#002620] focus:outline-none focus:ring-1 focus:ring-[#006b57]"
                />
              </div>

              <div className="p-2.5 bg-[#f4faff] rounded-lg border border-[#e2f0f9] text-[11px] text-[#404846]">
                Consumer Account: <strong>CA #{currentUser.consumerNumber}</strong> · Resident: <strong>{currentUser.name}</strong>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg bg-[#002620] hover:bg-[#003d34] disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Dispatch Service Ticket</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tickets History / Staff Dispatch Board */}
        <div className={`${workspaceMode === 'customer' ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white p-5 rounded-2xl border border-[#e2f0f9] shadow-sm space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-base font-bold text-[#002620] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006b57]">history</span>
              <span>{workspaceMode === 'customer' ? 'Your Service Ticket History' : 'All Customer Service Tickets (Persisted)'}</span>
            </h2>
            <button
              onClick={fetchTickets}
              disabled={loading}
              className="p-1.5 rounded-lg text-[#717976] hover:bg-[#f4faff] hover:text-[#002620] transition-colors"
              title="Refresh tickets"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-[#717976] bg-[#fbfbf9] rounded-xl border border-[#cbd2ca] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px] animate-spin text-[#006b57]">sync</span>
              <span>Loading service requests from database...</span>
            </div>
          ) : loadError ? (
            <div className="p-4 bg-[#fef2f2] border border-[#fecaca] rounded-xl text-xs text-[#991b1b] flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[20px] shrink-0 text-[#dc2626]">cloud_off</span>
              <div>
                <strong className="block font-semibold">Service Database Offline</strong>
                <p className="mt-0.5 text-[11px] leading-relaxed">{loadError}</p>
                <p className="mt-1 text-[10px] text-[#7f1d1d]">
                  Service ticket persistence requires a running MongoDB instance. Start MongoDB on 127.0.0.1:27017 to synchronize tickets.
                </p>
              </div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#717976] bg-[#fbfbf9] rounded-xl border border-dashed border-[#cbd2ca]">
              <span className="material-symbols-outlined text-[32px] text-[#006b57] mb-2 block">task_alt</span>
              <strong>No open service requests found.</strong>
              <p className="mt-1">Your 6.8 kWp solar system is operating normally with zero pending maintenance orders.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((t) => (
                <div
                  key={t.ticketId}
                  className="p-4 rounded-xl border border-[#e2f0f9] bg-[#fbfbf9] hover:bg-white transition-colors space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#002620]">{t.ticketId}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'open'
                            ? 'bg-[#fee2e2] text-[#991b1b]'
                            : t.status === 'in_progress'
                            ? 'bg-[#fef3c7] text-[#92400e]'
                            : 'bg-[#d1fae5] text-[#065f46]'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          t.urgency === 'urgent' ? 'bg-[#fee2e2] text-[#991b1b] font-bold' : 'bg-[#e2f0f9] text-[#404846]'
                        }`}>
                          {t.urgency}
                        </span>
                      </div>
                      <h4 className="font-bold text-[#002620] mt-1">{getCategoryLabel(t.category)}</h4>
                    </div>
                    <span className="text-[11px] text-[#717976] font-mono">
                      {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <p className="text-[#404846] leading-relaxed">{t.description}</p>

                  <div className="pt-2 border-t border-[#e2f0f9] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#717976]">
                    <div>
                      Customer: <strong className="text-[#002620]">{t.customerName}</strong> (CA #{t.consumerNumber})
                    </div>
                    <div>
                      Assigned Lead: <strong className="text-[#006b57]">{t.assignedEngineer || 'Dheera Green Dispatch'}</strong>
                    </div>
                  </div>

                  {t.resolutionNotes && (
                    <div className="p-2.5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg text-[11px] text-[#065f46]">
                      <strong>Engineer Notes:</strong> {t.resolutionNotes}
                    </div>
                  )}

                  {/* Employee status update actions */}
                  {workspaceMode === 'employee' && (
                    <div className="pt-2 border-t border-[#e2f0f9] flex items-center justify-between">
                      {selectedTicketId === t.ticketId ? (
                        <div className="w-full space-y-2 pt-1">
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value as ServiceTicket['status'])}
                              className="px-2 py-1 rounded border border-[#cbd2ca] bg-white text-xs"
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                            <input
                              type="text"
                              value={assignedEngineer}
                              onChange={(e) => setAssignedEngineer(e.target.value)}
                              placeholder="Assigned Engineer"
                              className="px-2 py-1 rounded border border-[#cbd2ca] bg-white text-xs"
                            />
                          </div>
                          <input
                            type="text"
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Resolution notes or dispatch ETA..."
                            className="w-full px-2 py-1 rounded border border-[#cbd2ca] bg-white text-xs"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setSelectedTicketId(null)}
                              className="px-2.5 py-1 text-xs text-[#717976] hover:underline"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleUpdateTicket(t.ticketId)}
                              className="px-3 py-1 bg-[#002620] text-white text-xs font-semibold rounded"
                            >
                              Save Status
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTicketId(t.ticketId);
                            setNewStatus(t.status);
                            setAssignedEngineer(t.assignedEngineer || 'Er. Ankit Sharma');
                            setResolutionNotes(t.resolutionNotes || '');
                          }}
                          className="px-2.5 py-1 rounded bg-[#e2f0f9] hover:bg-[#c0c8c5]/40 text-[#002620] font-semibold text-[11px] transition-colors"
                        >
                          Manage Ticket
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
