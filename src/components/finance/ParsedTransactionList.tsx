import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, ArrowUpCircle, ArrowDownCircle, Building2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParseResult, ParsedTransaction } from '@/types/finance';

interface ParsedTransactionListProps {
  result: ParseResult;
  onSelectTransaction?: (tx: ParsedTransaction) => void;
}

const formatCurrency = (n: number) => 
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(Math.abs(n));

export function ParsedTransactionList({ result, onSelectTransaction }: ParsedTransactionListProps) {
  const { transactions, summary, bank_info } = result;
  const [showOnlyReview, setShowOnlyReview] = useState(false);
  
  // Sort: needs_review first
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (a.needs_review && !b.needs_review) return -1;
    if (!a.needs_review && b.needs_review) return 1;
    return 0;
  });

  const displayTransactions = showOnlyReview 
    ? sortedTransactions.filter(t => t.needs_review)
    : sortedTransactions;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">İşlem Sayısı</p>
              <p className="text-xl font-bold">{summary.transaction_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Toplam Gelir</p>
              <p className="text-xl font-bold text-green-600 flex items-center gap-1">
                <ArrowUpCircle className="h-4 w-4" />
                +{formatCurrency(summary.total_income)} ₺
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Toplam Gider</p>
              <p className="text-xl font-bold text-red-600 flex items-center gap-1">
                <ArrowDownCircle className="h-4 w-4" />
                -{formatCurrency(summary.total_expense)} ₺
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Kontrol Gereken</p>
              <p className={cn(
                "text-xl font-bold",
                summary.needs_review_count > 0 ? "text-amber-600" : "text-green-600"
              )}>
                {summary.needs_review_count}
              </p>
            </div>
          </div>
          
          {(bank_info.detected_bank || summary.date_range.start) && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
              {bank_info.detected_bank && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {bank_info.detected_bank}
                </span>
              )}
              {summary.date_range.start && summary.date_range.end && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {summary.date_range.start} - {summary.date_range.end}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Alert */}
      {summary.needs_review_count > 0 && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 flex items-center justify-between">
            <span>
              {summary.needs_review_count} işlem manuel kontrol gerektiriyor. 
              Sarı ile işaretli satırları kontrol edin.
            </span>
            <button 
              onClick={() => setShowOnlyReview(!showOnlyReview)}
              className="text-xs underline ml-2"
            >
              {showOnlyReview ? 'Tümünü Göster' : 'Sadece Kontrol Gerekenleri Göster'}
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Transaction List */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="w-[100px]">Tarih</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Karşı Taraf</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead className="w-[80px]">Güven</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTransactions.map((tx) => (
                <TableRow 
                  key={tx.row_number}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    tx.needs_review && "bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30"
                  )}
                  onClick={() => onSelectTransaction?.(tx)}
                >
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    {tx.row_number}
                  </TableCell>
                  <TableCell className="text-sm">
                    {tx.original_date || tx.date || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {tx.transaction_type}
                      </Badge>
                      <span className="truncate max-w-[300px]">{tx.description}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tx.counterparty || '-'}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-medium",
                    tx.amount >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)} ₺
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      "text-xs px-2 py-1 rounded text-center",
                      tx.confidence >= 0.8 && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                      tx.confidence >= 0.5 && tx.confidence < 0.8 && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
                      tx.confidence < 0.5 && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    )}>
                      {Math.round(tx.confidence * 100)}%
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
