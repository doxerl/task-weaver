-- 1. Profiles tablosu (kullanıcı profilleri)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  timezone text DEFAULT 'Europe/Istanbul',
  locale text DEFAULT 'tr-TR',
  working_hours_start time DEFAULT '08:00',
  working_hours_end time DEFAULT '22:00',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Plan items tablosu (planlanan görevler)
CREATE TABLE public.plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  type text CHECK (type IN ('task', 'event', 'habit')) DEFAULT 'task',
  priority text CHECK (priority IN ('low', 'med', 'high')) DEFAULT 'med',
  tags text[] DEFAULT '{}',
  notes text,
  location text,
  status text CHECK (status IN ('planned', 'done', 'skipped')) DEFAULT 'planned',
  source text CHECK (source IN ('voice', 'text', 'manual', 'github')) DEFAULT 'manual',
  linked_github jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Actual entries tablosu (gerçekleşen aktiviteler)
CREATE TABLE public.actual_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  tags text[] DEFAULT '{}',
  notes text,
  source text CHECK (source IN ('voice', 'text', 'review')) DEFAULT 'text',
  linked_plan_item_id uuid REFERENCES public.plan_items(id) ON DELETE SET NULL,
  linked_github jsonb,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 4. Command events tablosu (audit log)
CREATE TABLE public.command_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  source text CHECK (source IN ('voice', 'text', 'review', 'system')) DEFAULT 'text',
  raw_transcript text,
  normalized_text text,
  task text CHECK (task IN ('parsePlan', 'parseActual', 'dayReview', 'githubSync')),
  ai_json_output jsonb,
  ai_parse_ok boolean DEFAULT false,
  warnings jsonb,
  clarifying_questions jsonb,
  apply_status text CHECK (apply_status IN ('applied', 'rejected', 'needs_clarification')) DEFAULT 'applied',
  diff_summary jsonb,
  error text,
  context jsonb
);

-- 5. Day reviews tablosu (günlük review sonuçları)
CREATE TABLE public.day_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  timezone text NOT NULL,
  review_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, date)
);

-- 6. GitHub integrations tablosu
CREATE TABLE public.integrations_github (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  mode text CHECK (mode IN ('oauth', 'pat')) DEFAULT 'pat',
  token_encrypted text NOT NULL,
  token_last4 text,
  scopes text[] DEFAULT '{}',
  connected_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 7. GitHub work items cache tablosu
CREATE TABLE public.github_work_items_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider text DEFAULT 'github',
  type text CHECK (type IN ('issue', 'pr')) NOT NULL,
  owner text NOT NULL,
  repo text NOT NULL,
  number integer NOT NULL,
  title text NOT NULL,
  state text NOT NULL,
  url text NOT NULL,
  assignees text[] DEFAULT '{}',
  labels text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now() NOT NULL,
  raw jsonb,
  UNIQUE(user_id, owner, repo, number)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations_github ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_work_items_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for plan_items
CREATE POLICY "Users can view own plan items" ON public.plan_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own plan items" ON public.plan_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan items" ON public.plan_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan items" ON public.plan_items
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for actual_entries
CREATE POLICY "Users can view own actual entries" ON public.actual_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own actual entries" ON public.actual_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actual entries" ON public.actual_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own actual entries" ON public.actual_entries
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for command_events
CREATE POLICY "Users can view own command events" ON public.command_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own command events" ON public.command_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for day_reviews
CREATE POLICY "Users can view own day reviews" ON public.day_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own day reviews" ON public.day_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own day reviews" ON public.day_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for integrations_github
CREATE POLICY "Users can view own github integration" ON public.integrations_github
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own github integration" ON public.integrations_github
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own github integration" ON public.integrations_github
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own github integration" ON public.integrations_github
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for github_work_items_cache
CREATE POLICY "Users can view own github cache" ON public.github_work_items_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own github cache" ON public.github_work_items_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own github cache" ON public.github_work_items_cache
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own github cache" ON public.github_work_items_cache
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_plan_items_updated_at
  BEFORE UPDATE ON public.plan_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_actual_entries_updated_at
  BEFORE UPDATE ON public.actual_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_day_reviews_updated_at
  BEFORE UPDATE ON public.day_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_integrations_github_updated_at
  BEFORE UPDATE ON public.integrations_github
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user signup (creates profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX idx_plan_items_user_date ON public.plan_items(user_id, start_at);
CREATE INDEX idx_actual_entries_user_date ON public.actual_entries(user_id, start_at);
CREATE INDEX idx_command_events_user_date ON public.command_events(user_id, created_at);
CREATE INDEX idx_day_reviews_user_date ON public.day_reviews(user_id, date);
CREATE INDEX idx_github_cache_user ON public.github_work_items_cache(user_id);