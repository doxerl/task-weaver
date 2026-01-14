import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Divide } from 'lucide-react';
import { ProjectionItem, InvestmentItem, QuarterlyAmounts } from '@/types/simulation';

interface AddItemDialogProps {
  type: 'revenue' | 'expense' | 'investment';
  onAdd: (item: Omit<ProjectionItem, 'id'> | Omit<InvestmentItem, 'id'>) => void;
}

const QUARTERS = [
  { key: 'q1', label: 'Q1', months: 'Oca-Mar' },
  { key: 'q2', label: 'Q2', months: 'Nis-Haz' },
  { key: 'q3', label: 'Q3', months: 'Tem-Eyl' },
  { key: 'q4', label: 'Q4', months: 'Eki-Ara' },
] as const;

export function AddItemDialog({ type, onAdd }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [q4, setQ4] = useState('');

  const quarterlyValues = useMemo(() => ({
    q1: parseFloat(q1) || 0,
    q2: parseFloat(q2) || 0,
    q3: parseFloat(q3) || 0,
    q4: parseFloat(q4) || 0,
  }), [q1, q2, q3, q4]);

  const yearlyTotal = useMemo(() => {
    return quarterlyValues.q1 + quarterlyValues.q2 + quarterlyValues.q3 + quarterlyValues.q4;
  }, [quarterlyValues]);

  const distributeEvenly = () => {
    if (yearlyTotal <= 0) return;
    const perQuarter = Math.floor(yearlyTotal / 4);
    const remainder = yearlyTotal - (perQuarter * 4);
    setQ1(perQuarter.toString());
    setQ2(perQuarter.toString());
    setQ3(perQuarter.toString());
    setQ4((perQuarter + remainder).toString());
  };

  const handleSubmit = () => {
    if (!name || yearlyTotal <= 0) return;

    const quarterly: QuarterlyAmounts = quarterlyValues;

    if (type === 'investment') {
      onAdd({
        name,
        amount: yearlyTotal,
        description,
        month: 1, // Default to January, but quarterly is the real distribution
        quarterly,
      } as Omit<InvestmentItem, 'id'>);
    } else {
      onAdd({
        category: name,
        baseAmount: 0,
        projectedAmount: yearlyTotal,
        baseQuarterly: { q1: 0, q2: 0, q3: 0, q4: 0 },
        projectedQuarterly: quarterly,
        description,
        isNew: true,
      } as Omit<ProjectionItem, 'id'>);
    }

    // Reset form
    setName('');
    setDescription('');
    setQ1('');
    setQ2('');
    setQ3('');
    setQ4('');
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

  const getQuarterlyLabel = () => {
    switch (type) {
      case 'revenue': return 'Çeyreklik Gelir Projeksiyonu (USD)';
      case 'expense': return 'Çeyreklik Gider Projeksiyonu (USD)';
      case 'investment': return 'Çeyreklik Yatırım Dağılımı (USD)';
    }
  };

  const quarterSetters = {
    q1: setQ1,
    q2: setQ2,
    q3: setQ3,
    q4: setQ4,
  };

  const quarterValues = {
    q1,
    q2,
    q3,
    q4,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
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

          <div className="space-y-3">
            <Label>{getQuarterlyLabel()}</Label>
            <div className="grid grid-cols-4 gap-2">
              {QUARTERS.map((quarter) => (
                <div key={quarter.key} className="space-y-1">
                  <div className="text-center">
                    <span className="text-xs font-medium">{quarter.label}</span>
                    <span className="text-[10px] text-muted-foreground block">{quarter.months}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    <Input
                      type="number"
                      value={quarterValues[quarter.key]}
                      onChange={(e) => quarterSetters[quarter.key](e.target.value)}
                      className="pl-5 text-sm text-center"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-sm text-muted-foreground">
                Yıllık Toplam: <span className="font-semibold text-foreground">${yearlyTotal.toLocaleString()}</span>
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={distributeEvenly} 
                disabled={yearlyTotal <= 0}
                className="gap-1.5 text-xs"
              >
                <Divide className="h-3 w-3" />
                Eşit Dağıt
              </Button>
            </div>
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
          <Button onClick={handleSubmit} disabled={!name || yearlyTotal <= 0}>
            Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
