// B2.5e — Contract Documents list & create (blank or from template).
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, ArrowLeft } from "lucide-react";
import { useContractDocuments } from "@/contracts/hooks/useContractDocuments";
import { useContractTemplates } from "@/contracts/hooks/useContractTemplates";
import type { ContractType, ContractDocumentStatus } from "@/contracts/docModel/types";
import { formatStandardDate } from "@/lib/displayHelpers";

const STATUS_LABEL: Record<ContractDocumentStatus, string> = {
  draft: "Draft", sent_for_review: "Sent", approved: "Approved",
  rejected: "Rejected", cancelled: "Cancelled", archived: "Archived",
};
const STATUS_VARIANT: Record<ContractDocumentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary", sent_for_review: "secondary", approved: "default",
  rejected: "destructive", cancelled: "outline", archived: "outline",
};

export default function DashboardContractDocuments() {
  const navigate = useNavigate();
  const { documents, isLoading, createBlank, createFromTemplate } = useContractDocuments();
  const { templates } = useContractTemplates();
  const publishedTemplates = templates.filter((t) => t.status === "published");

  const [filter, setFilter] = useState<"all" | ContractDocumentStatus>("all");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [type, setType] = useState<ContractType>("boarding");
  const [tplId, setTplId] = useState<string>("__blank__");

  const visible = filter === "all" ? documents : documents.filter((d) => d.status === filter);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const id = tplId !== "__blank__"
      ? await createFromTemplate.mutateAsync({ template_id: tplId, title: title.trim(), title_ar: titleAr.trim() || undefined })
      : await createBlank.mutateAsync({ contract_type: type, title: title.trim(), title_ar: titleAr.trim() || undefined });
    setOpen(false);
    setTitle(""); setTitleAr("");
    navigate(`/dashboard/contracts/documents/${id}`);
  };

  return (
    <DashboardShell>
      <MobilePageHeader title="Contract Documents" />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Link to="/dashboard/contracts" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1">
              <ArrowLeft className="w-3 h-3" /> Contracts
            </Link>
            <h1 className="font-display text-2xl font-semibold text-navy">Contract Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Drafts and sent contracts. Sent documents are frozen snapshots.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 me-1" /> New document</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New contract document</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>From template (optional)</Label>
                  <Select value={tplId} onValueChange={setTplId}>
                    <SelectTrigger><SelectValue placeholder="Blank document" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__blank__">Blank document</SelectItem>
                      {publishedTemplates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {tplId === "__blank__" && (
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
                )}
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
                <Button onClick={handleCreate} disabled={!title.trim() || createBlank.isPending || createFromTemplate.isPending}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="sent_for_review">Sent</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No documents.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((doc) => (
              <Card
                key={doc.id}
                className="hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/dashboard/contracts/documents/${doc.id}`)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      {doc.title_ar && (
                        <p className="text-xs text-muted-foreground truncate" dir="rtl">{doc.title_ar}</p>
                      )}
                    </div>
                    <Badge variant={STATUS_VARIANT[doc.status]}>{STATUS_LABEL[doc.status]}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{doc.contract_type}</span>
                    <span>{formatStandardDate(doc.updated_at)}</span>
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
