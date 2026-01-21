import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, ArrowUpDown, Eye } from 'lucide-react';
import { Receipt } from '@/types/finance';
import { cn } from '@/lib/utils';

const formatCurrency = (n: number, currency: string = 'TRY') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }
  if (currency === 'EUR') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
  }
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
};
const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

type SortField = 'date' | 'amount' | 'vendor';
type SortDirection = 'asc' | 'desc';

interface ReceiptTableProps {
  receipts: Receipt[];
  categories: { id: string; name: string; icon: string }[];
  onCategoryChange: (id: string, categoryId: string | null) => void;
  onToggleReport: (id: string, include: boolean) => void;
  onDelete: (id: string) => void;
  isReceived: boolean;
}

export function ReceiptTable({ 
  receipts, 
  categories, 
  onCategoryChange, 
  onToggleReport, 
  onDelete,
  isReceived 
}: ReceiptTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedReceipts = [...receipts].sort((a, b) => {
    const mult = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'date':
        return mult * ((new Date(a.receipt_date || 0).getTime()) - (new Date(b.receipt_date || 0).getTime()));
      case 'amount':
        return mult * ((a.total_amount || 0) - (b.total_amount || 0));
      case 'vendor':
        const nameA = isReceived ? (a.seller_name || a.vendor_name || '') : (a.buyer_name || '');
        const nameB = isReceived ? (b.seller_name || b.vendor_name || '') : (b.buyer_name || '');
        return mult * nameA.localeCompare(nameB, 'tr');
      default:
        return 0;
    }
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === receipts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(receipts.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Calculate totals
  const totals = receipts.reduce((acc, r) => ({
    subtotal: acc.subtotal + (r.subtotal || 0),
    vat: acc.vat + (r.vat_amount || 0),
    total: acc.total + (r.total_amount || 0),
  }), { subtotal: 0, vat: 0, total: 0 });

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-8 p-0 hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={cn(
        "ml-1 h-3 w-3",
        sortField === field && "text-primary"
      )} />
    </Button>
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox 
                checked={selectedIds.size === receipts.length && receipts.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="w-10">#</TableHead>
            <TableHead>
              <SortButton field="date">Tarih</SortButton>
            </TableHead>
            <TableHead>Belge No</TableHead>
            <TableHead>
              <SortButton field="vendor">{isReceived ? 'Satıcı' : 'Alıcı'}</SortButton>
            </TableHead>
            <TableHead className="text-right">Ara Toplam</TableHead>
            <TableHead className="text-right">KDV</TableHead>
            <TableHead className="text-right">
              <SortButton field="amount">Toplam</SortButton>
            </TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-center">Rapor</TableHead>
            <TableHead className="w-20">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedReceipts.map((receipt, idx) => {
            const displayName = isReceived 
              ? (receipt.seller_name || receipt.vendor_name || '-')
              : (receipt.buyer_name || '-');
            // Yabancı faturalar için KDV=0 normaldir, sadece yurtiçi TRY faturaları kontrol et
            const hasMissingVat = !receipt.vat_amount && receipt.total_amount && 
                                  !receipt.is_foreign_invoice && 
                                  (receipt.currency === 'TRY' || !receipt.currency);
            const receiptCurrency = receipt.currency || 'TRY';

            return (
              <TableRow 
                key={receipt.id}
                className={cn(
                  receipt.is_included_in_report && "bg-green-50 dark:bg-green-950/20",
                  selectedIds.has(receipt.id) && "bg-accent"
                )}
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.has(receipt.id)}
                    onCheckedChange={() => toggleSelect(receipt.id)}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                <TableCell className="text-sm">{formatDate(receipt.receipt_date)}</TableCell>
                <TableCell className="text-sm font-mono">{receipt.receipt_no || '-'}</TableCell>
                <TableCell>
                  <div className="max-w-[200px]">
                    <p className="text-sm truncate">{displayName}</p>
                    {(receipt.seller_tax_no || receipt.vendor_tax_no || receipt.buyer_tax_no) && (
                      <p className="text-xs text-muted-foreground">
                        VKN: {isReceived ? (receipt.seller_tax_no || receipt.vendor_tax_no) : receipt.buyer_tax_no}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {receipt.subtotal ? formatCurrency(receipt.subtotal, receiptCurrency) : '-'}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {receipt.is_foreign_invoice ? (
                    <span className="text-muted-foreground">%0</span>
                  ) : hasMissingVat ? (
                    <span className="flex items-center justify-end gap-1 text-yellow-600">
                      <AlertTriangle className="h-3 w-3" />
                      Eksik
                    </span>
                  ) : receipt.vat_amount ? (
                    <span>
                      {formatCurrency(receipt.vat_amount, 'TRY')}
                      {receipt.vat_rate && <span className="text-xs text-muted-foreground ml-1">(%{receipt.vat_rate})</span>}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-medium",
                  isReceived ? "text-destructive" : "text-green-600"
                )}>
                  <div>
                    {isReceived ? '-' : '+'}{formatCurrency(receipt.total_amount || 0, receiptCurrency)}
                    {receipt.is_foreign_invoice && receipt.amount_try && (
                      <span className="block text-xs text-muted-foreground font-normal">
                        ≈ {formatCurrency(receipt.amount_try, 'TRY')}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={receipt.category_id || ''}
                    onValueChange={categoryId => onCategoryChange(receipt.id, categoryId || null)}
                  >
                    <SelectTrigger className="h-8 text-xs w-32">
                      <SelectValue placeholder="Seç..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={receipt.is_included_in_report}
                    onCheckedChange={checked => onToggleReport(receipt.id, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link to={`/finance/receipts/${receipt.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Faturayı Sil</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bu faturayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDelete(receipt.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {/* Totals Row */}
          <TableRow className="bg-muted/50 font-medium">
            <TableCell colSpan={5} className="text-right">TOPLAM</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.subtotal)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.vat)}</TableCell>
            <TableCell className={cn(
              "text-right",
              isReceived ? "text-destructive" : "text-green-600"
            )}>
              {formatCurrency(totals.total)}
            </TableCell>
            <TableCell colSpan={3}></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
