-- ============================================================
-- TaskHub — Migration 002: Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- RLS: users table
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile; admins can read all
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

-- Users can update their own profile (not role); admins can update all
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

-- Only admins can update any user (including role changes)
CREATE POLICY "users_admin_update" ON public.users
  FOR UPDATE USING (public.is_admin());

-- No direct inserts (handled by trigger from auth.users)
CREATE POLICY "users_insert_trigger" ON public.users
  FOR INSERT WITH CHECK (TRUE);  -- trigger uses SECURITY DEFINER

-- No deletes from client (only cascade from auth.users)
CREATE POLICY "users_no_delete" ON public.users
  FOR DELETE USING (FALSE);

-- ============================================================
-- RLS: tasks table
-- ============================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on tasks
CREATE POLICY "tasks_admin_all" ON public.tasks
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can only SELECT tasks assigned to them
CREATE POLICY "tasks_user_select" ON public.tasks
  FOR SELECT USING (
    assigned_to = auth.uid() AND NOT public.is_admin()
  );

-- Users can UPDATE only their assigned tasks (start/submit transitions)
CREATE POLICY "tasks_user_update" ON public.tasks
  FOR UPDATE USING (
    assigned_to = auth.uid() AND NOT public.is_admin()
  )
  WITH CHECK (
    assigned_to = auth.uid()
    AND status IN ('in_progress', 'submitted')  -- only valid user transitions
  );

-- ============================================================
-- RLS: generated_images table
-- ============================================================
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "gen_images_admin_all" ON public.generated_images
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users: access only images belonging to their tasks
CREATE POLICY "gen_images_user_select" ON public.generated_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id AND assigned_to = auth.uid()
    )
    AND NOT public.is_admin()
  );

CREATE POLICY "gen_images_user_update" ON public.generated_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id AND assigned_to = auth.uid()
    )
    AND NOT public.is_admin()
  );

-- ============================================================
-- RLS: audit_logs table
-- ============================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- Anyone authenticated can insert (backend uses service role anyway)
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No updates or deletes on audit logs (immutable)
CREATE POLICY "audit_logs_no_update" ON public.audit_logs
  FOR UPDATE USING (FALSE);

CREATE POLICY "audit_logs_no_delete" ON public.audit_logs
  FOR DELETE USING (FALSE);
