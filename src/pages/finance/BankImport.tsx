import { useCallback, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle, ArrowLeft, AlertCircle, FileSpreadsheet, X, StopCircle, PlayCircle, Eye } from 'lucide-react';
import { useBankFileUpload } from '@/hooks/finance/useBankFileUpload';
import { TransactionEditor, ParsedTransaction, EditableTransaction } from '@/components/finance/TransactionEditor';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ViewMode = 'upload' | 'preview' | 'completed';

export default function BankImport() {
  const navigate = useNavigate();
  const { 
    uploadAndParse, 
    saveTransactions, 
    resumeProcessing,
    categorizeAndShowPaused,
    progress, 
    status, 
    isUploading, 
    isSaving, 
    isResuming,
    isCategorizing,
    reset, 
    parsedTransactions, 
    batchProgress, 
    canResume,
    pausedTransactionCount,
    stopProcessing 
  } = useBankFileUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [error, setError] = useState<string | null>(null);

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
    if (parsedTransactions.length > 0 && status !== 'parsing' && status !== 'categorizing' && status !== 'paused' && !isResuming) {
      // Processing completed, can go to preview
    }
  }, [parsedTransactions, status, isResuming]);

  const handleSave = async (transactions: EditableTransaction[]) => {
    try {
      await saveTransactions.mutateAsync(transactions);
      setViewMode('completed');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
    setViewMode('upload');
    reset();
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

  // Preview mode - show transaction editor
  if (viewMode === 'preview' && parsedTransactions.length > 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={handleClear} className="p-2 hover:bg-accent rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">İşlemleri Düzenle</h1>
              <p className="text-sm text-muted-foreground">
                {parsedTransactions.length} işlem bulundu - kategorileri seçin
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TransactionEditor
            transactions={parsedTransactions}
            onSave={handleSave}
            isSaving={isSaving}
          />
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
                
                {/* Batch Progress for Parsing */}
                {status === 'parsing' && batchProgress.total > 0 && (
                  <div className="space-y-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-blue-600 dark:text-blue-400">İşlemler Çıkarılıyor</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={stopProcessing}
                        className="h-6 px-2 text-xs"
                      >
                        <StopCircle className="h-3 w-3 mr-1" />
                        Duraklat
                      </Button>
                    </div>
                    
                    <Progress 
                      value={(batchProgress.current / batchProgress.total) * 100} 
                      className="h-2"
                    />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Batch {batchProgress.current}/{batchProgress.total}
                      </span>
                      <span>
                        {batchProgress.processedTransactions} işlem çıkarıldı
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                        <span>3x paralel • gemini-2.5-pro</span>
                      </div>
                      <span>
                        {batchProgress.estimatedTimeLeft > 0 
                          ? `~${Math.ceil(batchProgress.estimatedTimeLeft / 60)}dk`
                          : ''}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Batch Progress for Categorization */}
                {status === 'categorizing' && batchProgress.total > 0 && (
                  <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-primary">AI Kategorilendirme</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={stopProcessing}
                        className="h-6 px-2 text-xs"
                      >
                        <StopCircle className="h-3 w-3 mr-1" />
                        Duraklat
                      </Button>
                    </div>
                    
                    <Progress 
                      value={(batchProgress.current / batchProgress.total) * 100} 
                      className="h-2"
                    />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Batch {batchProgress.current}/{batchProgress.total}
                      </span>
                      <span>
                        {batchProgress.processedTransactions}/{batchProgress.totalTransactions} işlem
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
                        <span>3x paralel • gemini-2.5-flash</span>
                      </div>
                      <span>
                        {batchProgress.estimatedTimeLeft > 0 
                          ? `~${Math.ceil(batchProgress.estimatedTimeLeft / 60)}dk`
                          : ''}
                      </span>
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
