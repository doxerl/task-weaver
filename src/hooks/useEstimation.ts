import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DurationSuggestion, EstimationStats } from '@/types/estimation';

export const useEstimationStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['estimation-stats', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('estimation_stats')
        .select('*')
        .eq('user_id', userId)
        .order('calibration_score', { ascending: false });
      
      if (error) throw error;
      return data as EstimationStats[];
    },
    enabled: !!userId,
  });
};

export const useDurationSuggestion = () => {
  return useMutation({
    mutationFn: async (category: string): Promise<DurationSuggestion> => {
      const { data, error } = await supabase.functions.invoke('suggest-duration', {
        body: { category }
      });
      
      if (error) throw error;
      return data as DurationSuggestion;
    },
  });
};

export const useRecordEstimation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      planItemId,
      category,
      estimatedMinutes,
      actualMinutes,
    }: {
      planItemId: string;
      category: string;
      estimatedMinutes: number;
      actualMinutes: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const deviationMinutes = actualMinutes - estimatedMinutes;
      const deviationPercent = estimatedMinutes > 0 
        ? ((actualMinutes - estimatedMinutes) / estimatedMinutes) * 100 
        : 0;
      
      // 1. Estimation history'e kaydet
      const { error: historyError } = await supabase
        .from('estimation_history')
        .insert({
          user_id: userData.user.id,
          plan_item_id: planItemId,
          category,
          estimated_minutes: estimatedMinutes,
          actual_minutes: actualMinutes,
          deviation_minutes: deviationMinutes,
          deviation_percent: Math.round(deviationPercent * 100) / 100,
        });
      
      if (historyError) throw historyError;
      
      // 2. Estimation stats'ı güncelle (upsert)
      const { data: existingStats } = await supabase
        .from('estimation_stats')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('category', category)
        .maybeSingle();
      
      if (existingStats) {
        // Mevcut istatistikleri güncelle
        const newTotalTasks = existingStats.total_tasks + 1;
        const newTotalEstimated = existingStats.total_estimated_minutes + estimatedMinutes;
        const newTotalActual = existingStats.total_actual_minutes + actualMinutes;
        const newAvgDeviation = ((newTotalActual - newTotalEstimated) / newTotalEstimated) * 100;
        const newCalibrationScore = Math.max(0, Math.min(100, Math.round(100 - Math.abs(newAvgDeviation))));
        
        const { error: updateError } = await supabase
          .from('estimation_stats')
          .update({
            total_tasks: newTotalTasks,
            total_estimated_minutes: newTotalEstimated,
            total_actual_minutes: newTotalActual,
            avg_deviation_percent: Math.round(newAvgDeviation * 100) / 100,
            calibration_score: newCalibrationScore,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existingStats.id);
        
        if (updateError) throw updateError;
      } else {
        // Yeni istatistik oluştur
        const avgDeviation = ((actualMinutes - estimatedMinutes) / estimatedMinutes) * 100;
        const calibrationScore = Math.max(0, Math.min(100, Math.round(100 - Math.abs(avgDeviation))));
        
        const { error: insertError } = await supabase
          .from('estimation_stats')
          .insert({
            user_id: userData.user.id,
            category,
            total_tasks: 1,
            total_estimated_minutes: estimatedMinutes,
            total_actual_minutes: actualMinutes,
            avg_deviation_percent: Math.round(avgDeviation * 100) / 100,
            calibration_score: calibrationScore,
          });
        
        if (insertError) throw insertError;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimation-stats'] });
    },
  });
};

// Utility: Kalibrasyon skorundan renk al
export const getCalibrationColor = (score: number | null): string => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

// Utility: Bias yüzdesinden mesaj al
export const getBiasMessage = (biasPercent: number | null): string | null => {
  if (biasPercent === null) return null;
  if (biasPercent > 20) return `%${Math.round(biasPercent)} eksik tahmin`;
  if (biasPercent < -20) return `%${Math.abs(Math.round(biasPercent))} fazla tahmin`;
  return 'İyi kalibrasyon';
};
