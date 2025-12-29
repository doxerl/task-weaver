import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { weekStart } = await req.json();
    console.log('Calculating weekly metrics for:', weekStart, 'user:', user.id);

    // Calculate week end (7 days from start)
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    // Fetch plan items for the week
    const { data: planItems, error: planError } = await supabaseAdmin
      .from('plan_items')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_at', weekStartDate.toISOString())
      .lt('start_at', weekEndDate.toISOString());

    if (planError) {
      console.error('Error fetching plan items:', planError);
      throw planError;
    }

    // Fetch actual entries for the week
    const { data: actualEntries, error: actualError } = await supabaseAdmin
      .from('actual_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_at', weekStartDate.toISOString())
      .lt('start_at', weekEndDate.toISOString());

    if (actualError) {
      console.error('Error fetching actual entries:', actualError);
      throw actualError;
    }

    console.log('Found', planItems?.length, 'plan items and', actualEntries?.length, 'actual entries');

    // Calculate metrics
    const totalPlanned = planItems?.length || 0;
    const totalCompleted = planItems?.filter(p => p.status === 'done').length || 0;
    const completionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

    // Calculate estimation accuracy from estimation_history
    const { data: estimationData } = await supabaseAdmin
      .from('estimation_history')
      .select('deviation_percent')
      .eq('user_id', user.id)
      .gte('created_at', weekStartDate.toISOString())
      .lt('created_at', weekEndDate.toISOString());

    let estimationAccuracy = 100;
    if (estimationData && estimationData.length > 0) {
      const avgDeviation = estimationData.reduce((sum, e) => sum + Math.abs(e.deviation_percent || 0), 0) / estimationData.length;
      estimationAccuracy = Math.max(0, Math.round(100 - avgDeviation));
    }

    // Calculate category distribution
    const categoryDistribution: Record<string, number> = {};
    planItems?.forEach(item => {
      const category = item.tags?.[0] || 'Genel';
      const duration = (new Date(item.end_at).getTime() - new Date(item.start_at).getTime()) / 60000;
      categoryDistribution[category] = (categoryDistribution[category] || 0) + duration;
    });

    // Calculate day performance
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const dayPerformance: Record<string, { planned: number; completed: number }> = {};
    
    planItems?.forEach(item => {
      const dayName = dayNames[new Date(item.start_at).getDay()];
      if (!dayPerformance[dayName]) {
        dayPerformance[dayName] = { planned: 0, completed: 0 };
      }
      dayPerformance[dayName].planned++;
      if (item.status === 'done') {
        dayPerformance[dayName].completed++;
      }
    });

    // Find zombie tasks (carry_over_count >= 3)
    const { data: zombieTasks } = await supabaseAdmin
      .from('plan_items')
      .select('id, title, carry_over_count')
      .eq('user_id', user.id)
      .gte('carry_over_count', 3)
      .neq('status', 'done');

    const zombieTaskIds = zombieTasks?.map(t => t.id) || [];

    // Generate auto suggestions
    const autoSuggestions: string[] = [];
    
    if (completionRate < 50) {
      autoSuggestions.push('Tamamlama oranın düşük. Daha az ve gerçekçi planlar yapmayı dene.');
    }
    if (estimationAccuracy < 70) {
      autoSuggestions.push('Süre tahminlerin tutmuyor. Görevlere daha fazla buffer ekle.');
    }
    if (zombieTaskIds.length > 0) {
      autoSuggestions.push(`${zombieTaskIds.length} zombi görevin var. Bunları parçalamayı veya silmeyi düşün.`);
    }

    // Find best day
    let bestDay = '';
    let bestRate = 0;
    Object.entries(dayPerformance).forEach(([day, perf]) => {
      if (perf.planned > 0) {
        const rate = perf.completed / perf.planned;
        if (rate > bestRate) {
          bestRate = rate;
          bestDay = day;
        }
      }
    });
    if (bestDay) {
      autoSuggestions.push(`En verimli günün ${bestDay}. Bu günü önemli işler için değerlendir.`);
    }

    // Calculate deep work ratio (tasks > 60 min)
    const deepWorkMinutes = planItems?.filter(item => {
      const duration = (new Date(item.end_at).getTime() - new Date(item.start_at).getTime()) / 60000;
      return duration >= 60;
    }).reduce((sum, item) => {
      return sum + (new Date(item.end_at).getTime() - new Date(item.start_at).getTime()) / 60000;
    }, 0) || 0;

    const totalMinutes = planItems?.reduce((sum, item) => {
      return sum + (new Date(item.end_at).getTime() - new Date(item.start_at).getTime()) / 60000;
    }, 0) || 0;

    const deepWorkRatio = totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0;

    // Upsert weekly retrospective
    const metricsData = {
      user_id: user.id,
      week_start: weekStart,
      completion_rate: completionRate,
      estimation_accuracy: estimationAccuracy,
      category_distribution: categoryDistribution,
      day_performance: dayPerformance,
      zombie_tasks: zombieTaskIds,
      auto_suggestions: autoSuggestions,
      deep_work_ratio: deepWorkRatio,
      carried_over_count: zombieTaskIds.length,
    };

    const { data: existingRetro } = await supabaseAdmin
      .from('weekly_retrospectives')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single();

    let retroData;
    if (existingRetro) {
      const { data, error } = await supabaseAdmin
        .from('weekly_retrospectives')
        .update(metricsData)
        .eq('id', existingRetro.id)
        .select()
        .single();
      if (error) throw error;
      retroData = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('weekly_retrospectives')
        .insert(metricsData)
        .select()
        .single();
      if (error) throw error;
      retroData = data;
    }

    console.log('Weekly metrics calculated and saved:', retroData?.id);

    return new Response(JSON.stringify({
      success: true,
      metrics: {
        completionRate,
        estimationAccuracy,
        categoryDistribution,
        dayPerformance,
        zombieTasks: zombieTasks || [],
        autoSuggestions,
        deepWorkRatio,
      },
      retrospective: retroData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Calculate weekly metrics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
