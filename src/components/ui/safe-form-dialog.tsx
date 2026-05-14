import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SafeDiscardCopy {
  title: string;
  description: string;
  confirm: string;
  keepEditing: string;
}

interface CommonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, attempted user-close shows a discard confirmation. */
  isDirty?: boolean;
  /** Optional override for the discard confirmation copy. */
  discardCopy?: SafeDiscardCopy;
  children?: React.ReactNode;
}

interface SafeFormDialogProps
  extends CommonProps,
    Omit<React.ComponentPropsWithoutRef<typeof DialogContent>, "children"> {
  contentClassName?: string;
}

/**
 * Workspace-class form dialog that prevents accidental dismissal via
 * outside-click or Escape, and routes intentional close attempts (X button,
 * Cancel button, controlled `open=false` from inside) through an optional
 * dirty-state confirmation.
 *
 * Important: only user-initiated close gestures are intercepted. Programmatic
 * `setOpen(false)` from a successful submit calls `onOpenChange(false)`
 * directly, bypassing the wrapper, and existing reset handlers run normally.
 */
export function SafeFormDialog({
  open,
  onOpenChange,
  isDirty = false,
  discardCopy,
  children,
  className,
  contentClassName,
  ...contentProps
}: SafeFormDialogProps) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const requestClose = React.useCallback(() => {
    if (isDirty) {
      setConfirmOpen(true);
    } else {
      onOpenChange(false);
    }
  }, [isDirty, onOpenChange]);

  const copy: SafeDiscardCopy = discardCopy ?? {
    title: t("common.dialog.discardChanges.title"),
    description: t("common.dialog.discardChanges.description"),
    confirm: t("common.dialog.discardChanges.confirm"),
    keepEditing: t("common.dialog.discardChanges.keepEditing"),
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) {
            onOpenChange(true);
            return;
          }
          // Any user-driven close path (Radix close button, Esc, outside) is
          // funneled through requestClose. We can't fully suppress the close
          // button's onOpenChange, so dirty-state guarding still applies here.
          requestClose();
        }}
      >
        <DialogContent
          className={cn(className, contentClassName)}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          {...contentProps}
        >
          {children}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.keepEditing}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => {
                setConfirmOpen(false);
                onOpenChange(false);
              }}
            >
              {copy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SafeFormDrawerProps extends CommonProps {
  className?: string;
  drawerContentClassName?: string;
}

/**
 * Mobile counterpart to SafeFormDialog. Disables Vaul's swipe-down and
 * scrim-tap dismissal via `dismissible={false}` and routes intentional close
 * gestures through the same dirty-state confirmation contract.
 */
export function SafeFormDrawer({
  open,
  onOpenChange,
  isDirty = false,
  discardCopy,
  children,
  drawerContentClassName,
}: SafeFormDrawerProps) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const requestClose = React.useCallback(() => {
    if (isDirty) {
      setConfirmOpen(true);
    } else {
      onOpenChange(false);
    }
  }, [isDirty, onOpenChange]);

  const copy: SafeDiscardCopy = discardCopy ?? {
    title: t("common.dialog.discardChanges.title"),
    description: t("common.dialog.discardChanges.description"),
    confirm: t("common.dialog.discardChanges.confirm"),
    keepEditing: t("common.dialog.discardChanges.keepEditing"),
  };

  return (
    <>
      <Drawer
        open={open}
        // dismissible={false} disables swipe-down and overlay-tap dismissal in
        // Vaul, leaving only explicit close buttons as the close path.
        dismissible={false}
        onOpenChange={(next) => {
          if (next) {
            onOpenChange(true);
            return;
          }
          requestClose();
        }}
      >
        <DrawerContent className={drawerContentClassName}>
          {children}
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.keepEditing}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => {
                setConfirmOpen(false);
                onOpenChange(false);
              }}
            >
              {copy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Helper consumers can use to request closing a SafeFormDialog after
 * successful submit. Bypasses the dirty confirmation by calling onOpenChange
 * directly.
 */
export function safeCloseAfterSubmit(
  onOpenChange: (open: boolean) => void,
) {
  onOpenChange(false);
}
