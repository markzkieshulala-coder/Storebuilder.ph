"use client";

import { useRef, ReactNode, CSSProperties } from "react";
import { useEditor } from "./EditorContext";

export type EditorFieldState = {
  // Kept on the type for backwards-compat with previously saved sites.
  // The per-field move/resize handles have been removed — only sections
  // are now adjustable. We still read these so old saved overrides
  // continue to render at their stored size.
  x?: number;
  y?: number;
  fontSize?: number;
  width?: number;
};

interface Props {
  sectionId: string;
  field: string;
  editor?: EditorFieldState;
  isEditable: boolean;
  selected: boolean;
  onSelect: (sectionId: string, field: string) => void;
  onUpdateEditor: (sectionId: string, field: string, updates: EditorFieldState) => void;
  onResetEditor: (sectionId: string, field: string) => void;

  // Inline editing forwarded to the inner element
  onTextChange?: (sectionId: string, field: string, value: string) => void;
  onImagePaste?: (sectionId: string, field: string, file: File) => void;
  onShowToolbar?: (info: {
    sectionId: string;
    textColor: string;
    bgColor: string;
    accentColor: string;
    rect: { top: number; left: number; width: number; height: number };
  }) => void;
  textColor?: string;
  bgColor?: string;
  accentColor?: string;

  // Visual config for the inner element
  tag?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: CSSProperties;

  children: ReactNode;
}

export default function EditableField({
  sectionId, field, editor, isEditable, selected,
  onSelect,
  onTextChange, onImagePaste: onImagePasteProp, onShowToolbar,
  textColor = "#fff", bgColor = "#0d0d1a", accentColor = "#c9a84c",
  tag = "div", className, style, children,
}: Props) {
  const innerRef = useRef<HTMLElement>(null);
  // Sections don't pass onImagePaste through fieldProps — pull it from
  // context so paste-an-image works without touching every section.
  const ctx = useEditor();
  const onImagePaste = onImagePasteProp ?? ctx.onImagePaste;

  const Tag = tag as any;

  const fsPx = (editor?.fontSize != null && editor.fontSize > 4) ? editor.fontSize : null;
  const widthPx = editor?.width;
  const x = editor?.x ?? 0;
  const y = editor?.y ?? 0;

  // Paste handler: strip rich-text formatting so pastes from Google Search,
  // docs, etc. inherit the site's typography instead of dragging in a foreign
  // font/color/size. Image pastes are routed to the upload pipeline.
  function handlePaste(e: React.ClipboardEvent<HTMLElement>) {
    if (!isEditable || !onTextChange) return;
    const cb = e.clipboardData;
    if (!cb) return;

    // Image paste — pull the first image item and forward it.
    if (onImagePaste) {
      for (let i = 0; i < cb.items.length; i++) {
        const item = cb.items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onImagePaste(sectionId, field, file);
            return;
          }
        }
      }
    }

    // Text paste — force plain text so the global font/colour win.
    const text = cb.getData("text/plain");
    if (text) {
      e.preventDefault();
      document.execCommand("insertText", false, text);
    }
  }

  const editableProps = isEditable && onTextChange ? {
    contentEditable: true as const,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => onTextChange(sectionId, field, e.currentTarget.innerText),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      onSelect(sectionId, field);
      if (onShowToolbar) {
        const r = e.currentTarget.getBoundingClientRect();
        onShowToolbar({
          sectionId,
          textColor, bgColor, accentColor,
          rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        });
      }
    },
    onPaste: handlePaste,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  } : {};

  // Non-editor mode: plain element. Keep any saved px overrides applied
  // so previously edited sites still render the way the user left them.
  if (!isEditable) {
    const finalStyle: CSSProperties = { ...style };
    if (fsPx != null) finalStyle.fontSize = `${fsPx}px`;
    if (widthPx) finalStyle.maxWidth = widthPx;
    if (x || y) finalStyle.transform = `translate(${x}px, ${y}px)`;
    return <Tag className={className} style={finalStyle}>{children}</Tag>;
  }

  // Editor mode: inline-edit + selection outline. No drag / resize handles —
  // only sections are adjustable now.
  const innerStyle: CSSProperties = {
    ...style,
    fontSize: fsPx != null ? `${fsPx}px` : style?.fontSize,
    maxWidth: widthPx ? `${widthPx}px` : style?.maxWidth,
    transform: x || y ? `translate(${x}px, ${y}px)` : undefined,
    cursor: "text",
    outline: selected ? "2px solid #1877F2" : "2px solid transparent",
    outlineOffset: "2px",
    borderRadius: "4px",
    transition: "outline-color 0.12s ease",
  };

  return (
    <Tag
      ref={innerRef as any}
      className={className}
      style={innerStyle}
      {...editableProps}
    >
      {children}
    </Tag>
  );
}
