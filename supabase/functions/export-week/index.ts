import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ISO hafta numarası hesaplama
function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Türkçe gün isimleri
const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

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

    const weekNumber = getWeekNumber(weekStartDate);
    const year = weekStartDate.getFullYear();

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

    // Helper functions
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('tr-TR');
    };

    const formatTime = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    // Group data by day
    const dayData: { [key: number]: { plans: any[], actuals: any[] } } = {};
    for (let i = 0; i < 7; i++) {
      dayData[i] = { plans: [], actuals: [] };
    }

    (planItems || []).forEach(item => {
      const itemDate = new Date(item.start_at);
      const dayOfWeek = (itemDate.getDay() + 6) % 7; // Convert to Monday=0
      dayData[dayOfWeek].plans.push(item);
    });

    (actualEntries || []).forEach(entry => {
      const entryDate = new Date(entry.start_at);
      const dayOfWeek = (entryDate.getDay() + 6) % 7; // Convert to Monday=0
      dayData[dayOfWeek].actuals.push(entry);
    });

    // Calculate stats
    const totalPlans = planItems?.length || 0;
    const totalActuals = actualEntries?.length || 0;
    const completedPlans = (planItems || []).filter(p => p.status === 'completed').length;
    const skippedPlans = (planItems || []).filter(p => p.status === 'skipped').length;
    const pendingPlans = totalPlans - completedPlans - skippedPlans;
    const complianceRate = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;
    const activeDays = Object.values(dayData).filter(d => d.plans.length > 0 || d.actuals.length > 0).length;

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // ========== ÖZET SHEET ==========
    const summaryData = [
      ['HAFTALIK RAPOR'],
      [],
      ['Hafta', `${weekNumber}. Hafta`],
      ['Yıl', year.toString()],
      ['Tarih Aralığı', `${formatDate(weekStartDate.toISOString())} - ${formatDate(new Date(weekEndDate.getTime() - 1).toISOString())}`],
      [],
      ['İSTATİSTİKLER'],
      [],
      ['Toplam Plan', totalPlans],
      ['Tamamlanan', completedPlans],
      ['Atlanan', skippedPlans],
      ['Bekleyen', pendingPlans],
      [],
      ['Toplam Gerçekleşen', totalActuals],
      ['Aktif Gün', activeDays],
      ['Uyum Oranı', `%${complianceRate}`],
      [],
      ['GÜN BAZLI ÖZET'],
      [],
      ['Gün', 'Tarih', 'Plan Sayısı', 'Gerçekleşen Sayısı']
    ];

    // Add daily summary
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(dayDate.getDate() + i);
      summaryData.push([
        dayNames[i],
        formatDate(dayDate.toISOString()),
        dayData[i].plans.length,
        dayData[i].actuals.length
      ]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths for summary
    summarySheet['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

    // ========== GÜN SHEET'LERİ ==========
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(dayDate.getDate() + i);
      
      const plans = dayData[i].plans;
      const actuals = dayData[i].actuals;
      
      const maxRows = Math.max(plans.length, actuals.length, 1);
      
      const daySheetData: any[][] = [
        [`${dayNames[i]} - ${formatDate(dayDate.toISOString())}`],
        [],
        ['PLANLANAN', '', '', '', '', '', 'GERÇEKLEŞEN', '', '', ''],
        ['Saat', 'Bitiş', 'Başlık', 'Tip', 'Öncelik', 'Durum', 'Saat', 'Bitiş', 'Başlık', 'Kaynak']
      ];

      for (let row = 0; row < maxRows; row++) {
        const plan = plans[row];
        const actual = actuals[row];
        
        const rowData = [
          plan ? formatTime(plan.start_at) : '',
          plan ? formatTime(plan.end_at) : '',
          plan ? plan.title : '',
          plan ? (plan.type || '') : '',
          plan ? (plan.priority || '') : '',
          plan ? (plan.status || '') : '',
          actual ? formatTime(actual.start_at) : '',
          actual ? formatTime(actual.end_at) : '',
          actual ? actual.title : '',
          actual ? (actual.source || '') : ''
        ];
        
        daySheetData.push(rowData);
      }

      const daySheet = XLSX.utils.aoa_to_sheet(daySheetData);
      
      // Set column widths for day sheet
      daySheet['!cols'] = [
        { wch: 8 },   // Plan Saat
        { wch: 8 },   // Plan Bitiş
        { wch: 30 },  // Plan Başlık
        { wch: 10 },  // Tip
        { wch: 10 },  // Öncelik
        { wch: 12 },  // Durum
        { wch: 8 },   // Actual Saat
        { wch: 8 },   // Actual Bitiş
        { wch: 30 },  // Actual Başlık
        { wch: 12 }   // Kaynak
      ];

      // Merge header cell
      daySheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Day title
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // PLANLANAN
        { s: { r: 2, c: 6 }, e: { r: 2, c: 9 } }  // GERÇEKLEŞEN
      ];

      XLSX.utils.book_append_sheet(workbook, daySheet, dayNames[i]);
    }

    // Generate buffer
    const xlsxBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    
    // Convert to base64
    const uint8Array = new Uint8Array(xlsxBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binaryString);

    const filename = `${weekNumber}.Hafta_${year}`;

    console.log('[export-week] XLSX export successful');

    return new Response(JSON.stringify({
      xlsxBase64: base64,
      filename,
      weekNumber,
      year,
      planCount: totalPlans,
      actualCount: totalActuals
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
