// B2.5e — Contract Forms inner section (renders inside DashboardContracts Hub shell).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import type { ContractType } from "@/contracts/docModel/types";
import { formatStandardDate } from "@/lib/displayHelpers";

export function ContractTemplatesSection() {
  const { t } = useI18n();
  const { templates, isLoading, create } = useContractTemplates();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [type, setType] = useState<ContractType>("boarding");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const id = await create.mutateAsync({
      contract_type: type,
      name: name.trim(),
      name_ar: nameAr.trim() || undefined,
    });
    setOpen(false);
    setName(""); setNameAr("");
    navigate(`/dashboard/contracts/templates/${id}`);
  };

  return (
    <div className="space-y-4">
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
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => navigate(`/dashboard/contracts/templates/${tpl.id}`)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{tpl.name}</p>
                    {tpl.name_ar && (
                      <p className="text-xs text-muted-foreground truncate" dir="rtl">{tpl.name_ar}</p>
                    )}
                  </div>
                  <Badge variant={tpl.status === "published" ? "default" : "secondary"}>
                    {tpl.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{tpl.contract_type}</span>
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
              <Label>{t("contracts.columns.type")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as ContractType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boarding">Boarding</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="reproduction">Reproduction</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name (English)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Boarding Contract" />
            </div>
            <div className="space-y-1.5">
              <Label>Name (Arabic) — optional</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" placeholder="مثال: عقد إيواء قياسي" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
