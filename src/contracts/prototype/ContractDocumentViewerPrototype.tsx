// B2.5d.3 prototype — pure JSON snapshot viewer. NO Tiptap dependency.
// Proves the production viewer can ship without the editor library.
import React from "react";
import { cn } from "@/lib/utils";
import type {
  Block, BodyDoc, Inline, Mark, VariableDef, VariableValues,
} from "./contractDocTypes";

const alignClass = (a?: string) =>
  a === "center" ? "text-center" : a === "end" ? "text-end" : "text-start";

const colorClass = (token: string) => {
  switch (token) {
    case "primary": return "text-primary";
    case "muted": return "text-muted-foreground";
    case "destructive": return "text-destructive";
    case "navy": return "text-navy";
    default: return "";
  }
};

const sizeClass = (preset: string) => {
  switch (preset) {
    case "sm": return "text-sm";
    case "lg": return "text-lg";
    case "xl": return "text-xl";
    case "2xl": return "text-2xl";
    default: return "text-base";
  }
};

function renderMarks(marks: Mark[] | undefined, text: string, k: string) {
  let cls = "";
  let bold = false, italic = false, underline = false;
  for (const m of marks ?? []) {
    if (m.type === "bold") bold = true;
    else if (m.type === "italic") italic = true;
    else if (m.type === "underline") underline = true;
    else if (m.type === "textColor") cls += " " + colorClass(m.attrs.token);
    else if (m.type === "fontSize") cls += " " + sizeClass(m.attrs.preset);
  }
  let el: React.ReactNode = text;
  if (bold) el = <strong>{el}</strong>;
  if (italic) el = <em>{el}</em>;
  if (underline) el = <u>{el}</u>;
  return <span key={k} className={cls.trim() || undefined}>{el}</span>;
}

function resolveVariable(
  key: string,
  required: boolean,
  values: VariableValues,
  defs: VariableDef[],
): { text: string; missing: boolean; required: boolean } {
  const v = values[key];
  if (v === undefined || v === null || v === "") {
    const def = defs.find((d) => d.key === key);
    const isReq = required || def?.required || false;
    return { text: isReq ? `⚠ {${key}}` : "[—]", missing: true, required: isReq };
  }
  return { text: String(v), missing: false, required };
}

function renderInline(
  nodes: Inline[] | undefined,
  values: VariableValues,
  defs: VariableDef[],
  parentDir?: "ltr" | "rtl",
): React.ReactNode {
  if (!nodes) return null;
  return nodes.map((n, i) => {
    if (n.type === "text") return renderMarks(n.marks, n.text, `t-${i}`);
    if (n.type === "variable") {
      const r = resolveVariable(n.attrs.key, !!n.attrs.required, values, defs);
      // Wrap with explicit dir opposite to parent for safe bidi
      const looksArabic = /[\u0600-\u06FF]/.test(r.text);
      const wrapDir = looksArabic ? "rtl" : "ltr";
      return (
        <span
          key={`v-${i}`}
          dir={wrapDir}
          className={cn(
            "inline-block align-baseline",
            r.missing && r.required && "text-destructive font-semibold",
            r.missing && !r.required && "text-muted-foreground",
          )}
        >
          {r.text}
        </span>
      );
    }
    return null;
  });
}

function renderBlock(
  b: Block,
  idx: number,
  values: VariableValues,
  defs: VariableDef[],
): React.ReactNode {
  if (b.type === "heading") {
    const Tag = (`h${b.attrs.level}`) as "h1" | "h2" | "h3";
    const sz = b.attrs.level === 1 ? "text-2xl" : b.attrs.level === 2 ? "text-xl" : "text-lg";
    return (
      <Tag
        key={idx}
        dir={b.attrs.dir}
        className={cn("font-semibold my-3", sz, alignClass(b.attrs.align))}
      >
        {renderInline(b.content, values, defs, b.attrs.dir)}
      </Tag>
    );
  }
  if (b.type === "paragraph") {
    return (
      <p
        key={idx}
        dir={b.attrs?.dir}
        className={cn("my-2 leading-relaxed break-words", alignClass(b.attrs?.align))}
      >
        {renderInline(b.content, values, defs, b.attrs?.dir)}
      </p>
    );
  }
  if (b.type === "bulletList") {
    return (
      <ul key={idx} className="list-disc ps-6 my-2 space-y-1">
        {b.content.map((li, i) => (
          <li key={i}>{li.content.map((p, j) => renderBlock(p, j, values, defs))}</li>
        ))}
      </ul>
    );
  }
  if (b.type === "orderedList") {
    return (
      <ol key={idx} className="list-decimal ps-6 my-2 space-y-1">
        {b.content.map((li, i) => (
          <li key={i}>{li.content.map((p, j) => renderBlock(p, j, values, defs))}</li>
        ))}
      </ol>
    );
  }
  return null;
}

export function renderBodyDoc(
  doc: BodyDoc,
  values: VariableValues,
  defs: VariableDef[],
): React.ReactNode {
  return doc.content.map((b, i) => renderBlock(b, i, values, defs));
}

interface ViewerProps {
  doc: BodyDoc;
  values: VariableValues;
  defs: VariableDef[];
  dir?: "ltr" | "rtl";
  className?: string;
}

export function ContractDocumentViewerPrototype({
  doc, values, defs, dir, className,
}: ViewerProps) {
  return (
    <div
      dir={dir}
      className={cn("prose-sm max-w-none text-foreground", className)}
    >
      {renderBodyDoc(doc, values, defs)}
    </div>
  );
}
