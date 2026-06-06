// B2.5e.1 — Tiptap Mark for preset font sizes.
// Stored as { type: "fontSize", attrs: { preset } } to match viewer renderer.
import { Mark, mergeAttributes } from "@tiptap/core";

export type FontSizePreset = "sm" | "base" | "lg" | "xl" | "2xl";

const PRESET_CLASS: Record<FontSizePreset, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    contractFontSize: {
      setContractFontSize: (preset: FontSizePreset) => ReturnType;
      unsetContractFontSize: () => ReturnType;
    };
  }
}

export const FontSizeMark = Mark.create({
  name: "fontSize",

  addAttributes() {
    return {
      preset: {
        default: "base" as FontSizePreset,
        parseHTML: (el) => (el.getAttribute("data-font-size") ?? "base") as FontSizePreset,
        renderHTML: (attrs) => ({ "data-font-size": attrs.preset }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-font-size]" }];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const preset = (mark.attrs.preset ?? "base") as FontSizePreset;
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: PRESET_CLASS[preset] }),
      0,
    ];
  },

  addCommands() {
    return {
      setContractFontSize:
        (preset) =>
        ({ commands }) =>
          commands.setMark(this.name, { preset }),
      unsetContractFontSize:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
