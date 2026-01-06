-- Create table for user's custom quick chips
CREATE TABLE public.user_quick_chips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  tags TEXT[] DEFAULT '{}',
  default_hour INTEGER DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_quick_chips ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chips
CREATE POLICY "Users can view their own quick chips"
ON public.user_quick_chips
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own chips
CREATE POLICY "Users can create their own quick chips"
ON public.user_quick_chips
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own chips
CREATE POLICY "Users can update their own quick chips"
ON public.user_quick_chips
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own chips
CREATE POLICY "Users can delete their own quick chips"
ON public.user_quick_chips
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_quick_chips_updated_at
BEFORE UPDATE ON public.user_quick_chips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();