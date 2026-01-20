import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Receipt {
  id: string;
  receipt_date: string | null;
  receipt_no: string | null;
  document_type: string | null;
  receipt_subtype: string | null;
  seller_name: string | null;
  seller_tax_no: string | null;
  vendor_name: string | null;
  vendor_tax_no: string | null;
  buyer_name: string | null;
  buyer_tax_no: string | null;
  subtotal: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  withholding_tax_amount: number | null;
  withholding_tax_rate: number | null;
  total_amount: number | null;
  currency: string | null;
  original_currency: string | null;
  original_amount: number | null;
  is_foreign_invoice: boolean | null;
  is_included_in_report: boolean | null;
  notes: string | null;
  file_name: string | null;
  category?: { name: string } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { year } = await req.json();
    if (!year) {
      throw new Error('Year is required');
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    // Fetch receipts with category (specify foreign key to avoid ambiguity)
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select(`
        id, receipt_date, receipt_no, document_type, receipt_subtype,
        seller_name, seller_tax_no, vendor_name, vendor_tax_no,
        buyer_name, buyer_tax_no,
        subtotal, vat_rate, vat_amount, withholding_tax_amount, withholding_tax_rate,
        total_amount, currency, original_currency, original_amount,
        is_foreign_invoice, is_included_in_report, notes, file_name,
        category:transaction_categories!receipts_category_id_fkey(name)
      `)
      .eq('user_id', user.id)
      .eq('year', year)
      .order('receipt_date', { ascending: false });

    if (receiptsError) {
      throw receiptsError;
    }

    // Map and fix category structure (Supabase returns array, we need single object)
    const allReceipts: Receipt[] = (receipts || []).map((r: any) => ({
      ...r,
      category: Array.isArray(r.category) && r.category.length > 0 ? r.category[0] : r.category
    }));

    // Separate by type
    const slips = allReceipts.filter(r => r.document_type !== 'issued' && r.receipt_subtype !== 'invoice');
    const invoices = allReceipts.filter(r => r.document_type !== 'issued' && r.receipt_subtype === 'invoice');
    const issued = allReceipts.filter(r => r.document_type === 'issued');

    // Calculate totals
    const calcStats = (items: Receipt[]) => {
      const total = items.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const vatTotal = items.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
      const reportTotal = items.filter(r => r.is_included_in_report)
        .reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const foreignCount = items.filter(r => r.is_foreign_invoice).length;
      const foreignByUSD = items.filter(r => r.is_foreign_invoice && (r.original_currency || r.currency) === 'USD')
        .reduce((sum, r) => sum + (r.original_amount || r.total_amount || 0), 0);
      const foreignByEUR = items.filter(r => r.is_foreign_invoice && (r.original_currency || r.currency) === 'EUR')
        .reduce((sum, r) => sum + (r.original_amount || r.total_amount || 0), 0);
      return { total, vatTotal, reportTotal, foreignCount, foreignByUSD, foreignByEUR };
    };

    const slipStats = calcStats(slips);
    const invoiceStats = calcStats(invoices);
    const issuedStats = calcStats(issued);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Format date
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
    };

    const today = new Date();
    const todayStr = formatDate(today.toISOString());

    // ===== ÖZET SHEET =====
    const summaryData = [
      ['FİŞ/FATURA RAPORU'],
      [],
      ['Rapor Bilgileri'],
      ['Yıl:', year],
      ['Oluşturma Tarihi:', todayStr],
      ['Kullanıcı:', `${profile?.first_name || ''} ${profile?.last_name || ''}`],
      [],
      ['GENEL İSTATİSTİKLER'],
      ['', 'Adet', 'Toplam Tutar', 'Rapora Dahil', 'Toplam KDV'],
      ['Alınan Fişler', slips.length, slipStats.total, slipStats.reportTotal, slipStats.vatTotal],
      ['Alınan Faturalar', invoices.length, invoiceStats.total, invoiceStats.reportTotal, invoiceStats.vatTotal],
      ['Kesilen Faturalar', issued.length, issuedStats.total, issuedStats.reportTotal, issuedStats.vatTotal],
      [],
      ['KDV ÖZETİ'],
      ['Ödenen KDV (Gider):', slipStats.vatTotal + invoiceStats.vatTotal],
      ['Hesaplanan KDV (Gelir):', issuedStats.vatTotal],
      ['Net KDV Durumu:', issuedStats.vatTotal - (slipStats.vatTotal + invoiceStats.vatTotal)],
      [],
      ['YURTDIŞI FATURA ÖZETİ'],
      ['Toplam Yurtdışı Fatura:', slipStats.foreignCount + invoiceStats.foreignCount + issuedStats.foreignCount],
      ['USD Toplam:', slipStats.foreignByUSD + invoiceStats.foreignByUSD + issuedStats.foreignByUSD],
      ['EUR Toplam:', slipStats.foreignByEUR + invoiceStats.foreignByEUR + issuedStats.foreignByEUR],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths for summary
    summarySheet['!cols'] = [
      { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

    // ===== HELPER: Create receipt sheet =====
    const createReceiptSheet = (items: Receipt[], isReceived: boolean) => {
      const headers = isReceived 
        ? ['Tarih', 'Fiş/Fatura No', 'Satıcı Adı', 'Satıcı VKN', 'Ara Toplam', 'KDV %', 'KDV Tutarı', 'Stopaj', 'Toplam', 'Para Birimi', 'Orijinal Tutar', 'Yurtdışı', 'Kategori', 'Rapora Dahil', 'Notlar', 'Dosya Adı']
        : ['Tarih', 'Fatura No', 'Alıcı Adı', 'Alıcı VKN', 'Ara Toplam', 'KDV %', 'KDV Tutarı', 'Stopaj Kesintisi', 'Net Tutar', 'Para Birimi', 'Orijinal Tutar', 'Yurtdışı', 'Kategori', 'Rapora Dahil', 'Notlar', 'Dosya Adı'];

      const rows = items.map(r => {
        const isForeign = r.is_foreign_invoice || (r.currency && r.currency !== 'TRY');
        const displayCurrency = isForeign ? (r.original_currency || r.currency || 'USD') : 'TRY';
        const originalAmount = isForeign ? (r.original_amount || r.total_amount || 0) : null;
        
        return isReceived ? [
          formatDate(r.receipt_date),
          r.receipt_no || '',
          r.seller_name || r.vendor_name || '',
          r.seller_tax_no || r.vendor_tax_no || '',
          r.subtotal || 0,
          isForeign ? 0 : (r.vat_rate || 0),
          isForeign ? 0 : (r.vat_amount || 0),
          r.withholding_tax_amount || 0,
          r.total_amount || 0,
          displayCurrency,
          originalAmount,
          isForeign ? 'Evet' : 'Hayır',
          r.category?.name || '',
          r.is_included_in_report ? 'Evet' : 'Hayır',
          r.notes || '',
          r.file_name || ''
        ] : [
          formatDate(r.receipt_date),
          r.receipt_no || '',
          r.buyer_name || '',
          r.buyer_tax_no || '',
          r.subtotal || 0,
          r.vat_rate || 0,
          r.vat_amount || 0,
          r.withholding_tax_amount || 0,
          r.total_amount || 0,
          r.currency || 'TRY',
          originalAmount,
          isForeign ? 'Evet' : 'Hayır',
          r.category?.name || '',
          r.is_included_in_report ? 'Evet' : 'Hayır',
          r.notes || '',
          r.file_name || ''
        ];
      });

      const sheetData = [headers, ...rows];
      const sheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Set column widths
      sheet['!cols'] = [
        { wch: 12 }, // Tarih
        { wch: 15 }, // No
        { wch: 25 }, // İsim
        { wch: 14 }, // VKN
        { wch: 14 }, // Ara Toplam
        { wch: 8 },  // KDV %
        { wch: 12 }, // KDV Tutarı
        { wch: 12 }, // Stopaj
        { wch: 14 }, // Toplam
        { wch: 10 }, // Para Birimi
        { wch: 14 }, // Orijinal Tutar
        { wch: 10 }, // Yurtdışı
        { wch: 18 }, // Kategori
        { wch: 12 }, // Rapora Dahil
        { wch: 25 }, // Notlar
        { wch: 30 }, // Dosya Adı
      ];

      return sheet;
    };

    // ===== ALINAN FİŞLER SHEET =====
    const slipsSheet = createReceiptSheet(slips, true);
    XLSX.utils.book_append_sheet(workbook, slipsSheet, 'Alınan Fişler');

    // ===== ALINAN FATURALAR SHEET =====
    const invoicesSheet = createReceiptSheet(invoices, true);
    XLSX.utils.book_append_sheet(workbook, invoicesSheet, 'Alınan Faturalar');

    // ===== KESİLEN FATURALAR SHEET =====
    const issuedSheet = createReceiptSheet(issued, false);
    XLSX.utils.book_append_sheet(workbook, issuedSheet, 'Kesilen Faturalar');

    // Generate XLSX buffer
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(xlsxBuffer)));

    // Generate filename
    const filename = `FisFaturalar_${year}_${todayStr.replace(/\./g, '-')}`;

    return new Response(
      JSON.stringify({
        xlsxBase64: base64,
        filename,
        stats: {
          slips: slips.length,
          invoices: invoices.length,
          issued: issued.length,
          total: allReceipts.length
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
