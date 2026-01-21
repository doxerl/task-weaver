import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback exchange rates (same as useExchangeRates.ts)
const FALLBACK_USD_TRY: Record<string, number> = {
  '2024-1': 30.12, '2024-2': 30.85, '2024-3': 32.14, '2024-4': 32.34, 
  '2024-5': 32.24, '2024-6': 32.53, '2024-7': 32.93, '2024-8': 33.59, 
  '2024-9': 34.05, '2024-10': 34.24, '2024-11': 34.49, '2024-12': 34.86,
  '2025-1': 35.44, '2025-2': 36.07, '2025-3': 36.42, '2025-4': 38.00, 
  '2025-5': 38.50, '2025-6': 39.00, '2025-7': 39.50, '2025-8': 40.00, 
  '2025-9': 40.50, '2025-10': 41.00, '2025-11': 41.50, '2025-12': 42.00,
  '2026-1': 43.00, '2026-2': 43.50, '2026-3': 44.00, '2026-4': 44.50, 
  '2026-5': 45.00, '2026-6': 45.50, '2026-7': 46.00, '2026-8': 46.50, 
  '2026-9': 47.00, '2026-10': 47.50, '2026-11': 48.00, '2026-12': 48.50,
};

const FALLBACK_EUR_TRY: Record<string, number> = {
  '2024-1': 32.83, '2024-2': 33.32, '2024-3': 34.82, '2024-4': 34.40, 
  '2024-5': 34.96, '2024-6': 34.95, '2024-7': 35.66, '2024-8': 37.17, 
  '2024-9': 37.79, '2024-10': 37.32, '2024-11': 36.37, '2024-12': 36.55,
  '2025-1': 36.64, '2025-2': 37.52, '2025-3': 39.50, '2025-4': 43.40, 
  '2025-5': 43.84, '2025-6': 44.50, '2025-7': 45.00, '2025-8': 45.50, 
  '2025-9': 46.00, '2025-10': 46.50, '2025-11': 47.00, '2025-12': 47.50,
  '2026-1': 48.00, '2026-2': 48.50, '2026-3': 49.00, '2026-4': 49.50, 
  '2026-5': 50.00, '2026-6': 50.50, '2026-7': 51.00, '2026-8': 51.50, 
  '2026-9': 52.00, '2026-10': 52.50, '2026-11': 53.00, '2026-12': 53.50,
};

// Get exchange rate for a specific currency, year and month
function getExchangeRate(currency: string, year: number, month: number): number | null {
  const key = `${year}-${month}`;
  if (currency === 'USD') return FALLBACK_USD_TRY[key] || null;
  if (currency === 'EUR') return FALLBACK_EUR_TRY[key] || null;
  return null;
}

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
  amount_try: number | null;
  exchange_rate_used: number | null;
  is_foreign_invoice: boolean | null;
  is_included_in_report: boolean | null;
  notes: string | null;
  file_name: string | null;
  category?: { name: string } | null;
}

type FilterType = 'all' | 'slip' | 'invoice' | 'issued' | 'foreign';

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

    const { year, filter = 'all' } = await req.json();
    if (!year) {
      throw new Error('Year is required');
    }

    const filterType = filter as FilterType;

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
        total_amount, currency, original_currency, original_amount, amount_try, exchange_rate_used,
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
    const foreignAll = allReceipts.filter(r => r.is_foreign_invoice || (r.currency && r.currency !== 'TRY'));

    // Determine which data to export based on filter
    let exportSlips: Receipt[] = [];
    let exportInvoices: Receipt[] = [];
    let exportIssued: Receipt[] = [];
    let exportForeign: Receipt[] = [];

    switch (filterType) {
      case 'slip':
        exportSlips = slips;
        break;
      case 'invoice':
        exportInvoices = invoices;
        break;
      case 'issued':
        exportIssued = issued;
        break;
      case 'foreign':
        exportForeign = foreignAll;
        break;
      case 'all':
      default:
        exportSlips = slips;
        exportInvoices = invoices;
        exportIssued = issued;
        break;
    }

    // Helper to calculate TRY amount for foreign receipt
    const calculateTryAmount = (r: Receipt): { tryAmount: number; rate: number | null } => {
      const isForeign = r.is_foreign_invoice || (r.currency && r.currency !== 'TRY');
      if (!isForeign) return { tryAmount: r.total_amount || 0, rate: null };
      
      // Use stored amount_try if available
      if (r.amount_try) {
        return { tryAmount: r.amount_try, rate: r.exchange_rate_used || null };
      }
      
      // Calculate using exchange rate
      const currency = r.original_currency || r.currency || 'USD';
      const originalAmount = r.original_amount || r.total_amount || 0;
      
      if (r.receipt_date) {
        const receiptDate = new Date(r.receipt_date);
        const receiptYear = receiptDate.getFullYear();
        const receiptMonth = receiptDate.getMonth() + 1;
        const rate = getExchangeRate(currency, receiptYear, receiptMonth);
        if (rate) {
          return { tryAmount: originalAmount * rate, rate };
        }
      }
      
      // Fallback to total_amount if no rate found
      return { tryAmount: r.total_amount || 0, rate: null };
    };

    // Calculate totals for stats
    const calcStats = (items: Receipt[]) => {
      const total = items.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const vatTotal = items.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
      const reportTotal = items.filter(r => r.is_included_in_report)
        .reduce((sum, r) => sum + (r.total_amount || 0), 0);
      
      // Calculate foreign totals with proper TRY conversion
      const foreignItems = items.filter(r => r.is_foreign_invoice);
      let foreignTRYTotal = 0;
      let foreignByUSD = 0;
      let foreignByEUR = 0;
      
      foreignItems.forEach(r => {
        const currency = r.original_currency || r.currency || 'USD';
        const originalAmount = r.original_amount || r.total_amount || 0;
        const { tryAmount } = calculateTryAmount(r);
        
        foreignTRYTotal += tryAmount;
        if (currency === 'USD') foreignByUSD += originalAmount;
        if (currency === 'EUR') foreignByEUR += originalAmount;
      });
      
      return { 
        total, 
        vatTotal, 
        reportTotal, 
        foreignCount: foreignItems.length, 
        foreignTRYTotal,
        foreignByUSD, 
        foreignByEUR, 
        count: items.length 
      };
    };

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

    // ===== HELPER: Create receipt sheet =====
    const createReceiptSheet = (items: Receipt[], isReceived: boolean) => {
      const headers = isReceived 
        ? ['Tarih', 'Fiş/Fatura No', 'Satıcı Adı', 'Satıcı VKN', 'Ara Toplam', 'KDV %', 'KDV Tutarı', 'Stopaj', 'Toplam', 'Para Birimi', 'Orijinal Tutar', 'Kullanılan Kur', 'TRY Karşılığı', 'Yurtdışı', 'Kategori', 'Rapora Dahil', 'Notlar', 'Dosya Adı']
        : ['Tarih', 'Fatura No', 'Alıcı Adı', 'Alıcı VKN', 'Ara Toplam', 'KDV %', 'KDV Tutarı', 'Stopaj Kesintisi', 'Net Tutar', 'Para Birimi', 'Orijinal Tutar', 'Kullanılan Kur', 'TRY Karşılığı', 'Yurtdışı', 'Kategori', 'Rapora Dahil', 'Notlar', 'Dosya Adı'];

      const rows = items.map(r => {
        const isForeign = r.is_foreign_invoice || (r.currency && r.currency !== 'TRY');
        const displayCurrency = isForeign ? (r.original_currency || r.currency || 'USD') : 'TRY';
        const originalAmount = isForeign ? (r.original_amount || r.total_amount || 0) : null;
        const { tryAmount, rate } = calculateTryAmount(r);
        
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
          isForeign ? (rate || '-') : '-',
          isForeign ? tryAmount : (r.total_amount || 0),
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
          isForeign ? (rate || '-') : '-',
          isForeign ? tryAmount : (r.total_amount || 0),
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
        { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 14 }, { wch: 14 },
        { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 25 }, { wch: 30 },
      ];

      return sheet;
    };

    // ===== HELPER: Create foreign receipts sheet =====
    const createForeignSheet = (items: Receipt[]) => {
      const headers = ['Belge Türü', 'Tarih', 'Belge No', 'Satıcı/Alıcı', 'VKN', 'Orijinal Para Birimi', 'Orijinal Tutar', 'Kullanılan Kur', 'TRY Karşılığı', 'Kategori', 'Rapora Dahil', 'Dosya Adı'];

      const rows = items.map(r => {
        const isReceived = r.document_type !== 'issued';
        const docTypeLabel = r.document_type === 'issued' ? 'Kesilen Fatura' 
          : r.receipt_subtype === 'invoice' ? 'Alınan Fatura' : 'Alınan Fiş';
        const partyName = isReceived 
          ? (r.seller_name || r.vendor_name || '') 
          : (r.buyer_name || '');
        const partyTaxNo = isReceived 
          ? (r.seller_tax_no || r.vendor_tax_no || '') 
          : (r.buyer_tax_no || '');
        
        const currency = r.original_currency || r.currency || 'USD';
        const originalAmount = r.original_amount || r.total_amount || 0;
        const { tryAmount, rate } = calculateTryAmount(r);
        
        return [
          docTypeLabel,
          formatDate(r.receipt_date),
          r.receipt_no || '',
          partyName,
          partyTaxNo,
          currency,
          originalAmount,
          rate || '-',
          tryAmount,
          r.category?.name || '',
          r.is_included_in_report ? 'Evet' : 'Hayır',
          r.file_name || ''
        ];
      });

      const sheetData = [headers, ...rows];
      const sheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      sheet['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 14 },
        { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 30 },
      ];

      return sheet;
    };

    // ===== BUILD SHEETS BASED ON FILTER =====
    let filename = '';
    let totalExported = 0;

    if (filterType === 'foreign') {
      // Foreign only export
      const foreignStats = calcStats(exportForeign);
      totalExported = exportForeign.length;
      
      // Summary for foreign
      const summaryData = [
        ['YURTDIŞI FATURA RAPORU'],
        [],
        ['Rapor Bilgileri'],
        ['Yıl:', year],
        ['Oluşturma Tarihi:', todayStr],
        ['Kullanıcı:', `${profile?.first_name || ''} ${profile?.last_name || ''}`],
        [],
        ['İSTATİSTİKLER'],
        ['Toplam Belge Sayısı:', exportForeign.length],
        ['Toplam TRY Karşılığı:', foreignStats.foreignTRYTotal],
        ['USD Toplam:', foreignStats.foreignByUSD],
        ['EUR Toplam:', foreignStats.foreignByEUR],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

      const foreignSheet = createForeignSheet(exportForeign);
      XLSX.utils.book_append_sheet(workbook, foreignSheet, 'Yurtdışı Faturalar');
      
      filename = `YurtdisiFaturalar_${year}_${todayStr.replace(/\./g, '-')}`;

    } else if (filterType === 'slip') {
      const slipStats = calcStats(exportSlips);
      totalExported = exportSlips.length;

      const summaryData = [
        ['ALINAN FİŞLER RAPORU'],
        [],
        ['Rapor Bilgileri'],
        ['Yıl:', year],
        ['Oluşturma Tarihi:', todayStr],
        ['Kullanıcı:', `${profile?.first_name || ''} ${profile?.last_name || ''}`],
        [],
        ['İSTATİSTİKLER'],
        ['Toplam Fiş Sayısı:', exportSlips.length],
        ['Toplam Tutar:', slipStats.total],
        ['Rapora Dahil:', slipStats.reportTotal],
        ['Toplam KDV:', slipStats.vatTotal],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

      const slipsSheet = createReceiptSheet(exportSlips, true);
      XLSX.utils.book_append_sheet(workbook, slipsSheet, 'Alınan Fişler');

      filename = `AlinanFisler_${year}_${todayStr.replace(/\./g, '-')}`;

    } else if (filterType === 'invoice') {
      // Separate domestic and foreign invoices
      const domesticInvoices = exportInvoices.filter(
        r => !r.is_foreign_invoice && (!r.currency || r.currency === 'TRY')
      );
      const foreignInvoices = exportInvoices.filter(
        r => r.is_foreign_invoice || (r.currency && r.currency !== 'TRY')
      );
      
      totalExported = exportInvoices.length;
      
      // Calculate domestic stats with VAT breakdown
      let domesticSubtotal = 0;
      let domesticVat = 0;
      let domesticTotal = 0;
      domesticInvoices.forEach(r => {
        const vat = r.vat_amount || 0;
        const subtotal = r.subtotal || ((r.total_amount || 0) - vat);
        domesticSubtotal += subtotal;
        domesticVat += vat;
        domesticTotal += r.total_amount || 0;
      });
      
      // Calculate foreign stats by currency
      const foreignByCurrency: Record<string, { amount: number; tryAmount: number }> = {};
      let foreignTotalTRY = 0;
      foreignInvoices.forEach(r => {
        const curr = r.original_currency || r.currency || 'USD';
        const originalAmt = r.original_amount || r.total_amount || 0;
        
        if (!foreignByCurrency[curr]) {
          foreignByCurrency[curr] = { amount: 0, tryAmount: 0 };
        }
        foreignByCurrency[curr].amount += originalAmt;
        
        // Calculate TRY equivalent
        const { tryAmount } = calculateTryAmount(r);
        foreignByCurrency[curr].tryAmount += tryAmount;
        foreignTotalTRY += tryAmount;
      });
      
      // Build summary sheet
      const summaryData: (string | number)[][] = [
        ['ALINAN FATURALAR RAPORU'],
        [''],
        ['Yıl:', year],
        ['Oluşturma Tarihi:', todayStr],
        ['Kullanıcı:', `${profile?.first_name || ''} ${profile?.last_name || ''}`],
        [''],
        ['═══════════════════════════════════════'],
        [''],
        ['YURTİÇİ FATURALAR'],
        ['Fatura Sayısı:', domesticInvoices.length],
        ['Matrah (KDV Hariç):', domesticSubtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺'],
        ['KDV Tutarı:', domesticVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺'],
        ['Toplam:', domesticTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺'],
        [''],
        ['═══════════════════════════════════════'],
        [''],
        ['YURTDIŞI FATURALAR'],
        ['Fatura Sayısı:', foreignInvoices.length],
      ];
      
      // Add currency breakdown
      Object.entries(foreignByCurrency).forEach(([curr, data]) => {
        const symbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr;
        summaryData.push([
          `${curr} Toplam:`,
          `${symbol}${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        ]);
      });
      summaryData.push(['TRY Karşılığı:', foreignTotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺']);
      
      summaryData.push(['']);
      summaryData.push(['═══════════════════════════════════════']);
      summaryData.push(['']);
      summaryData.push(['GENEL TOPLAM (TRY):', (domesticTotal + foreignTotalTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺']);
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');
      
      // Create domestic invoices sheet - ALWAYS create it
      const domesticHeaders = ['Tarih', 'Fatura No', 'Satıcı Adı', 'Satıcı VKN', 'Matrah', 'KDV %', 'KDV Tutarı', 'Toplam', 'Kategori', 'Rapora Dahil', 'Dosya Adı'];
      const domesticRows = domesticInvoices.map(r => [
        formatDate(r.receipt_date),
        r.receipt_no || '',
        r.seller_name || r.vendor_name || '',
        r.seller_tax_no || r.vendor_tax_no || '',
        r.subtotal || ((r.total_amount || 0) - (r.vat_amount || 0)),
        r.vat_rate || 0,
        r.vat_amount || 0,
        r.total_amount || 0,
        r.category?.name || '',
        r.is_included_in_report ? 'Evet' : 'Hayır',
        r.file_name || ''
      ]);
      const domesticSheet = XLSX.utils.aoa_to_sheet([domesticHeaders, ...domesticRows]);
      domesticSheet['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 14 }, { wch: 14 },
        { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(workbook, domesticSheet, 'Yurtiçi Faturalar');
      
      // Create foreign invoices sheet - ALWAYS create it
      const foreignHeaders = ['Tarih', 'Fatura No', 'Satıcı Adı', 'Para Birimi', 'Orijinal Tutar', 'Kullanılan Kur', 'TRY Karşılığı', 'Kategori', 'Rapora Dahil', 'Dosya Adı'];
      const foreignRows = foreignInvoices.map(r => {
        const currency = r.original_currency || r.currency || 'USD';
        const originalAmount = r.original_amount || r.total_amount || 0;
        const { tryAmount, rate } = calculateTryAmount(r);
        return [
          formatDate(r.receipt_date),
          r.receipt_no || '',
          r.seller_name || r.vendor_name || '',
          currency,
          originalAmount,
          rate || '-',
          tryAmount,
          r.category?.name || '',
          r.is_included_in_report ? 'Evet' : 'Hayır',
          r.file_name || ''
        ];
      });
      const foreignSheet = XLSX.utils.aoa_to_sheet([foreignHeaders, ...foreignRows]);
      foreignSheet['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(workbook, foreignSheet, 'Yurtdışı Faturalar');

      filename = `AlinanFaturalar_${year}_${todayStr.replace(/\./g, '-')}`;

    } else if (filterType === 'issued') {
      const issuedStats = calcStats(exportIssued);
      totalExported = exportIssued.length;

      const summaryData = [
        ['KESİLEN FATURALAR RAPORU'],
        [],
        ['Rapor Bilgileri'],
        ['Yıl:', year],
        ['Oluşturma Tarihi:', todayStr],
        ['Kullanıcı:', `${profile?.first_name || ''} ${profile?.last_name || ''}`],
        [],
        ['İSTATİSTİKLER'],
        ['Toplam Fatura Sayısı:', exportIssued.length],
        ['Toplam Tutar:', issuedStats.total],
        ['Rapora Dahil:', issuedStats.reportTotal],
        ['Toplam KDV:', issuedStats.vatTotal],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

      const issuedSheet = createReceiptSheet(exportIssued, false);
      XLSX.utils.book_append_sheet(workbook, issuedSheet, 'Kesilen Faturalar');

      filename = `KesilenFaturalar_${year}_${todayStr.replace(/\./g, '-')}`;

    } else {
      // ALL - default behavior
      const slipStats = calcStats(exportSlips);
      const invoiceStats = calcStats(exportInvoices);
      const issuedStats = calcStats(exportIssued);
      totalExported = exportSlips.length + exportInvoices.length + exportIssued.length;

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
        ['Alınan Fişler', slipStats.count, slipStats.total, slipStats.reportTotal, slipStats.vatTotal],
        ['Alınan Faturalar', invoiceStats.count, invoiceStats.total, invoiceStats.reportTotal, invoiceStats.vatTotal],
        ['Kesilen Faturalar', issuedStats.count, issuedStats.total, issuedStats.reportTotal, issuedStats.vatTotal],
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
        ['Toplam TRY Karşılığı:', slipStats.foreignTRYTotal + invoiceStats.foreignTRYTotal + issuedStats.foreignTRYTotal],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

      const slipsSheet = createReceiptSheet(exportSlips, true);
      XLSX.utils.book_append_sheet(workbook, slipsSheet, 'Alınan Fişler');

      const invoicesSheet = createReceiptSheet(exportInvoices, true);
      XLSX.utils.book_append_sheet(workbook, invoicesSheet, 'Alınan Faturalar');

      const issuedSheet = createReceiptSheet(exportIssued, false);
      XLSX.utils.book_append_sheet(workbook, issuedSheet, 'Kesilen Faturalar');

      filename = `FisFaturalar_${year}_${todayStr.replace(/\./g, '-')}`;
    }

    // Generate XLSX buffer
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(xlsxBuffer)));

    return new Response(
      JSON.stringify({
        xlsxBase64: base64,
        filename,
        stats: {
          total: totalExported,
          filter: filterType
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
