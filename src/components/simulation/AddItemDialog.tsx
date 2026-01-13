import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { ProjectionItem, InvestmentItem } from '@/types/simulation';

interface AddItemDialogProps {
  type: 'revenue' | 'expense' | 'investment';
  onAdd: (item: Omit<ProjectionItem, 'id'> | Omit<InvestmentItem, 'id'>) => void;
}

const MONTHS = [
  { value: '1', label: 'Ocak' },
  { value: '2', label: 'Şubat' },
  { value: '3', label: 'Mart' },
  { value: '4', label: 'Nisan' },
  { value: '5', label: 'Mayıs' },
  { value: '6', label: 'Haziran' },
  { value: '7', label: 'Temmuz' },
  { value: '8', label: 'Ağustos' },
  { value: '9', label: 'Eylül' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasım' },
  { value: '12', label: 'Aralık' },
];

export function AddItemDialog({ type, onAdd }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [startMonth, setStartMonth] = useState('1');

  const handleSubmit = () => {
    if (!name || !amount) return;

    if (type === 'investment') {
      onAdd({
        name,
        amount: parseFloat(amount),
        description,
        month: parseInt(startMonth),
      } as Omit<InvestmentItem, 'id'>);
    } else {
      onAdd({
        category: name,
        baseAmount: 0,
        projectedAmount: parseFloat(amount),
        description,
        isNew: true,
        startMonth: parseInt(startMonth),
      } as Omit<ProjectionItem, 'id'>);
    }

    // Reset form
    setName('');
    setAmount('');
    setDescription('');
    setStartMonth('1');
    setOpen(false);
  };

  const getTitle = () => {
    switch (type) {
      case 'revenue': return 'Yeni Gelir Kalemi';
      case 'expense': return 'Yeni Gider Kalemi';
      case 'investment': return 'Yeni Yatırım';
    }
  };

  const getNameLabel = () => {
    switch (type) {
      case 'revenue': return 'Hizmet/Ürün Adı';
      case 'expense': return 'Gider Kalemi';
      case 'investment': return 'Yatırım Adı';
    }
  };

  const getAmountLabel = () => {
    switch (type) {
      case 'revenue': return '2026 Hedef Gelir (USD)';
      case 'expense': return '2026 Planlanan Gider (USD)';
      case 'investment': return 'Yatırım Tutarı (USD)';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ekle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{getNameLabel()}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="örn: AI Danışmanlık Hizmeti"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">{getAmountLabel()}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                placeholder="50000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startMonth">Başlangıç Ayı</Label>
            <Select value={startMonth} onValueChange={setStartMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaylı açıklama veya gerekçe..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !amount}>
            Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
