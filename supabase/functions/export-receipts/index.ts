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

    // Calculate totals for stats
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
      return { total, vatTotal, reportTotal, foreignCount, foreignByUSD, foreignByEUR, count: items.length };
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
        { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 14 }, { wch: 14 },
        { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
        { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 25 }, { wch: 30 },
      ];

      return sheet;
    };

    // ===== HELPER: Create foreign receipts sheet =====
    const createForeignSheet = (items: Receipt[]) => {
      const headers = ['Belge Türü', 'Tarih', 'Belge No', 'Satıcı/Alıcı', 'VKN', 'Orijinal Para Birimi', 'Orijinal Tutar', 'TRY Karşılığı', 'Kategori', 'Rapora Dahil', 'Dosya Adı'];

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
        
        return [
          docTypeLabel,
          formatDate(r.receipt_date),
          r.receipt_no || '',
          partyName,
          partyTaxNo,
          r.original_currency || r.currency || 'USD',
          r.original_amount || r.total_amount || 0,
          r.total_amount || 0,
          r.category?.name || '',
          r.is_included_in_report ? 'Evet' : 'Hayır',
          r.file_name || ''
        ];
      });

      const sheetData = [headers, ...rows];
      const sheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      sheet['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 14 },
        { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 30 },
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
        ['Toplam TRY Karşılığı:', foreignStats.total],
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
      const invoiceStats = calcStats(exportInvoices);
      totalExported = exportInvoices.length;

      const summaryData = [
        ['ALINAN FATURALAR RAPORU'],
        [],
        ['Rapor Bilgileri'],
        ['Yıl:', year],
        ['Oluşturma Tarihi:', todayStr],
        ['Kullanıcı:', `${profile?.first_name || ''} ${profile?.last_name || ''}`],
        [],
        ['İSTATİSTİKLER'],
        ['Toplam Fatura Sayısı:', exportInvoices.length],
        ['Toplam Tutar:', invoiceStats.total],
        ['Rapora Dahil:', invoiceStats.reportTotal],
        ['Toplam KDV:', invoiceStats.vatTotal],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

      const invoicesSheet = createReceiptSheet(exportInvoices, true);
      XLSX.utils.book_append_sheet(workbook, invoicesSheet, 'Alınan Faturalar');

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
