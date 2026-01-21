import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { Receipt } from '@/types/finance';
import { cn } from '@/lib/utils';

interface UploadedReceiptCardProps {
  receipt: Receipt;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onReprocess: (id: string) => void;
  onToggleInclude: (id: string, include: boolean) => void;
  isReprocessing?: boolean;
}

export function UploadedReceiptCard({
  receipt,
  onDelete,
  onEdit,
  onReprocess,
  onToggleInclude,
  isReprocessing = false
}: UploadedReceiptCardProps) {
  const hasMissingVat = !receipt.vat_amount && receipt.vat_amount !== 0;
  const hasMissingSeller = !receipt.seller_name;
  const hasWarnings = hasMissingVat || hasMissingSeller;
  
  // Foreign invoice detection - only trust database field
  const isForeignInvoice = receipt.is_foreign_invoice === true;
  
  // Domestic invoice with foreign currency
  const isDomesticWithForeignCurrency = !isForeignInvoice && receipt.currency && receipt.currency !== 'TRY';
  
  // Check if this is an issued invoice
  const isIssuedInvoice = receipt.document_type === 'issued';
  
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: receipt.currency || 'TRY'
    }).format(amount);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      hasWarnings && "border-warning"
    )}>
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className="w-20 h-20 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
            {receipt.thumbnail_url || (receipt.file_type === 'image' && receipt.file_url) ? (
              <img 
                src={receipt.thumbnail_url || receipt.file_url} 
                alt="" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Entity Info - Changes based on document type */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm truncate">
                    {isIssuedInvoice 
                      ? (receipt.buyer_name || 'Alıcı bilgisi yok')
                      : (receipt.seller_name || 'Satıcı bilgisi yok')
                    }
                  </h3>
                  {/* Document Type Badge for Issued */}
                  {isIssuedInvoice && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 flex-shrink-0">
                      Kesilen
                    </span>
                  )}
                  {/* Foreign Invoice Badge */}
                  {isForeignInvoice && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 flex items-center gap-1 flex-shrink-0">
                      <Globe className="h-3 w-3" />
                      Yurtdışı
                    </span>
                  )}
                  {/* Domestic with Foreign Currency Badge */}
                  {isDomesticWithForeignCurrency && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 flex-shrink-0">
                      {receipt.currency} → TRY
                    </span>
                  )}
                </div>
                {/* Tax Number - Based on document type */}
                {isIssuedInvoice ? (
                  receipt.buyer_tax_no && (
                    <p className="text-xs text-muted-foreground">
                      VKN: {receipt.buyer_tax_no}
                    </p>
                  )
                ) : (
                  receipt.seller_tax_no && (
                    <p className="text-xs text-muted-foreground">
                      VKN: {receipt.seller_tax_no}
                    </p>
                  )
                )}
                {/* For issued invoices, show issuer (own company) */}
                {isIssuedInvoice && receipt.seller_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kesen: {receipt.seller_name}
                  </p>
                )}
              </div>
              {receipt.ocr_confidence !== null && (
                <div className={cn(
                  "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                  receipt.ocr_confidence >= 0.8 
                    ? "bg-green-500/10 text-green-600"
                    : receipt.ocr_confidence >= 0.5
                    ? "bg-warning/10 text-warning"
                    : "bg-destructive/10 text-destructive"
                )}>
                  %{Math.round((receipt.ocr_confidence || 0) * 100)}
                </div>
              )}
            </div>

            {/* Warnings */}
            {hasWarnings && (
              <div className="flex flex-wrap gap-1 mt-2">
                {hasMissingVat && (
                  <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    KDV eksik
                  </span>
                )}
                {hasMissingSeller && (
                  <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Satıcı eksik
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Financial Details */}
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {receipt.subtotal !== null && receipt.subtotal !== undefined && (
              <>
                <span className="text-muted-foreground">Ara Toplam</span>
                <span className="text-right">{formatCurrency(receipt.subtotal)}</span>
              </>
            )}
            
            {receipt.vat_rate !== null && receipt.vat_amount !== null && (
              <>
                <span className="text-muted-foreground">
                  KDV {receipt.vat_rate ? `(%${receipt.vat_rate})` : ''}
                </span>
                <span className="text-right text-green-600">+{formatCurrency(receipt.vat_amount)}</span>
              </>
            )}
            
            {receipt.withholding_tax_amount !== null && receipt.withholding_tax_amount !== undefined && (
              <>
                <span className="text-muted-foreground">
                  Stopaj {receipt.withholding_tax_rate ? `(%${receipt.withholding_tax_rate})` : ''}
                </span>
                <span className="text-right text-destructive">-{formatCurrency(receipt.withholding_tax_amount)}</span>
              </>
            )}
            
            {receipt.stamp_tax_amount !== null && receipt.stamp_tax_amount !== undefined && (
              <>
                <span className="text-muted-foreground">Damga Vergisi</span>
                <span className="text-right text-destructive">-{formatCurrency(receipt.stamp_tax_amount)}</span>
              </>
            )}
            
            <span className="font-semibold">TOPLAM</span>
            <span className="text-right font-bold">{formatCurrency(receipt.total_amount)}</span>
            
            {/* Foreign Invoice: Exchange Rate & TRY Equivalent */}
            {isForeignInvoice && receipt.amount_try && receipt.exchange_rate_used && (
              <>
                <span className="text-muted-foreground text-xs">Döviz Kuru</span>
                <span className="text-right text-xs">
                  1 {receipt.original_currency || receipt.currency} = {receipt.exchange_rate_used.toFixed(4)} TRY
                </span>
                
                <span className="text-muted-foreground font-medium">TRY Karşılığı</span>
                <span className="text-right font-bold text-blue-600">
                  ₺{receipt.amount_try.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Date & Receipt No */}
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex justify-between">
          <span>Tarih: {formatDate(receipt.receipt_date)}</span>
          {receipt.receipt_no && <span>Fiş No: {receipt.receipt_no}</span>}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox 
              id={`include-${receipt.id}`}
              checked={receipt.is_included_in_report}
              onCheckedChange={(checked) => onToggleInclude(receipt.id, !!checked)}
            />
            <label 
              htmlFor={`include-${receipt.id}`}
              className="text-sm cursor-pointer flex items-center gap-1"
            >
              {receipt.is_included_in_report ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : null}
              Rapora dahil et
            </label>
          </div>
          
          <div className="flex items-center gap-1">
            {hasMissingVat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReprocess(receipt.id)}
                disabled={isReprocessing}
                className="h-8 px-2"
              >
                <RefreshCw className={cn("h-4 w-4", isReprocessing && "animate-spin")} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(receipt.id)}
              className="h-8 px-2"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(receipt.id)}
              className="h-8 px-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
