// B2.5d.3 prototype — sample bilingual contract document covering all test cases.
import type {
  BodyDoc, ContractTemplateDoc, VariableDef, VariableValues,
} from "./contractDocTypes";

export const SAMPLE_VARIABLES: VariableDef[] = [
  { key: "horse.name_en", label_en: "Horse name (EN)", label_ar: "اسم الخيل (إنجليزي)", type: "text", required: true },
  { key: "horse.name_ar", label_en: "Horse name (AR)", label_ar: "اسم الخيل (عربي)", type: "text", required: true },
  { key: "owner.name_en", label_en: "Owner (EN)", label_ar: "المالك (إنجليزي)", type: "text", required: true },
  { key: "owner.name_ar", label_en: "Owner (AR)", label_ar: "المالك (عربي)", type: "text", required: true },
  { key: "stable.name_en", label_en: "Stable (EN)", label_ar: "الإسطبل (إنجليزي)", type: "text", required: true },
  { key: "stable.name_ar", label_en: "Stable (AR)", label_ar: "الإسطبل (عربي)", type: "text", required: true },
  { key: "plan.name_en", label_en: "Plan (EN)", label_ar: "الباقة (إنجليزي)", type: "text", required: false },
  { key: "plan.name_ar", label_en: "Plan (AR)", label_ar: "الباقة (عربي)", type: "text", required: false },
  { key: "plan.price", label_en: "Plan price", label_ar: "سعر الباقة", type: "currency", required: true },
  { key: "contract.start_date", label_en: "Start date", label_ar: "تاريخ البدء", type: "date", required: true },
  { key: "contract.arrival_date", label_en: "Arrival date", label_ar: "تاريخ الوصول", type: "date", required: false },
];

export const SAMPLE_VALUES: VariableValues = {
  "horse.name_en": "Northern Star",
  "horse.name_ar": "نجم الشمال",
  "owner.name_en": "Khalid Al-Mansour",
  "owner.name_ar": "خالد المنصور",
  "stable.name_en": "Dayli Stables",
  "stable.name_ar": "اسطبلات دايلي",
  "plan.name_en": "Full Board",
  "plan.name_ar": "إقامة كاملة",
  "plan.price": "1500 SAR",
  "contract.start_date": "2026-06-15",
  // contract.arrival_date intentionally missing → optional → renders [—]
};

const ar: BodyDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1, align: "center", dir: "rtl" },
      content: [{ type: "text", text: "عقد إيواء — نموذج تجريبي" }],
    },
    {
      type: "paragraph",
      attrs: { align: "start", dir: "rtl" },
      content: [
        { type: "text", text: "يوافق المالك " },
        { type: "variable", attrs: { key: "owner.name_ar", required: true } },
        { type: "text", text: " على إيواء الخيل " },
        { type: "variable", attrs: { key: "horse.name_en", required: true } },
        { type: "text", text: " لدى " },
        { type: "variable", attrs: { key: "stable.name_ar", required: true } },
        { type: "text", text: "، وذلك ابتداءً من تاريخ " },
        { type: "variable", attrs: { key: "contract.start_date", required: true } },
        { type: "text", text: " بقيمة " },
        { type: "variable", attrs: { key: "plan.price", required: true } },
        { type: "text", text: " شهرياً." },
      ],
    },
    {
      type: "paragraph",
      attrs: { align: "start", dir: "rtl" },
      content: [
        { type: "text", text: "ملاحظات «هامة»: (تشمل الباقة الإقامة والتغذية)، تاريخ الوصول: " },
        { type: "variable", attrs: { key: "contract.arrival_date", required: false } },
        { type: "text", text: "، ،" },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "التغذية اليومية." }] }] },
        { type: "listItem", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "النظافة والعناية." }] }] },
      ],
    },
  ],
};

const en: BodyDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1, align: "center", dir: "ltr" },
      content: [{ type: "text", text: "Boarding Contract — Prototype" }],
    },
    {
      type: "paragraph",
      attrs: { align: "start", dir: "ltr" },
      content: [
        { type: "text", text: "The owner " },
        { type: "variable", attrs: { key: "owner.name_en", required: true } },
        { type: "text", text: " agrees to board the horse " },
        { type: "variable", attrs: { key: "horse.name_ar", required: true } },
        { type: "text", text: " at " },
        { type: "variable", attrs: { key: "stable.name_en", required: true } },
        { type: "text", text: ", starting on " },
        { type: "variable", attrs: { key: "contract.start_date", required: true } },
        { type: "text", text: " for a monthly fee of " },
        { type: "variable", attrs: { key: "plan.price", required: true } },
        { type: "text", text: "." },
      ],
    },
    {
      type: "orderedList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Daily feeding included." }] }] },
        { type: "listItem", content: [{ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Stall cleaning included." }] }] },
      ],
    },
  ],
};

export const SAMPLE_TEMPLATE: ContractTemplateDoc = {
  schema_version: 1,
  meta: {
    template_id: "proto-boarding-001",
    version_no: 1,
    title_en: "Boarding Contract — Prototype",
    title_ar: "عقد إيواء — نموذج تجريبي",
  },
  variables: SAMPLE_VARIABLES,
  sections: [
    { id: "s-ar", order: 1, title_en: "Arabic body", title_ar: "النص العربي", body_doc_en: { type: "doc", content: [] }, body_doc_ar: ar },
    { id: "s-en", order: 2, title_en: "English body", title_ar: "النص الإنجليزي", body_doc_en: en, body_doc_ar: { type: "doc", content: [] } },
  ],
};
