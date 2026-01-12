import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, ArrowLeft, X, FileText, Receipt } from 'lucide-react';
import { useReceipts } from '@/hooks/finance/useReceipts';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { DocumentType } from '@/types/finance';

export default function ReceiptUpload() {
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as DocumentType) || 'received';
  
  const { uploadReceipt, uploadProgress } = useReceipts();
  const [documentType, setDocumentType] = useState<DocumentType>(initialType);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(0);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
    
    // Generate previews
    selected.forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviews(prev => [...prev, url]);
      } else {
        setPreviews(prev => [...prev, '']);
      }
    });
  }, []);

  const removeFile = (index: number) => {
    // Revoke object URL to prevent memory leaks
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]);
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    setUploading(true);
    setCompleted(0);
    
    for (const file of files) {
      await uploadReceipt.mutateAsync({ file, documentType });
      setCompleted(prev => prev + 1);
    }
    
    // Clean up previews
    previews.forEach(url => url && URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
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

        {/* Document Type Selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDocumentType('received')}
            disabled={uploading}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              documentType === 'received' 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-5 w-5 text-primary" />
              <span className="font-semibold">Alınan</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Gider fişi/faturası
            </p>
          </button>
          
          <button
            onClick={() => setDocumentType('issued')}
            disabled={uploading}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              documentType === 'issued' 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Kesilen</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Gelir faturası
            </p>
          </button>
        </div>

        {/* File Upload Area */}
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

        {/* File Previews */}
        {files.length > 0 && !uploading && (
          <>
            <div className="space-y-3">
              {files.map((file, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex gap-3">
                      {/* Preview */}
                      <div className="w-24 h-24 flex-shrink-0 bg-muted">
                        {previews[i] ? (
                          <img 
                            src={previews[i]} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* File Info */}
                      <div className="flex-1 py-3 pr-3">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(file.size / 1024).toFixed(0)} KB • {file.type.split('/')[1].toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            documentType === 'received' 
                              ? "bg-primary/10 text-primary" 
                              : "bg-green-500/10 text-green-600"
                          )}>
                            {documentType === 'received' ? '📥 Alınan' : '📤 Kesilen'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeFile(i)}
                        className="self-start p-2 hover:bg-destructive/10 rounded-lg m-2"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
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