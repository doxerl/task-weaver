import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  FormDescription,
} from '@/components/ui/form';
import { TransactionCategory, CategoryType, CostCenter } from '@/types/finance';
import { Loader2 } from 'lucide-react';
import { useCategories } from '@/hooks/finance/useCategories';

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

const accountCodeOptions = [
  { value: '600', label: '600 - Yurtiçi Satışlar' },
  { value: '601', label: '601 - Yurtdışı Satışlar' },
  { value: '602', label: '602 - Diğer Gelirler' },
  { value: '620', label: '620 - Satılan Mamuller Maliyeti' },
  { value: '622', label: '622 - Satılan Hizmet Maliyeti' },
  { value: '632', label: '632 - Genel Yönetim Giderleri' },
  { value: '760', label: '760 - Pazarlama Satış Dağıtım Giderleri' },
  { value: '770', label: '770 - Genel Yönetim Giderleri' },
  { value: '780', label: '780 - Finansman Giderleri' },
  { value: '642', label: '642 - Faiz Gelirleri' },
  { value: '649', label: '649 - Diğer Olağan Gelir ve Karlar' },
  { value: '659', label: '659 - Diğer Olağan Gider ve Zararlar' },
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
  // New fields
  parent_category_id: z.string().optional().nullable(),
  account_code: z.string().optional().nullable(),
  account_subcode: z.string().optional().nullable(),
  cost_center: z.enum(['DELIVERY', 'ADMIN', 'SALES']).optional().nullable(),
  is_kkeg: z.boolean().default(false),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  category?: TransactionCategory;
  onSave: (data: Partial<TransactionCategory>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function CategoryForm({ category, onSave, onCancel, isLoading }: CategoryFormProps) {
  const { t } = useTranslation(['finance', 'common', 'validation']);
  const [selectedEmoji, setSelectedEmoji] = useState(category?.icon || '💰');
  const [selectedColor, setSelectedColor] = useState(category?.color || '#6b7280');
  const { parentCategories } = useCategories();

  const categoryTypes: { value: CategoryType; label: string }[] = [
    { value: 'INCOME', label: t('finance:categories.types.income') },
    { value: 'EXPENSE', label: t('finance:categories.types.expense') },
    { value: 'PARTNER', label: t('finance:categories.types.partner') },
    { value: 'FINANCING', label: t('finance:categories.types.financing') },
    { value: 'INVESTMENT', label: t('finance:categories.types.investment') },
    { value: 'EXCLUDED', label: t('finance:categories.types.excluded') },
  ];

  const costCenterOptions: { value: CostCenter; label: string }[] = [
    { value: null, label: t('finance:categories.form.costCenterOptions.none') },
    { value: 'DELIVERY', label: t('finance:categories.form.costCenterOptions.delivery') },
    { value: 'ADMIN', label: t('finance:categories.form.costCenterOptions.admin') },
    { value: 'SALES', label: t('finance:categories.form.costCenterOptions.sales') },
  ];

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
      parent_category_id: category?.parent_category_id || null,
      account_code: category?.account_code || null,
      account_subcode: category?.account_subcode || null,
      cost_center: category?.cost_center || null,
      is_kkeg: category?.is_kkeg || false,
    },
  });

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z_]/g, '').replace(/\s/g, '_');
    form.setValue('code', value);
  };

  const selectedType = form.watch('type');
  const selectedParent = form.watch('parent_category_id');
  const selectedAccountCode = form.watch('account_code');

  // Filter parent categories by selected type
  const filteredParentCategories = parentCategories.filter(c => c.type === selectedType);

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
      parent_category_id: data.parent_category_id || null,
      cost_center: data.cost_center || null,
      is_kkeg: data.is_kkeg || false,
      depth: data.parent_category_id ? 1 : 0,
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
              <FormLabel>{t('finance:categories.form.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('finance:categories.form.placeholders.name')} {...field} />
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
              <FormLabel>{t('finance:categories.form.code')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('finance:categories.form.placeholders.code')}
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
              <FormLabel>{t('finance:categories.form.type')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('finance:categories.form.type')} />
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

        {/* Parent Category Selection */}
        <FormField
          control={form.control}
          name="parent_category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance:categories.form.parentCategory')} ({t('common:labels.optional')})</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                value={field.value || 'none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('finance:categories.form.parentCategory')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">— {t('finance:categories.form.mainCategory')} —</SelectItem>
                  {filteredParentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t('finance:categories.form.parentCategoryHint')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account Code */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="account_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('finance:categories.form.accountCode')}</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                  value={field.value || 'none'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('finance:categories.form.accountCode')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {accountCodeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="account_subcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('finance:categories.form.subAccountCode')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('finance:categories.form.placeholders.accountCode')}
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Cost Center */}
        <FormField
          control={form.control}
          name="cost_center"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance:categories.form.costCenter')}</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                value={field.value || 'none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('finance:categories.form.costCenter')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {costCenterOptions.map((opt) => (
                    <SelectItem key={opt.value || 'none'} value={opt.value || 'none'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* KKEG Checkbox */}
        <FormField
          control={form.control}
          name="is_kkeg"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>{t('finance:categories.form.kkeg')}</FormLabel>
                <FormDescription>
                  {t('finance:categories.form.kkegDescription')}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>{t('finance:categories.form.icon')}</Label>
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
          <Label>{t('finance:categories.form.color')}</Label>
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
              <FormLabel>{t('finance:categories.form.keywords')} ({t('common:labels.optional')})</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('finance:categories.form.placeholders.keywords')}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                {t('finance:categories.form.keywordsHint')}
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
              <FormLabel>{t('finance:categories.form.vendorPatterns')} ({t('common:labels.optional')})</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('finance:categories.form.placeholders.vendorPatterns')}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                {t('finance:categories.form.vendorPatternsHint')}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? t('common:buttons.update') : t('common:buttons.add')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common:buttons.cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );
}