import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Edit2, Check } from 'lucide-react';
import { EditableProjectionItem } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { useTranslation } from 'react-i18next';

interface EditableProjectionTableProps {
  title: string;
  description?: string;
  items: EditableProjectionItem[];
  onItemChange: (index: number, field: 'q1' | 'q2' | 'q3' | 'q4', value: number) => void;
  onReset: () => void;
  type: 'revenue' | 'expense';
}

export const EditableProjectionTable = ({
  title,
  description,
  items,
  onItemChange,
  onReset,
  type
}: EditableProjectionTableProps) => {
  const { t } = useTranslation(['simulation']);
  const [editingCell, setEditingCell] = useState<{ index: number; field: string } | null>(null);
  
  const handleInputChange = (index: number, field: 'q1' | 'q2' | 'q3' | 'q4', value: string) => {
    const numValue = parseFloat(value) || 0;
    onItemChange(index, field, numValue);
  };
  
  const handleCellClick = (index: number, field: string) => {
    setEditingCell({ index, field });
  };
  
  const handleBlur = () => {
    setEditingCell(null);
  };
  
  const totalQ1 = items.reduce((sum, item) => sum + item.q1, 0);
  const totalQ2 = items.reduce((sum, item) => sum + item.q2, 0);
  const totalQ3 = items.reduce((sum, item) => sum + item.q3, 0);
  const totalQ4 = items.reduce((sum, item) => sum + item.q4, 0);
  const grandTotal = totalQ1 + totalQ2 + totalQ3 + totalQ4;
  
  const hasEdits = items.some(item => item.userEdited);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            {title}
            {hasEdits && (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
                <Edit2 className="h-3 w-3 mr-1" />
                {t('editableTable.edited')}
              </Badge>
            )}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs mt-1 print-hidden">{description}</CardDescription>
          )}
        </div>
        {hasEdits && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-xs">
            <RotateCcw className="h-3 w-3" />
            {t('editableTable.resetToAI')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">{t('editableTable.item')}</TableHead>
              <TableHead className="text-right w-[90px]">{t('quarters.q1')}</TableHead>
              <TableHead className="text-right w-[90px]">{t('quarters.q2')}</TableHead>
              <TableHead className="text-right w-[90px]">{t('quarters.q3')}</TableHead>
              <TableHead className="text-right w-[90px]">{t('quarters.q4')}</TableHead>
              <TableHead className="text-right w-[100px]">{t('editableTable.total')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.category}>
                <TableCell className="font-medium text-sm">
                  <div className="flex items-center gap-1.5">
                    {item.category}
                    {item.userEdited && (
                      <Check className="h-3 w-3 text-emerald-400" />
                    )}
                  </div>
                </TableCell>
                {(['q1', 'q2', 'q3', 'q4'] as const).map(quarter => (
                  <TableCell key={quarter} className="text-right p-1">
                    {editingCell?.index === index && editingCell?.field === quarter ? (
                      <Input
                        type="number"
                        value={item[quarter]}
                        onChange={(e) => handleInputChange(index, quarter, e.target.value)}
                        onBlur={handleBlur}
                        autoFocus
                        className="w-20 h-7 text-xs text-right"
                      />
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 text-xs"
                        onClick={() => handleCellClick(index, quarter)}
                      >
                        {formatCompactUSD(item[quarter])}
                      </div>
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold text-sm">
                  {formatCompactUSD(item.q1 + item.q2 + item.q3 + item.q4)}
                </TableCell>
              </TableRow>
            ))}
            {/* Totals Row */}
            <TableRow className="border-t-2 bg-muted/30">
              <TableCell className="font-bold text-sm">
                {type === 'revenue' ? t('editableTable.totalRevenue') : t('editableTable.totalExpense')}
              </TableCell>
              <TableCell className="text-right font-bold text-sm">{formatCompactUSD(totalQ1)}</TableCell>
              <TableCell className="text-right font-bold text-sm">{formatCompactUSD(totalQ2)}</TableCell>
              <TableCell className="text-right font-bold text-sm">{formatCompactUSD(totalQ3)}</TableCell>
              <TableCell className="text-right font-bold text-sm">{formatCompactUSD(totalQ4)}</TableCell>
              <TableCell className="text-right font-bold text-sm text-primary">
                {formatCompactUSD(grandTotal)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
