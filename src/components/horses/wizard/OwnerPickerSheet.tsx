import { useState, useMemo } from "react";
import { Check, Search, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHorseMasterData, HorseOwner, getPrimaryPhoneNumber } from "@/hooks/useHorseMasterData";
import { AddMasterDataDialog } from "../AddMasterDataDialog";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { Badge } from "@/components/ui/badge";

interface OwnerPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOwnerId?: string | null;
  onOwnerSelect: (ownerId: string, owner?: HorseOwner) => void;
}

export function OwnerPickerSheet({
  open,
  onOpenChange,
  selectedOwnerId,
  onOwnerSelect,
}: OwnerPickerSheetProps) {
  const [searchValue, setSearchValue] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { owners, createOwner } = useHorseMasterData();
  const { t } = useI18n();

  const filtered = useMemo(() => {
    if (!searchValue.trim()) return owners;
    const q = searchValue.toLowerCase();
    return owners.filter(o =>
      o.name.toLowerCase().includes(q) ||
      (o.name_ar && o.name_ar.includes(searchValue))
    );
  }, [owners, searchValue]);

  const handleSelect = (owner: HorseOwner) => {
    onOwnerSelect(owner.id, owner);
    onOpenChange(false);
    setSearchValue("");
  };

  const handleQuickAdd = () => {
    onOpenChange(false);
    setQuickAddOpen(true);
  };

  const handleCreate = (formData: Record<string, string>) =>
    const handleCreate = (formData: Record<string, unknown>) => createOwner(formData as any);

  const handleSuccess = (result: any) => {
    if (result?.id) {
      onOwnerSelect(result.id, result as HorseOwner);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-lg h-[80vh] max-h-[600px] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <DialogTitle>{t("horses.wizard.chooseOwner")}</DialogTitle>
          </DialogHeader>

          <div className="px-4 py-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("horses.wizard.searchOwnerPlaceholder")}
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
              <span className="font-medium">{t("horses.wizard.createNewOwner")}</span>
              {searchValue && <span className="text-muted-foreground text-sm">"{searchValue}"</span>}
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-2 py-1">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  {t("horses.wizard.noOwnersFound")}
                </div>
              ) : (
                filtered.map((owner) => (
                  <button
                    key={owner.id}
                    onClick={() => handleSelect(owner)}
                    className={cn(
                      "w-full flex items-center gap-2 p-3 rounded-lg text-start transition-colors min-h-[56px]",
                      "hover:bg-muted/50 active:bg-muted",
                      selectedOwnerId === owner.id && "bg-primary/5 border border-primary/30"
                    )}
                  >
                    {selectedOwnerId === owner.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                    <BilingualName name={owner.name} nameAr={owner.name_ar} primaryClassName="text-sm" />
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AddMasterDataDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        type="owner"
        onCreate={handleCreate}
        onSuccess={handleSuccess}
      />
    </>
  );
}
