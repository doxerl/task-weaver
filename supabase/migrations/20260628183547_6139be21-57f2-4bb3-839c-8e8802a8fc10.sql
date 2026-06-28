
-- 1. Tighten monthly_exchange_rates write policies (drop public-true policies)
DROP POLICY IF EXISTS "Authenticated users can insert exchange rates" ON public.monthly_exchange_rates;
DROP POLICY IF EXISTS "Authenticated users can update exchange rates" ON public.monthly_exchange_rates;
DROP POLICY IF EXISTS "Authenticated users can delete exchange rates" ON public.monthly_exchange_rates;

-- Create app_role + user_roles infra (idempotent)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Admin-only writes on monthly_exchange_rates
CREATE POLICY "Admins can insert exchange rates"
  ON public.monthly_exchange_rates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update exchange rates"
  ON public.monthly_exchange_rates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete exchange rates"
  ON public.monthly_exchange_rates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Lock down SECURITY DEFINER trigger functions from API execution
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 3. Storage: add UPDATE policy + ensure ownership checks on finance-files
DROP POLICY IF EXISTS "Users can update own finance files" ON storage.objects;
CREATE POLICY "Users can update own finance files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'finance-files' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'finance-files' AND (auth.uid())::text = (storage.foldername(name))[1]);
