import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useBalanceSheetUpload } from '@/hooks/finance/useBalanceSheetUpload';
import { formatFullTRY } from '@/lib/formatters';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface BalanceSheetUploaderProps {
  year: number;
}

export function BalanceSheetUploader({ year }: BalanceSheetUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const {
    uploadBalanceSheet,
    approveAndSave,
    clearUpload,
    isUploading,
    isApproving,
    uploadResult,
    fileName,
  } = useBalanceSheetUpload(year);

  const handleFileSelect = (file: File) => {
    const validExtensions = ['.pdf', '.xlsx', '.xls'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(ext)) {
      return;
    }
    
    uploadBalanceSheet(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const toggleAccount = (code: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedAccounts(newExpanded);
  };

  // Group accounts by type
  const groupedAccounts = uploadResult?.accounts.reduce((groups, account) => {
    const mainCode = account.code.split('.')[0];
    let group = 'other';
    
    if (mainCode.startsWith('1')) group = 'current_assets';
    else if (mainCode.startsWith('2')) group = 'fixed_assets';
    else if (mainCode.startsWith('3')) group = 'short_term_liabilities';
    else if (mainCode.startsWith('4')) group = 'long_term_liabilities';
    else if (mainCode.startsWith('5')) group = 'equity';
    
    if (!groups[group]) groups[group] = [];
    groups[group].push(account);
    return groups;
  }, {} as Record<string, typeof uploadResult.accounts>) || {};

  const groupLabels: Record<string, string> = {
    current_assets: 'Dönen Varlıklar (1xx)',
    fixed_assets: 'Duran Varlıklar (2xx)',
    short_term_liabilities: 'Kısa Vadeli Borçlar (3xx)',
    long_term_liabilities: 'Uzun Vadeli Borçlar (4xx)',
    equity: 'Özkaynaklar (5xx)',
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {!uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {year} Yılı Bilanço Yükle
            </CardTitle>
            <CardDescription>
              Muhasebeciden aldığınız bilanço dosyasını yükleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Bilanço işleniyor...
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    PDF veya Excel dosyasını sürükleyip bırakın
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    veya tıklayarak seçin
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Desteklenen formatlar: .pdf, .xlsx, .xls
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
                e.target.value = '';
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  {fileName}
                </CardTitle>
                <CardDescription>
                  {uploadResult.summary.accountCount} hesap bulundu
                </CardDescription>
              </div>
              <Badge variant={uploadResult.summary.isBalanced ? 'default' : 'destructive'}>
                {uploadResult.summary.isBalanced ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Dengeli</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 mr-1" /> Dengesiz</>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Toplam Aktif</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatFullTRY(uploadResult.summary.totalAssets)}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Toplam Pasif</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {formatFullTRY(uploadResult.summary.totalLiabilities)}
                </p>
              </div>
            </div>

            {/* Balance Check */}
            <div className={`rounded-lg p-3 ${
              uploadResult.summary.isBalanced 
                ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' 
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
            }`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                {uploadResult.summary.isBalanced ? (
                  <><CheckCircle className="h-4 w-4" /> Bilanço Dengeli (Aktif = Pasif)</>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" /> 
                    Bilanço Dengesiz! Fark: {formatFullTRY(Math.abs(
                      uploadResult.summary.totalAssets - uploadResult.summary.totalLiabilities
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Preview Toggle */}
            <Collapsible open={showPreview} onOpenChange={setShowPreview}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Önizlemeyi Gizle' : 'Hesapları Önizle'}
                  {showPreview ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronRight className="h-4 w-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <ScrollArea className="h-[400px] border rounded-lg">
                  {Object.entries(groupLabels).map(([groupKey, groupLabel]) => {
                    const accounts = groupedAccounts[groupKey] || [];
                    if (accounts.length === 0) return null;
                    
                    return (
                      <div key={groupKey} className="mb-4">
                        <div className="bg-muted/50 px-4 py-2 font-semibold text-sm sticky top-0">
                          {groupLabel}
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-24">Kod</TableHead>
                              <TableHead>Hesap Adı</TableHead>
                              <TableHead className="text-right w-32">Borç</TableHead>
                              <TableHead className="text-right w-32">Alacak</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accounts.map((account) => (
                              <React.Fragment key={account.code}>
                                <TableRow 
                                  className={account.subAccounts?.length ? 'cursor-pointer hover:bg-muted/50' : ''}
                                  onClick={() => account.subAccounts?.length && toggleAccount(account.code)}
                                >
                                  <TableCell className="font-mono text-sm">
                                    {account.subAccounts?.length ? (
                                      <span className="flex items-center gap-1">
                                        {expandedAccounts.has(account.code) ? 
                                          <ChevronDown className="h-3 w-3" /> : 
                                          <ChevronRight className="h-3 w-3" />
                                        }
                                        {account.code}
                                      </span>
                                    ) : account.code}
                                  </TableCell>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {account.debitBalance > 0 ? formatFullTRY(account.debitBalance) : '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {account.creditBalance > 0 ? formatFullTRY(account.creditBalance) : '-'}
                                  </TableCell>
                                </TableRow>
                                {expandedAccounts.has(account.code) && account.subAccounts?.map((sub) => (
                                  <TableRow key={sub.code} className="bg-muted/30">
                                    <TableCell className="font-mono text-xs pl-8">{sub.code}</TableCell>
                                    <TableCell className="text-sm">{sub.name}</TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                      {sub.debitBalance > 0 ? formatFullTRY(sub.debitBalance) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                      {sub.creditBalance > 0 ? formatFullTRY(sub.creditBalance) : '-'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </React.Fragment>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={approveAndSave}
                disabled={isApproving}
                className="flex-1"
              >
                {isApproving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Kaydediliyor...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Onayla ve Kaydet</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={clearUpload}
                disabled={isApproving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Sil
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nasıl Çalışır?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Muhasebeciden aldığınız bilanço PDF veya Excel dosyasını yükleyin</p>
            <p>2. Sistem hesap kodlarını otomatik olarak tanıyacaktır (1xx-5xx)</p>
            <p>3. Aktif = Pasif denge kontrolü yapılacak</p>
            <p>4. Önizleme yaparak verileri kontrol edin</p>
            <p>5. "Onayla ve Kaydet" ile verileri kaydedin</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
