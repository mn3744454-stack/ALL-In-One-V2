import type { VariableDef } from "./types";

// Shared initial variable set offered by every contract template.
export const DEFAULT_CONTRACT_VARIABLES: VariableDef[] = [
  { key: "horse.name_en", label_en: "Horse name (EN)", label_ar: "اسم الحصان (إنجليزي)", type: "text", required: true },
  { key: "horse.name_ar", label_en: "Horse name (AR)", label_ar: "اسم الحصان (عربي)", type: "text", required: false },
  { key: "owner.name_en", label_en: "Owner name (EN)", label_ar: "اسم المالك (إنجليزي)", type: "text", required: true },
  { key: "owner.name_ar", label_en: "Owner name (AR)", label_ar: "اسم المالك (عربي)", type: "text", required: false },
  { key: "stable.name_en", label_en: "Stable name (EN)", label_ar: "اسم الإسطبل (إنجليزي)", type: "text", required: true },
  { key: "stable.name_ar", label_en: "Stable name (AR)", label_ar: "اسم الإسطبل (عربي)", type: "text", required: false },
  { key: "plan.name_en", label_en: "Plan name (EN)", label_ar: "اسم الباقة (إنجليزي)", type: "text", required: false },
  { key: "plan.name_ar", label_en: "Plan name (AR)", label_ar: "اسم الباقة (عربي)", type: "text", required: false },
  { key: "plan.price", label_en: "Plan price", label_ar: "سعر الباقة", type: "currency", required: false },
  { key: "contract.start_date", label_en: "Start date", label_ar: "تاريخ البدء", type: "date", required: false },
  { key: "contract.arrival_date", label_en: "Arrival date", label_ar: "تاريخ الوصول", type: "date", required: false },
  { key: "contract.duration", label_en: "Duration", label_ar: "المدة", type: "text", required: false },
  { key: "contract.branch_preference", label_en: "Branch preference", label_ar: "الفرع المفضل", type: "text", required: false },
];
