import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, FileText, Check, Trash2, Eye, Loader2, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { useTrialBalance } from '@/hooks/finance/useTrialBalance';
import { formatFullTRY } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { SubAccount } from '@/types/officialFinance';

interface TrialBalanceUploaderProps {
  year: number;
  month?: number | null;
}

// Collapsible row component for accounts with sub-accounts
function CollapsibleAccountRow({ code, account, subAccounts, hasSubAccounts }: { 
  code: string; 
  account: any; 
  subAccounts?: SubAccount[];
  hasSubAccounts?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  if (!hasSubAccounts) {
    return (
      <TableRow>
        <TableCell className="font-mono pl-6">{code}</TableCell>
        <TableCell>{account.name}</TableCell>
        <TableCell className="text-right">{formatFullTRY(account.debit)}</TableCell>
        <TableCell className="text-right">{formatFullTRY(account.credit)}</TableCell>
        <TableCell className="text-right">{formatFullTRY(account.debitBalance)}</TableCell>
        <TableCell className="text-right">{formatFullTRY(account.creditBalance)}</TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="font-mono">
          <div className="flex items-center gap-1">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {code}
          </div>
        </TableCell>
        <TableCell>
          {account.name}
          <span className="text-xs text-muted-foreground ml-2">
            ({subAccounts?.length} alt hesap)
          </span>
        </TableCell>
        <TableCell className="text-right font-medium">{formatFullTRY(account.debit)}</TableCell>
        <TableCell className="text-right font-medium">{formatFullTRY(account.credit)}</TableCell>
        <TableCell className="text-right font-medium">{formatFullTRY(account.debitBalance)}</TableCell>
        <TableCell className="text-right font-medium">{formatFullTRY(account.creditBalance)}</TableCell>
      </TableRow>
      {isOpen && subAccounts?.map((sub) => (
        <TableRow key={sub.code} className="bg-muted/30">
          <TableCell className="font-mono pl-8 text-sm text-muted-foreground">{sub.code}</TableCell>
          <TableCell className="text-sm pl-4">{sub.name}</TableCell>
          <TableCell className="text-right text-sm">{formatFullTRY(sub.debit)}</TableCell>
          <TableCell className="text-right text-sm">{formatFullTRY(sub.credit)}</TableCell>
          <TableCell className="text-right text-sm">{formatFullTRY(sub.debitBalance)}</TableCell>
          <TableCell className="text-right text-sm">{formatFullTRY(sub.creditBalance)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function TrialBalanceUploader({ year, month = null }: TrialBalanceUploaderProps) {
  const {
    trialBalance,
    isLoading,
    uploadTrialBalance,
    approveTrialBalance,
    deleteTrialBalance,
    isUploading,
    isApproving,
    isDeleting,
  } = useTrialBalance(year, month);

  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await uploadTrialBalance(files[0]);
    }
  }, [uploadTrialBalance]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await uploadTrialBalance(files[0]);
    }
    e.target.value = '';
  }, [uploadTrialBalance]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Calculate totals from accounts
  const accountsArray = Object.entries(trialBalance?.accounts || {});
  const totalDebit = accountsArray.reduce((sum, [_, acc]) => sum + acc.debit, 0);
  const totalCredit = accountsArray.reduce((sum, [_, acc]) => sum + acc.credit, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          {year} Yılı Mizan {month ? `(${month}. Ay)` : '(Yıllık)'}
        </CardTitle>
        <CardDescription>
          Muhasebeciden gelen mizan dosyasını yükleyin (Excel veya PDF formatı)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!trialBalance ? (
          // Upload zone
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Mizan dosyası işleniyor...</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Excel veya PDF dosyasını sürükleyip bırakın
                </p>
                <p className="text-xs text-muted-foreground mb-4">veya</p>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    Dosya Seç
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls,.pdf"
                      onChange={handleFileSelect}
                    />
                  </label>
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Desteklenen formatlar: .xlsx, .xls, .pdf
                </p>
              </>
            )}
          </div>
        ) : (
          // Uploaded file info
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {trialBalance.file_name?.toLowerCase().endsWith('.pdf') ? (
                  <FileText className="h-8 w-8 text-red-600" />
                ) : (
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                )}
                <div>
                  <p className="font-medium">{trialBalance.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {accountsArray.length} hesap
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {trialBalance.is_approved ? (
                  <Badge variant="default" className="bg-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Onaylandı
                  </Badge>
                ) : (
                  <Badge variant="outline">Onay Bekliyor</Badge>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">Toplam Borç</p>
                <p className="font-semibold text-lg">{formatFullTRY(totalDebit)}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">Toplam Alacak</p>
                <p className="font-semibold text-lg">{formatFullTRY(totalCredit)}</p>
              </div>
            </div>

            {/* Balance check */}
            {Math.abs(totalDebit - totalCredit) > 0.01 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Borç ve alacak toplamları eşit değil (Fark: {formatFullTRY(Math.abs(totalDebit - totalCredit))})</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {/* Preview Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Önizle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Mizan Önizleme</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Hesap</TableHead>
                          <TableHead>Hesap Adı</TableHead>
                          <TableHead className="text-right">Borç</TableHead>
                          <TableHead className="text-right">Alacak</TableHead>
                          <TableHead className="text-right">Borç Bak.</TableHead>
                          <TableHead className="text-right">Alacak Bak.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountsArray
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([code, account]) => {
                            const subAccounts = (account as any).subAccounts as SubAccount[] | undefined;
                            const hasSubAccounts = subAccounts && subAccounts.length > 0;
                            
                            return (
                              <CollapsibleAccountRow 
                                key={code}
                                code={code}
                                account={account}
                                subAccounts={subAccounts}
                                hasSubAccounts={hasSubAccounts}
                              />
                            );
                          })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              {!trialBalance.is_approved && (
                <Button 
                  onClick={() => approveTrialBalance()} 
                  disabled={isApproving}
                  size="sm"
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Onayla ve Aktar
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mizan Verilerini Sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu işlem mizan verilerini kalıcı olarak silecektir. Devam etmek istiyor musunuz?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTrialBalance()}>
                      Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
