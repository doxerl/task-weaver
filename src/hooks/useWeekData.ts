import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlanItem, ActualEntry } from '@/types/plan';
import { startOfWeek, endOfWeek, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';

interface DayData {
  date: Date;
  planItems: PlanItem[];
  actualEntries: ActualEntry[];
}

export function useWeekData(weekStart: Date) {
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const start = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(weekStart, { weekStartsOn: 1 }); // Sunday
    
    const weekStartISO = startOfDay(start).toISOString();
    const weekEndISO = endOfDay(end).toISOString();

    try {
      // Fetch all plan items for the week
      const { data: plans, error: plansError } = await supabase
        .from('plan_items')
        .select('*')
        .gte('start_at', weekStartISO)
        .lt('start_at', weekEndISO)
        .order('start_at', { ascending: true });

      if (plansError) {
        console.error('Error fetching plan items:', plansError);
      }

      // Fetch all actual entries for the week
      const { data: actuals, error: actualsError } = await supabase
        .from('actual_entries')
        .select('*')
        .gte('start_at', weekStartISO)
        .lt('start_at', weekEndISO)
        .order('start_at', { ascending: true });

      if (actualsError) {
        console.error('Error fetching actual entries:', actualsError);
      }

      // Group by day
      const days = eachDayOfInterval({ start, end });
      const grouped: DayData[] = days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        
        return {
          date: day,
          planItems: ((plans || []) as unknown as PlanItem[]).filter(item => {
            const itemDate = new Date(item.start_at);
            return itemDate >= dayStart && itemDate <= dayEnd;
          }),
          actualEntries: ((actuals || []) as unknown as ActualEntry[]).filter(entry => {
            const entryDate = new Date(entry.start_at);
            return entryDate >= dayStart && entryDate <= dayEnd;
          })
        };
      });

      setWeekData(grouped);
    } catch (error) {
      console.error('Error fetching week data:', error);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    weekData,
    loading,
    refetch: fetchData
  };
}
