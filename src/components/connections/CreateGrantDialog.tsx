import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";

interface CreateGrantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  onSubmit: (data: {
    connectionId: string;
    resourceType: string;
    accessLevel: string;
    dateFrom?: string;
    dateTo?: string;
    forwardOnly: boolean;
  }) => void;
  isLoading?: boolean;
}

export function CreateGrantDialog({
  open,
  onOpenChange,
  connectionId,
  onSubmit,
  isLoading,
}: CreateGrantDialogProps) {
  const { t } = useI18n();
  const [resourceType, setResourceType] = useState("lab_results");
  const [accessLevel, setAccessLevel] = useState("read");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [forwardOnly, setForwardOnly] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      connectionId,
      resourceType,
      accessLevel,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      forwardOnly,
    });
  };

  const resetForm = () => {
    setResourceType("lab_results");
    setAccessLevel("read");
    setDateFrom("");
    setDateTo("");
    setForwardOnly(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("connections.grants.createTitle")}</DialogTitle>
          <DialogDescription>
            {t("connections.grants.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("connections.grants.resourceType")}</Label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="lab_results">
                {t("connections.grants.resourceTypes.lab_results")}
              </option>
              <option value="vet_records">
                {t("connections.grants.resourceTypes.vet_records")}
              </option>
              <option value="breeding_records">
                {t("connections.grants.resourceTypes.breeding_records")}
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t("connections.grants.accessLevel")}</Label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="read">{t("connections.grants.accessLevels.read")}</option>
              <option value="write">{t("connections.grants.accessLevels.write")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">{t("connections.grants.dateFrom")}</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">{t("connections.grants.dateTo")}</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>{t("connections.grants.forwardOnly")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("connections.grants.forwardOnlyDesc")}
              </p>
            </div>
            <Switch checked={forwardOnly} onCheckedChange={setForwardOnly} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("common.loading") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
