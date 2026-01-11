import { useState, useMemo } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MobilePageHeader } from "@/components/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { useCustomFinancialCategories } from "@/hooks/useCustomFinancialCategories";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";

interface CategoryFormData {
  name: string;
  name_ar: string;
  category_type: "income" | "expense";
  account_code: string;
  description: string;
  parent_id: string | null;
}

const initialFormData: CategoryFormData = {
  name: "",
  name_ar: "",
  category_type: "expense",
  account_code: "",
  description: "",
  parent_id: null,
};

export default function DashboardFinanceCategories() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { t, dir } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const { categories, loading: isLoading, createCategory, updateCategory, deleteCategory, refresh } = useCustomFinancialCategories();

  const canManage = activeRole === "owner" || activeRole === "manager";

  // Filter categories by type
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.category_type === "income"),
    [categories]
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.category_type === "expense"),
    [categories]
  );

  const currentCategories = activeTab === "income" ? incomeCategories : expenseCategories;

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ ...initialFormData, category_type: activeTab });
    setShowFormDialog(true);
  };

  const handleOpenEdit = (category: typeof categories[0]) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      name_ar: category.name_ar || "",
      category_type: category.category_type as "income" | "expense",
      account_code: category.account_code || "",
      description: category.description || "",
      parent_id: category.parent_id,
    });
    setShowFormDialog(true);
  };

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t("common.required"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: formData.name,
          name_ar: formData.name_ar || null,
          category_type: formData.category_type,
          account_code: formData.account_code || null,
          description: formData.description || null,
          parent_id: formData.parent_id,
        });
        toast.success(t("common.success"));
      } else {
        await createCategory({
          name: formData.name,
          name_ar: formData.name_ar || null,
          category_type: formData.category_type,
          account_code: formData.account_code || null,
          description: formData.description || null,
          parent_id: formData.parent_id,
        });
        toast.success(t("common.success"));
      }
      setShowFormDialog(false);
      refresh();
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await deleteCategory(deletingId);
      toast.success(t("common.success"));
      setShowDeleteDialog(false);
      setDeletingId(null);
      refresh();
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  // Get parent category options
  const parentOptions = useMemo(() => {
    return categories
      .filter((c) => c.category_type === formData.category_type && c.id !== editingId)
      .filter((c) => !c.parent_id); // Only top-level categories can be parents
  }, [categories, formData.category_type, editingId]);

  if (!canManage) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card variant="elevated" className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Tags className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-navy mb-2">
              {t("permissions.accessDenied")}
            </h2>
            <p className="text-muted-foreground">
              {t("permissions.accessDeniedDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-cream flex", dir === "rtl" && "flex-row-reverse")}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <MobilePageHeader title={t("finance.categories.title")} backTo="/dashboard/finance" />

        <div className="p-4 lg:p-8">
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-navy">{t("finance.categories.title")}</h1>
              <p className="text-muted-foreground">{t("finance.categories.subtitle")}</p>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 me-2" />
              {t("finance.categories.addCategory")}
            </Button>
          </div>

          {/* Mobile Add Button */}
          <div className="lg:hidden flex justify-end mb-4">
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="w-4 h-4 me-2" />
              {t("common.add")}
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "income" | "expense")}>
            <TabsList className="mb-6">
              <TabsTrigger value="expense" className="gap-2">
                <TrendingDown className="w-4 h-4" />
                {t("finance.categories.expenseCategories")}
              </TabsTrigger>
              <TabsTrigger value="income" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                {t("finance.categories.incomeCategories")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">{t("common.loading")}</p>
                </div>
              ) : currentCategories.length === 0 ? (
                <Card variant="elevated">
                  <CardContent className="py-12 text-center">
                    <Tags className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-navy mb-2">
                      {t("finance.categories.empty")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("finance.categories.emptyDesc")}
                    </p>
                    <Button onClick={handleOpenCreate}>
                      <Plus className="w-4 h-4 me-2" />
                      {t("finance.categories.addCategory")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {currentCategories.map((category) => {
                    const parentCategory = category.parent_id
                      ? categories.find((c) => c.id === category.parent_id)
                      : null;

                    return (
                      <Card key={category.id} variant="elevated">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center",
                                  category.category_type === "income"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-red-100 text-red-600"
                                )}
                              >
                                {category.category_type === "income" ? (
                                  <TrendingUp className="w-5 h-5" />
                                ) : (
                                  <TrendingDown className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-navy">
                                    {dir === "rtl" && category.name_ar ? category.name_ar : category.name}
                                  </h4>
                                  {category.account_code && (
                                    <Badge variant="outline" className="text-xs">
                                      {category.account_code}
                                    </Badge>
                                  )}
                                </div>
                                {parentCategory && (
                                  <p className="text-xs text-muted-foreground">
                                    {t("finance.categories.parentLabel")}: {parentCategory.name}
                                  </p>
                                )}
                                {category.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {category.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(category)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDelete(category.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("finance.categories.editCategory") : t("finance.categories.addCategory")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("finance.categories.name")}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("finance.categories.namePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("finance.categories.nameAr")}</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder={t("finance.categories.nameArPlaceholder")}
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("finance.categories.type")}</Label>
              <Select
                value={formData.category_type}
                onValueChange={(v) => setFormData({ ...formData, category_type: v as "income" | "expense", parent_id: null })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">{t("finance.categories.expense")}</SelectItem>
                  <SelectItem value="income">{t("finance.categories.income")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("finance.categories.accountCode")}</Label>
              <Input
                value={formData.account_code}
                onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                placeholder={t("finance.categories.accountCodePlaceholder")}
                dir="ltr"
              />
            </div>

            {parentOptions.length > 0 && (
              <div className="space-y-2">
                <Label>{t("finance.categories.parent")}</Label>
                <Select
                  value={formData.parent_id || "none"}
                  onValueChange={(v) => setFormData({ ...formData, parent_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("finance.categories.noParent")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("finance.categories.noParent")}</SelectItem>
                    {parentOptions.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("finance.categories.description")}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("finance.categories.descriptionPlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {editingId ? t("common.update") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.categories.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("finance.categories.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
