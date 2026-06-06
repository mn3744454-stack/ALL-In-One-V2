// B2.5e — Contract Templates list & create.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, ArrowLeft } from "lucide-react";
import { useContractTemplates } from "@/contracts/hooks/useContractTemplates";
import type { ContractType } from "@/contracts/docModel/types";
import { formatStandardDate } from "@/lib/displayHelpers";

export default function DashboardContractTemplates() {
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
    <DashboardShell>
      <MobilePageHeader title="Contract Templates" />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link
              to="/dashboard/contracts"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="w-3 h-3" /> Contracts
            </Link>
            <h1 className="font-display text-2xl font-semibold text-navy">
              Contract Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Reusable rich-text contract templates with bilingual variables.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 me-1" /> New template</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New contract template</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Contract type</Label>
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

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No templates yet.</p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 me-1" /> Create your first template
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
      </div>
    </DashboardShell>
  );
}
