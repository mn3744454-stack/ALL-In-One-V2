/**
 * Phase N+3 · Slice 3.3 — Shared financial money input.
 *
 * Requirements:
 *   • Never render <input type="number">. Mouse-wheel, ArrowUp/ArrowDown, and
 *     native spinners must NOT mutate the money value.
 *   • Wheel events must still bubble so the parent ScrollArea keeps scrolling
 *     even when the pointer sits on top of the input.
 *   • Accepts digits + a single decimal separator only; blocks e/E, +, -.
 *   • Draft-local state: the user may type an intermediate value ("4", "43",
 *     "43.") that isn't valid yet — we only surface committed numeric values
 *     (or `null`) upward via `onValueChange`, so an invalid draft never enters
 *     totals, payload, or fingerprint.
 *   • Optional `max` clamps the COMMITTED value; over-max drafts stay local
 *     and are surfaced through `onInvalidDraft` so callers can flag the row
 *     without silently overwriting the user's typing.
 *
 * Pure presentational component — no i18n, no supabase.
 */
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  evaluateDraft,
  shouldBlockKey,
} from "@/lib/finance/financialAmountInputLogic";

export interface FinancialAmountInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "min" | "max" | "step"
  > {
  /** Committed numeric value; `null` = empty. */
  value: number | null;
  /** Fired whenever the DRAFT parses to a valid, in-range number (or empty). */
  onValueChange: (next: number | null) => void;
  /** Optional cap. Drafts above `max` are held locally and reported via onInvalidDraft. */
  max?: number;
  /** Called with the raw string when the draft is invalid (over max, malformed, negative). */
  onInvalidDraft?: (rawDraft: string, reason: "over-max" | "malformed") => void;
  /** Decimal places to display when reflecting the committed value. Default 2. */
  decimals?: number;
}

function formatCommitted(value: number | null, decimals: number): string {
  if (value === null || Number.isNaN(value)) return "";
  return value.toFixed(decimals);
}

export const FinancialAmountInput = React.forwardRef<
  HTMLInputElement,
  FinancialAmountInputProps
>(function FinancialAmountInput(
  {
    value,
    onValueChange,
    max,
    onInvalidDraft,
    decimals = 2,
    className,
    onKeyDown,
    onWheel,
    onBlur,
    onFocus,
    placeholder = "0.00",
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string>(() =>
    formatCommitted(value, decimals),
  );

  // Sync external value → draft whenever the input isn't being actively typed in.
  React.useEffect(() => {
    if (!focused) setDraft(formatCommitted(value, decimals));
  }, [value, decimals, focused]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const outcome = evaluateDraft(raw, { max, decimals });
    if (outcome.kind === "invalid") {
      onInvalidDraft?.(raw, outcome.reason);
      // For over-max we still surface the draft locally so the user sees
      // what they typed; for malformed we drop the character entirely.
      if (outcome.reason === "over-max") setDraft(outcome.normalized);
      return;
    }
    setDraft(outcome.normalized);
    onValueChange(outcome.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (shouldBlockKey(e.key)) e.preventDefault();
    onKeyDown?.(e);
  }

  function handleWheel(e: React.WheelEvent<HTMLInputElement>) {
    // Native <input type=number> would mutate the value on wheel. We render
    // as text, so nothing happens — but if the element is focused browsers
    // may still let the value creep; blur it to be safe. We do NOT stop
    // propagation so the parent ScrollArea keeps scrolling.
    if (document.activeElement === e.currentTarget) {
      (e.currentTarget as HTMLInputElement).blur();
    }
    onWheel?.(e);
  }

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      dir="ltr"
      data-financial-amount-input
      placeholder={placeholder}
      className={cn("font-mono tabular-nums text-end", className)}
      value={focused ? draft : formatCommitted(value, decimals)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onFocus={(e) => {
        setFocused(true);
        setDraft(formatCommitted(value, decimals));
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        setDraft(formatCommitted(value, decimals));
        onBlur?.(e);
      }}
      {...rest}
    />
  );
});
