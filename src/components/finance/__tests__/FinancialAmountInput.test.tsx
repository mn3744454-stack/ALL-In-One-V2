import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FinancialAmountInput } from "../FinancialAmountInput";

function Harness(props: {
  initial?: number | null;
  max?: number;
  onValueChange?: (v: number | null) => void;
  onInvalidDraft?: (raw: string, r: "over-max" | "malformed") => void;
}) {
  return (
    <FinancialAmountInput
      aria-label="amount"
      value={props.initial ?? null}
      max={props.max}
      onValueChange={props.onValueChange ?? (() => {})}
      onInvalidDraft={props.onInvalidDraft}
    />
  );
}

describe("FinancialAmountInput", () => {
  it("never renders as type=number and never has a spinner (step)", () => {
    render(<Harness initial={10} />);
    const el = screen.getByLabelText("amount") as HTMLInputElement;
    expect(el.getAttribute("type")).toBe("text");
    expect(el.getAttribute("inputMode")).toBe("decimal");
    expect(el.getAttribute("step")).toBeNull();
  });

  it("commits digits and one decimal, rejects e/E, +, -", () => {
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    const el = screen.getByLabelText("amount") as HTMLInputElement;
    fireEvent.focus(el);
    fireEvent.change(el, { target: { value: "43.25" } });
    expect(onValueChange).toHaveBeenLastCalledWith(43.25);

    const eBlocked = fireEvent.keyDown(el, { key: "e" });
    expect(eBlocked).toBe(false); // preventDefault
    const plusBlocked = fireEvent.keyDown(el, { key: "+" });
    expect(plusBlocked).toBe(false);
    const minusBlocked = fireEvent.keyDown(el, { key: "-" });
    expect(minusBlocked).toBe(false);
  });

  it("prevents ArrowUp/ArrowDown from mutating the value", () => {
    const onValueChange = vi.fn();
    render(<Harness initial={10} onValueChange={onValueChange} />);
    const el = screen.getByLabelText("amount") as HTMLInputElement;
    const up = fireEvent.keyDown(el, { key: "ArrowUp" });
    const dn = fireEvent.keyDown(el, { key: "ArrowDown" });
    expect(up).toBe(false);
    expect(dn).toBe(false);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("does not stop wheel propagation (parent ScrollArea keeps scrolling)", () => {
    let parentSaw = 0;
    const onValueChange = vi.fn();
    render(
      <div onWheel={() => (parentSaw += 1)}>
        <Harness initial={10} onValueChange={onValueChange} />
      </div>,
    );
    const el = screen.getByLabelText("amount") as HTMLInputElement;
    fireEvent.wheel(el, { deltaY: 40 });
    expect(parentSaw).toBe(1);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("keeps over-max drafts local and does NOT commit them upward", () => {
    const onValueChange = vi.fn();
    const onInvalidDraft = vi.fn();
    render(
      <Harness
        initial={0}
        max={432.5}
        onValueChange={onValueChange}
        onInvalidDraft={onInvalidDraft}
      />,
    );
    const el = screen.getByLabelText("amount") as HTMLInputElement;
    fireEvent.focus(el);
    fireEvent.change(el, { target: { value: "500" } });
    // Only "over-max" invalid-draft signal — no committed value.
    expect(onValueChange).not.toHaveBeenCalledWith(500);
    expect(onInvalidDraft).toHaveBeenCalledWith("500", "over-max");
    // A valid under-cap value commits.
    fireEvent.change(el, { target: { value: "400" } });
    expect(onValueChange).toHaveBeenLastCalledWith(400);
  });

  it("treats empty string as null (no value)", () => {
    const onValueChange = vi.fn();
    render(<Harness initial={10} onValueChange={onValueChange} />);
    const el = screen.getByLabelText("amount") as HTMLInputElement;
    fireEvent.focus(el);
    fireEvent.change(el, { target: { value: "" } });
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("normalizes Arabic-Indic digits + Arabic decimal separator", () => {
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    const el = screen.getByLabelText("amount") as HTMLInputElement;
    fireEvent.focus(el);
    fireEvent.change(el, { target: { value: "٤٣٫٢٥" } });
    expect(onValueChange).toHaveBeenLastCalledWith(43.25);
  });
});
