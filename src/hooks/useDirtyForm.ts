/**
 * useDirtyForm — supporting hook for the Safe Data-Entry Dialog Dismissal rule
 * (see `docs/platform-ux-standards.md` §6).
 *
 * Current adoption is **scoped to Housing/Movement surfaces** only. Platform-
 * wide rollout is pending a future dialog/wizard inventory audit.
 *
 * Intended for **plain serializable form state** (primitives, plain objects,
 * small arrays). It is NOT designed for `Date` instances, `Map`/`Set`, class
 * instances, functions, or other non-serializable values without a custom
 * comparison strategy — JSON serialization will lose or misrepresent them.
 *
 * This JSDoc is documentation-only; no runtime behavior is changed by it.
 */
import { useEffect, useRef, useState } from "react";

/**
 * Lightweight dirty-state tracker for scoped Housing form dialogs/wizards.
 *
 * Captures a JSON snapshot of `value` whenever `open` transitions to true and
 * compares the live value against the baseline. Suitable for plain forms whose
 * state is composed of primitives, plain objects, and small arrays. Do not use
 * for state containing Date instances, functions, Maps, or class instances.
 */
export function useDirtyForm<T>(value: T, open: boolean) {
  const baselineRef = useRef<string>("");
  const initializedRef = useRef(false);
  const [, force] = useState(0);

  useEffect(() => {
    if (open && !initializedRef.current) {
      baselineRef.current = safeStringify(value);
      initializedRef.current = true;
      force((n) => n + 1);
    } else if (!open && initializedRef.current) {
      // Allow next open to recapture baseline.
      initializedRef.current = false;
      baselineRef.current = "";
    }
    // We intentionally do NOT include `value` in deps — baseline is only
    // captured on open transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isDirty =
    initializedRef.current && safeStringify(value) !== baselineRef.current;

  const resetBaseline = (next?: T) => {
    baselineRef.current = safeStringify(next ?? value);
    initializedRef.current = true;
    force((n) => n + 1);
  };

  return { isDirty, resetBaseline };
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}
