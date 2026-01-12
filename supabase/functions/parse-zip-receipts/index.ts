import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { unzipSync } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILES = 100;
const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'xml'];

interface ProcessedFile {
  fileName: string;
  success: boolean;
  result?: Record<string, any>;
  error?: string;
  fileType: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zipUrl, documentType = 'received' } = await req.json();
    
    if (!zipUrl) {
      throw new Error('ZIP dosya URL\'si gerekli');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }

    console.log('Fetching ZIP file from:', zipUrl);
    
    // Fetch the ZIP file
    const zipResponse = await fetch(zipUrl);
    if (!zipResponse.ok) {
      throw new Error(`ZIP dosyası indirilemedi: ${zipResponse.status}`);
    }
    
    const zipArrayBuffer = await zipResponse.arrayBuffer();
    const zipData = new Uint8Array(zipArrayBuffer);
    
    console.log('ZIP file size:', zipData.length, 'bytes');
    
    // Unzip the file
    let unzipped: Record<string, Uint8Array>;
    try {
      unzipped = unzipSync(zipData);
    } catch (e) {
      console.error('Unzip error:', e);
      throw new Error('ZIP dosyası açılamadı. Geçerli bir ZIP dosyası olduğundan emin olun.');
    }
    
    const fileNames = Object.keys(unzipped);
    console.log('Files in ZIP:', fileNames.length);
    
    // Filter supported files
    const supportedFiles = fileNames.filter(name => {
      // Skip directories and hidden files
      if (name.endsWith('/') || name.startsWith('.') || name.includes('/__MACOSX')) {
        return false;
      }
      const ext = name.split('.').pop()?.toLowerCase() || '';
      return SUPPORTED_EXTENSIONS.includes(ext);
    });
    
    console.log('Supported files:', supportedFiles.length);
    
    if (supportedFiles.length === 0) {
      throw new Error('ZIP içinde desteklenen dosya bulunamadı. Desteklenen formatlar: JPG, PNG, PDF, XML');
    }
    
    if (supportedFiles.length > MAX_FILES) {
      throw new Error(`ZIP içinde en fazla ${MAX_FILES} dosya işlenebilir. Mevcut: ${supportedFiles.length}`);
    }
    
    const results: ProcessedFile[] = [];
    
    // Process each file sequentially to avoid timeout
    for (const fileName of supportedFiles) {
      const fileData = unzipped[fileName];
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const baseName = fileName.split('/').pop() || fileName;
      
      console.log(`Processing: ${baseName} (${ext})`);
      
      try {
        if (ext === 'xml') {
          // Parse XML directly
          const xmlContent = new TextDecoder().decode(fileData);
          
          const parseResponse = await fetch(`${SUPABASE_URL}/functions/v1/parse-xml-invoice`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ xmlContent }),
          });
          
          if (!parseResponse.ok) {
            const errorText = await parseResponse.text();
            throw new Error(`XML parse failed: ${errorText}`);
          }
          
          const data = await parseResponse.json();
          results.push({
            fileName: baseName,
            success: true,
            result: data.result,
            fileType: 'xml',
          });
          
        } else {
          // For images/PDFs, we need to upload temporarily and call parse-receipt
          // Convert to base64 data URL
          const mimeTypes: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            pdf: 'application/pdf',
          };
          const mimeType = mimeTypes[ext] || 'application/octet-stream';
          
          // Convert to base64
          let binary = '';
          for (let i = 0; i < fileData.length; i++) {
            binary += String.fromCharCode(fileData[i]);
          }
          const base64 = btoa(binary);
          const dataUrl = `data:${mimeType};base64,${base64}`;
          
          // Call parse-receipt with base64 data
          // Note: parse-receipt expects imageUrl but we'll pass dataUrl
          const parseResponse = await fetch(`${SUPABASE_URL}/functions/v1/parse-receipt`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              imageUrl: dataUrl,
              documentType,
            }),
          });
          
          if (!parseResponse.ok) {
            const errorText = await parseResponse.text();
            throw new Error(`OCR failed: ${errorText}`);
          }
          
          const data = await parseResponse.json();
          results.push({
            fileName: baseName,
            success: true,
            result: data.result,
            fileType: ext === 'pdf' ? 'pdf' : 'image',
          });
        }
      } catch (error) {
        console.error(`Error processing ${baseName}:`, error);
        results.push({
          fileName: baseName,
          success: false,
          error: error instanceof Error ? error.message : 'Bilinmeyen hata',
          fileType: ext,
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Processed ${results.length} files, ${successCount} successful`);

    return new Response(JSON.stringify({ 
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: results.length - successCount,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('parse-zip-receipts error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'ZIP işleme hatası' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
