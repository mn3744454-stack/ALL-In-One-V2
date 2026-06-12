// B2.5e Phase 2c — Reusable Contract Template (Form) editor body.
// Mounted by both the SafeFormDialog and the direct route fallback.
// No backend/TipTap/JSON changes; preserves all existing handlers.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Save, Send, Trash2, Plus,
  FileText, ListChecks, IdCard, Rocket,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useContractTemplate } from "@/contracts/hooks/useContractTemplates";
import { ContractDocumentEditor } from "@/contracts/docModel/ContractDocumentEditor";
import { EMPTY_BODY_DOC } from "@/contracts/docModel/types";
import { DEFAULT_CONTRACT_VARIABLES } from "@/contracts/docModel/defaultVariables";
import type { BodyDoc, VariableDef, VariableValueType, ContractType, ContractTemplateStatus } from "@/contracts/docModel/types";
import { formatStandardDate } from "@/lib/displayHelpers";
import { EditorShell, type EditorShellSection } from "./EditorShell";

export interface ContractTemplateEditorBodyProps {
  templateId: string;
  inDialog?: boolean;
  onRequestClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}

export function ContractTemplateEditorBody({
  templateId,
  inDialog,
  onRequestClose: _onRequestClose,
  onDirtyChange,
  onBusyChange,
}: ContractTemplateEditorBodyProps) {
  const { dir, t } = useI18n();
  const { data, isLoading, saveDraft, publish } = useContractTemplate(templateId);

  const draftVersion = useMemo(
    () => data?.versions.find((v) => v.status === "draft") ?? data?.versions[0],
    [data],
  );

  const [bodyDoc, setBodyDoc] = useState<BodyDoc>(EMPTY_BODY_DOC);
  const [variables, setVariables] = useState<VariableDef[]>(DEFAULT_CONTRACT_VARIABLES);
  const [editorKey, setEditorKey] = useState(`tpl-${dir}-0`);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!draftVersion) return;
    setBodyDoc((draftVersion.body_json as BodyDoc) ?? EMPTY_BODY_DOC);
    setVariables(
      Array.isArray(draftVersion.variables_json) && draftVersion.variables_json.length > 0
        ? (draftVersion.variables_json as VariableDef[])
        : DEFAULT_CONTRACT_VARIABLES,
    );
    setEditorKey(`tpl-${dir}-${draftVersion.id}`);
    setIsDirty(false);
  }, [draftVersion?.id, dir]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const isBusy = saveDraft.isPending || publish.isPending;

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  const markDirty = () => setIsDirty(true);

  const addVariable = () => {
    setVariables((v) => [
      ...v,
      { key: `custom.var_${v.length + 1}`, label_en: "New variable", label_ar: "متغير جديد", type: "text", required: false },
    ]);
    markDirty();
  };
  const updateVar = (i: number, patch: Partial<VariableDef>) => {
    setVariables((v) => v.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
    markDirty();
  };
  const removeVar = (i: number) => {
    setVariables((v) => v.filter((_, idx) => idx !== i));
    markDirty();
  };

  const onSave = () =>
    saveDraft.mutate(
      { body_json: bodyDoc, variables_json: variables },
      { onSuccess: () => setIsDirty(false) },
    );

  const onPublish = () => {
    if (!draftVersion) return;
    saveDraft.mutate(
      { body_json: bodyDoc, variables_json: variables },
      { onSuccess: () => { setIsDirty(false); publish.mutate(draftVersion.id); } },
    );
  };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">{t("contracts.editor.loading")}</div>;
  if (!data) return <div className="p-8 text-sm text-muted-foreground">{t("contracts.editor.notFoundForm")}</div>;

  const { template, versions } = data;
  const publishedVersion = versions.find((v) => v.status === "published");

  const statusLabel = (s: ContractTemplateStatus) => t(`contracts.forms.status.${s}`) || s;
  const typeLabel = (ct: ContractType) => t(`contracts.types.${ct}.label`) || ct;

  const headerNode = (
    <div className="min-w-0">
      {inDialog ? (
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mb-1">
          {t("contracts.hub.forms")}
        </p>
      ) : (
        <Link
          to="/dashboard/contracts/templates"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"
        >
          <ArrowLeft className="w-3 h-3" /> {t("contracts.editor.backToForms")}
        </Link>
      )}
      <h1 className="font-display text-xl lg:text-2xl font-semibold text-navy truncate">{template.name}</h1>
      {template.name_ar && (
        <p className="text-sm text-muted-foreground truncate" dir="rtl">{template.name_ar}</p>
      )}
    </div>
  );

  const actionsNode = (
    <>
      <Button variant="outline" size="sm" onClick={onSave} disabled={saveDraft.isPending}>
        <Save className="w-4 h-4 me-1" /> {t("contracts.editor.actions.saveDraft")}
      </Button>
      <Button size="sm" onClick={onPublish} disabled={!draftVersion || publish.isPending || saveDraft.isPending}>
        <Send className="w-4 h-4 me-1" /> {t("contracts.editor.actions.publish")}
      </Button>
      {inDialog && onRequestClose && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRequestClose}
          aria-label={t("common.close")}
          className="ms-1"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </>
  );

  const sections: EditorShellSection[] = [
    {
      id: "identity",
      label: t("contracts.editor.identitySection"),
      icon: <IdCard className="w-4 h-4" />,
      content: (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{typeLabel(template.contract_type)}</Badge>
          <Badge variant={template.status === "published" ? "default" : "secondary"}>
            {statusLabel(template.status)}
          </Badge>
          {publishedVersion && (
            <span className="text-xs text-muted-foreground">
              {t("contracts.editor.publishedPrefix")} v{publishedVersion.version_no} ·{" "}
              {formatStandardDate(publishedVersion.published_at ?? publishedVersion.created_at)}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "body",
      label: t("contracts.editor.bodySection"),
      icon: <FileText className="w-4 h-4" />,
      content: (
        <ContractDocumentEditor
          editorKey={editorKey}
          dir={dir as "ltr" | "rtl"}
          initialDoc={bodyDoc}
          variables={variables}
          onChange={(next) => { setBodyDoc(next); markDirty(); }}
        />
      ),
    },
    {
      id: "variables",
      label: t("contracts.editor.variablesSection"),
      icon: <ListChecks className="w-4 h-4" />,
      count: variables.length,
      headerAside: (
        <Button size="sm" variant="outline" onClick={addVariable}>
          <Plus className="w-4 h-4 me-1" /> {t("contracts.editor.addVariable")}
        </Button>
      ),
      content: variables.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("contracts.editor.noVariables")}</p>
      ) : (
        <div className="space-y-2">
          {variables.map((v, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border border-border rounded-md p-2">
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs">{t("contracts.editor.fields.key")}</Label>
                <Input value={v.key} onChange={(e) => updateVar(i, { key: e.target.value })} className="font-mono text-xs" />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs">{t("contracts.editor.fields.labelEn")}</Label>
                <Input value={v.label_en} onChange={(e) => updateVar(i, { label_en: e.target.value })} />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs">{t("contracts.editor.fields.labelAr")}</Label>
                <Input value={v.label_ar} onChange={(e) => updateVar(i, { label_ar: e.target.value })} dir="rtl" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">{t("contracts.editor.fields.type")}</Label>
                <Select value={v.type} onValueChange={(val) => updateVar(i, { type: val as VariableValueType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">{t("contracts.editor.variableTypes.text")}</SelectItem>
                    <SelectItem value="number">{t("contracts.editor.variableTypes.number")}</SelectItem>
                    <SelectItem value="currency">{t("contracts.editor.variableTypes.currency")}</SelectItem>
                    <SelectItem value="date">{t("contracts.editor.variableTypes.date")}</SelectItem>
                    <SelectItem value="identity_bilingual">{t("contracts.editor.variableTypes.identity_bilingual")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1 flex items-center justify-between gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <Checkbox checked={v.required} onCheckedChange={(c) => updateVar(i, { required: !!c })} />
                  {t("contracts.editor.fields.requiredShort")}
                </label>
                <Button size="icon" variant="ghost" onClick={() => removeVar(i)} title={t("contracts.editor.fields.deleteVariable")} aria-label={t("contracts.editor.fields.deleteVariable")}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "publishing",
      label: t("contracts.editor.publishingSection"),
      icon: <Rocket className="w-4 h-4" />,
      defaultCollapsed: true,
      content: (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">{t("common.status")}:</span>
            <Badge variant={template.status === "published" ? "default" : "secondary"}>
              {statusLabel(template.status)}
            </Badge>
          </div>
          {publishedVersion && (
            <p className="text-muted-foreground">
              {t("contracts.editor.publishedPrefix")} v{publishedVersion.version_no} ·{" "}
              {formatStandardDate(publishedVersion.published_at ?? publishedVersion.created_at)}
            </p>
          )}
        </div>
      ),
    },
  ];

  return <EditorShell header={headerNode} actions={actionsNode} sections={sections} />;
}
