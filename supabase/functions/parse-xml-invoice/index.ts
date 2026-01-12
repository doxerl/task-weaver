import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse Turkish e-Fatura (UBL-TR) XML format
function parseEFatura(xmlContent: string): Record<string, any> {
  const result: Record<string, any> = {
    sellerName: null,
    sellerTaxNo: null,
    sellerAddress: null,
    buyerName: null,
    buyerTaxNo: null,
    buyerAddress: null,
    receiptDate: null,
    receiptNo: null,
    subtotal: null,
    vatRate: null,
    vatAmount: null,
    withholdingTaxRate: null,
    withholdingTaxAmount: null,
    stampTaxAmount: null,
    totalAmount: null,
    currency: 'TRY',
    confidence: 1.0, // XML parsing is 100% accurate
    isEFatura: true,
  };

  try {
    // Helper to extract text between tags
    const extractTag = (content: string, tagName: string): string | null => {
      // Handle namespaced tags like cbc:ID, cac:Party, etc.
      const patterns = [
        new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i'),
        new RegExp(`<cbc:${tagName}[^>]*>([^<]*)</cbc:${tagName}>`, 'i'),
        new RegExp(`<cac:${tagName}[^>]*>([\\s\\S]*?)</cac:${tagName}>`, 'i'),
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      return null;
    };

    // Extract invoice ID/number
    const invoiceId = extractTag(xmlContent, 'ID');
    if (invoiceId) {
      result.receiptNo = invoiceId;
    }

    // Extract issue date
    const issueDate = extractTag(xmlContent, 'IssueDate');
    if (issueDate) {
      // Convert YYYY-MM-DD to DD.MM.YYYY
      const [y, m, d] = issueDate.split('-');
      if (y && m && d) {
        result.receiptDate = `${d}.${m}.${y}`;
      }
    }

    // Extract document currency
    const currencyMatch = xmlContent.match(/currencyID="([A-Z]{3})"/i);
    if (currencyMatch) {
      result.currency = currencyMatch[1];
    }

    // Extract Supplier (Seller) info
    const supplierMatch = xmlContent.match(/<cac:AccountingSupplierParty[^>]*>([\s\S]*?)<\/cac:AccountingSupplierParty>/i);
    if (supplierMatch) {
      const supplierBlock = supplierMatch[1];
      
      // Party name
      const partyName = extractTag(supplierBlock, 'Name');
      if (partyName) {
        result.sellerName = partyName;
      }
      
      // Tax number (VKN)
      const taxSchemeMatch = supplierBlock.match(/<cac:PartyTaxScheme[^>]*>([\s\S]*?)<\/cac:PartyTaxScheme>/i);
      if (taxSchemeMatch) {
        const taxNo = extractTag(taxSchemeMatch[1], 'CompanyID');
        if (taxNo) {
          result.sellerTaxNo = taxNo;
        }
      }
      
      // Alternative: PartyIdentification
      const identMatch = supplierBlock.match(/<cac:PartyIdentification[^>]*>([\s\S]*?)<\/cac:PartyIdentification>/i);
      if (identMatch && !result.sellerTaxNo) {
        const taxNo = extractTag(identMatch[1], 'ID');
        if (taxNo) {
          result.sellerTaxNo = taxNo;
        }
      }
      
      // Address
      const addressMatch = supplierBlock.match(/<cac:PostalAddress[^>]*>([\s\S]*?)<\/cac:PostalAddress>/i);
      if (addressMatch) {
        const streetName = extractTag(addressMatch[1], 'StreetName');
        const cityName = extractTag(addressMatch[1], 'CityName');
        const district = extractTag(addressMatch[1], 'CitySubdivisionName');
        const parts = [streetName, district, cityName].filter(Boolean);
        if (parts.length > 0) {
          result.sellerAddress = parts.join(', ');
        }
      }
    }

    // Extract Customer (Buyer) info
    const customerMatch = xmlContent.match(/<cac:AccountingCustomerParty[^>]*>([\s\S]*?)<\/cac:AccountingCustomerParty>/i);
    if (customerMatch) {
      const customerBlock = customerMatch[1];
      
      // Party name
      const partyName = extractTag(customerBlock, 'Name');
      if (partyName) {
        result.buyerName = partyName;
      }
      
      // Tax number
      const taxSchemeMatch = customerBlock.match(/<cac:PartyTaxScheme[^>]*>([\s\S]*?)<\/cac:PartyTaxScheme>/i);
      if (taxSchemeMatch) {
        const taxNo = extractTag(taxSchemeMatch[1], 'CompanyID');
        if (taxNo) {
          result.buyerTaxNo = taxNo;
        }
      }
      
      // Alternative: PartyIdentification
      const identMatch = customerBlock.match(/<cac:PartyIdentification[^>]*>([\s\S]*?)<\/cac:PartyIdentification>/i);
      if (identMatch && !result.buyerTaxNo) {
        const taxNo = extractTag(identMatch[1], 'ID');
        if (taxNo) {
          result.buyerTaxNo = taxNo;
        }
      }
      
      // Address
      const addressMatch = customerBlock.match(/<cac:PostalAddress[^>]*>([\s\S]*?)<\/cac:PostalAddress>/i);
      if (addressMatch) {
        const streetName = extractTag(addressMatch[1], 'StreetName');
        const cityName = extractTag(addressMatch[1], 'CityName');
        const district = extractTag(addressMatch[1], 'CitySubdivisionName');
        const parts = [streetName, district, cityName].filter(Boolean);
        if (parts.length > 0) {
          result.buyerAddress = parts.join(', ');
        }
      }
    }

    // Extract Tax totals
    const taxTotalMatch = xmlContent.match(/<cac:TaxTotal[^>]*>([\s\S]*?)<\/cac:TaxTotal>/i);
    if (taxTotalMatch) {
      const taxBlock = taxTotalMatch[1];
      
      // Total tax amount
      const taxAmount = extractTag(taxBlock, 'TaxAmount');
      if (taxAmount) {
        result.vatAmount = parseFloat(taxAmount);
      }
      
      // Tax subtotals (for VAT rate)
      const taxSubtotalMatch = taxBlock.match(/<cac:TaxSubtotal[^>]*>([\s\S]*?)<\/cac:TaxSubtotal>/i);
      if (taxSubtotalMatch) {
        const percent = extractTag(taxSubtotalMatch[1], 'Percent');
        if (percent) {
          result.vatRate = parseFloat(percent);
        }
      }
    }

    // Extract withholding tax if present
    const withholdingMatch = xmlContent.match(/<cac:WithholdingTaxTotal[^>]*>([\s\S]*?)<\/cac:WithholdingTaxTotal>/i);
    if (withholdingMatch) {
      const taxAmount = extractTag(withholdingMatch[1], 'TaxAmount');
      if (taxAmount) {
        result.withholdingTaxAmount = parseFloat(taxAmount);
      }
    }

    // Extract monetary totals
    const monetaryMatch = xmlContent.match(/<cac:LegalMonetaryTotal[^>]*>([\s\S]*?)<\/cac:LegalMonetaryTotal>/i);
    if (monetaryMatch) {
      const monetaryBlock = monetaryMatch[1];
      
      // Line extension (subtotal)
      const lineExtension = extractTag(monetaryBlock, 'LineExtensionAmount');
      if (lineExtension) {
        result.subtotal = parseFloat(lineExtension);
      }
      
      // Tax exclusive (net)
      const taxExclusive = extractTag(monetaryBlock, 'TaxExclusiveAmount');
      if (taxExclusive && !result.subtotal) {
        result.subtotal = parseFloat(taxExclusive);
      }
      
      // Payable amount (total)
      const payable = extractTag(monetaryBlock, 'PayableAmount');
      if (payable) {
        result.totalAmount = parseFloat(payable);
      }
      
      // Alternative: Tax inclusive amount
      const taxInclusive = extractTag(monetaryBlock, 'TaxInclusiveAmount');
      if (taxInclusive && !result.totalAmount) {
        result.totalAmount = parseFloat(taxInclusive);
      }
    }

    console.log('Parsed e-Fatura result:', result);
    
  } catch (error) {
    console.error('XML parsing error:', error);
    result.confidence = 0.5;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { xmlContent, xmlUrl } = await req.json();
    
    let content = xmlContent;
    
    // If URL provided, fetch the XML content
    if (xmlUrl && !content) {
      console.log('Fetching XML from URL:', xmlUrl);
      const response = await fetch(xmlUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch XML: ${response.status}`);
      }
      content = await response.text();
    }
    
    if (!content) {
      throw new Error('XML içeriği bulunamadı');
    }

    console.log('Parsing e-Fatura XML, length:', content.length);
    
    const result = parseEFatura(content);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('parse-xml-invoice error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'XML parse hatası' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
