import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle, ArrowLeft, AlertCircle, FileSpreadsheet, X } from 'lucide-react';
import { useBankFileUpload } from '@/hooks/finance/useBankFileUpload';
import { TransactionEditor, ParsedTransaction, EditableTransaction } from '@/components/finance/TransactionEditor';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ViewMode = 'upload' | 'preview' | 'completed';

export default function BankImport() {
  const navigate = useNavigate();
  const { uploadAndParse, saveTransactions, progress, status, isUploading, isSaving, reset, parsedTransactions } = useBankFileUpload();
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
      await uploadAndParse.mutateAsync(selectedFile);
      setViewMode('preview');
    } catch (err: any) {
      setError(err.message);
    }
  };

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
    parsing: 'AI ile analiz ediliyor (Extended Thinking)...',
    categorizing: 'Kategorize ediliyor...',
    saving: 'Kaydediliyor...',
    completed: 'Tamamlandı!',
    error: 'Hata oluştu'
  };

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
              isUploading ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
              
              {status === 'completed' ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : isUploading ? (
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              ) : (
                <Upload className="h-12 w-12 text-muted-foreground" />
              )}
              
              <p className="text-sm font-medium">{statusText[status]}</p>
              <p className="text-xs text-muted-foreground">Excel (.xlsx, .xls) veya PDF</p>
            </label>

            {/* Selected file info */}
            {selectedFile && !isUploading && (
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

            {/* Progress */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-center text-muted-foreground">
                  {status === 'uploading' && 'Dosya yükleniyor...'}
                  {status === 'parsing' && 'Claude AI ile analiz ediliyor (Extended Thinking aktif)...'}
                  {status === 'categorizing' && 'Kategoriler öneriliyor...'}
                </p>
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
            {selectedFile && !isUploading && status !== 'completed' && (
              <Button
                onClick={handleParse}
                className="w-full"
                disabled={isUploading}
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
