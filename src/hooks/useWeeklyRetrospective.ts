import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface WeeklyMetrics {
  completionRate: number;
  estimationAccuracy: number;
  categoryDistribution: Record<string, number>;
  dayPerformance: Record<string, { planned: number; completed: number }>;
  zombieTasks: Array<{ id: string; title: string; carry_over_count: number }>;
  autoSuggestions: string[];
  deepWorkRatio: number;
}

interface WeeklyRetrospective {
  id: string;
  week_start: string;
  what_worked: string[];
  what_was_hard: string[];
  next_week_changes: string[];
  completion_rate: number | null;
  estimation_accuracy: number | null;
  category_distribution: unknown;
  day_performance: unknown;
  zombie_tasks: string[];
  auto_suggestions: unknown;
  deep_work_ratio: number | null;
}

export function useWeeklyRetrospective(weekStart: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);

  // Fetch existing retrospective
  const { data: retrospective, isLoading } = useQuery({
    queryKey: ['weekly-retrospective', weekStart, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('weekly_retrospectives')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle();
      
      if (error) throw error;
      return data as WeeklyRetrospective | null;
    },
    enabled: !!user,
  });

  // Calculate metrics via edge function
  const calculateMetrics = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-weekly-metrics', {
        body: { weekStart }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setMetrics(data.metrics);
      queryClient.invalidateQueries({ queryKey: ['weekly-retrospective', weekStart] });
    },
    onError: (error) => {
      console.error('Failed to calculate metrics:', error);
      toast.error('Metrikler hesaplanamadı');
    },
  });

  // Save retrospective
  const saveRetrospective = useMutation({
    mutationFn: async (data: { 
      whatWorked: string[]; 
      whatWasHard: string[]; 
      nextWeekChanges: string[] 
    }) => {
      if (!user) throw new Error('Not authenticated');

      const payload = {
        user_id: user.id,
        week_start: weekStart,
        what_worked: data.whatWorked,
        what_was_hard: data.whatWasHard,
        next_week_changes: data.nextWeekChanges,
      };

      if (retrospective?.id) {
        const { error } = await supabase
          .from('weekly_retrospectives')
          .update(payload)
          .eq('id', retrospective.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('weekly_retrospectives')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-retrospective', weekStart] });
    },
    onError: (error) => {
      console.error('Failed to save retrospective:', error);
      toast.error('Retrospektif kaydedilemedi');
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['weekly-retrospective', weekStart] });
    calculateMetrics.mutate();
  }, [queryClient, weekStart, calculateMetrics]);

  return {
    retrospective,
    metrics,
    isLoading,
    isCalculating: calculateMetrics.isPending,
    calculateMetrics: calculateMetrics.mutate,
    saveRetrospective: saveRetrospective.mutate,
    isSaving: saveRetrospective.isPending,
    refresh,
  };
}
