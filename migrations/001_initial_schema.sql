-- ============================================================
-- TaskHub — Migration 001: Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: users (extends Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  role       TEXT NOT NULL DEFAULT 'user'
               CHECK (role IN ('admin', 'user')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Application user profiles, linked to Supabase Auth';
COMMENT ON COLUMN public.users.role IS 'admin | user';

-- ============================================================
-- TABLE: tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                        TEXT NOT NULL,
  description                  TEXT,
  product_image_url            TEXT NOT NULL,
  product_image_removed_bg_url TEXT,
  product_descriptor           TEXT,          -- GPT-4o extracted description
  created_by                   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to                  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status                       TEXT NOT NULL DEFAULT 'pending'
                                 CHECK (status IN (
                                   'pending',
                                   'assigned',
                                   'in_progress',
                                   'submitted',
                                   'accepted',
                                   'revision_requested'
                                 )),
  admin_notes                  TEXT,          -- Admin feedback on revision
  generation_seed              BIGINT,        -- Fixed seed for AI consistency
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tasks IS 'Product photography tasks';
COMMENT ON COLUMN public.tasks.generation_seed IS 'Fixed random seed for consistent AI generation across all 8 image types';

-- ============================================================
-- TABLE: generated_images
-- ============================================================
CREATE TABLE IF NOT EXISTS public.generated_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  image_type   TEXT NOT NULL
                 CHECK (image_type IN (
                   'white_bg',
                   'theme_marble',
                   'theme_velvet',
                   'lifestyle_beach',
                   'lifestyle_studio',
                   'model_front',
                   'model_side',
                   'model_closeup'
                 )),
  image_url    TEXT,
  prompt_used  TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',  -- job_id, fal_request_id, seed, etc.
  angle        TEXT,
  is_final     BOOLEAN NOT NULL DEFAULT FALSE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'generating', 'done', 'failed')),
  error_message TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, image_type)               -- One slot per type per task
);

COMMENT ON TABLE public.generated_images IS 'AI-generated product images, one record per image type per task';

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB NOT NULL DEFAULT '{}',
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail for all significant user/admin actions';

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER generated_images_updated_at
  BEFORE UPDATE ON public.generated_images
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TRIGGER: auto-create user profile on auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user'  -- Default role; manually set admin in DB
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_status         ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to    ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by     ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at     ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_images_task_id   ON public.generated_images(task_id);
CREATE INDEX IF NOT EXISTS idx_gen_images_status    ON public.generated_images(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id   ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
