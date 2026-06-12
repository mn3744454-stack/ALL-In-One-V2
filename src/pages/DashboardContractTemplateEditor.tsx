// B2.5e — Contract Template editor: edit body_json + variables; save draft; publish.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Send, Trash2, Plus } from "lucide-react";
import { useI18n } from "@/i18n";
import { useContractTemplate } from "@/contracts/hooks/useContractTemplates";
import { ContractDocumentEditor } from "@/contracts/docModel/ContractDocumentEditor";
import { EMPTY_BODY_DOC } from "@/contracts/docModel/types";
import { DEFAULT_CONTRACT_VARIABLES } from "@/contracts/docModel/defaultVariables";
import type { BodyDoc, VariableDef, VariableValueType, ContractType, ContractTemplateStatus } from "@/contracts/docModel/types";
import { formatStandardDate } from "@/lib/displayHelpers";

export default function DashboardContractTemplateEditor() {
  const { templateId = "" } = useParams();
  const navigate = useNavigate();
  const { dir, t } = useI18n();
  const { data, isLoading, saveDraft, publish } = useContractTemplate(templateId);

  const draftVersion = useMemo(
    () => data?.versions.find((v) => v.status === "draft") ?? data?.versions[0],
    [data],
  );

  const [bodyDoc, setBodyDoc] = useState<BodyDoc>(EMPTY_BODY_DOC);
  const [variables, setVariables] = useState<VariableDef[]>(DEFAULT_CONTRACT_VARIABLES);
  const [editorKey, setEditorKey] = useState(`tpl-${dir}-0`);

  useEffect(() => {
    if (!draftVersion) return;
    setBodyDoc((draftVersion.body_json as BodyDoc) ?? EMPTY_BODY_DOC);
    setVariables(
      Array.isArray(draftVersion.variables_json) && draftVersion.variables_json.length > 0
        ? (draftVersion.variables_json as VariableDef[])
        : DEFAULT_CONTRACT_VARIABLES,
    );
    setEditorKey(`tpl-${dir}-${draftVersion.id}`);
  }, [draftVersion?.id, dir]);

  const addVariable = () => {
    setVariables((v) => [
      ...v,
      { key: `custom.var_${v.length + 1}`, label_en: "New variable", label_ar: "متغير جديد", type: "text", required: false },
    ]);
  };
  const updateVar = (i: number, patch: Partial<VariableDef>) =>
    setVariables((v) => v.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const removeVar = (i: number) =>
    setVariables((v) => v.filter((_, idx) => idx !== i));

  const onSave = () =>
    saveDraft.mutate({ body_json: bodyDoc, variables_json: variables });

  const onPublish = () => {
    if (!draftVersion) return;
    saveDraft.mutate(
      { body_json: bodyDoc, variables_json: variables },
      { onSuccess: () => publish.mutate(draftVersion.id) },
    );
  };

  if (isLoading) return <DashboardShell><div className="p-8">{t("contracts.editor.loading")}</div></DashboardShell>;
  if (!data) return <DashboardShell><div className="p-8">{t("contracts.editor.notFoundForm")}</div></DashboardShell>;

  const { template, versions } = data;
  const publishedVersion = versions.find((v) => v.status === "published");

  const statusLabel = (s: ContractTemplateStatus) => t(`contracts.forms.status.${s}`) || s;
  const typeLabel = (ct: ContractType) => t(`contracts.types.${ct}.label`) || ct;

  return (
    <DashboardShell>
      <MobilePageHeader title={template.name} />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <Link
              to="/dashboard/contracts/templates"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="w-3 h-3" /> {t("contracts.editor.backToForms")}
            </Link>
            <h1 className="font-display text-2xl font-semibold text-navy">{template.name}</h1>
            {template.name_ar && (
              <p className="text-sm text-muted-foreground" dir="rtl">{template.name_ar}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline">{typeLabel(template.contract_type)}</Badge>
              <Badge variant={template.status === "published" ? "default" : "secondary"}>
                {statusLabel(template.status)}
              </Badge>
              {publishedVersion && (
                <span className="text-xs text-muted-foreground">
                  {t("contracts.editor.publishedPrefix")} v{publishedVersion.version_no} · {formatStandardDate(publishedVersion.published_at ?? publishedVersion.created_at)}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSave} disabled={saveDraft.isPending}>
              <Save className="w-4 h-4 me-1" /> {t("contracts.editor.actions.saveDraft")}
            </Button>
            <Button onClick={onPublish} disabled={!draftVersion || publish.isPending || saveDraft.isPending}>
              <Send className="w-4 h-4 me-1" /> {t("contracts.editor.actions.publish")}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("contracts.editor.bodySection")}</CardTitle></CardHeader>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("contracts.editor.variablesSection")}</CardTitle>
            <Button size="sm" variant="outline" onClick={addVariable}>
              <Plus className="w-4 h-4 me-1" /> {t("contracts.editor.addVariable")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
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
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
