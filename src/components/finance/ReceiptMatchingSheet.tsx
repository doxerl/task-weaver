import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Search, ArrowRightLeft, Check } from 'lucide-react';
import { useReceiptMatching, MatchCandidate } from '@/hooks/finance/useReceiptMatching';
import { Receipt } from '@/types/finance';
import { cn } from '@/lib/utils';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '-';

interface ReceiptMatchingSheetProps {
  receipt: Receipt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptMatchingSheet({ receipt, open, onOpenChange }: ReceiptMatchingSheetProps) {
  const { candidates, addManualMatch, isLoading } = useReceiptMatching(receipt.id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Filter candidates by search query
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(c => 
      c.description?.toLowerCase().includes(q) ||
      c.counterparty?.toLowerCase().includes(q) ||
      Math.abs(c.amount).toString().includes(q)
    );
  }, [candidates, searchQuery]);

  // Calculate selected totals
  const selectedTransactions = filteredCandidates.filter(c => selectedIds.has(c.id));
  const selectedTotal = selectedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const receiptTotal = receipt.total_amount || 0;
  const difference = selectedTotal - receiptTotal;

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMatch = async () => {
    if (selectedIds.size === 0) return;
    
    const matchType = selectedIds.size === 1 && Math.abs(difference) < receiptTotal * 0.02 
      ? 'full' 
      : 'partial';
    
    await addManualMatch.mutateAsync({
      transactionIds: Array.from(selectedIds),
      matchType
    });
    
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Manuel Eşleştirme
          </SheetTitle>
        </SheetHeader>

        {/* Receipt Summary */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fatura:</span>
            <span className="font-medium">{receipt.seller_name || receipt.vendor_name || 'Bilinmiyor'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tutar:</span>
            <span className="font-bold">{formatCurrency(receiptTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tarih:</span>
            <span>{formatDate(receipt.receipt_date)}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="İşlem ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Candidates List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-2">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Yükleniyor...
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Eşleşen işlem bulunamadı
              </div>
            ) : (
              filteredCandidates.map(candidate => (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  isSelected={selectedIds.has(candidate.id)}
                  onToggle={() => toggleSelection(candidate.id)}
                  receiptAmount={receiptTotal}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Selection Summary */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span>Seçilen: {selectedIds.size} işlem</span>
            <span className={cn(
              "font-medium",
              Math.abs(difference) < receiptTotal * 0.02 ? "text-green-600" :
              difference > 0 ? "text-blue-600" : "text-yellow-600"
            )}>
              {formatCurrency(selectedTotal)} / {formatCurrency(receiptTotal)}
            </span>
          </div>
          
          {selectedIds.size > 0 && Math.abs(difference) >= receiptTotal * 0.02 && (
            <div className="text-xs text-muted-foreground">
              Fark: {difference > 0 ? '+' : ''}{formatCurrency(difference)}
              {difference > 0 && ' (Fazla seçildi)'}
              {difference < 0 && ' (Eksik seçildi)'}
            </div>
          )}

          <Button
            onClick={handleMatch}
            disabled={selectedIds.size === 0 || addManualMatch.isPending}
            className="w-full"
          >
            <Check className="h-4 w-4 mr-2" />
            {selectedIds.size === 0 ? 'İşlem Seçin' : 
             selectedIds.size === 1 ? 'Eşleştir' : 
             `${selectedIds.size} İşlemi Eşleştir`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface CandidateRowProps {
  candidate: MatchCandidate;
  isSelected: boolean;
  onToggle: () => void;
  receiptAmount: number;
}

function CandidateRow({ candidate, isSelected, onToggle, receiptAmount }: CandidateRowProps) {
  const amount = Math.abs(candidate.amount);
  const diff = Math.abs(amount - receiptAmount) / receiptAmount;
  const isExactMatch = diff <= 0.02;

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        isSelected && "border-primary bg-primary/5",
        candidate.is_matched && "opacity-50 pointer-events-none"
      )}
      onClick={onToggle}
    >
      <Checkbox 
        checked={isSelected} 
        onCheckedChange={() => onToggle()}
        disabled={candidate.is_matched}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(candidate.transaction_date)}
          </span>
          {isExactMatch && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
              Tam Eşleşme
            </Badge>
          )}
          {candidate.is_matched && (
            <Badge variant="secondary" className="text-xs">
              Eşleştirilmiş
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium truncate mt-0.5">
          {candidate.counterparty || candidate.description}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {candidate.description}
        </p>
      </div>
      
      <div className={cn(
        "text-sm font-mono font-medium",
        candidate.amount < 0 ? "text-destructive" : "text-green-600"
      )}>
        {formatCurrency(amount)}
      </div>
    </div>
  );
}
