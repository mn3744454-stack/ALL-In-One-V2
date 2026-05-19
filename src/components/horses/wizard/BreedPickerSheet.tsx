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
import type { HorseBreed, DeleteMasterDataResult } from "@/hooks/useHorseMasterData";
import { AddMasterDataDialog } from "../AddMasterDataDialog";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { toast } from "sonner";

interface BreedPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBreedId?: string | null;
  onBreedSelect: (breedId: string, breed?: HorseBreed) => void;
  breeds: HorseBreed[];
  createBreed: (
    name: string,
    name_ar?: string
  ) => Promise<{ data: HorseBreed | null; error: Error | null }>;
  deleteBreed?: (id: string) => Promise<DeleteMasterDataResult>;
  onBreedDeleted?: (id: string) => void;
}

export function BreedPickerSheet({
  open,
  onOpenChange,
  selectedBreedId,
  onBreedSelect,
  breeds,
  createBreed,
  deleteBreed,
  onBreedDeleted,
}: BreedPickerSheetProps) {
  const [searchValue, setSearchValue] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<HorseBreed | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { t } = useI18n();

  const filtered = useMemo(() => {
    if (!searchValue.trim()) return breeds;
    const q = searchValue.toLowerCase();
    return breeds.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.name_ar && b.name_ar.includes(searchValue))
    );
  }, [breeds, searchValue]);

  const handleSelect = (breed: HorseBreed) => {
    onBreedSelect(breed.id, breed);
    onOpenChange(false);
    setSearchValue("");
  };

  const handleQuickAdd = () => {
    onOpenChange(false);
    setQuickAddOpen(true);
  };

  const handleCreate = async (formData: Record<string, string>) => {
    return createBreed(formData.name, formData.name_ar);
  };

  const handleSuccess = (result: any) => {
    if (result?.id) {
      onBreedSelect(result.id, result as HorseBreed);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget || !deleteBreed) return;
    setDeleting(true);
    const result = await deleteBreed(confirmTarget.id);
    setDeleting(false);
    const id = confirmTarget.id;
    setConfirmTarget(null);
    switch (result.reason) {
      case "deleted":
        toast.success(t("horses.masterData.delete.breed.success"));
        onBreedDeleted?.(id);
        break;
      case "used_by_horses":
        toast.error(t("horses.masterData.delete.breed.blockedUsed"));
        break;
      case "protected_seed":
        toast.error(t("horses.masterData.delete.breed.blockedSeed"));
        break;
      case "not_found":
        toast.error(t("horses.masterData.delete.breed.notFound"));
        break;
      default:
        toast.error(t("horses.masterData.delete.breed.error"));
        break;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-lg h-[80vh] max-h-[600px] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <DialogTitle>{t("horses.wizard.chooseBreed")}</DialogTitle>
          </DialogHeader>

          <div className="px-4 py-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("horses.wizard.searchBreedPlaceholder")}
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
              <span className="font-medium">{t("horses.wizard.addNewBreed")}</span>
              {searchValue && <span className="text-muted-foreground text-sm">"{searchValue}"</span>}
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-2 py-1">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  {t("horses.wizard.noBreedsFound")}
                </div>
              ) : (
                filtered.map((breed) => (
                  <div
                    key={breed.id}
                    className={cn(
                      "w-full flex items-center gap-2 p-3 rounded-lg transition-colors min-h-[56px]",
                      "hover:bg-muted/50",
                      selectedBreedId === breed.id && "bg-primary/5 border border-primary/30"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(breed)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-start"
                    >
                      {selectedBreedId === breed.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                      <BilingualName name={breed.name} nameAr={breed.name_ar} primaryClassName="text-sm" />
                    </button>
                    {deleteBreed && !breed.is_seed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmTarget(breed);
                        }}
                        className="ms-auto p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        aria-label={t("horses.masterData.delete.breed.title")}
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
        type="breed"
        onCreate={handleCreate}
        onSuccess={handleSuccess}
      />

      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={(o) => { if (!o && !deleting) setConfirmTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("horses.masterData.delete.breed.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("horses.masterData.delete.breed.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("horses.masterData.delete.breed.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
