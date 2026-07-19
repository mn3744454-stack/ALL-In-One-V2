/**
 * Slice 2C — Service Category Manager
 *
 * Contextual create/rename/archive/restore surface for tenant-scoped
 * `tenant_service_categories`. Embedded next to the Statement category
 * multi-select so authorized users never hit a dead end when a needed
 * category is missing. Reuses `useServiceCategories` — no duplicate CRUD.
 *
 *  - Category `key` is generated server-side once and stays immutable.
 *  - Rename updates display names only.
 *  - Archive sets is_active = false; no hard delete.
 *  - Restore sets is_active = true.
 *  - Every mutation invalidates the shared category query so the selector
 *    refreshes without a hard reload.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useI18n } from "@/i18n";
import {
  useServiceCategories,
  displayCategoryName,
  type ServiceCategory,
} from "@/hooks/finance/useServiceCategories";
import { usePermissions } from "@/hooks/usePermissions";
import { Archive, ArchiveRestore, Edit2, Plus, Loader2, ChevronDown } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceCategoryManagerDialog({ open, onOpenChange }: Props) {
  const { t, lang, dir } = useI18n();
  const isRTL = dir === "rtl";
  const { hasPermission, isOwner } = usePermissions();
  const {
    categories: allCategories,
    isLoading,
    createCategory,
    renameCategory,
    archiveCategory,
    restoreCategory,
    isMutating,
  } = useServiceCategories(true);

  // Slice 2 Correction 4 — Align frontend write gate with the Slice 1 RLS
  // contract on tenant_service_categories, which authorizes writes via
  // `services.manage` (owners bypass). We intentionally do NOT expose the
  // manager under `finance.categories.manage` because the backend does not
  // grant that permission for this table.
  const canManage = isOwner || hasPermission("services.manage");

  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [editing, setEditing] = useState<ServiceCategory | null>(null);

  const resetForm = () => {
    setName("");
    setNameAr("");
    setEditing(null);
  };

  const startEdit = (cat: ServiceCategory) => {
    setEditing(cat);
    setName(cat.name);
    setNameAr(cat.name_ar || "");
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (editing) {
        await renameCategory({
          id: editing.id,
          data: { name: trimmed, name_ar: nameAr.trim() || null },
        });
      } else {
        await createCategory({ name: trimmed, name_ar: nameAr.trim() || null });
      }
      resetForm();
    } catch {
      // Toast surfaced inside the hook.
    }
  };

  const active = allCategories.filter((c) => c.is_active);
  const archived = allCategories.filter((c) => !c.is_active);

  const canSubmit = name.trim().length > 0 && !isMutating;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isRTL ? "إدارة تصنيفات الخدمات" : "Manage Service Categories"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 min-h-0">
          {canManage ? (
            <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {editing
                  ? isRTL ? "تعديل التصنيف" : "Edit Category"
                  : isRTL ? "تصنيف جديد" : "New Category"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">
                    {isRTL ? "الاسم (إنجليزي)" : "Name (English)"}
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Boarding, Laboratory, ..."
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    {isRTL ? "الاسم (عربي)" : "Name (Arabic)"}
                  </Label>
                  <Input
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="إيواء، مختبر، ..."
                    dir="rtl"
                  />
                </div>
              </div>
              {editing && canManage && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className="w-3 h-3" />
                      {isRTL ? "تفاصيل متقدمة" : "Advanced Details"}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {isRTL ? "المعرّف الداخلي" : "Internal Identifier"}
                    </Label>
                    <Input
                      readOnly
                      value={editing.key}
                      dir="ltr"
                      className="font-mono text-[11px] h-7 bg-muted/40"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {isRTL
                        ? "قيمة تقنية للقراءة فقط. لا تُستخدم كعنوان تصنيف."
                        : "Read-only technical value. Not used as a category title."}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {isMutating && <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />}
                  {editing ? (
                    <>
                      <Edit2 className="w-3.5 h-3.5 me-1" />
                      {isRTL ? "حفظ" : "Save"}
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 me-1" />
                      {isRTL ? "إضافة" : "Add"}
                    </>
                  )}
                </Button>
                {editing && (
                  <Button size="sm" variant="ghost" onClick={resetForm}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("permissions.accessDenied")}
            </p>
          )}

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {isRTL ? "التصنيفات النشطة" : "Active"}
              <Badge variant="secondary" className="ms-2 h-4 px-1.5 text-[10px]">
                {active.length}
              </Badge>
            </p>
            {isLoading ? (
              <p className="py-3 text-sm text-muted-foreground text-center">
                {t("common.loading")}
              </p>
            ) : active.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground text-center">
                {t("common.noResults")}
              </p>
            ) : (
              <div className="space-y-1">
                {active.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {displayCategoryName(cat, lang as "ar" | "en")}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => startEdit(cat)}
                          aria-label={isRTL ? "تعديل" : "Edit"}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => archiveCategory(cat.id)}
                          disabled={isMutating}
                          aria-label={isRTL ? "أرشفة" : "Archive"}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {archived.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {isRTL ? "المؤرشفة" : "Archived"}
                <Badge variant="outline" className="ms-2 h-4 px-1.5 text-[10px]">
                  {archived.length}
                </Badge>
              </p>
              <div className="space-y-1">
                {archived.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate">
                        {displayCategoryName(cat, lang as "ar" | "en")}
                      </p>
                    </div>
                    {canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => restoreCategory(cat.id)}
                        disabled={isMutating}
                        aria-label={isRTL ? "استعادة" : "Restore"}
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
