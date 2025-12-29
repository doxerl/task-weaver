-- Add DELETE policy for command_events table so users can delete their own command history
CREATE POLICY "Users can delete own command events" 
ON public.command_events 
FOR DELETE 
USING (auth.uid() = user_id);