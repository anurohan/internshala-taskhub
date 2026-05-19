/**
 * TaskHub API Client — typed fetch wrapper for Flask backend
 */
import { Task, GeneratedImage, UserProfile, JobStatus, AnalyticsData } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  me: (token: string) =>
    apiFetch<{ user: UserProfile; is_admin: boolean }>('/api/auth/me', { token }),
  logout: (token: string) =>
    apiFetch<{ message: string }>('/api/auth/logout', { method: 'POST', token }),
  listUsers: (token: string) =>
    apiFetch<{ users: UserProfile[] }>('/api/auth/users', { token }),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  create: (token: string, formData: FormData) =>
    fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((r) => r.json() as Promise<{ task: Task }>),

  list: (token: string, params?: { status?: string; page?: number }) => {
    const q = new URLSearchParams(params as Record<string, string> ?? {});
    return apiFetch<{ tasks: Task[]; total: number }>(`/api/tasks?${q}`, { token });
  },

  get: (token: string, id: string) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}`, { token }),

  assign: (token: string, id: string, assigned_to: string) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}/assign`, {
      method: 'POST',
      token,
      body: JSON.stringify({ assigned_to }),
    }),

  accept: (token: string, id: string) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}/accept`, { method: 'PUT', token }),

  requestRevision: (token: string, id: string, admin_notes: string) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}/request-revision`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ admin_notes }),
    }),

  delete: (token: string, id: string) =>
    apiFetch<{ message: string }>(`/api/tasks/${id}`, { method: 'DELETE', token }),

  myTasks: (token: string) =>
    apiFetch<{ tasks: Task[]; total: number }>('/api/my-tasks', { token }),

  start: (token: string, id: string) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}/start`, { method: 'PUT', token }),

  submit: (token: string, id: string) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}/submit`, { method: 'POST', token }),

  analytics: (token: string) =>
    apiFetch<AnalyticsData>('/api/admin/analytics', { token }),
};

// ── Generations ───────────────────────────────────────────────────────────────
export const generationsApi = {
  generate: (token: string, taskId: string, imageTypes?: string[]) =>
    apiFetch<{ jobs: { job_id: string; generation_id: string; image_type: string }[] }>(
      `/api/tasks/${taskId}/generate`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ image_types: imageTypes ?? null }),
      }
    ),

  list: (token: string, taskId: string) =>
    apiFetch<{ generations: GeneratedImage[]; total: number; completed: number }>(
      `/api/tasks/${taskId}/generations`,
      { token }
    ),

  delete: (token: string, genId: string) =>
    apiFetch<{ message: string }>(`/api/generations/${genId}`, {
      method: 'DELETE',
      token,
    }),

  markFinal: (token: string, genId: string) =>
    apiFetch<{ generation: GeneratedImage }>(`/api/generations/${genId}/mark-final`, {
      method: 'PUT',
      token,
    }),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsApi = {
  status: (token: string, jobId: string) =>
    apiFetch<JobStatus>(`/api/jobs/${jobId}/status`, { token }),
};
