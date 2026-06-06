// B2.5d.3 prototype — Tiptap editor wrapper (prototype only).
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import { useEffect, useMemo } from "react";
import { VariableTokenNode } from "./variableNodes";
import { FontSizeMark, type FontSizePreset } from "./fontSizeMark";
import type { BodyDoc, VariableDef } from "./contractDocTypes";

interface Props {
  initialDoc: BodyDoc;
  dir: "ltr" | "rtl";
  variables: VariableDef[];
  onChange: (doc: BodyDoc) => void;
  editorKey: string; // forces remount on dir change
}

export function RichContractEditorPrototype({
  initialDoc, dir, variables, onChange, editorKey,
}: Props) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["start", "center", "end"],
          defaultAlignment: "start",
        }),
        TextStyle,
        Color,
        FontSizeMark,
        VariableTokenNode.configure({
          getLabel: (key) => {
            const d = variables.find((v) => v.key === key);
            return d ? `${d.label_en} / ${d.label_ar}` : key;
          },
        }),
      ],
      content: initialDoc,
      editorProps: {
        attributes: {
          dir,
          class:
            "min-h-[320px] max-w-none px-4 py-3 focus:outline-none prose-sm prose-headings:font-semibold",
        },
      },
      onUpdate({ editor }) {
        onChange(editor.getJSON() as unknown as BodyDoc);
      },
    },
    [editorKey],
  );

  useEffect(() => () => editor?.destroy(), [editor]);

  const toolbar = useMemo(() => (editor ? <Toolbar editor={editor} variables={variables} /> : null), [editor, variables]);

  return (
    <div className="rounded-md border border-border bg-card">
      {toolbar}
      <EditorContent editor={editor} />
    </div>
  );
}

const COLORS: { token: string; hsl: string; label: string }[] = [
  { token: "default", hsl: "", label: "Default" },
  { token: "primary", hsl: "hsl(var(--primary))", label: "Primary" },
  { token: "muted", hsl: "hsl(var(--muted-foreground))", label: "Muted" },
  { token: "destructive", hsl: "hsl(var(--destructive))", label: "Destructive" },
];

const SIZES: { preset: string; cls: string }[] = [
  { preset: "sm", cls: "text-sm" },
  { preset: "base", cls: "text-base" },
  { preset: "lg", cls: "text-lg" },
  { preset: "xl", cls: "text-xl" },
  { preset: "2xl", cls: "text-2xl" },
];

function Btn({
  active, onClick, children, title,
}: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={
        "px-2 py-1 text-xs rounded border border-border hover:bg-muted transition-colors " +
        (active ? "bg-primary/10 text-primary border-primary/30" : "bg-background")
      }
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, variables }: { editor: Editor; variables: VariableDef[] }) {
  const can = editor.can();
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
      <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>B</Btn>
      <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>I</Btn>
      <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>U</Btn>
      <span className="mx-1 h-4 w-px bg-border" />
      {[1, 2, 3].map((lvl) => (
        <Btn key={lvl} active={editor.isActive("heading", { level: lvl })}
          onClick={() => editor.chain().focus().toggleHeading({ level: lvl as 1 | 2 | 3 }).run()}>
          H{lvl}
        </Btn>
      ))}
      <Btn active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>P</Btn>
      <span className="mx-1 h-4 w-px bg-border" />
      <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</Btn>
      <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Btn>
      <span className="mx-1 h-4 w-px bg-border" />
      {(["start", "center", "end"] as const).map((a) => (
        <Btn key={a} active={editor.isActive({ textAlign: a })}
          onClick={() => editor.chain().focus().setTextAlign(a).run()}>
          {a}
        </Btn>
      ))}
      <span className="mx-1 h-4 w-px bg-border" />
      <select
        className="text-xs rounded border border-border bg-background px-1 py-1"
        onChange={(e) => {
          const c = COLORS.find((x) => x.token === e.target.value);
          if (!c || c.token === "default") editor.chain().focus().unsetColor().run();
          else editor.chain().focus().setColor(c.hsl).run();
        }}
        defaultValue="default"
      >
        {COLORS.map((c) => <option key={c.token} value={c.token}>{c.label}</option>)}
      </select>
      <select
        className="text-xs rounded border border-border bg-background px-1 py-1"
        onChange={(e) => {
          const preset = e.target.value as FontSizePreset;
          if (preset === "base") editor.chain().focus().unsetFontSize().run();
          else editor.chain().focus().setFontSize(preset).run();
        }}
        value={(editor.getAttributes("fontSize")?.preset as FontSizePreset) ?? "base"}
        title="Font size"
      >
        {SIZES.map((s) => <option key={s.preset} value={s.preset}>{s.preset}</option>)}
      </select>
      <span className="mx-1 h-4 w-px bg-border" />
      <select
        className="text-xs rounded border border-border bg-background px-1 py-1 max-w-[200px]"
        onChange={(e) => {
          const key = e.target.value;
          if (!key) return;
          const def = variables.find((v) => v.key === key);
          editor.chain().focus().insertVariable(key, def?.required ?? false).run();
          e.currentTarget.value = "";
        }}
        defaultValue=""
      >
        <option value="">+ Insert variable…</option>
        {variables.map((v) => (
          <option key={v.key} value={v.key}>{v.key}</option>
        ))}
      </select>
      <span className="mx-1 h-4 w-px bg-border" />
      <Btn onClick={() => can.undo() && editor.chain().focus().undo().run()}>↺</Btn>
      <Btn onClick={() => can.redo() && editor.chain().focus().redo().run()}>↻</Btn>
    </div>
  );
}
