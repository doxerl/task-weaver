import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Building2, User, FileText, Trash2, Pencil, ZoomIn, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useReceipts } from '@/hooks/finance/useReceipts';
import { useCategories } from '@/hooks/finance/useCategories';
import { ReceiptEditSheet } from '@/components/finance/ReceiptEditSheet';
import { BottomTabBar } from '@/components/BottomTabBar';
import { cn } from '@/lib/utils';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  
  const { receipts, isLoading, updateCategory, toggleIncludeInReport, deleteReceipt, updateReceipt } = useReceipts();
  const { grouped } = useCategories();

  const receipt = receipts.find(r => r.id === id);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/finance/receipts" className="p-2 hover:bg-accent rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold">Fatura Bulunamadı</h1>
          </div>
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Bu ID'ye sahip fatura bulunamadı.
              <Link to="/finance/receipts" className="block mt-2 text-primary underline">
                Faturalara Dön
              </Link>
            </CardContent>
          </Card>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  const isReceived = receipt.document_type !== 'issued';
  const categories = isReceived ? grouped.expense : grouped.income;

  const handleDelete = async () => {
    await deleteReceipt.mutateAsync(receipt.id);
    navigate('/finance/receipts');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/finance/receipts" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">
            {isReceived ? 'Alınan Fatura' : 'Kesilen Fatura'}
          </h1>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Düzenle
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Sil
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Faturayı Sil</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu faturayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Sil
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Document Preview */}
        <Card>
          <CardContent className="p-4">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative cursor-pointer group">
                  {receipt.file_url ? (
                    <img 
                      src={receipt.file_url} 
                      alt="Fatura" 
                      className="w-full max-h-64 object-contain rounded-lg bg-muted"
                    />
                  ) : receipt.thumbnail_url ? (
                    <img 
                      src={receipt.thumbnail_url} 
                      alt="Fatura" 
                      className="w-full max-h-64 object-contain rounded-lg bg-muted"
                    />
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white" />
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                {receipt.file_url ? (
                  <img 
                    src={receipt.file_url} 
                    alt="Fatura" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Görsel yok
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Seller/Buyer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {isReceived ? 'Satıcı Bilgileri' : 'Satıcı Bilgileri (Siz)'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Firma Adı:</span>
                <p className="font-medium">{receipt.seller_name || receipt.vendor_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">VKN/TCKN:</span>
                <p className="font-mono">{receipt.seller_tax_no || receipt.vendor_tax_no || '-'}</p>
              </div>
              {receipt.seller_address && (
                <div>
                  <span className="text-muted-foreground">Adres:</span>
                  <p>{receipt.seller_address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                {isReceived ? 'Alıcı Bilgileri (Siz)' : 'Alıcı Bilgileri'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Firma Adı:</span>
                <p className="font-medium">{receipt.buyer_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">VKN/TCKN:</span>
                <p className="font-mono">{receipt.buyer_tax_no || '-'}</p>
              </div>
              {receipt.buyer_address && (
                <div>
                  <span className="text-muted-foreground">Adres:</span>
                  <p>{receipt.buyer_address}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Finansal Detaylar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Fatura Tarihi:</span>
                <p className="font-medium">{formatDate(receipt.receipt_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fatura No:</span>
                <p className="font-mono">{receipt.receipt_no || '-'}</p>
              </div>
            </div>

            <hr />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ara Toplam:</span>
                <span>{receipt.subtotal ? formatCurrency(receipt.subtotal) : '-'}</span>
              </div>
              {receipt.vat_amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    KDV {receipt.vat_rate ? `(%${receipt.vat_rate})` : ''}:
                  </span>
                  <span className="text-green-600">+{formatCurrency(receipt.vat_amount)}</span>
                </div>
              )}
              {receipt.withholding_tax_amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Stopaj {receipt.withholding_tax_rate ? `(%${receipt.withholding_tax_rate})` : ''}:
                  </span>
                  <span className="text-destructive">-{formatCurrency(receipt.withholding_tax_amount)}</span>
                </div>
              )}
              {receipt.stamp_tax_amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Damga Vergisi:</span>
                  <span>+{formatCurrency(receipt.stamp_tax_amount)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between font-bold text-lg">
                <span>GENEL TOPLAM:</span>
                <span className={isReceived ? "text-destructive" : "text-green-600"}>
                  {formatCurrency(receipt.total_amount || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={receipt.category_id || ''}
              onValueChange={categoryId => updateCategory.mutate({ id: receipt.id, categoryId: categoryId || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategori seçin..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Bank Matching */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Banka Eşleştirme
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receipt.linked_bank_transaction_id ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Banka işlemi ile eşleştirildi
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-yellow-600">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                  Henüz eşleşen banka işlemi yok
                </div>
                <Button variant="outline" size="sm" disabled>
                  Eşleştir
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Include in Report */}
        <Card className={cn(receipt.is_included_in_report && "ring-2 ring-green-500")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="include-report"
                checked={receipt.is_included_in_report}
                onCheckedChange={checked => toggleIncludeInReport.mutate({ id: receipt.id, include: !!checked })}
              />
              <label htmlFor="include-report" className="text-sm font-medium cursor-pointer">
                Rapora Dahil Et
              </label>
            </div>
            {receipt.is_included_in_report && (
              <p className="text-xs text-muted-foreground mt-2">
                Bu fatura gelir-gider tablosu ve KDV raporuna dahil edilecektir.
              </p>
            )}
          </CardContent>
        </Card>

        {/* OCR Info */}
        {receipt.ocr_confidence && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">OCR Güvenilirliği:</span>
                <span className={cn(
                  "font-medium",
                  receipt.ocr_confidence > 0.8 ? "text-green-600" :
                  receipt.ocr_confidence > 0.5 ? "text-yellow-600" : "text-destructive"
                )}>
                  %{Math.round(receipt.ocr_confidence * 100)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Sheet */}
      <ReceiptEditSheet
        receipt={receipt}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(updates) => {
          updateReceipt.mutate({ id: receipt.id, updates });
          setEditOpen(false);
        }}
      />

      <BottomTabBar />
    </div>
  );
}
