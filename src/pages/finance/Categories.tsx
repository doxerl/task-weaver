import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

export default function Categories() {
  const { t } = useTranslation(['finance', 'common']);
  const { grouped, isLoading, createCategory, updateCategory, deleteCategory } = useCategories();

  const typeLabels: Record<string, string> = {
    INCOME: t('finance:categories.types.income'),
    EXPENSE: t('finance:categories.types.expense'),
    PARTNER: t('finance:categories.types.partner'),
    FINANCING: t('finance:categories.types.financing'),
    INVESTMENT: t('finance:categories.types.investment'),
    EXCLUDED: t('finance:categories.types.excluded')
  };
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<TransactionCategory | null>(null);

  const handleSave = async (data: Partial<TransactionCategory>) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...data });
        toast.success(t('common:toast.updateSuccess'));
      } else {
        await createCategory.mutateAsync(data);
        toast.success(t('common:toast.saveSuccess'));
      }
      setIsFormOpen(false);
      setEditingCategory(null);
    } catch (error) {
      toast.error(t('common:toast.error'));
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
      toast.success(t('common:toast.deleteSuccess'));
      setDeletingCategory(null);
    } catch (error) {
      toast.error(t('common:toast.error'));
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
            <Link to="/" className="p-2 hover:bg-accent rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold">{t('finance:categories.title')}</h1>
          </div>
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('common:buttons.add')}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).filter(([key]) => key !== 'all').map(([type, cats]) => {
              // Separate parent and child categories
              const parentCats = cats.filter(c => !c.parent_category_id);
              const childCats = cats.filter(c => c.parent_category_id);
              
              return (
                <div key={type}>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                    {typeLabels[type.toUpperCase()] || type}
                  </h2>
                  <Card>
                    <CardContent className="p-2 space-y-1">
                      {parentCats.map(cat => {
                        const children = childCats.filter(c => c.parent_category_id === cat.id);
                        return (
                          <div key={cat.id}>
                            <div className="flex items-center gap-3 p-2 rounded hover:bg-accent group">
                              <span className="text-lg">{cat.icon}</span>
                              <span className="flex-1 font-medium">{cat.name}</span>
                              <span className="text-xs text-muted-foreground">{cat.account_subcode || cat.code}</span>
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
                            {/* Child categories */}
                            {children.length > 0 && (
                              <div className="ml-6 border-l-2 border-border pl-3 space-y-1">
                                {children.map(child => (
                                  <div key={child.id} className="flex items-center gap-3 p-2 rounded hover:bg-accent group">
                                    <span className="text-muted-foreground">├</span>
                                    <span className="text-sm">{child.icon}</span>
                                    <span className="flex-1 text-sm">{child.name}</span>
                                    <span className="text-xs text-muted-foreground">{child.account_subcode || child.code}</span>
                                    {child.is_system ? (
                                      <Lock className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6"
                                          onClick={() => handleEdit(child)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 text-destructive hover:text-destructive"
                                          onClick={() => setDeletingCategory(child)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {parentCats.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t('finance:categories.noCategoriesInType')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={isFormOpen} onOpenChange={handleCloseForm}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingCategory ? t('finance:categories.editCategory') : t('finance:categories.newCategory')}
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
            <AlertDialogTitle>{t('finance:categories.deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('finance:categories.deleteConfirmation', { name: deletingCategory?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('common:buttons.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomTabBar />
    </div>
  );
}
