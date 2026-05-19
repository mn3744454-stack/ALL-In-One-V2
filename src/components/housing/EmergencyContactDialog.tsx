import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, User } from "lucide-react";
import { useI18n } from "@/i18n";
import {
  useBoardingAdmissions,
  type BoardingEmergencyContact,
  type EmergencyContactPhone,
} from "@/hooks/housing/useBoardingAdmissions";
import { formatBilingualName } from "@/lib/displayHelpers";
import {
  MultiPhoneInput,
  type PhoneEntry,
} from "@/components/shared/contact/MultiPhoneInput";
import { toast } from "sonner";

interface EmergencyContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admissionId: string;
  currentContacts?: BoardingEmergencyContact[] | null;
  /** Legacy single-text fallback used for backfill in case the JSONB is empty. */
  currentValue?: string | null;
  horseName?: string | null;
  horseNameAr?: string | null;
}

interface DraftContact {
  uid: string;
  name: string;
  name_ar: string;
  relationship: string;
  phones: PhoneEntry[];
}

let __uidCounter = 0;
const makeUid = () => `c_${Date.now()}_${++__uidCounter}`;

function toDraft(c: BoardingEmergencyContact): DraftContact {
  return {
    uid: makeUid(),
    name: c.name || "",
    name_ar: c.name_ar || "",
    relationship: c.relationship || "",
    phones: Array.isArray(c.phones)
      ? c.phones.map((p) => ({
          number: p.number || "",
          label: (p.label as PhoneEntry["label"]) || "other",
          is_whatsapp: !!p.is_whatsapp,
          is_primary: !!p.is_primary,
        }))
      : [],
  };
}

function fromLegacyText(text: string | null | undefined): DraftContact[] {
  if (!text || !text.trim()) return [];
  return [
    {
      uid: makeUid(),
      name: text.trim(),
      name_ar: "",
      relationship: "",
      phones: [
        {
          number: text.trim(),
          label: "other",
          is_whatsapp: false,
          is_primary: true,
        },
      ],
    },
  ];
}

export function EmergencyContactDialog({
  open,
  onOpenChange,
  admissionId,
  currentContacts,
  currentValue,
  horseName,
  horseNameAr,
}: EmergencyContactDialogProps) {
  const { t, lang } = useI18n();
  const { updateAdmission } = useBoardingAdmissions();
  const [drafts, setDrafts] = useState<DraftContact[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (Array.isArray(currentContacts) && currentContacts.length > 0) {
      setDrafts(currentContacts.map(toDraft));
    } else {
      setDrafts(fromLegacyText(currentValue ?? null));
    }
  }, [open, currentContacts, currentValue]);

  const bilingualHorse = formatBilingualName(horseName, horseNameAr, lang);
  const dialogTitle = t(
    "housing.admissions.detail.emergencyContactDialogTitle"
  ).replace("{{name}}", bilingualHorse);

  const addContact = () => {
    setDrafts((prev) => [
      ...prev,
      {
        uid: makeUid(),
        name: "",
        name_ar: "",
        relationship: "",
        phones: [
          { number: "", label: "mobile", is_whatsapp: false, is_primary: true },
        ],
      },
    ]);
  };

  const removeContact = (uid: string) => {
    setDrafts((prev) => prev.filter((d) => d.uid !== uid));
  };

  const updateContact = (uid: string, patch: Partial<DraftContact>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.uid === uid ? { ...d, ...patch } : d))
    );
  };

  const validate = (): string | null => {
    if (drafts.length === 0) return null; // empty is allowed (clears contacts)
    for (const d of drafts) {
      const hasEn = d.name.trim().length > 0;
      const hasAr = d.name_ar.trim().length > 0;
      if (lang === "ar") {
        if (!hasAr || !hasEn) {
          return t("housing.emergency.validation.namesRequiredAr");
        }
      } else {
        if (!hasEn) {
          return t("housing.emergency.validation.nameRequired");
        }
      }
      const phones = (d.phones || []).filter(
        (p) => p && p.number && p.number.trim().length > 0
      );
      if (phones.length === 0) {
        return t("housing.emergency.validation.phoneRequired");
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    // Normalize: drop empty phone rows; ensure exactly one primary per contact.
    const cleaned: BoardingEmergencyContact[] = drafts.map((d) => {
      let phones = (d.phones || [])
        .filter((p) => p && p.number && p.number.trim().length > 0)
        .map<EmergencyContactPhone>((p) => ({
          number: p.number.trim(),
          label: (p.label as EmergencyContactPhone["label"]) || "other",
          is_whatsapp: !!p.is_whatsapp,
          is_primary: !!p.is_primary,
        }));
      if (phones.length > 0 && !phones.some((p) => p.is_primary)) {
        phones = phones.map((p, i) => ({ ...p, is_primary: i === 0 }));
      }
      return {
        name: d.name.trim(),
        name_ar: d.name_ar.trim() || null,
        relationship: d.relationship.trim() || null,
        phones,
      };
    });

    setSaving(true);
    try {
      await updateAdmission({
        admissionId,
        emergency_contacts: cleaned,
      } as any);
      onOpenChange(false);
    } catch {
      // toast handled in mutation
    } finally {
      setSaving(false);
    }
  };

  const isEmpty = drafts.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 space-y-4 py-2">
          {isEmpty ? (
            <div className="rounded-md border border-dashed p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("housing.emergency.emptyState")}
              </p>
              <Button variant="outline" size="sm" onClick={addContact}>
                <Plus className="h-3.5 w-3.5 me-1" />
                {t("housing.emergency.addContact")}
              </Button>
            </div>
          ) : (
            drafts.map((d, idx) => (
              <ContactCard
                key={d.uid}
                index={idx}
                draft={d}
                onChange={(patch) => updateContact(d.uid, patch)}
                onRemove={() => removeContact(d.uid)}
              />
            ))
          )}

          {!isEmpty && (
            <Button variant="outline" size="sm" onClick={addContact}>
              <Plus className="h-3.5 w-3.5 me-1" />
              {t("housing.emergency.addContact")}
            </Button>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactCard({
  index,
  draft,
  onChange,
  onRemove,
}: {
  index: number;
  draft: DraftContact;
  onChange: (patch: Partial<DraftContact>) => void;
  onRemove: () => void;
}) {
  const { t, lang } = useI18n();
  const heading = useMemo(
    () =>
      t("housing.emergency.contactHeading").replace("{{n}}", String(index + 1)),
    [t, index]
  );

  return (
    <div className="rounded-md border p-3 space-y-3 bg-card">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{heading}</h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:bg-destructive/10"
          onClick={onRemove}
          aria-label={t("housing.emergency.removeContact")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`ec-name-${draft.uid}`}>
            {t("housing.emergency.nameEn")}
            {lang === "en" ? " *" : ""}
          </Label>
          <Input
            id={`ec-name-${draft.uid}`}
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t("housing.emergency.nameEnPlaceholder")}
            dir="ltr"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`ec-name-ar-${draft.uid}`}>
            {t("housing.emergency.nameAr")}
            {lang === "ar" ? " *" : ""}
          </Label>
          <Input
            id={`ec-name-ar-${draft.uid}`}
            value={draft.name_ar}
            onChange={(e) => onChange({ name_ar: e.target.value })}
            placeholder={t("housing.emergency.nameArPlaceholder")}
            dir="rtl"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`ec-rel-${draft.uid}`}>
          {t("housing.emergency.relationship")}
        </Label>
        <Input
          id={`ec-rel-${draft.uid}`}
          value={draft.relationship}
          onChange={(e) => onChange({ relationship: e.target.value })}
          placeholder={t("housing.emergency.relationshipPlaceholder")}
        />
      </div>

      <MultiPhoneInput
        phones={draft.phones}
        onChange={(phones) => onChange({ phones })}
        labelNamespace="emergency"
      />
    </div>
  );
}
