/**
 * Solaris API Client for Express/MongoDB backend.
 * Uses relative `/api` paths forwarded by Vite reverse proxy (or direct on same origin).
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  status?: string;
  data?: T;
  error?: string;
  timestamp?: string;
  service?: string;
  database?: {
    status: string;
    name?: string;
    host?: string;
    port?: number;
  };
  isSyntheticDataEnforced?: boolean;
  jurisdiction?: string;
  attribution?: string;
  systemTime?: string;
}

const API_BASE = typeof window !== 'undefined' ? '/api' : 'http://localhost:5000/api';

export const apiClient = {
  /**
   * Health & Database Connection Probe
   */
  async checkHealth(): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) {
        return { success: false, error: `Health check failed with HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err: any) {
      return { success: false, error: `Backend unavailable: ${err.message}` };
    }
  },

  /**
   * Fetch community project and member roster from MongoDB
   */
  async getCommunity(): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/community`);
      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `HTTP ${res.status}: ${text || 'Failed to fetch community'}` };
      }
      return await res.json();
    } catch (err: any) {
      return { success: false, error: `Backend offline: ${err.message}` };
    }
  },

  /**
   * Update member status (e.g. withdraw or re-admit) in MongoDB
   */
  async updateMemberStatus(memberId: string, status: string, operatorName?: string): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/community/members/${encodeURIComponent(memberId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, operatorName })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: `Failed to persist member update: ${err.message}` };
    }
  },

  /**
   * Execute and persist optimization scenario in MongoDB
   */
  async solveOptimisation(params: any): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/optimiser/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: `Failed to persist optimisation: ${err.message}` };
    }
  },

  /**
   * Save solar feasibility assessment to MongoDB
   */
  async saveAssessment(inputs: any): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: `Failed to persist assessment: ${err.message}` };
    }
  },

  /**
   * Fetch recent optimization solver runs from MongoDB
   */
  async getOptimisationRuns(): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/optimiser/runs`);
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err: any) {
      return { success: false, error: `Failed to fetch optimisation runs: ${err.message}` };
    }
  },

  /**
   * Fetch most recently saved site assessment from MongoDB
   */
  async getLatestAssessment(): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/assessments/latest`);
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err: any) {
      return { success: false, error: `Failed to fetch latest assessment: ${err.message}` };
    }
  },

  /**
   * Fetch saved assessment history from MongoDB
   */
  async getAssessments(): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/assessments`);
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err: any) {
      return { success: false, error: `Failed to fetch assessments: ${err.message}` };
    }
  },

  /**
   * Fetch append-only audit trail from MongoDB
   */
  async getAuditLogs(): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/audit-logs`);
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err: any) {
      return { success: false, error: `Failed to fetch audit logs: ${err.message}` };
    }
  },

  /**
   * Request technical planning advisory from AI assistant (with offline rule-based fallback)
   */
  async askAssistant(prompt: string, context?: any): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: `Assistant unavailable: ${err.message}` };
    }
  },

  /**
   * Submit customer maintenance/service request to MongoDB
   */
  async createServiceRequest(payload: any): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/support/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: `Failed to submit service request: ${err.message}` };
    }
  },

  /**
   * Fetch customer service requests from MongoDB
   */
  async getServiceRequests(consumerNumber?: string): Promise<ApiResponse> {
    try {
      const query = consumerNumber ? `?consumerNumber=${encodeURIComponent(consumerNumber)}` : '';
      const res = await fetch(`${API_BASE}/support/requests${query}`);
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err: any) {
      return { success: false, error: `Failed to fetch service requests: ${err.message}` };
    }
  },

  /**
   * Update service request status (Employee action)
   */
  async updateServiceRequestStatus(ticketId: string, updates: any): Promise<ApiResponse> {
    try {
      const res = await fetch(`${API_BASE}/support/requests/${encodeURIComponent(ticketId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: `Failed to update service request: ${err.message}` };
    }
  }
};


