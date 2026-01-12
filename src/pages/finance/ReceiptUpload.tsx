import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, CheckCircle, ArrowLeft, X } from 'lucide-react';
import { useReceipts } from '@/hooks/finance/useReceipts';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';

export default function ReceiptUpload() {
  const { uploadReceipt, uploadProgress } = useReceipts();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(0);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    setUploading(true);
    setCompleted(0);
    
    for (const file of files) {
      await uploadReceipt.mutateAsync(file);
      setCompleted(prev => prev + 1);
    }
    
    setFiles([]);
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/finance/receipts" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Fiş/Fatura Yükle</h1>
        </div>

        <Card>
          <CardContent className="p-4">
            <label className={cn(
              "flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              uploading ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}>
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
              
              {uploading ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground" />
              )}
              
              <p className="text-sm font-medium">
                {uploading ? `Yükleniyor ${completed}/${files.length}` : 'Fiş/Fatura seçin'}
              </p>
              <p className="text-xs text-muted-foreground">JPG, PNG, PDF</p>
            </label>

            {uploading && (
              <Progress value={(completed / files.length) * 100} className="mt-4" />
            )}
          </CardContent>
        </Card>

        {files.length > 0 && !uploading && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {files.map((file, i) => (
                <div key={i} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  {file.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      PDF
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpload}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium"
            >
              {files.length} Dosya Yükle
            </button>
          </>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}
