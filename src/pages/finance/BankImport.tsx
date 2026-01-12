import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { useBankFileUpload } from '@/hooks/finance/useBankFileUpload';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';

export default function BankImport() {
  const { upload, progress, status, isUploading, reset } = useBankFileUpload();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
  }, [upload]);

  const statusText: Record<string, string> = {
    idle: 'Dosya seçin veya sürükleyin',
    uploading: 'Yükleniyor...',
    parsing: 'AI ile okunuyor...',
    categorizing: 'Kategorize ediliyor...',
    saving: 'Kaydediliyor...',
    completed: 'Tamamlandı!',
    error: 'Hata oluştu'
  };

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
          <CardContent className="p-6">
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
              <p className="text-xs text-muted-foreground">PDF, XLSX, XLS</p>
            </label>

            {isUploading && (
              <Progress value={progress} className="mt-4" />
            )}

            {status === 'completed' && (
              <div className="mt-4 flex gap-2">
                <Link to="/finance/bank-transactions" className="flex-1">
                  <button className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg">
                    İşlemleri Gör
                  </button>
                </Link>
                <button onClick={reset} className="px-4 py-2 border rounded-lg">
                  Yeni Yükle
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomTabBar />
    </div>
  );
}
