-- Add frozen_at column to plan_items
ALTER TABLE public.plan_items 
ADD COLUMN frozen_at timestamp with time zone DEFAULT NULL;

-- Add deviation tracking columns to actual_entries
ALTER TABLE public.actual_entries 
ADD COLUMN deviation_minutes integer DEFAULT NULL,
ADD COLUMN match_method text DEFAULT NULL;

-- Create day_metrics table for daily aggregated metrics
CREATE TABLE public.day_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  planned_count integer NOT NULL DEFAULT 0,
  completed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  actual_count integer NOT NULL DEFAULT 0,
  unplanned_count integer NOT NULL DEFAULT 0,
  planned_minutes integer NOT NULL DEFAULT 0,
  actual_minutes integer NOT NULL DEFAULT 0,
  avg_deviation_minutes integer DEFAULT NULL,
  within_tolerance_count integer NOT NULL DEFAULT 0,
  completion_rate numeric DEFAULT NULL,
  focus_score numeric DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on day_metrics
ALTER TABLE public.day_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for day_metrics
CREATE POLICY "Users can view own day metrics" 
ON public.day_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own day metrics" 
ON public.day_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own day metrics" 
ON public.day_metrics 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at on day_metrics
CREATE TRIGGER update_day_metrics_updated_at
BEFORE UPDATE ON public.day_metrics
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();