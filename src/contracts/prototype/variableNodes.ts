// B2.5d.3 prototype — Tiptap custom inline atom node for variable tokens.
import { Node, mergeAttributes } from "@tiptap/core";

export interface VariableTokenOptions {
  HTMLAttributes: Record<string, unknown>;
  getLabel?: (key: string) => string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    variableToken: {
      insertVariable: (key: string, required?: boolean) => ReturnType;
    };
  }
}

export const VariableTokenNode = Node.create<VariableTokenOptions>({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { HTMLAttributes: {}, getLabel: (k) => k };
  },

  addAttributes() {
    return {
      key: { default: "" },
      required: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-variable-key]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const key = String(node.attrs.key ?? "");
    const label = this.options.getLabel?.(key) ?? key;
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-variable-key": key,
        "data-required": node.attrs.required ? "true" : "false",
        class:
          "inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[0.85em] font-medium text-primary mx-0.5 align-baseline",
        contenteditable: "false",
        dir: "ltr",
      }),
      `{${label}}`,
    ];
  },

  addCommands() {
    return {
      insertVariable:
        (key: string, required = false) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { key, required },
          }),
    };
  },
});
