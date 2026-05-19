import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useClients } from "@/hooks/useClients";
import { useBoardingAdmissions } from "@/hooks/housing/useBoardingAdmissions";
import { BilingualName } from "@/components/ui/BilingualName";
import { formatBilingualName } from "@/lib/displayHelpers";

interface AssignClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admissionId: string;
  currentClientId: string | null;
  horseName?: string | null;
  horseNameAr?: string | null;
}

export function AssignClientDialog({
  open,
  onOpenChange,
  admissionId,
  currentClientId,
  horseName,
  horseNameAr,
}: AssignClientDialogProps) {
  const { t, lang } = useI18n();
  const { clients } = useClients();
  const { updateAdmission } = useBoardingAdmissions();
  const [selectedId, setSelectedId] = useState<string | null>(currentClientId);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedId(currentClientId);
      setQuery("");
    }
  }, [open, currentClientId]);

  const activeClients = useMemo(
    () => clients.filter((c) => c.status === "active"),
    [clients]
  );

  const title = formatBilingualName(horseName, horseNameAr, lang);
  const dialogTitle = t("housing.admissions.detail.assignClientDialogTitle").replace(
    "{{name}}",
    title
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdmission({
        admissionId,
        client_id: selectedId || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Command shouldFilter={true}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={t("housing.admissions.detail.searchClientsPlaceholder")}
            />
            <CommandList className="max-h-[50vh]">
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {activeClients.length === 0
                    ? t("housing.admissions.detail.noClientsYet")
                    : t("common.noResults")}
                </div>
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => setSelectedId(null)}
                >
                  <Check
                    className={cn(
                      "me-2 h-4 w-4",
                      selectedId === null ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-muted-foreground">
                    {t("housing.admissions.wizard.noClient")}
                  </span>
                </CommandItem>
                {activeClients.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.name} ${c.name_ar || ""} ${c.email || ""} ${c.phone || ""}`}
                    onSelect={() => setSelectedId(c.id)}
                  >
                    <Check
                      className={cn(
                        "me-2 h-4 w-4",
                        selectedId === c.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <BilingualName name={c.name} nameAr={c.name_ar} />
                      {(c.phone || c.email) && (
                        <span className="text-xs text-muted-foreground truncate">
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
