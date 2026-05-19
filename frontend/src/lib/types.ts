// All TypeScript types for TaskHub

export type UserRole = 'admin' | 'user';
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'submitted'
  | 'accepted'
  | 'revision_requested';

export type ImageType =
  | 'white_bg'
  | 'theme_marble'
  | 'theme_velvet'
  | 'lifestyle_beach'
  | 'lifestyle_studio'
  | 'model_front'
  | 'model_side'
  | 'model_closeup';

export type ImageStatus = 'pending' | 'generating' | 'done' | 'failed';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  product_image_url: string;
  product_image_removed_bg_url: string | null;
  product_descriptor: string | null;
  created_by: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  admin_notes: string | null;
  generation_seed: number | null;
  created_at: string;
  updated_at: string;
  created_by_profile?: UserProfile | null;
  assigned_to_profile?: UserProfile | null;
  generation_count?: number;
}

export interface GeneratedImage {
  id: string;
  task_id: string;
  image_type: ImageType;
  image_url: string | null;
  prompt_used: string | null;
  metadata: Record<string, unknown>;
  angle: string | null;
  is_final: boolean;
  status: ImageStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobStatus {
  job_id: string;
  status: 'queued' | 'started' | 'finished' | 'failed' | 'deferred';
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string | null;
  ended_at: string | null;
}

export interface AnalyticsData {
  total_tasks: number;
  status_breakdown: Partial<Record<TaskStatus, number>>;
  total_users: number;
  total_generated_images: number;
}

// Image type metadata for UI display
export const IMAGE_TYPE_META: Record<
  ImageType,
  { label: string; description: string; emoji: string; slot: number }
> = {
  white_bg: { label: 'White Background', description: 'Clean e-commerce style', emoji: '⬜', slot: 1 },
  theme_marble: { label: 'Marble Theme', description: 'Luxury marble surface', emoji: '🪨', slot: 2 },
  theme_velvet: { label: 'Velvet Theme', description: 'Deep velvet backdrop', emoji: '🟣', slot: 3 },
  lifestyle_beach: { label: 'Beach Lifestyle', description: 'Golden hour seaside', emoji: '🏖️', slot: 4 },
  lifestyle_studio: { label: 'Studio Lifestyle', description: 'Minimalist interior', emoji: '🌿', slot: 5 },
  model_front: { label: 'Model — Front', description: 'Professional model, front', emoji: '👤', slot: 6 },
  model_side: { label: 'Model — Side 45°', description: 'Professional model, angle', emoji: '🔄', slot: 7 },
  model_closeup: { label: 'Model — Close-up', description: 'Macro detail shot', emoji: '🔍', slot: 8 },
};

export const ALL_IMAGE_TYPES = Object.keys(IMAGE_TYPE_META) as ImageType[];

export const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#94a3b8', bg: '#1e293b' },
  assigned: { label: 'Assigned', color: '#60a5fa', bg: '#1e3a5f' },
  in_progress: { label: 'In Progress', color: '#fbbf24', bg: '#3d2a00' },
  submitted: { label: 'Submitted', color: '#a78bfa', bg: '#2d1b5e' },
  accepted: { label: 'Accepted', color: '#34d399', bg: '#022c22' },
  revision_requested: { label: 'Revision Needed', color: '#fb923c', bg: '#3d1400' },
};
