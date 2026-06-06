// B2.5e.1 — Optional Contract Documents section inside Boarding Contract Details.
// Pulls rich contract documents linked via boarding_contract_id (RPC-side filter).
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Plus, Eye } from "lucide-react";
import { useState } from "react";
import { useContractDocuments } from "@/contracts/hooks/useContractDocuments";
import { useContractTemplates } from "@/contracts/hooks/useContractTemplates";
import type { ContractDocumentStatus } from "@/contracts/docModel/types";
import { formatStandardDate } from "@/lib/displayHelpers";

interface Props {
  boardingContractId: string;
  canManage: boolean;
}

const STATUS_LABEL: Record<ContractDocumentStatus, string> = {
  draft: "Draft", sent_for_review: "Sent", approved: "Approved",
  rejected: "Rejected", cancelled: "Cancelled", archived: "Archived",
};
const STATUS_VARIANT: Record<ContractDocumentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary", sent_for_review: "secondary", approved: "default",
  rejected: "destructive", cancelled: "outline", archived: "outline",
};

export function BoardingContractDocumentsSection({ boardingContractId, canManage }: Props) {
  const navigate = useNavigate();
  const { documents, isLoading, createBlank, createFromTemplate } = useContractDocuments({
    boardingContractId,
  });
  const { templates } = useContractTemplates({ contractType: "boarding" });
  const publishedTemplates = templates.filter((t) => t.status === "published");

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [tplId, setTplId] = useState<string>("__blank__");

  const handleCreate = async () => {
    if (!title.trim()) return;
    const id = tplId !== "__blank__"
      ? await createFromTemplate.mutateAsync({
          template_id: tplId,
          title: title.trim(),
          title_ar: titleAr.trim() || undefined,
          boarding_contract_id: boardingContractId,
        })
      : await createBlank.mutateAsync({
          contract_type: "boarding",
          title: title.trim(),
          title_ar: titleAr.trim() || undefined,
        });
    setOpen(false);
    setTitle(""); setTitleAr(""); setTplId("__blank__");
    navigate(`/dashboard/contracts/documents/${id}`);
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contract documents / مستندات العقد
        </h3>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="w-3 h-3 me-1" /> New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create contract document / إنشاء مستند عقد</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>From template (optional) / من قالب</Label>
                  <Select value={tplId} onValueChange={setTplId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__blank__">Blank document</SelectItem>
                      {publishedTemplates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Title (English)</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Title (Arabic) — optional</Label>
                  <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || createBlank.isPending || createFromTemplate.isPending}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No contract document attached. Approval flow above is unchanged.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
            >
              <div className="min-w-0 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatStandardDate(d.updated_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={STATUS_VARIANT[d.status]} className="text-[10px]">
                  {STATUS_LABEL[d.status]}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => navigate(`/dashboard/contracts/documents/${d.id}`)}
                >
                  <Eye className="w-3 h-3 me-1" /> Open
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
