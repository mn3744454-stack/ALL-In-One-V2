import { useState, useMemo } from "react";
import { Check, Search, Plus, X, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type { HorseColor, DeleteMasterDataResult } from "@/hooks/useHorseMasterData";
import { AddMasterDataDialog } from "../AddMasterDataDialog";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { toast } from "sonner";

interface ColorPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedColorId?: string | null;
  onColorSelect: (colorId: string, color?: HorseColor) => void;
  colors: HorseColor[];
  createColor: (
    name: string,
    name_ar?: string
  ) => Promise<{ data: HorseColor | null; error: Error | null }>;
  deleteColor?: (id: string) => Promise<DeleteMasterDataResult>;
  onColorDeleted?: (id: string) => void;
}

export function ColorPickerSheet({
  open,
  onOpenChange,
  selectedColorId,
  onColorSelect,
  colors,
  createColor,
  deleteColor,
  onColorDeleted,
}: ColorPickerSheetProps) {
  const [searchValue, setSearchValue] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<HorseColor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { t } = useI18n();

  const filtered = useMemo(() => {
    if (!searchValue.trim()) return colors;
    const q = searchValue.toLowerCase();
    return colors.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.name_ar && c.name_ar.includes(searchValue))
    );
  }, [colors, searchValue]);

  const handleSelect = (color: HorseColor) => {
    onColorSelect(color.id, color);
    onOpenChange(false);
    setSearchValue("");
  };

  const handleQuickAdd = () => {
    onOpenChange(false);
    setQuickAddOpen(true);
  };

  const handleCreate = async (formData: Record<string, string>) => {
    return createColor(formData.name, formData.name_ar);
  };

  const handleSuccess = (result: any) => {
    if (result?.id) {
      onColorSelect(result.id, result as HorseColor);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget || !deleteColor) return;
    setDeleting(true);
    const result = await deleteColor(confirmTarget.id);
    setDeleting(false);
    const id = confirmTarget.id;
    setConfirmTarget(null);
    switch (result.reason) {
      case "deleted":
        toast.success(t("horses.masterData.delete.color.success"));
        onColorDeleted?.(id);
        break;
      case "used_by_horses":
        toast.error(t("horses.masterData.delete.color.blockedUsed"));
        break;
      case "protected_seed":
        toast.error(t("horses.masterData.delete.color.blockedSeed"));
        break;
      case "not_found":
        toast.error(t("horses.masterData.delete.color.notFound"));
        break;
      default:
        toast.error(t("horses.masterData.delete.color.error"));
        break;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-lg h-[80vh] max-h-[600px] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <DialogTitle>{t("horses.wizard.chooseColor")}</DialogTitle>
          </DialogHeader>

          <div className="px-4 py-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("horses.wizard.searchColorPlaceholder")}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="ps-10"
                autoFocus
              />
              {searchValue && (
                <button onClick={() => setSearchValue("")} className="absolute end-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="px-4 py-2 border-b shrink-0">
            <Button variant="ghost" className="w-full justify-start text-primary gap-2" onClick={handleQuickAdd}>
              <Plus className="h-4 w-4" />
              <span className="font-medium">{t("horses.wizard.addNewColor")}</span>
              {searchValue && <span className="text-muted-foreground text-sm">"{searchValue}"</span>}
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-2 py-1">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  {t("horses.wizard.noColorsFound")}
                </div>
              ) : (
                filtered.map((color) => (
                  <div
                    key={color.id}
                    className={cn(
                      "w-full flex items-center gap-2 p-3 rounded-lg transition-colors min-h-[56px]",
                      "hover:bg-muted/50",
                      selectedColorId === color.id && "bg-primary/5 border border-primary/30"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(color)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-start"
                    >
                      {selectedColorId === color.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                      <BilingualName name={color.name} nameAr={color.name_ar} primaryClassName="text-sm" />
                    </button>
                    {deleteColor && !color.is_seed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmTarget(color);
                        }}
                        className="ms-auto p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        aria-label={t("horses.masterData.delete.color.title")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AddMasterDataDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        type="color"
        onCreate={handleCreate}
        onSuccess={handleSuccess}
      />

      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={(o) => { if (!o && !deleting) setConfirmTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("horses.masterData.delete.color.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("horses.masterData.delete.color.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("horses.masterData.delete.color.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
