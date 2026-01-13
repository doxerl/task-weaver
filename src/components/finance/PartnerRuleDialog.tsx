import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2 } from 'lucide-react';
import { useCategoryRules } from '@/hooks/finance/useCategoryRules';
import { useToast } from '@/hooks/use-toast';

interface PartnerRuleDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function PartnerRuleDialog({ trigger, onSuccess }: PartnerRuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [description, setDescription] = useState('');
  const { createRule } = useCategoryRules();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!partnerName.trim()) {
      toast({
        title: 'Hata',
        description: 'Ortak adı giriniz',
        variant: 'destructive'
      });
      return;
    }

    try {
      await createRule.mutateAsync({
        pattern: partnerName.trim().toUpperCase(),
        is_partner_rule: true,
        partner_type: 'BOTH',
        description: description || `Şirket ortağı: ${partnerName}`,
        priority: 10, // High priority for partner rules
        rule_type: 'contains',
        amount_condition: 'any'
      });

      toast({
        title: 'Başarılı',
        description: `"${partnerName}" ortak olarak tanımlandı. Bu kişinin adı geçen işlemler otomatik olarak kategorilenir.`
      });

      setPartnerName('');
      setDescription('');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Kural oluşturulamadı',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Ortak Tanımla
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Şirket Ortağı Tanımla</DialogTitle>
          <DialogDescription>
            Bu kişinin adı geçen havale/EFT işlemleri otomatik olarak kategorilenir:
            <ul className="list-disc list-inside mt-2 text-sm">
              <li><span className="text-destructive">Giden para</span> → ORTAK_OUT (Ortağa Ödeme)</li>
              <li><span className="text-green-600">Gelen para</span> → ORTAK_IN (Ortaktan Tahsilat)</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="partnerName">Ortak Adı *</Label>
            <Input
              id="partnerName"
              placeholder="Örn: EMRE AKÇAOĞLU"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Banka ekstresinde göründüğü şekilde yazın
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
            <Input
              id="description"
              placeholder="Örn: %50 hissedar"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={createRule.isPending}>
            {createRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
