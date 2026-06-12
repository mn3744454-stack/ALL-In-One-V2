// B2.5e Phase 3a — Contract Document editor dialog with guarded close.
// SafeFormDialog owns the single close affordance (Radix X). While any
// mutation is in-flight, user-initiated close attempts are blocked to
// prevent silent data loss.
import { useCallback, useRef, useState } from "react";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useRTL } from "@/hooks/useRTL";
import { ContractDocumentEditorBody } from "./ContractDocumentEditorBody";

interface Props {
  documentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractDocumentEditorDialog({ documentId, open, onOpenChange }: Props) {
  const { isRTL } = useRTL();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  busyRef.current = busy;

  const handleDirty = useCallback((d: boolean) => setDirty(d), []);
  const handleBusy = useCallback((b: boolean) => setBusy(b), []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && busyRef.current) {
        // Block close while a mutation is in-flight.
        return;
      }
      if (!next) {
        setDirty(false);
        setBusy(false);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      isDirty={dirty}
      className="w-[95vw] max-w-6xl max-h-[90vh] p-0 rounded-2xl flex flex-col overflow-hidden gap-0"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {documentId ? (
        <ContractDocumentEditorBody
          documentId={documentId}
          inDialog
          onDirtyChange={handleDirty}
          onBusyChange={handleBusy}
        />
      ) : null}
    </SafeFormDialog>
  );
}
