import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { TransactionCategory, CategoryType } from '@/types/finance';
import { Loader2 } from 'lucide-react';

const COMMON_EMOJIS = [
  '💰', '💵', '💳', '🏦', '📊', '📈', '📉',
  '🛒', '🛍️', '🍽️', '🚗', '✈️', '🏠', '💼',
  '📱', '💻', '🔧', '📦', '🎓', '⚖️', '🏥',
  '📋', '📝', '🔌', '💡', '🚛', '👥', '🎁',
  '🏢', '🏭', '⚙️', '🎯', '📞', '✉️', '🔒'
];

const COLOR_PALETTE = [
  '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#6b7280', '#0ea5e9', '#84cc16',
  '#f97316', '#06b6d4', '#a855f7', '#10b981', '#dc2626'
];

const categoryTypes: { value: CategoryType; label: string }[] = [
  { value: 'INCOME', label: 'Gelir' },
  { value: 'EXPENSE', label: 'Gider' },
  { value: 'PARTNER', label: 'Ortak Cari' },
  { value: 'FINANCING', label: 'Finansman' },
  { value: 'INVESTMENT', label: 'Yatırım' },
  { value: 'EXCLUDED', label: 'Hariç' },
];

const categorySchema = z.object({
  name: z.string().min(2, 'En az 2 karakter').max(50, 'En fazla 50 karakter'),
  code: z.string().min(2, 'En az 2 karakter').max(20, 'En fazla 20 karakter')
    .regex(/^[A-Z_]+$/, 'Sadece büyük harf ve alt çizgi'),
  type: z.enum(['INCOME', 'EXPENSE', 'PARTNER', 'FINANCING', 'INVESTMENT', 'EXCLUDED']),
  icon: z.string().default('💰'),
  color: z.string().default('#6b7280'),
  keywords: z.string().optional(),
  vendor_patterns: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  category?: TransactionCategory;
  onSave: (data: Partial<TransactionCategory>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function CategoryForm({ category, onSave, onCancel, isLoading }: CategoryFormProps) {
  const [selectedEmoji, setSelectedEmoji] = useState(category?.icon || '💰');
  const [selectedColor, setSelectedColor] = useState(category?.color || '#6b7280');

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      code: category?.code || '',
      type: (category?.type as CategoryType) || 'EXPENSE',
      icon: category?.icon || '💰',
      color: category?.color || '#6b7280',
      keywords: category?.keywords?.join(', ') || '',
      vendor_patterns: category?.vendor_patterns?.join(', ') || '',
    },
  });

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z_]/g, '').replace(/\s/g, '_');
    form.setValue('code', value);
  };

  const onSubmit = (data: CategoryFormData) => {
    const keywords = data.keywords
      ? data.keywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];
    const vendor_patterns = data.vendor_patterns
      ? data.vendor_patterns.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    onSave({
      ...data,
      icon: selectedEmoji,
      color: selectedColor,
      keywords,
      vendor_patterns,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategori Adı</FormLabel>
              <FormControl>
                <Input placeholder="örn: Personel Giderleri" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kod</FormLabel>
              <FormControl>
                <Input
                  placeholder="örn: PERSONEL"
                  {...field}
                  onChange={handleCodeChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tür</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Tür seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoryTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>İkon</Label>
          <div className="flex flex-wrap gap-2 p-2 border rounded-lg max-h-32 overflow-y-auto">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`w-8 h-8 flex items-center justify-center rounded hover:bg-accent transition-colors ${
                  selectedEmoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Renk</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-8 h-8 rounded-full transition-transform ${
                  selectedColor === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="keywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anahtar Kelimeler (opsiyonel)</FormLabel>
              <FormControl>
                <Input
                  placeholder="örn: maaş, bordro, sgk"
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                AI eşleştirme için virgülle ayrılmış kelimeler
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vendor_patterns"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Satıcı Kalıpları (opsiyonel)</FormLabel>
              <FormControl>
                <Input
                  placeholder="örn: TURK TELEKOM, VODAFONE"
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Otomatik eşleşme için satıcı isimleri
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? 'Güncelle' : 'Ekle'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            İptal
          </Button>
        </div>
      </form>
    </Form>
  );
}
