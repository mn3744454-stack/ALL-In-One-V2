// B2.5e — Contract Forms inner section (renders inside DashboardContracts Hub shell).
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, FileText } from "lucide-react";
import { useContractTemplates } from "@/contracts/hooks/useContractTemplates";
import { useI18n } from "@/i18n";
import type { ContractType, ContractTemplateStatus } from "@/contracts/docModel/types";
import { formatStandardDate } from "@/lib/displayHelpers";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { ContractTemplateEditorDialog } from "@/contracts/editor/ContractTemplateEditorDialog";

const STATUS_VARIANT: Record<ContractTemplateStatus, "default" | "secondary" | "outline"> = {
  draft: "secondary", published: "default", archived: "outline",
};

const CONTRACT_TYPES: ContractType[] = ["boarding", "training", "reproduction", "custom"];

export function ContractTemplatesSection() {
  const { t } = useI18n();
  const { templates, isLoading, create } = useContractTemplates();
  const [editorId, setEditorId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [type, setType] = useState<ContractType>("boarding");
  const { viewMode, gridColumns, setViewMode, setGridColumns } =
    useViewPreference("contracts.forms");

  const statusLabel = (s: ContractTemplateStatus) => t(`contracts.forms.status.${s}`);
  const typeLabel = (ct: ContractType) => t(`contracts.types.${ct}.label`);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const id = await create.mutateAsync({
      contract_type: type,
      name: name.trim(),
      name_ar: nameAr.trim() || undefined,
    });
    setOpen(false);
    setName(""); setNameAr("");
    setEditorId(id);
  };

  const openTpl = (id: string) => setEditorId(id);

  return (
    <div className="space-y-4">
      {!isLoading && templates.length > 0 && (
        <div className="flex items-center justify-end">
          <ViewSwitcher
            viewMode={viewMode}
            gridColumns={gridColumns}
            onViewModeChange={setViewMode}
            onGridColumnsChange={setGridColumns}
            showTable
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("contracts.forms.empty")}</p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 me-1" /> {t("contracts.forms.createFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-foreground">
              <tr>
                <th className="text-start font-bold px-3 py-2">{t("contracts.columns.name")}</th>
                <th className="text-start font-bold px-3 py-2">{t("contracts.columns.type")}</th>
                <th className="text-start font-bold px-3 py-2">{t("contracts.columns.status")}</th>
                <th className="text-start font-bold px-3 py-2">{t("contracts.columns.updated")}</th>
                <th className="text-end font-bold px-3 py-2">{t("contracts.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => openTpl(tpl.id)}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{tpl.name}</div>
                    {tpl.name_ar && <div className="text-xs text-muted-foreground" dir="rtl">{tpl.name_ar}</div>}
                  </td>
                  <td className="px-3 py-2">{typeLabel(tpl.contract_type)}</td>
                  <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[tpl.status]}>{statusLabel(tpl.status)}</Badge></td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatStandardDate(tpl.updated_at)}</td>
                  <td className="px-3 py-2 text-end">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openTpl(tpl.id); }}>
                      {t("contracts.columns.open")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewMode === "list" ? (
        <div className="grid grid-cols-1 gap-2">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="hover:border-primary/40 cursor-pointer" onClick={() => openTpl(tpl.id)}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {typeLabel(tpl.contract_type)} · {formatStandardDate(tpl.updated_at)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[tpl.status]}>{statusLabel(tpl.status)}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className={getGridClass(gridColumns, "grid")}>
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => openTpl(tpl.id)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{tpl.name}</p>
                    {tpl.name_ar && (
                      <p className="text-xs text-muted-foreground truncate" dir="rtl">{tpl.name_ar}</p>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANT[tpl.status]}>{statusLabel(tpl.status)}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{typeLabel(tpl.contract_type)}</span>
                  <span>{formatStandardDate(tpl.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("contracts.forms.dialogTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("contracts.forms.contractType")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as ContractType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>{typeLabel(ct)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("contracts.forms.nameEn")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("contracts.forms.placeholderEn")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("contracts.forms.nameAr")}</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" placeholder={t("contracts.forms.placeholderAr")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || create.isPending}>
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContractTemplateEditorDialog
        templateId={editorId}
        open={!!editorId}
        onOpenChange={(o) => { if (!o) setEditorId(null); }}
      />
    </div>
  );
}
