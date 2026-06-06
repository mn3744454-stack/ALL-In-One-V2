// B2.5e — Contract Document editor + viewer (snapshot once sent).
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Send, CheckCircle2, XCircle, Printer } from "lucide-react";
import { useI18n } from "@/i18n";
import { useContractDocument } from "@/contracts/hooks/useContractDocuments";
import { ContractDocumentEditor } from "@/contracts/docModel/ContractDocumentEditor";
import { ContractDocumentViewer } from "@/contracts/docModel/ContractDocumentViewer";
import { EMPTY_BODY_DOC } from "@/contracts/docModel/types";
import { DEFAULT_CONTRACT_VARIABLES } from "@/contracts/docModel/defaultVariables";
import type { BodyDoc, VariableDef } from "@/contracts/docModel/types";
import { formatStandardDate } from "@/lib/displayHelpers";

export default function DashboardContractDocumentEditor() {
  const { documentId = "" } = useParams();
  const { dir } = useI18n();
  const { data, isLoading, saveDraft, send, approve, reject } = useContractDocument(documentId);

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
  const isFrozen = !!doc?.snapshot_json;

  const missingRequired = useMemo(() => {
    if (!isDraft) return [];
    return variables.filter((v) => v.required && (values[v.key] == null || values[v.key] === ""));
  }, [variables, values, isDraft]);

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
    return <DashboardShell><div className="p-8">Loading…</div></DashboardShell>;
  }

  const snapshotDoc = (doc.snapshot_json as BodyDoc) ?? bodyDoc;
  const snapshotVars = (Array.isArray(doc.variables_json) ? doc.variables_json : variables) as VariableDef[];
  const snapshotValues = (doc.variable_values as Record<string, any>) ?? values;

  return (
    <DashboardShell>
      <MobilePageHeader title={doc.title} />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <Link to="/dashboard/contracts/documents" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1">
              <ArrowLeft className="w-3 h-3" /> Documents
            </Link>
            <h1 className="font-display text-2xl font-semibold text-navy">{doc.title}</h1>
            {doc.title_ar && <p className="text-sm text-muted-foreground" dir="rtl">{doc.title_ar}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="capitalize">{doc.contract_type}</Badge>
              <Badge variant={isApproved ? "default" : "secondary"}>{doc.status}</Badge>
              {doc.sent_at && (
                <span className="text-xs text-muted-foreground">
                  Sent {formatStandardDate(doc.sent_at)}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isFrozen && (
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 me-1" /> Print
              </Button>
            )}
            {isDraft && (
              <>
                <Button variant="outline" onClick={onSave} disabled={saveDraft.isPending}>
                  <Save className="w-4 h-4 me-1" /> Save draft
                </Button>
                <Button onClick={onSend} disabled={missingRequired.length > 0 || send.isPending || saveDraft.isPending}>
                  <Send className="w-4 h-4 me-1" /> Send for review
                </Button>
              </>
            )}
            {isSent && (
              <>
                <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
                  <CheckCircle2 className="w-4 h-4 me-1" /> Approve
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <XCircle className="w-4 h-4 me-1" /> Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject document</AlertDialogTitle>
                      <AlertDialogDescription>
                        Provide a reason. The document goes back to the sender as rejected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection"
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => reject.mutate(rejectReason || undefined)}>
                        Reject
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {isDraft ? (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Body</CardTitle></CardHeader>
              <CardContent>
                <ContractDocumentEditor
                  editorKey={editorKey}
                  dir={dir as "ltr" | "rtl"}
                  initialDoc={bodyDoc}
                  variables={variables}
                  onChange={setBodyDoc}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Variable values</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {variables.map((v) => (
                  <div key={v.key} className="space-y-1">
                    <Label className="text-xs">
                      {v.label_en}
                      {v.required && <span className="text-destructive"> *</span>}
                      <span className="ms-2 text-muted-foreground font-mono">{v.key}</span>
                    </Label>
                    <Input
                      value={values[v.key] ?? ""}
                      onChange={(e) => setValues((s) => ({ ...s, [v.key]: e.target.value }))}
                      type={v.type === "date" ? "date" : v.type === "number" || v.type === "currency" ? "number" : "text"}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {missingRequired.length > 0 && (
              <p className="text-xs text-destructive">
                Missing required: {missingRequired.map((v) => v.label_en).join(", ")}
              </p>
            )}
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Document snapshot {isFrozen && <Badge variant="outline" className="ms-2">Frozen</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-card border border-border rounded-md p-6 max-w-3xl mx-auto">
                <ContractDocumentViewer
                  doc={snapshotDoc}
                  values={snapshotValues}
                  defs={snapshotVars}
                  dir={dir as "ltr" | "rtl"}
                />
              </div>
              {doc.rejection_reason && (
                <p className="mt-3 text-sm text-destructive">
                  Rejection: {doc.rejection_reason}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {data.events.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {data.events.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-2 border-b border-border last:border-0 py-1">
                    <span className="capitalize">{ev.event_type.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">{formatStandardDate(ev.created_at)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
