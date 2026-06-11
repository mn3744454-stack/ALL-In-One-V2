// B2.5e — Contract Documents inner section (renders inside DashboardContracts Hub shell).
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText } from "lucide-react";
import { useI18n } from "@/i18n";
import { useContractDocuments } from "@/contracts/hooks/useContractDocuments";
import { useContractTemplates } from "@/contracts/hooks/useContractTemplates";
import type { ContractType, ContractDocumentStatus } from "@/contracts/docModel/types";
import { formatStandardDate } from "@/lib/displayHelpers";

const STATUS_VARIANT: Record<ContractDocumentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary", sent_for_review: "secondary", approved: "default",
  rejected: "destructive", cancelled: "outline", archived: "outline",
};

export function ContractDocumentsSection() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { documents, isLoading, createBlank, createFromTemplate } = useContractDocuments();
  const { templates } = useContractTemplates();
  const publishedTemplates = templates.filter((tpl) => tpl.status === "published");

  const [filter, setFilter] = useState<"all" | ContractDocumentStatus>("all");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [type, setType] = useState<ContractType>("boarding");
  const [tplId, setTplId] = useState<string>("__blank__");

  useEffect(() => {
    const create = searchParams.get("create");
    if (create === "blank" || create === "fromForm") {
      setTplId(create === "fromForm" && publishedTemplates[0]?.id
        ? publishedTemplates[0].id
        : "__blank__");
      setOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, publishedTemplates]);

  const STATUS_LABEL: Record<ContractDocumentStatus, string> = {
    draft: t("contracts.documents.filters.draft"),
    sent_for_review: t("contracts.documents.filters.sent_for_review"),
    approved: t("contracts.documents.filters.approved"),
    rejected: t("contracts.documents.filters.rejected"),
    cancelled: t("contracts.documents.filters.archived"),
    archived: t("contracts.documents.filters.archived"),
  };

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
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">{t("contracts.documents.filters.all")}</TabsTrigger>
          <TabsTrigger value="draft">{t("contracts.documents.filters.draft")}</TabsTrigger>
          <TabsTrigger value="sent_for_review">{t("contracts.documents.filters.sent_for_review")}</TabsTrigger>
          <TabsTrigger value="approved">{t("contracts.documents.filters.approved")}</TabsTrigger>
          <TabsTrigger value="rejected">{t("contracts.documents.filters.rejected")}</TabsTrigger>
          <TabsTrigger value="archived">{t("contracts.documents.filters.archived")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("contracts.documents.empty")}</p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> {t("contracts.documents.newDocument")}
            </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("contracts.documents.newDocument")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("contracts.cta.fromContractForm")}</Label>
              <Select value={tplId} onValueChange={setTplId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__blank__">{t("contracts.cta.contractDocument")}</SelectItem>
                  {publishedTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tplId === "__blank__" && (
              <div className="space-y-1.5">
                <Label>{t("contracts.columns.type")}</Label>
                <Select value={type} onValueChange={(v) => setType(v as ContractType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boarding">{t("contracts.types.boarding.label")}</SelectItem>
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
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel") || "Cancel"}</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || createBlank.isPending || createFromTemplate.isPending}>
              {t("contracts.documents.newDocument")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
