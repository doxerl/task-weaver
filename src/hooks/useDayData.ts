import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlanItem, ActualEntry } from '@/types/plan';
import { format, startOfDay, endOfDay } from 'date-fns';

export function useDayData(date: Date) {
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [actualEntries, setActualEntries] = useState<ActualEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const dayStart = startOfDay(date).toISOString();
    const dayEnd = endOfDay(date).toISOString();

    try {
      // Fetch plan items for the day
      const { data: plans, error: plansError } = await supabase
        .from('plan_items')
        .select('*')
        .gte('start_at', dayStart)
        .lt('start_at', dayEnd)
        .order('start_at', { ascending: true });

      if (plansError) {
        console.error('Error fetching plan items:', plansError);
      } else {
        setPlanItems((plans || []) as unknown as PlanItem[]);
      }

      // Fetch actual entries for the day
      const { data: actuals, error: actualsError } = await supabase
        .from('actual_entries')
        .select('*')
        .gte('start_at', dayStart)
        .lt('start_at', dayEnd)
        .order('start_at', { ascending: true });

      if (actualsError) {
        console.error('Error fetching actual entries:', actualsError);
      } else {
        setActualEntries((actuals || []) as unknown as ActualEntry[]);
      }
    } catch (error) {
      console.error('Error fetching day data:', error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    planItems,
    actualEntries,
    loading,
    refetch: fetchData
  };
}
