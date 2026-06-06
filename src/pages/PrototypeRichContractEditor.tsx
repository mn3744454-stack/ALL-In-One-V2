// B2.5d.3 prototype page — isolated from production Contracts.
// Route: /dashboard/contracts/prototype-rich-editor (not in any nav).
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RichContractEditorPrototype } from "@/contracts/prototype/RichContractEditorPrototype";
import { ContractDocumentViewerPrototype } from "@/contracts/prototype/ContractDocumentViewerPrototype";
import { SAMPLE_TEMPLATE, SAMPLE_VALUES } from "@/contracts/prototype/sampleContractDoc";
import type { BodyDoc, VariableValues } from "@/contracts/prototype/contractDocTypes";

const TEST_CASES: { id: number; label: string }[] = [
  { id: 1, label: "Arabic RTL clause with English horse variable" },
  { id: 2, label: "Arabic clause with price + date" },
  { id: 3, label: "English clause with Arabic horse variable" },
  { id: 4, label: "Centered Arabic heading (desktop + 360px)" },
  { id: 5, label: "Mixed punctuation «…» (…) : ، + token" },
  { id: 6, label: "Variable chip in editor → plain text in viewer" },
  { id: 7, label: "Deterministic snapshot (render twice)" },
  { id: 8, label: "Mobile viewer 360/390/414 — no overflow" },
  { id: 9, label: "Paste Arabic Word-like content → marks stripped" },
  { id: 10, label: "Missing required ⚠ vs optional [—]" },
  { id: 11, label: "Reload from exported JSON — no drift" },
  { id: 12, label: "Language/dir switch — editor remounts" },
  { id: 13, label: "RTL audit (logical classes only)" },
  { id: 14, label: "Bundle-size note" },
];

type Result = "pass" | "fail" | "manual" | "todo";

export default function PrototypeRichContractEditor() {
  const { lang, setLang, dir } = useI18n();
  const [arDoc, setArDoc] = useState<BodyDoc>(SAMPLE_TEMPLATE.sections[0].body_doc_ar);
  const [enDoc, setEnDoc] = useState<BodyDoc>(SAMPLE_TEMPLATE.sections[1].body_doc_en);
  const [values, setValues] = useState<VariableValues>(SAMPLE_VALUES);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [reloadKey, setReloadKey] = useState(0);

  const exported = useMemo(
    () => JSON.stringify({ ar: arDoc, en: enDoc, values }, null, 2),
    [arDoc, enDoc, values],
  );

  const reloadFromExport = () => {
    try {
      const parsed = JSON.parse(exported);
      setArDoc(parsed.ar);
      setEnDoc(parsed.en);
      setValues(parsed.values);
      setReloadKey((k) => k + 1);
    } catch { /* noop */ }
  };

  const removeRequiredVar = () => {
    const next = { ...values };
    delete next["plan.price"];
    setValues(next);
  };

  return (
    <DashboardShell>
      <div className="p-4 lg:p-8 space-y-6">
        <div className="rounded-md border-2 border-dashed border-destructive/40 bg-destructive/5 p-3 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <Badge variant="destructive">Prototype only / نموذج تجريبي فقط</Badge>
            <span className="ms-2 text-sm text-muted-foreground">
              Not a legal/official document. No PDF, no signatures, no production data.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              Switch UI: {lang === "ar" ? "→ EN" : "→ AR"}
            </Button>
            <Button size="sm" variant="outline" onClick={reloadFromExport}>Reload from JSON</Button>
            <Button size="sm" variant="outline" onClick={removeRequiredVar}>Drop required var</Button>
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">
            Rich Contract Prototype — Tiptap / ProseMirror
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Active UI direction: <code>{dir}</code> · language: <code>{lang}</code>
          </p>
        </div>

        <Tabs defaultValue="ar" className="w-full">
          <TabsList>
            <TabsTrigger value="ar">Arabic body (RTL)</TabsTrigger>
            <TabsTrigger value="en">English body (LTR)</TabsTrigger>
          </TabsList>
          <TabsContent value="ar" className="space-y-4">
            <RichContractEditorPrototype
              editorKey={`ar-${reloadKey}`}
              dir="rtl"
              initialDoc={arDoc}
              variables={SAMPLE_TEMPLATE.variables}
              onChange={setArDoc}
            />
            <Viewers doc={arDoc} values={values} defs={SAMPLE_TEMPLATE.variables} dir="rtl" />
          </TabsContent>
          <TabsContent value="en" className="space-y-4">
            <RichContractEditorPrototype
              editorKey={`en-${reloadKey}`}
              dir="ltr"
              initialDoc={enDoc}
              variables={SAMPLE_TEMPLATE.variables}
              onChange={setEnDoc}
            />
            <Viewers doc={enDoc} values={values} defs={SAMPLE_TEMPLATE.variables} dir="ltr" />
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader><CardTitle className="text-base">Exported JSON (source of truth)</CardTitle></CardHeader>
          <CardContent>
            <pre className="max-h-72 overflow-auto rounded bg-muted p-3 text-xs leading-snug" dir="ltr">
              {exported}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Test-case checklist</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {TEST_CASES.map((tc) => (
                <li key={tc.id} className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground w-8">#{tc.id}</span>
                  <span className="flex-1 min-w-[200px]">{tc.label}</span>
                  {(["pass", "fail", "manual"] as Result[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setResults((s) => ({ ...s, [tc.id]: r }))}
                      className={
                        "text-xs px-2 py-0.5 rounded border " +
                        (results[tc.id] === r
                          ? r === "pass" ? "bg-primary/10 text-primary border-primary/30"
                            : r === "fail" ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "bg-muted border-border"
                          : "border-border text-muted-foreground hover:bg-muted")
                      }
                    >
                      {r}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function Viewers({
  doc, values, defs, dir,
}: { doc: BodyDoc; values: VariableValues; defs: typeof SAMPLE_TEMPLATE.variables; dir: "ltr" | "rtl" }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-base">Snapshot viewer (desktop)</CardTitle></CardHeader>
        <CardContent>
          <ContractDocumentViewerPrototype doc={doc} values={values} defs={defs} dir={dir} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Mobile viewer (360px)</CardTitle></CardHeader>
        <CardContent>
          <div className="w-[360px] max-w-full border border-border rounded p-3 mx-auto">
            <ContractDocumentViewerPrototype doc={doc} values={values} defs={defs} dir={dir} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
