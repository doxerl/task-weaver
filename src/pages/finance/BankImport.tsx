import { useCallback, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle, ArrowLeft, AlertCircle, FileSpreadsheet, X, StopCircle, PlayCircle, Eye, RefreshCw, Trash2, UserPlus, AlertTriangle, Zap, Clock } from 'lucide-react';
import { useBankFileUpload } from '@/hooks/finance/useBankFileUpload';
import { useBankImportSession } from '@/hooks/finance/useBankImportSession';
import { TransactionEditor, EditableTransaction } from '@/components/finance/TransactionEditor';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ParsedTransactionList } from '@/components/finance/ParsedTransactionList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PartnerRuleDialog } from '@/components/finance/PartnerRuleDialog';

type ViewMode = 'upload' | 'preview' | 'completed';

export default function BankImport() {
  const navigate = useNavigate();
  
  // Upload hook - for new uploads
  const { 
    uploadAndParse, 
    saveTransactions: saveFromUpload, 
    resumeProcessing,
    categorizeAndShowPaused,
    progress, 
    status, 
    isUploading, 
    isSaving: isSavingUpload, 
    isResuming,
    isCategorizing,
    reset, 
    parsedTransactions: uploadedTransactions,
    parseResult,
    batchProgress, 
    canResume,
    pausedTransactionCount,
    failedRowRanges,
    stopProcessing 
  } = useBankFileUpload();

  // Session hook - for loading from database on page refresh
  const {
    session,
    parsedTransactions: sessionTransactions,
    hasActiveSession,
    isLoading: sessionLoading,
    approveAndTransfer,
    cancelSession,
    isApproving,
    uncategorizedCount,
    recategorizeUncategorized,
    isRecategorizing,
    recategorizeAll,
    isRecategorizingAll,
    isCancelling
  } = useBankImportSession();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [error, setError] = useState<string | null>(null);

  // Auto-switch to preview if active session with transactions exists
  useEffect(() => {
    if (hasActiveSession && sessionTransactions.length > 0 && viewMode === 'upload' && !isUploading && !isResuming && !isCategorizing) {
      setViewMode('preview');
    }
  }, [hasActiveSession, sessionTransactions.length, viewMode, isUploading, isResuming, isCategorizing]);

  // Effective transactions: prefer uploaded (fresh), fallback to session (from DB)
  const effectiveTransactions = uploadedTransactions.length > 0 
    ? uploadedTransactions 
    : sessionTransactions;

  const isSaving = isSavingUpload || isApproving;

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const handleParse = async () => {
    if (!selectedFile) return;
    setError(null);
    
    try {
      const result = await uploadAndParse.mutateAsync(selectedFile);
      if (result.length > 0) {
        setViewMode('preview');
      }
    } catch (err: any) {
      if (err.message !== 'PAUSED') {
        setError(err.message);
      }
    }
  };

  const handleResume = async () => {
    setError(null);
    try {
      const result = await resumeProcessing.mutateAsync();
      // Only go to preview if we completed successfully (not paused again)
      if (result.length > 0) {
        setViewMode('preview');
      }
    } catch (err: any) {
      if (err.message !== 'PAUSED') {
        setError(err.message);
      }
    }
  };

  const handleCategorizeAndShow = async () => {
    setError(null);
    try {
      const result = await categorizeAndShowPaused.mutateAsync();
      if (result.length > 0) {
        setViewMode('preview');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Watch for successful completion after resume
  useEffect(() => {
    if (uploadedTransactions.length > 0 && status !== 'parsing' && status !== 'categorizing' && status !== 'paused' && !isResuming) {
      // Processing completed, can go to preview
    }
  }, [uploadedTransactions, status, isResuming]);

  const handleSave = async (transactions: EditableTransaction[]) => {
    try {
      // If we have active session, use approveAndTransfer (moves to main tables)
      if (hasActiveSession && uploadedTransactions.length === 0) {
        await approveAndTransfer();
      } else {
        await saveFromUpload.mutateAsync(transactions);
      }
      setViewMode('completed');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClear = async () => {
    try {
      // 1. Delete session and its transactions from DB
      if (hasActiveSession) {
        await cancelSession();
      }
      
      // 2. Reset React states
      setSelectedFile(null);
      setError(null);
      setViewMode('upload');
      
      // 3. Reset upload hook state (includes cache invalidation)
      reset();
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  const statusText: Record<string, string> = {
    idle: 'Dosya seçin veya sürükleyin',
    uploading: 'Yükleniyor...',
    parsing: 'AI ile işlemler çıkarılıyor...',
    categorizing: 'Kategorize ediliyor...',
    saving: 'Kaydediliyor...',
    completed: 'Tamamlandı!',
    paused: 'Duraklatıldı - Devam edebilirsiniz',
    cancelled: 'İşlem iptal edildi',
    error: 'Hata oluştu'
  };

  const isProcessing = isUploading || isResuming || isCategorizing;

  // Loading state - checking for active session
  if (sessionLoading && viewMode === 'upload') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Mevcut oturum kontrol ediliyor...</span>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  // Preview mode - show transaction editor with tabs
  const isClearing = isCancelling;

  if (viewMode === 'preview' && effectiveTransactions.length > 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleClear} 
              disabled={isSaving || isClearing}
              className="p-2 hover:bg-accent rounded-lg disabled:opacity-50"
            >
              {isClearing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowLeft className="h-5 w-5" />
              )}
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">İşlemleri Düzenle</h1>
              <p className="text-sm text-muted-foreground">
                {effectiveTransactions.length} işlem bulundu - kategorileri seçin
                {session && uploadedTransactions.length === 0 && (
                  <span className="block text-xs mt-1 text-primary">
                    📁 "{session.file_name}" dosyasından yüklendi
                  </span>
                )}
              </p>
            </div>
            <PartnerRuleDialog 
              trigger={
                <Button variant="outline" size="sm" title="Ortak tanımla">
                  <UserPlus className="h-4 w-4" />
                </Button>
              }
              onSuccess={() => recategorizeAll()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => recategorizeAll()}
              disabled={isSaving || isRecategorizingAll || isRecategorizing}
              title="Tüm işlemleri yeniden kategorile"
            >
              {isRecategorizingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClear}
              disabled={isSaving || isClearing}
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Recategorize uncategorized transactions */}
          {uncategorizedCount > 0 && (
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="flex items-center justify-between">
                <span>{uncategorizedCount} işlem kategorilendirilemedi</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => recategorizeUncategorized()}
                  disabled={isRecategorizing}
                >
                  {isRecategorizing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Tekrar Dene
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Failed rows warning */}
          {failedRowRanges.length > 0 && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-red-700 dark:text-red-300">
                ⚠️ Bazı satırlar işlenemedi ({failedRowRanges.length} batch başarısız)
              </AlertTitle>
              <AlertDescription className="mt-2">
                <ul className="list-disc pl-4 space-y-1 text-sm text-red-600 dark:text-red-400">
                  {failedRowRanges.map((batch, i) => (
                    <li key={i}>
                      <span className="font-medium">Satır {batch.rowRange.start}-{batch.rowRange.end}:</span>{' '}
                      {batch.error} ({batch.retryCount} deneme yapıldı)
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-red-500 dark:text-red-400">
                  Bu satırlardaki işlemleri Excel'den kontrol edip <strong>Manuel Giriş</strong> sayfasından ekleyebilirsiniz.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="categorize" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="categorize">📋 İşlemleri Etiketle</TabsTrigger>
              <TabsTrigger value="raw">📄 Ham Veriler</TabsTrigger>
            </TabsList>
            
            <TabsContent value="categorize" className="mt-4">
              <TransactionEditor
                transactions={effectiveTransactions}
                onSave={handleSave}
                isSaving={isSaving}
              />
            </TabsContent>
            
            <TabsContent value="raw" className="mt-4">
              {parseResult && (
                <ParsedTransactionList result={parseResult} />
              )}
            </TabsContent>
          </Tabs>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  // Completed mode
  if (viewMode === 'completed') {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold">Banka Hareketi Yükle</h1>
          </div>

          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-lg font-semibold">Yükleme Tamamlandı!</h2>
                <p className="text-muted-foreground">İşlemler başarıyla kaydedildi</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClear}
                >
                  Yeni Yükle
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate('/finance/bank-transactions')}
                >
                  İşlemleri Gör
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  // Upload mode (default)
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Banka Hareketi Yükle</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <label className={cn(
              "flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              isProcessing ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="hidden"
              />
              
              {status === 'completed' ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : status === 'paused' ? (
                <PlayCircle className="h-12 w-12 text-amber-500" />
              ) : isProcessing ? (
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              ) : (
                <Upload className="h-12 w-12 text-muted-foreground" />
              )}
              
              <p className="text-sm font-medium">{statusText[status]}</p>
              <p className="text-xs text-muted-foreground">Excel formatı (.xlsx, .xls)</p>
            </label>

            {/* Selected file info */}
            {selectedFile && !isProcessing && status !== 'paused' && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClear}
                  className="p-1 hover:bg-accent rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Paused state - show resume info */}
            {status === 'paused' && canResume && (
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-amber-500" />
                  <span className="font-medium text-amber-600 dark:text-amber-400">İşlem Duraklatıldı</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {pausedTransactionCount} işlem çıkarıldı
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Kalan {batchProgress.total - batchProgress.current} batch işlenecek
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleResume}
                      className="flex-1"
                      disabled={isResuming || isCategorizing}
                    >
                      {isResuming ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <PlayCircle className="h-4 w-4 mr-2" />
                      )}
                      Devam Et
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClear}
                      disabled={isResuming || isCategorizing}
                    >
                      İptal
                    </Button>
                  </div>
                  {pausedTransactionCount > 0 && (
                    <Button
                      variant="secondary"
                      onClick={handleCategorizeAndShow}
                      disabled={isResuming || isCategorizing}
                      className="w-full"
                    >
                      {isCategorizing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Mevcut {pausedTransactionCount} İşlemi Görüntüle & Kategorile
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-3">
                <Progress value={progress} />
                
                {/* Detailed Batch Progress for Parsing */}
                {status === 'parsing' && batchProgress.total > 0 && (
                  <div className="space-y-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    {/* Header with stop button */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        İşlemler Çıkarılıyor
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={stopProcessing}
                        className="h-7 px-2 text-xs"
                      >
                        <StopCircle className="h-3 w-3 mr-1" />
                        Duraklat
                      </Button>
                    </div>
                    
                    {/* Main progress bar */}
                    <Progress 
                      value={(batchProgress.current / batchProgress.total) * 100} 
                      className="h-2"
                    />

                    {/* File Info Row */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-background/50 rounded flex items-center gap-2">
                        <FileSpreadsheet className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Excel satır:</span>
                        <span className="font-medium">{batchProgress.totalRowsInFile || '—'}</span>
                      </div>
                      <div className="p-2 bg-background/50 rounded flex items-center gap-2">
                        <Zap className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Batch sayısı:</span>
                        <span className="font-medium">{batchProgress.total}</span>
                      </div>
                    </div>

                    {/* Processing Stats */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-background/50 rounded text-center">
                        <div className="font-semibold text-lg">{batchProgress.current}/{batchProgress.total}</div>
                        <div className="text-muted-foreground">Batch</div>
                      </div>
                      <div className="p-2 bg-background/50 rounded text-center">
                        <div className="font-semibold text-lg text-green-600">{batchProgress.successfulBatches}</div>
                        <div className="text-muted-foreground">Başarılı</div>
                      </div>
                      <div className="p-2 bg-background/50 rounded text-center">
                        <div className={cn("font-semibold text-lg", batchProgress.failedBatches > 0 ? "text-red-500" : "text-muted-foreground")}>
                          {batchProgress.failedBatches}
                        </div>
                        <div className="text-muted-foreground">Başarısız</div>
                      </div>
                    </div>

                    {/* Extracted Transaction Count */}
                    <div className="flex items-center justify-between text-sm p-2 bg-primary/5 rounded">
                      <span className="text-muted-foreground">Çıkarılan işlem:</span>
                      <span className="font-semibold">
                        {batchProgress.processedTransactions}
                        {batchProgress.expectedTransactions > 0 && (
                          <span className="text-muted-foreground font-normal">/{batchProgress.expectedTransactions}</span>
                        )}
                      </span>
                    </div>

                    {/* Active Retry Indicator */}
                    {batchProgress.currentRetryAttempt > 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded animate-pulse">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Batch retry yapılıyor ({batchProgress.currentRetryAttempt}. deneme)...</span>
                      </div>
                    )}

                    {/* Retried Batches Success */}
                    {batchProgress.retriedBatches > 0 && (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>{batchProgress.retriedBatches} batch retry sonrası başarılı</span>
                      </div>
                    )}

                    {/* Footer - Performance Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                        <span>{batchProgress.parallelCount}x paralel • gemini-2.5-pro</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {batchProgress.estimatedTimeLeft > 0 
                            ? `~${Math.ceil(batchProgress.estimatedTimeLeft / 60)}dk kaldı`
                            : 'Hesaplanıyor...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Batch Progress for Categorization */}
                {status === 'categorizing' && batchProgress.total > 0 && (
                  <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-primary flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        AI Kategorilendirme
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={stopProcessing}
                        className="h-7 px-2 text-xs"
                      >
                        <StopCircle className="h-3 w-3 mr-1" />
                        Duraklat
                      </Button>
                    </div>
                    
                    <Progress 
                      value={(batchProgress.current / batchProgress.total) * 100} 
                      className="h-2"
                    />
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">İşlem:</span>
                      <span className="font-semibold">
                        {batchProgress.processedTransactions}/{batchProgress.totalTransactions}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
                        <span>{batchProgress.parallelCount}x paralel • gemini-2.5-flash</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {batchProgress.estimatedTimeLeft > 0 
                            ? `~${Math.ceil(batchProgress.estimatedTimeLeft / 60)}dk`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Status text for uploading step */}
                {status === 'uploading' && (
                  <p className="text-xs text-center text-muted-foreground">
                    Dosya yükleniyor...
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Parse button */}
            {selectedFile && !isProcessing && status !== 'completed' && status !== 'paused' && (
              <Button
                onClick={handleParse}
                className="w-full"
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" />
                AI ile Analiz Et
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomTabBar />
    </div>
  );
}
