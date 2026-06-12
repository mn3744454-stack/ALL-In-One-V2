// B2.5e — Contract Document editor + viewer (snapshot once sent).
// Phase 2: layout reorganized into a Lab-style EditorShell with section rail.
// No backend / lifecycle / TipTap / JSON changes.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Save, Send, CheckCircle2, XCircle, Printer, Archive,
  FileText, ListChecks, Eye, Clock, IdCard,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useContractDocument } from "@/contracts/hooks/useContractDocuments";
import { ContractDocumentEditor } from "@/contracts/docModel/ContractDocumentEditor";
import { ContractDocumentViewer } from "@/contracts/docModel/ContractDocumentViewer";
import { EMPTY_BODY_DOC } from "@/contracts/docModel/types";
import { DEFAULT_CONTRACT_VARIABLES } from "@/contracts/docModel/defaultVariables";
import type { BodyDoc, VariableDef, ContractType, ContractDocumentStatus } from "@/contracts/docModel/types";
import { formatStandardDate } from "@/lib/displayHelpers";
import { EditorShell, type EditorShellSection } from "@/contracts/editor/EditorShell";

export default function DashboardContractDocumentEditor() {
  const { documentId = "" } = useParams();
  const { dir, t } = useI18n();
  const { data, isLoading, saveDraft, send, approve, reject, archive } = useContractDocument(documentId);

  const [bodyDoc, setBodyDoc] = useState<BodyDoc>(EMPTY_BODY_DOC);
  const [variables, setVariables] = useState<VariableDef[]>(DEFAULT_CONTRACT_VARIABLES);
  const [values, setValues] = useState<Record<string, any>>({});
  const [rejectReason, setRejectReason] = useState("");
  const [editorKey, setEditorKey] = useState(`doc-${dir}-0`);

  useEffect(() => {
    if (!data?.document) return;
    const d = data.document;
    setBodyDoc((d.document_json as BodyDoc) ?? EMPTY_BODY_DOC);
    setVariables(
      Array.isArray(d.variables_json) && d.variables_json.length > 0
        ? (d.variables_json as VariableDef[])
        : DEFAULT_CONTRACT_VARIABLES,
    );
    setValues((d.variable_values as Record<string, any>) ?? {});
    setEditorKey(`doc-${dir}-${d.id}`);
  }, [data?.document?.id, dir]);

  const doc = data?.document;
  const isDraft = doc?.status === "draft";
  const isSent = doc?.status === "sent_for_review";
  const isApproved = doc?.status === "approved";
  const isArchived = doc?.status === "archived";
  const canArchive = !!doc && !isArchived;
  const isFrozen = !!doc?.snapshot_json;

  const missingRequired = useMemo(() => {
    if (!isDraft) return [];
    return variables.filter((v) => v.required && (values[v.key] == null || values[v.key] === ""));
  }, [variables, values, isDraft]);

  const filledCount = useMemo(
    () => variables.filter((v) => values[v.key] != null && values[v.key] !== "").length,
    [variables, values],
  );

  const onSave = () =>
    saveDraft.mutate({ document_json: bodyDoc, variables_json: variables, variable_values: values });

  const onSend = () => {
    if (missingRequired.length > 0) return;
    saveDraft.mutate(
      { document_json: bodyDoc, variables_json: variables, variable_values: values },
      { onSuccess: () => send.mutate(undefined) },
    );
  };

  if (isLoading || !doc) {
    return <DashboardShell><div className="p-8">{t("contracts.editor.loading")}</div></DashboardShell>;
  }

  const statusLabel = (s: ContractDocumentStatus) => {
    const map: Record<ContractDocumentStatus, string> = {
      draft: t("contracts.documents.filters.draft"),
      sent_for_review: t("contracts.documents.filters.sent_for_review"),
      approved: t("contracts.documents.filters.approved"),
      rejected: t("contracts.documents.filters.rejected"),
      cancelled: t("contracts.documents.filters.archived"),
      archived: t("contracts.documents.filters.archived"),
    };
    return map[s] ?? s;
  };
  const typeLabel = (ct: ContractType) => t(`contracts.types.${ct}.label`) || ct;
  const eventLabel = (ev: string) =>
    t(`contracts.editor.events.${ev}`) || ev.replace(/_/g, " ");

  const snapshotDoc = (doc.snapshot_json as BodyDoc) ?? bodyDoc;
  const snapshotVars = (Array.isArray(doc.variables_json) ? doc.variables_json : variables) as VariableDef[];
  const snapshotValues = (doc.variable_values as Record<string, any>) ?? values;

  const filledLabel = t("contracts.editor.filledOfTotal")
    .replace("{filled}", String(filledCount))
    .replace("{total}", String(variables.length));

  const headerNode = (
    <div className="min-w-0">
      <Link to="/dashboard/contracts/documents" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1">
        <ArrowLeft className="w-3 h-3" /> {t("contracts.editor.backToDocuments")}
      </Link>
      <h1 className="font-display text-2xl font-semibold text-navy">{doc.title}</h1>
      {doc.title_ar && <p className="text-sm text-muted-foreground" dir="rtl">{doc.title_ar}</p>}
    </div>
  );

  const actionsNode = (
    <>
      {isFrozen && (
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 me-1" /> {t("contracts.editor.actions.print")}
        </Button>
      )}
      {isDraft && (
        <>
          <Button variant="outline" size="sm" onClick={onSave} disabled={saveDraft.isPending}>
            <Save className="w-4 h-4 me-1" /> {t("contracts.editor.actions.saveDraft")}
          </Button>
          <Button size="sm" onClick={onSend} disabled={missingRequired.length > 0 || send.isPending || saveDraft.isPending}>
            <Send className="w-4 h-4 me-1" /> {t("contracts.editor.actions.sendForReview")}
          </Button>
        </>
      )}
      {isSent && (
        <>
          <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
            <CheckCircle2 className="w-4 h-4 me-1" /> {t("contracts.editor.actions.approve")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <XCircle className="w-4 h-4 me-1" /> {t("contracts.editor.actions.reject")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("contracts.editor.reject.title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("contracts.editor.reject.description")}</AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("contracts.editor.reject.placeholder")}
              />
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => reject.mutate(rejectReason || undefined)}>
                  {t("contracts.editor.reject.action")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      {canArchive && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Archive className="w-4 h-4 me-1" /> {t("contracts.editor.actions.archive")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("contracts.editor.archive.title")}</AlertDialogTitle>
              <AlertDialogDescription>{t("contracts.editor.archive.description")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => archive.mutate()} disabled={archive.isPending}>
                {t("contracts.editor.archive.action")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );

  const bannerNode = missingRequired.length > 0 ? (
    <p className="text-xs text-destructive">
      {t("contracts.editor.missingRequired")}: {missingRequired.map((v) => (dir === "rtl" && v.label_ar ? v.label_ar : v.label_en)).join("، ")}
    </p>
  ) : null;

  const sections: EditorShellSection[] = [
    {
      id: "identity",
      label: t("contracts.editor.identitySection"),
      icon: <IdCard className="w-4 h-4" />,
      content: (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{typeLabel(doc.contract_type)}</Badge>
          <Badge variant={isApproved ? "default" : "secondary"}>{statusLabel(doc.status)}</Badge>
          {doc.sent_at && (
            <span className="text-xs text-muted-foreground">
              {t("contracts.editor.sentAt")} {formatStandardDate(doc.sent_at)}
            </span>
          )}
          {isFrozen && <Badge variant="outline">{t("contracts.editor.frozen")}</Badge>}
        </div>
      ),
    },
    {
      id: "body",
      label: t("contracts.editor.bodySection"),
      icon: <FileText className="w-4 h-4" />,
      content: isDraft ? (
        <ContractDocumentEditor
          editorKey={editorKey}
          dir={dir as "ltr" | "rtl"}
          initialDoc={bodyDoc}
          variables={variables}
          onChange={setBodyDoc}
        />
      ) : (
        <div className="bg-card border border-border rounded-md p-6 max-w-3xl mx-auto">
          <ContractDocumentViewer
            doc={snapshotDoc}
            values={snapshotValues}
            defs={snapshotVars}
            dir={dir as "ltr" | "rtl"}
          />
        </div>
      ),
    },
    {
      id: "values",
      label: t("contracts.editor.variableValuesSection"),
      icon: <ListChecks className="w-4 h-4" />,
      count: variables.length,
      hasIssue: missingRequired.length > 0,
      headerAside: (
        <span className="text-[11px] text-muted-foreground">{filledLabel}</span>
      ),
      content: isDraft ? (
        <div className="grid gap-3 md:grid-cols-2">
          {variables.map((v) => {
            const label = dir === "rtl" && v.label_ar ? v.label_ar : v.label_en;
            return (
              <div key={v.key} className="space-y-1">
                <Label className="text-xs">
                  {label}
                  {v.required && <span className="text-destructive"> *</span>}
                  <span className="ms-2 text-muted-foreground font-mono">{v.key}</span>
                </Label>
                <Input
                  value={values[v.key] ?? ""}
                  onChange={(e) => setValues((s) => ({ ...s, [v.key]: e.target.value }))}
                  type={v.type === "date" ? "date" : v.type === "number" || v.type === "currency" ? "number" : "text"}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 text-sm">
          {snapshotVars.map((v) => {
            const label = dir === "rtl" && v.label_ar ? v.label_ar : v.label_en;
            return (
              <div key={v.key} className="flex items-center justify-between gap-2 border-b border-border py-1">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium truncate">{String(snapshotValues[v.key] ?? "")}</span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      id: "review",
      label: t("contracts.editor.reviewSection"),
      icon: <Eye className="w-4 h-4" />,
      defaultCollapsed: true,
      content: (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">{t("common.status")}:</span>
            <Badge variant={isApproved ? "default" : "secondary"}>{statusLabel(doc.status)}</Badge>
          </div>
          {doc.rejection_reason && (
            <p className="text-destructive">
              {t("contracts.editor.rejectionPrefix")}: {doc.rejection_reason}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "history",
      label: t("contracts.editor.historySection"),
      icon: <Clock className="w-4 h-4" />,
      count: data.events.length,
      defaultCollapsed: true,
      content: data.events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("contracts.editor.noHistory")}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {data.events.map((ev) => (
            <li key={ev.id} className="flex items-center justify-between gap-2 border-b border-border last:border-0 py-1">
              <span>{eventLabel(ev.event_type)}</span>
              <span className="text-xs text-muted-foreground">{formatStandardDate(ev.created_at)}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <DashboardShell>
      <MobilePageHeader title={doc.title} />
      <div className="p-4 lg:p-8">
        <EditorShell
          header={headerNode}
          actions={actionsNode}
          banner={bannerNode}
          sections={sections}
        />
      </div>
    </DashboardShell>
  );
}
