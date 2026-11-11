import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useRef } from 'react';
import { Animate } from '@/shared-ui/animate';
import { Button } from '@/shared-ui/button';

export interface ConfirmDialogProps {
  /** The caller owns whether the dialog is open. */
  open: boolean;
  title: string;
  /** Says what will happen. Read aloud when the dialog opens. */
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive action. */
  destructive?: boolean;
  /** The person confirmed. The caller closes the dialog afterwards. */
  onConfirm: () => void;
  /** The person cancelled, pressed Escape, or the dialog was dismissed in another way. */
  onCancel: () => void;
}

/**
 * The one confirmation dialog, used before every destructive action (BR-009, FR-ADMIN-GEN-002).
 *
 * The behavior comes from Radix's alert dialog (TD-025), which is the only place the library is
 * used for this: a modal `alertdialog` role, focus moved into the dialog and kept there while
 * it is open, Escape to cancel, the page behind hidden from assistive technology, and focus
 * returned to the control that opened it (remembered here, because the caller opens the dialog
 * from its own state). Focus starts on Cancel, so pressing Enter by reflex
 * never confirms a destructive action. A click outside does not close it, as an alert dialog
 * must be answered.
 *
 * Replacing the library means changing this file only.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // The caller opens the dialog from its own state, so the library has no trigger element to
  // return focus to. The control that had focus is remembered when the dialog opens instead.
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel();
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-surface-inverse/80" />
        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-11/12 max-w-lg -translate-x-1/2 -translate-y-1/2"
          onOpenAutoFocus={() => {
            openerRef.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
        >
          <Animate
            pattern="scale"
            className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
          >
            <AlertDialog.Title>{title}</AlertDialog.Title>
            <AlertDialog.Description className="text-text-secondary">
              {description}
            </AlertDialog.Description>
            <div className="flex flex-col-reverse gap-3 tablet:flex-row tablet:justify-end">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">{cancelLabel}</Button>
              </AlertDialog.Cancel>
              <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </Animate>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
