import { AlertTriangle, RefreshCw, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Receipt } from '@/types/finance';

interface MissingVatAlertProps {
  receipts: Receipt[];
  onReprocess: () => void;
  isProcessing: boolean;
  progress: number;
  processedCount: number;
  results: Array<{ id: string; success: boolean; vatAmount?: number }>;
}

export function MissingVatAlert({
  receipts,
  onReprocess,
  isProcessing,
  progress,
  processedCount,
  results
}: MissingVatAlertProps) {
  if (receipts.length === 0) return null;

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

  return (
    <Card className="border-warning bg-warning/10 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-warning-foreground">
              Eksik KDV Bilgisi
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {receipts.length} belgede KDV bilgisi bulunamadı. Bu durum KDV raporunun doğruluğunu etkileyebilir.
            </p>

            {/* Thumbnail previews */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {receipts.slice(0, 6).map((receipt) => {
                const result = results.find(r => r.id === receipt.id);
                return (
                  <div 
                    key={receipt.id} 
                    className="relative shrink-0 w-16 h-16 rounded-md overflow-hidden border bg-muted"
                  >
                    {receipt.thumbnail_url || receipt.file_url ? (
                      <img
                        src={receipt.thumbnail_url || receipt.file_url || ''}
                        alt={receipt.seller_name || receipt.file_name || 'Fiş'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        PDF
                      </div>
                    )}
                    
                    {/* Result overlay */}
                    {result && (
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        result.success && result.vatAmount 
                          ? 'bg-green-500/80' 
                          : 'bg-orange-500/80'
                      }`}>
                        {result.success && result.vatAmount ? (
                          <Check className="h-6 w-6 text-white" />
                        ) : (
                          <span className="text-xs text-white">—</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {receipts.length > 6 && (
                <div className="shrink-0 w-16 h-16 rounded-md border bg-muted flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">+{receipts.length - 6}</span>
                </div>
              )}
            </div>

            {/* Processing progress */}
            {isProcessing && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">İşleniyor...</span>
                  <span className="font-medium">{processedCount}/{receipts.length}</span>
                </div>
                <Progress value={progress} className="h-2" />
                
                {/* Recent results */}
                {results.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                    {results.slice(-3).map((result) => {
                      const receipt = receipts.find(r => r.id === result.id);
                      return (
                        <div key={result.id} className="flex items-center gap-2 text-xs">
                          {result.success && result.vatAmount ? (
                            <>
                              <Check className="h-3 w-3 text-green-500" />
                              <span className="text-green-600">
                                {receipt?.seller_name || 'Belge'} - KDV: {formatCurrency(result.vatAmount)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="h-3 w-3 text-orange-500">—</span>
                              <span className="text-orange-600">
                                {receipt?.seller_name || 'Belge'} - KDV bulunamadı
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Reprocess button */}
            <Button 
              onClick={onReprocess}
              disabled={isProcessing}
              variant="outline"
              className="w-full mt-3 border-warning text-warning-foreground hover:bg-warning/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tümünü Yeniden Tara ({receipts.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
