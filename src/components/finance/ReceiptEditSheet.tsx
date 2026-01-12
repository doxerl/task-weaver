import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt } from '@/types/finance';
import { Save, Loader2 } from 'lucide-react';

interface ReceiptEditSheetProps {
  receipt: Receipt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<Receipt>) => Promise<void>;
}

export function ReceiptEditSheet({
  receipt,
  open,
  onOpenChange,
  onSave
}: ReceiptEditSheetProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    seller_name: '',
    seller_tax_no: '',
    buyer_name: '',
    buyer_tax_no: '',
    subtotal: '',
    vat_rate: '',
    vat_amount: '',
    total_amount: '',
    receipt_date: '',
    receipt_no: ''
  });

  useEffect(() => {
    if (receipt) {
      setFormData({
        seller_name: receipt.seller_name || '',
        seller_tax_no: receipt.seller_tax_no || '',
        buyer_name: receipt.buyer_name || '',
        buyer_tax_no: receipt.buyer_tax_no || '',
        subtotal: receipt.subtotal?.toString() || '',
        vat_rate: receipt.vat_rate?.toString() || '',
        vat_amount: receipt.vat_amount?.toString() || '',
        total_amount: receipt.total_amount?.toString() || '',
        receipt_date: receipt.receipt_date || '',
        receipt_no: receipt.receipt_no || ''
      });
    }
  }, [receipt]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-calculate VAT when subtotal or rate changes
  const calculateVat = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const vatRate = parseFloat(formData.vat_rate) || 0;
    const vatAmount = (subtotal * vatRate) / 100;
    const total = subtotal + vatAmount;
    
    setFormData(prev => ({
      ...prev,
      vat_amount: vatAmount.toFixed(2),
      total_amount: total.toFixed(2)
    }));
  };

  const handleSave = async () => {
    if (!receipt) return;
    
    setSaving(true);
    try {
      await onSave(receipt.id, {
        seller_name: formData.seller_name || null,
        seller_tax_no: formData.seller_tax_no || null,
        buyer_name: formData.buyer_name || null,
        buyer_tax_no: formData.buyer_tax_no || null,
        subtotal: formData.subtotal ? parseFloat(formData.subtotal) : null,
        vat_rate: formData.vat_rate ? parseFloat(formData.vat_rate) : null,
        vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
        total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
        receipt_date: formData.receipt_date || null,
        receipt_no: formData.receipt_no || null
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Fiş/Fatura Düzenle</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4">
          {/* Seller Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Satıcı Bilgileri</h3>
            <div>
              <Label htmlFor="seller_name">Satıcı Adı</Label>
              <Input
                id="seller_name"
                value={formData.seller_name}
                onChange={(e) => handleChange('seller_name', e.target.value)}
                placeholder="A101 Market"
              />
            </div>
            <div>
              <Label htmlFor="seller_tax_no">Satıcı VKN</Label>
              <Input
                id="seller_tax_no"
                value={formData.seller_tax_no}
                onChange={(e) => handleChange('seller_tax_no', e.target.value)}
                placeholder="1234567890"
              />
            </div>
          </div>

          {/* Buyer Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Alıcı Bilgileri</h3>
            <div>
              <Label htmlFor="buyer_name">Alıcı Adı</Label>
              <Input
                id="buyer_name"
                value={formData.buyer_name}
                onChange={(e) => handleChange('buyer_name', e.target.value)}
                placeholder="Şirket Adı"
              />
            </div>
            <div>
              <Label htmlFor="buyer_tax_no">Alıcı VKN</Label>
              <Input
                id="buyer_tax_no"
                value={formData.buyer_tax_no}
                onChange={(e) => handleChange('buyer_tax_no', e.target.value)}
                placeholder="0987654321"
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Tutar Bilgileri</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="subtotal">Ara Toplam</Label>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  value={formData.subtotal}
                  onChange={(e) => handleChange('subtotal', e.target.value)}
                  onBlur={calculateVat}
                  placeholder="1000.00"
                />
              </div>
              <div>
                <Label htmlFor="vat_rate">KDV Oranı (%)</Label>
                <Input
                  id="vat_rate"
                  type="number"
                  value={formData.vat_rate}
                  onChange={(e) => handleChange('vat_rate', e.target.value)}
                  onBlur={calculateVat}
                  placeholder="20"
                />
              </div>
              <div>
                <Label htmlFor="vat_amount">KDV Tutarı</Label>
                <Input
                  id="vat_amount"
                  type="number"
                  step="0.01"
                  value={formData.vat_amount}
                  onChange={(e) => handleChange('vat_amount', e.target.value)}
                  placeholder="200.00"
                />
              </div>
              <div>
                <Label htmlFor="total_amount">Toplam</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => handleChange('total_amount', e.target.value)}
                  placeholder="1200.00"
                />
              </div>
            </div>
          </div>

          {/* Document Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Belge Bilgileri</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="receipt_date">Tarih</Label>
                <Input
                  id="receipt_date"
                  type="date"
                  value={formData.receipt_date}
                  onChange={(e) => handleChange('receipt_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="receipt_no">Fiş/Fatura No</Label>
                <Input
                  id="receipt_no"
                  value={formData.receipt_no}
                  onChange={(e) => handleChange('receipt_no', e.target.value)}
                  placeholder="FIS-12345"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            className="w-full"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Kaydet
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
