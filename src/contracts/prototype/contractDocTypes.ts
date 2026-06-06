// B2.5d.3 prototype — JSON document shape for rich contract templates.
// Intentionally aligned with the Tiptap/ProseMirror node JSON. Not production.

export type Align = "start" | "center" | "end";
export type FontSizePreset = "sm" | "base" | "lg" | "xl" | "2xl";
export type ColorToken = "default" | "primary" | "muted" | "destructive" | "navy";

export interface MarkBold { type: "bold" }
export interface MarkItalic { type: "italic" }
export interface MarkUnderline { type: "underline" }
export interface MarkColor { type: "textColor"; attrs: { token: ColorToken } }
export interface MarkFontSize { type: "fontSize"; attrs: { preset: FontSizePreset } }
export type Mark = MarkBold | MarkItalic | MarkUnderline | MarkColor | MarkFontSize;

export interface TextNode { type: "text"; text: string; marks?: Mark[] }
export interface VariableNode {
  type: "variable";
  attrs: { key: string; required?: boolean };
}
export type Inline = TextNode | VariableNode;

export interface ParagraphBlock {
  type: "paragraph";
  attrs?: { align?: Align; dir?: "ltr" | "rtl" };
  content?: Inline[];
}
export interface HeadingBlock {
  type: "heading";
  attrs: { level: 1 | 2 | 3; align?: Align; dir?: "ltr" | "rtl" };
  content?: Inline[];
}
export interface ListItemBlock { type: "listItem"; content: ParagraphBlock[] }
export interface BulletListBlock { type: "bulletList"; content: ListItemBlock[] }
export interface OrderedListBlock { type: "orderedList"; content: ListItemBlock[] }
export type Block = ParagraphBlock | HeadingBlock | BulletListBlock | OrderedListBlock;

export interface BodyDoc { type: "doc"; content: Block[] }

export type VariableValueType =
  | "text" | "number" | "currency" | "date" | "identity_bilingual";

export interface VariableDef {
  key: string;
  label_en: string;
  label_ar: string;
  type: VariableValueType;
  required: boolean;
}

export interface Section {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  body_doc_en: BodyDoc;
  body_doc_ar: BodyDoc;
}

export interface ContractTemplateDoc {
  schema_version: 1;
  meta: {
    template_id: string;
    version_no: number;
    title_en: string;
    title_ar: string;
  };
  variables: VariableDef[];
  sections: Section[];
}

export type VariableValues = Record<string, string | number | null | undefined>;
