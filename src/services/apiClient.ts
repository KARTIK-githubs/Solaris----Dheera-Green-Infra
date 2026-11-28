import type { OptimisationParams, SolarCalculationResult } from '../types';

export interface AccountSession {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'employee' | 'admin';
}

export interface ApiResponse<T = any> {
  success?: boolean;
  status?: string;
  data?: T;
  error?: string;
  httpStatus?: number;
  database?: { status: string };
}

const API_BASE = typeof window !== 'undefined' ? '/api' : 'http://localhost:5000/api';

// A tab's stale UI cannot request records using another tab's new session.
let expectedAccountId: string | null = null;

export function setApiAccount(id: string | null) {
  expectedAccountId = id;
}

async function request<T = any>(path: string, method = 'GET', payload?: unknown): Promise<ApiResponse<T>> {
  const headers = new Headers();
  if (expectedAccountId && !path.startsWith('/auth/')) {
    headers.set('X-Solaris-Account', expectedAccountId);
  }
  if (method !== 'GET') headers.set('X-Solaris-Request', '1');
  if (payload !== undefined) headers.set('Content-Type', 'application/json');
  try {
    const response = await fetch(API_BASE + path, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      credentials: 'same-origin',
      signal: AbortSignal.timeout(23_000)
    });
    if (!response.headers.get('Content-Type')?.includes('application/json')) {
      return { success: false, httpStatus: response.status, error: 'The API did not return a JSON response.' };
    }
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        httpStatus: response.status,
        error: typeof result.error === 'string' ? result.error : `Request failed (HTTP ${response.status}).`
      };
    }
    return { ...result, httpStatus: response.status };
  } catch {
    return { success: false, error: 'Could not reach the Solaris API. Try again.' };
  }
}

export type SavedAssessment = SolarCalculationResult & { _id: string; createdAt: string };

export const apiClient = {
  register: (name: string, email: string, password: string) =>
    request<AccountSession>('/auth/register', 'POST', { name, email, password }),
  login: (email: string, password: string) =>
    request<AccountSession>('/auth/login', 'POST', { email, password }),
  getSession: () => request<AccountSession>('/auth/session'),
  logout: () => request('/auth/logout', 'POST'),
  checkHealth: () => request('/health'),
  getCommunity: () => request('/community'),
  updateMemberStatus: (memberId: string, status: string) =>
    request(`/community/members/${encodeURIComponent(memberId)}/status`, 'PATCH', { status }),
  solveOptimisation: (params: OptimisationParams) => request('/optimiser/solve', 'POST', params),
  saveAssessment: (inputs: unknown) => request<SavedAssessment>('/assessments', 'POST', inputs),
  getOptimisationRuns: () => request('/optimiser/runs'),
  getLatestAssessment: () => request<SavedAssessment | null>('/assessments/latest'),
  getAssessments: () => request<SavedAssessment[]>('/assessments'),
  getAuditLogs: () => request('/audit-logs'),
  askAssistant: (prompt: string, context?: unknown) => request('/ai/assistant', 'POST', { prompt, context }),
  createServiceRequest: (payload: unknown) => request('/support/requests', 'POST', payload),
  getServiceRequests: (consumerNumber?: string) =>
    request('/support/requests' + (consumerNumber ? `?consumerNumber=${encodeURIComponent(consumerNumber)}` : '')),
  updateServiceRequestStatus: (ticketId: string, updates: unknown) =>
    request(`/support/requests/${encodeURIComponent(ticketId)}/status`, 'PATCH', updates)
};
