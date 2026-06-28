import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PARALLEL = 5;
const INVOICE_NO_REGEX = /(?:Fatura\s*No|Invoice\s*No|Belge\s*No)\s*[:：]?\s*([A-Z0-9\-_/]{4,})/i;

interface PageResult {
  page: number;
  invoiceNo: string | null;
  success: boolean;
  result?: Record<string, any>;
  error?: string;
  fileName: string;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfUrl, documentType = 'received', originalFileName = 'document.pdf' } = await req.json();
    if (!pdfUrl) throw new Error('pdfUrl gerekli');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    console.log(`Fetching PDF: ${pdfUrl.substring(0, 100)}...`);
    const pdfResp = await fetch(pdfUrl);
    if (!pdfResp.ok) throw new Error(`PDF indirilemedi: ${pdfResp.status}`);
    const pdfBytes = new Uint8Array(await pdfResp.arrayBuffer());

    // --- 1) Detect invoice count via text extraction ---
    const pdfProxy = await getDocumentProxy(pdfBytes);
    const totalPages: number = pdfProxy.numPages;
    console.log(`PDF page count: ${totalPages}`);

    const perPageInvoiceNo: (string | null)[] = [];
    let invoiceCount = 0;

    const { text } = await extractText(pdfProxy, { mergePages: false });
    const pages: string[] = Array.isArray(text) ? text : [String(text || '')];

    for (let i = 0; i < totalPages; i++) {
      const pageText = pages[i] || '';
      const match = pageText.match(INVOICE_NO_REGEX);
      const invoiceNo = match ? match[1].trim() : null;
      perPageInvoiceNo.push(invoiceNo);
      if (invoiceNo) invoiceCount++;
    }

    console.log(`Detected ${invoiceCount} invoice markers across ${totalPages} pages`);

    if (invoiceCount < 2) {
      return new Response(JSON.stringify({
        isMultiInvoice: false,
        pageCount: totalPages,
        invoiceCount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- 2) Split PDF into per-page documents ---
    const srcPdf = await PDFDocument.load(pdfBytes);
    const baseName = originalFileName.replace(/\.pdf$/i, '');

    const splitPages: { pageIndex: number; base64: string; invoiceNo: string | null; fileName: string }[] = [];
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copied] = await newPdf.copyPages(srcPdf, [i]);
      newPdf.addPage(copied);
      const bytes = await newPdf.save();
      splitPages.push({
        pageIndex: i,
        base64: uint8ToBase64(bytes),
        invoiceNo: perPageInvoiceNo[i],
        fileName: `${baseName}_p${i + 1}${perPageInvoiceNo[i] ? `_${perPageInvoiceNo[i]}` : ''}.pdf`,
      });
    }

    // --- 3) Parse each page in parallel batches of 5 ---
    const results: PageResult[] = [];

    for (let g = 0; g < splitPages.length; g += PARALLEL) {
      const group = splitPages.slice(g, g + PARALLEL);
      const groupResults = await Promise.all(group.map(async (p): Promise<PageResult> => {
        const dataUrl = `data:application/pdf;base64,${p.base64}`;
        try {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/parse-receipt`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl: dataUrl, documentType }),
          });

          if (!resp.ok) {
            const errText = await resp.text();
            return {
              page: p.pageIndex + 1,
              invoiceNo: p.invoiceNo,
              success: false,
              error: `parse-receipt ${resp.status}: ${errText.slice(0, 200)}`,
              fileName: p.fileName,
            };
          }

          const data = await resp.json();
          return {
            page: p.pageIndex + 1,
            invoiceNo: p.invoiceNo,
            success: true,
            result: data.result,
            fileName: p.fileName,
          };
        } catch (e) {
          return {
            page: p.pageIndex + 1,
            invoiceNo: p.invoiceNo,
            success: false,
            error: e instanceof Error ? e.message : String(e),
            fileName: p.fileName,
          };
        }
      }));
      results.push(...groupResults);
      console.log(`Processed pages ${g + 1}-${g + group.length}/${totalPages}`);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Done: ${successCount}/${totalPages} pages parsed successfully`);

    return new Response(JSON.stringify({
      isMultiInvoice: true,
      pageCount: totalPages,
      invoiceCount,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: results.length - successCount,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('process-multi-invoice-pdf error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'PDF işleme hatası',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
