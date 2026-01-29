import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, FileText, Check, Trash2, Eye, Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { useIncomeStatementUpload } from '@/hooks/finance/useIncomeStatementUpload';
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

interface IncomeStatementUploaderProps {
  year: number;
}

// Account code labels for display
const ACCOUNT_LABELS: Record<string, string> = {
  '600': 'Yurtiçi Satışlar',
  '601': 'Yurtdışı Satışlar',
  '602': 'Diğer Gelirler',
  '610': 'Satıştan İadeler',
  '611': 'Satış İskontoları',
  '620': 'Satılan Mamul Maliyeti',
  '621': 'Satılan Ticari Mal Maliyeti',
  '622': 'Satılan Hizmet Maliyeti',
  '630': 'Ar-Ge Giderleri',
  '631': 'Pazarlama Satış Dağıtım',
  '632': 'Genel Yönetim Giderleri',
  '640': 'İştiraklerden Temettü',
  '642': 'Faiz Gelirleri',
  '643': 'Komisyon Gelirleri',
  '646': 'Kambiyo Karları',
  '647': 'Reeskont Faiz Gelirleri',
  '649': 'Diğer Olağan Gelirler',
  '653': 'Komisyon Giderleri',
  '654': 'Karşılık Giderleri',
  '656': 'Kambiyo Zararları',
  '657': 'Reeskont Faiz Giderleri',
  '659': 'Diğer Olağan Giderler',
  '660': 'Kısa Vadeli Borçlanma',
  '661': 'Uzun Vadeli Borçlanma',
  '671': 'Önceki Dönem Gelir/Karları',
  '679': 'Diğer Olağandışı Gelirler',
  '681': 'Önceki Dönem Gider/Zararları',
  '689': 'Diğer Olağandışı Giderler',
  '691': 'Dönem Karı Vergi Karşılığı',
  '692': 'Ertelenmiş Vergi Gideri',
};

export function IncomeStatementUploader({ year }: IncomeStatementUploaderProps) {
  const {
    uploadState,
    isUploading,
    isApproving,
    uploadIncomeStatement,
    approveIncomeStatement,
    deleteUpload,
  } = useIncomeStatementUpload(year);

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
      await uploadIncomeStatement(files[0]);
    }
  }, [uploadIncomeStatement]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await uploadIncomeStatement(files[0]);
    }
    e.target.value = '';
  }, [uploadIncomeStatement]);

  // Calculate summary from accounts
  const calculateSummary = () => {
    if (!uploadState?.accounts) return null;

    const accounts = uploadState.accounts;
    
    // Gross sales (600-602) - use creditBalance
    const grossSales = accounts
      .filter(a => ['600', '601', '602'].includes(a.code))
      .reduce((sum, a) => sum + a.creditBalance, 0);
    
    // Sales deductions (610-611) - use debitBalance
    const salesDeductions = accounts
      .filter(a => ['610', '611'].includes(a.code))
      .reduce((sum, a) => sum + a.debitBalance, 0);
    
    const netSales = grossSales - salesDeductions;
    
    // Cost of sales (620-622) - use debitBalance
    const costOfSales = accounts
      .filter(a => ['620', '621', '622'].includes(a.code))
      .reduce((sum, a) => sum + a.debitBalance, 0);
    
    const grossProfit = netSales - costOfSales;
    
    // Operating expenses (630-632) - use debitBalance
    const operatingExpenses = accounts
      .filter(a => ['630', '631', '632'].includes(a.code))
      .reduce((sum, a) => sum + a.debitBalance, 0);
    
    const operatingProfit = grossProfit - operatingExpenses;

    return { netSales, grossProfit, operatingProfit };
  };

  const summary = uploadState ? calculateSummary() : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {year} Yılı Gelir Tablosu
        </CardTitle>
        <CardDescription>
          Muhasebeciden gelen mizan veya gelir tablosu dosyasını yükleyin (Excel veya PDF formatı)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!uploadState ? (
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
                <p className="text-sm text-muted-foreground">Gelir tablosu dosyası işleniyor...</p>
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
                <p className="text-xs text-muted-foreground mt-2">
                  6xx serisi hesaplar (gelir/gider) otomatik olarak tanınacaktır
                </p>
              </>
            )}
          </div>
        ) : (
          // Uploaded file info
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {uploadState.fileName?.toLowerCase().endsWith('.pdf') ? (
                  <FileText className="h-8 w-8 text-red-600" />
                ) : (
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                )}
                <div>
                  <p className="font-medium">{uploadState.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {uploadState.accounts.length} hesap parse edildi
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {uploadState.isApproved ? (
                  <Badge variant="default" className="bg-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Onaylandı
                  </Badge>
                ) : (
                  <Badge variant="outline">Onay Bekliyor</Badge>
                )}
              </div>
            </div>

            {/* Warnings */}
            {uploadState.warnings.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 text-yellow-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  {uploadState.warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Net Satışlar</p>
                  <p className="font-semibold text-lg">{formatFullTRY(summary.netSales)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Brüt Kâr</p>
                  <p className="font-semibold text-lg">{formatFullTRY(summary.grossProfit)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Faaliyet Kârı</p>
                  <p className="font-semibold text-lg">{formatFullTRY(summary.operatingProfit)}</p>
                </div>
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
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Gelir Tablosu Önizleme</DialogTitle>
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
                        {uploadState.accounts
                          .sort((a, b) => a.code.localeCompare(b.code))
                          .map((account) => (
                            <TableRow key={account.code}>
                              <TableCell className="font-mono">{account.code}</TableCell>
                              <TableCell>{account.name || ACCOUNT_LABELS[account.code] || '-'}</TableCell>
                              <TableCell className="text-right">{formatFullTRY(account.debit)}</TableCell>
                              <TableCell className="text-right">{formatFullTRY(account.credit)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatFullTRY(account.debitBalance)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatFullTRY(account.creditBalance)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              {!uploadState.isApproved && (
                <Button 
                  onClick={() => approveIncomeStatement()} 
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
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Verileri Sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu işlem yüklenen gelir tablosu verilerini silecektir. Devam etmek istiyor musunuz?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteUpload()}>
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
