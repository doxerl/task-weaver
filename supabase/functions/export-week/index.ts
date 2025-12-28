import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[export-week] No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User context client for auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('[export-week] User auth failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[export-week] User authenticated:', user.id);

    // Service role client for DB queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { weekStart, timezone = 'Europe/Istanbul' } = await req.json();
    
    if (!weekStart) {
      return new Response(JSON.stringify({ error: 'weekStart is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[export-week] Fetching data for week:', weekStart);

    // Calculate week end (7 days from start)
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    // Fetch plan items for the week
    const { data: planItems, error: planError } = await supabase
      .from('plan_items')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_at', weekStartDate.toISOString())
      .lt('start_at', weekEndDate.toISOString())
      .order('start_at', { ascending: true });

    if (planError) {
      console.error('[export-week] Plan fetch error:', planError);
      throw planError;
    }

    // Fetch actual entries for the week
    const { data: actualEntries, error: actualError } = await supabase
      .from('actual_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_at', weekStartDate.toISOString())
      .lt('start_at', weekEndDate.toISOString())
      .order('start_at', { ascending: true });

    if (actualError) {
      console.error('[export-week] Actual fetch error:', actualError);
      throw actualError;
    }

    console.log('[export-week] Found', planItems?.length, 'plans and', actualEntries?.length, 'actuals');

    // Helper to format date for CSV
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('tr-TR');
    };

    const formatTime = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    const escapeCSV = (str: string | null | undefined) => {
      if (!str) return '';
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Generate Plan CSV
    const planHeader = 'Tarih,Saat Başlangıç,Saat Bitiş,Başlık,Tip,Öncelik,Durum,Etiketler,Notlar';
    const planRows = (planItems || []).map(item => [
      formatDate(item.start_at),
      formatTime(item.start_at),
      formatTime(item.end_at),
      escapeCSV(item.title),
      escapeCSV(item.type),
      escapeCSV(item.priority),
      escapeCSV(item.status),
      escapeCSV(item.tags?.join(', ')),
      escapeCSV(item.notes)
    ].join(','));
    
    const planCsv = '\uFEFF' + planHeader + '\n' + planRows.join('\n');

    // Generate Actual CSV
    const actualHeader = 'Tarih,Saat Başlangıç,Saat Bitiş,Başlık,Kaynak,Güven,Etiketler,Notlar';
    const actualRows = (actualEntries || []).map(entry => [
      formatDate(entry.start_at),
      formatTime(entry.start_at),
      formatTime(entry.end_at),
      escapeCSV(entry.title),
      escapeCSV(entry.source),
      entry.confidence?.toString() || '',
      escapeCSV(entry.tags?.join(', ')),
      escapeCSV(entry.notes)
    ].join(','));
    
    const actualCsv = '\uFEFF' + actualHeader + '\n' + actualRows.join('\n');

    // Generate filename
    const startStr = weekStartDate.toISOString().split('T')[0];
    const endStr = new Date(weekEndDate.getTime() - 1).toISOString().split('T')[0];

    console.log('[export-week] Export successful');

    return new Response(JSON.stringify({
      planCsv,
      actualCsv,
      filename: `hafta_${startStr}_${endStr}`,
      planCount: planItems?.length || 0,
      actualCount: actualEntries?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[export-week] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
