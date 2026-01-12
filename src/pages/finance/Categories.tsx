import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { useCategories } from '@/hooks/finance/useCategories';
import { BottomTabBar } from '@/components/BottomTabBar';
import { CategoryForm } from '@/components/finance/CategoryForm';
import { TransactionCategory } from '@/types/finance';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const typeLabels: Record<string, string> = {
  INCOME: 'Gelir',
  EXPENSE: 'Gider',
  PARTNER: 'Ortak Cari',
  FINANCING: 'Finansman',
  INVESTMENT: 'Yatırım',
  EXCLUDED: 'Hariç'
};

export default function Categories() {
  const { grouped, isLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<TransactionCategory | null>(null);

  const handleSave = async (data: Partial<TransactionCategory>) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...data });
        toast.success('Kategori güncellendi');
      } else {
        await createCategory.mutateAsync(data);
        toast.success('Kategori eklendi');
      }
      setIsFormOpen(false);
      setEditingCategory(null);
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleEdit = (category: TransactionCategory) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategory.mutateAsync(deletingCategory.id);
      toast.success('Kategori silindi');
      setDeletingCategory(null);
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold">Kategoriler</h1>
          </div>
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ekle
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).filter(([key]) => key !== 'all').map(([type, cats]) => (
              <div key={type}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                  {typeLabels[type.toUpperCase()] || type}
                </h2>
                <Card>
                  <CardContent className="p-2 space-y-1">
                    {cats.map(cat => (
                      <div key={cat.id} className="flex items-center gap-3 p-2 rounded hover:bg-accent group">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="flex-1">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">{cat.code}</span>
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.is_system ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleEdit(cat)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeletingCategory(cat)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {cats.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Bu türde kategori yok
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={isFormOpen} onOpenChange={handleCloseForm}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CategoryForm
              category={editingCategory || undefined}
              onSave={handleSave}
              onCancel={handleCloseForm}
              isLoading={createCategory.isPending || updateCategory.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingCategory?.name}" kategorisini silmek istediğinize emin misiniz?
              Bu kategoriye atanmış işlemler kategorisiz kalacaktır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Sil'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomTabBar />
    </div>
  );
}
