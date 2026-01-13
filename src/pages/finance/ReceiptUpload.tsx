import { useCallback, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, ArrowLeft, X, FileText, Receipt as ReceiptIcon, Plus, Camera, ImageIcon, Archive, Code, FileCheck } from 'lucide-react';
import { useReceipts } from '@/hooks/finance/useReceipts';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { DocumentType, Receipt, ReceiptSubtype } from '@/types/finance';
import { UploadedReceiptCard } from '@/components/finance/UploadedReceiptCard';
import { ReceiptEditSheet } from '@/components/finance/ReceiptEditSheet';
import { useIsMobile } from '@/hooks/use-mobile';

// Helper to get file type info
function getFileTypeInfo(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'zip') return { type: 'zip', label: 'ZIP Arşiv', icon: Archive, color: 'text-amber-500' };
  if (ext === 'xml') return { type: 'xml', label: 'e-Fatura', icon: Code, color: 'text-green-500' };
  if (file.type === 'application/pdf' || ext === 'pdf') return { type: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-500' };
  return { type: 'image', label: 'Görsel', icon: ImageIcon, color: 'text-blue-500' };
}

export default function ReceiptUpload() {
  const isMobile = useIsMobile();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as DocumentType) || 'received';
  const initialSubtype = (searchParams.get('subtype') as ReceiptSubtype) || 'slip';
  
  // Fetch recent receipts from DB (last 20)
  const { 
    receipts: dbReceipts,
    isLoading: isLoadingReceipts,
    uploadReceipt, 
    uploadProgress, 
    deleteReceipt, 
    updateReceipt,
    reprocessReceipt,
    toggleIncludeInReport,
    isReprocessing
  } = useReceipts();
  
  const [documentType, setDocumentType] = useState<DocumentType>(initialType);
  const [receiptSubtype, setReceiptSubtype] = useState<ReceiptSubtype>(initialSubtype);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(0);
  
  // Uploaded receipts - start with empty, then merge with newly uploaded
  const [sessionUploadedIds, setSessionUploadedIds] = useState<Set<string>>(new Set());
  
  // Show recent receipts from DB (limit to last 20 for this session view)
  const recentReceipts = dbReceipts.slice(0, 20);
  
  // Edit sheet state
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
    
    // Generate previews and auto-detect subtype
    selected.forEach(file => {
      // Auto-detect subtype based on file type
      const fileInfo = getFileTypeInfo(file);
      if (documentType === 'received') {
        if (fileInfo.type === 'pdf' || fileInfo.type === 'xml') {
          setReceiptSubtype('invoice');
        } else if (fileInfo.type === 'image') {
          // Keep current or default to slip for images
          if (receiptSubtype !== 'invoice') {
            setReceiptSubtype('slip');
          }
        }
      }
      
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviews(prev => [...prev, url]);
      } else {
        setPreviews(prev => [...prev, '']);
      }
    });
  }, [documentType, receiptSubtype]);

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
    const uploadedIds: string[] = [];
    
    for (const file of files) {
      const result = await uploadReceipt.mutateAsync({ 
        file, 
        documentType,
        receiptSubtype: documentType === 'received' ? receiptSubtype : undefined
      });
      // Handle both single receipt and array (from ZIP)
      if (Array.isArray(result)) {
        uploadedIds.push(...result.map(r => r.id));
      } else if (result) {
        uploadedIds.push((result as Receipt).id);
      }
      setCompleted(prev => prev + 1);
    }
    
    // Clean up previews
    previews.forEach(url => url && URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setUploading(false);
    
    // Track which receipts were uploaded in this session
    setSessionUploadedIds(prev => new Set([...prev, ...uploadedIds]));
  };

  const handleDelete = async (id: string) => {
    await deleteReceipt.mutateAsync(id);
    setSessionUploadedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleEdit = (id: string) => {
    const receipt = recentReceipts.find(r => r.id === id);
    if (receipt) {
      setEditingReceipt(receipt);
      setEditSheetOpen(true);
    }
  };

  const handleReprocess = async (id: string) => {
    await reprocessReceipt.mutateAsync(id);
  };

  const handleToggleInclude = async (id: string, include: boolean) => {
    await toggleIncludeInReport.mutateAsync({ id, include });
  };

  const handleSaveEdit = async (id: string, data: Partial<Receipt>) => {
    await updateReceipt.mutateAsync({ id, data });
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

        {/* Document Type Selection - Kesilen / Alınan */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setDocumentType('received');
              setReceiptSubtype('slip');
            }}
            disabled={uploading}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              documentType === 'received' 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <ReceiptIcon className="h-5 w-5 text-primary" />
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

        {/* Receipt Subtype Selection - Only for "Alınan" */}
        {documentType === 'received' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setReceiptSubtype('slip')}
              disabled={uploading}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-left",
                receiptSubtype === 'slip' 
                  ? "border-orange-500 bg-orange-500/10" 
                  : "border-border hover:border-orange-500/50"
              )}
            >
              <div className="flex items-center gap-2">
                <ReceiptIcon className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-sm">Fiş</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Market, restoran, benzin vb.
              </p>
            </button>
            
            <button
              onClick={() => setReceiptSubtype('invoice')}
              disabled={uploading}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-left",
                receiptSubtype === 'invoice' 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-border hover:border-blue-500/50"
              )}
            >
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Fatura</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                e-Fatura, e-Arşiv, PDF
              </p>
            </button>
          </div>
        )}

        {/* File Upload Area */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,.pdf,.xml,.zip"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />

            {uploading ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg border-primary bg-primary/5">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm font-medium">Yükleniyor {completed}/{files.length}</p>
                <Progress value={(completed / files.length) * 100} className="w-full" />
              </div>
            ) : (
              <>
                {/* Mobile: Camera + Gallery buttons */}
                {isMobile ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg transition-colors border-primary bg-primary/5 hover:bg-primary/10"
                    >
                      <Camera className="h-10 w-10 text-primary" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Kamera ile Çek</p>
                        <p className="text-xs text-muted-foreground">Fotoğraf çek</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg transition-colors border-muted-foreground/25 hover:border-primary/50"
                    >
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Galeriden Seç</p>
                        <p className="text-xs text-muted-foreground">JPG, PDF, XML, ZIP</p>
                      </div>
                    </button>
                  </div>
                ) : (
                  /* Desktop: Single drop zone */
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-muted-foreground/25 hover:border-primary/50"
                  >
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {receiptSubtype === 'slip' ? 'Fiş seçin' : 'Fatura seçin'}
                    </p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, PDF, XML, ZIP</p>
                  </button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* File Previews - Before Upload */}
        {files.length > 0 && !uploading && (
          <>
            <div className="space-y-3">
              {files.map((file, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex gap-3">
                      {/* Preview */}
                      {(() => {
                        const fileInfo = getFileTypeInfo(file);
                        const FileIcon = fileInfo.icon;
                        return (
                          <div className="w-24 h-24 flex-shrink-0 bg-muted">
                            {previews[i] ? (
                              <img 
                                src={previews[i]} 
                                alt="" 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                <FileIcon className={cn("h-8 w-8", fileInfo.color)} />
                                <span className={cn("text-[10px] font-medium", fileInfo.color)}>{fileInfo.label}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      
                      {/* File Info */}
                      {(() => {
                        const fileInfo = getFileTypeInfo(file);
                        return (
                          <div className="flex-1 py-3 pr-3">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(file.size / 1024).toFixed(0)} KB • {fileInfo.label}
                            </p>
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {documentType === 'issued' ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                                  📤 Kesilen
                                </span>
                              ) : receiptSubtype === 'slip' ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                                  🧾 Fiş
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                                  📄 Fatura
                                </span>
                              )}
                              {fileInfo.type === 'zip' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                                  📦 Çoklu dosya
                                </span>
                              )}
                              {fileInfo.type === 'xml' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                                  ✓ %100 doğruluk
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      
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

        {/* Recent Receipts - Persisted from DB */}
        {isLoadingReceipts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentReceipts.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                📋 Son Yüklenen Belgeler ({recentReceipts.length})
              </h2>
              <Link 
                to="/finance/receipts" 
                className="text-sm text-primary hover:underline"
              >
                Tümünü Gör →
              </Link>
            </div>
            
            <div className="space-y-3">
              {recentReceipts.map((receipt) => (
                <UploadedReceiptCard
                  key={receipt.id}
                  receipt={receipt}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onReprocess={handleReprocess}
                  onToggleInclude={handleToggleInclude}
                  isReprocessing={isReprocessing}
                />
              ))}
            </div>

            {/* Add More Button */}
            <Card className="border-dashed">
              <CardContent className="p-4">
                {isMobile ? (
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent"
                    >
                      <Camera className="h-5 w-5 text-primary" />
                      <span className="text-sm">Kamera</span>
                    </button>
                    <div className="h-6 w-px bg-border" />
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent"
                    >
                      <Plus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Galeri</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-2"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Başka Belge Ekle</span>
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      {/* Edit Sheet */}
      <ReceiptEditSheet
        receipt={editingReceipt}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        onSave={handleSaveEdit}
      />

      <BottomTabBar />
    </div>
  );
}
