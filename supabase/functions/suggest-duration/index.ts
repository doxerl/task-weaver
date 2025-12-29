import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestionRequest {
  category: string;
}

interface SuggestionResponse {
  suggested_minutes: number | null;
  personal_bias_percent: number | null;
  confidence: 'low' | 'medium' | 'high';
  sample_size: number;
  message: string | null;
  category_stats: {
    total_tasks: number;
    avg_estimated: number;
    avg_actual: number;
  } | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { category }: SuggestionRequest = await req.json();
    
    console.log(`[suggest-duration] User: ${user.id}, Category: ${category}`);

    // 1. Kategori bazlı geçmiş verileri çek (son 30 görev)
    const { data: history, error: historyError } = await supabase
      .from('estimation_history')
      .select('estimated_minutes, actual_minutes, deviation_percent')
      .eq('user_id', user.id)
      .eq('category', category)
      .not('actual_minutes', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    if (historyError) {
      console.error('[suggest-duration] History query error:', historyError);
      throw historyError;
    }

    // Yeterli veri yoksa
    if (!history || history.length < 3) {
      console.log(`[suggest-duration] Not enough data for category: ${category}, count: ${history?.length || 0}`);
      
      const response: SuggestionResponse = {
        suggested_minutes: null,
        personal_bias_percent: null,
        confidence: 'low',
        sample_size: history?.length || 0,
        message: 'Bu kategoride yeterli veri yok. Varsayılan +%20 buffer ekleniyor.',
        category_stats: null
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Medyan hesapla (ortalama yerine - outlier'lara daha dayanıklı)
    const actuals = history
      .map(h => h.actual_minutes)
      .filter((m): m is number => m !== null)
      .sort((a, b) => a - b);
    
    const estimates = history
      .map(h => h.estimated_minutes)
      .filter((m): m is number => m !== null);

    const median = actuals[Math.floor(actuals.length / 2)];
    const avgEstimated = Math.round(estimates.reduce((a, b) => a + b, 0) / estimates.length);
    const avgActual = Math.round(actuals.reduce((a, b) => a + b, 0) / actuals.length);

    // 3. Kişisel bias hesapla (gerçek - tahmin / tahmin * 100)
    const biases = history
      .filter(h => h.actual_minutes && h.estimated_minutes)
      .map(h => ((h.actual_minutes! - h.estimated_minutes!) / h.estimated_minutes!) * 100);
    
    const avgBias = biases.length > 0 
      ? Math.round(biases.reduce((a, b) => a + b, 0) / biases.length)
      : 0;

    // 4. Confidence hesapla (standart sapma bazlı)
    const mean = actuals.reduce((a, b) => a + b, 0) / actuals.length;
    const squaredDiffs = actuals.map(x => Math.pow(x - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // Coefficient of variation = stdDev / mean
    const cv = stdDev / mean;
    const confidence: 'low' | 'medium' | 'high' = 
      cv < 0.2 ? 'high' : 
      cv < 0.4 ? 'medium' : 'low';

    // 5. Mesaj oluştur
    let message: string | null = null;
    if (avgBias > 20) {
      message = `Bu kategoride genelde %${avgBias} fazla süre harcıyorsun`;
    } else if (avgBias < -20) {
      message = `Bu kategoride genelde %${Math.abs(avgBias)} erken bitiriyorsun`;
    }

    console.log(`[suggest-duration] Suggestion: ${median} min, bias: ${avgBias}%, confidence: ${confidence}`);

    const response: SuggestionResponse = {
      suggested_minutes: median,
      personal_bias_percent: avgBias,
      confidence,
      sample_size: history.length,
      message,
      category_stats: {
        total_tasks: history.length,
        avg_estimated: avgEstimated,
        avg_actual: avgActual
      }
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[suggest-duration] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
