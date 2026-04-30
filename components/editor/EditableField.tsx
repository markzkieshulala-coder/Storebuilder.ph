"use client";

import { useRef, ReactNode, CSSProperties } from "react";
import { useEditor } from "./EditorContext";
import { GripHorizontal } from "lucide-react";

export type EditorFieldState = {
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

  tag?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: CSSProperties;

  children: ReactNode;
}

export default function EditableField({
  sectionId, field, editor, isEditable, selected,
  onSelect, onUpdateEditor,
  onTextChange, onImagePaste: onImagePasteProp, onShowToolbar,
  textColor = "#fff", bgColor = "#0d0d1a", accentColor = "#c9a84c",
  tag = "div", className, style, children,
}: Props) {
  const innerRef = useRef<HTMLElement>(null);
  const ctx = useEditor();
  const onImagePaste = onImagePasteProp ?? ctx.onImagePaste;

  const Tag = tag as any;

  const fsPx = (editor?.fontSize != null && editor.fontSize > 4) ? editor.fontSize : null;
  const widthPx = editor?.width;
  const x = editor?.x ?? 0;
  const y = editor?.y ?? 0;

  function handlePaste(e: React.ClipboardEvent<HTMLElement>) {
    if (!isEditable || !onTextChange) return;
    const cb = e.clipboardData;
    if (!cb) return;

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

    const text = cb.getData("text/plain");
    if (text) {
      e.preventDefault();
      document.execCommand("insertText", false, text);
    }
  }

  // Drag the text element to a new position within the section.
  // Uses pointer capture on the handle so the drag stays locked.
  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch {}
    const startX = e.clientX;
    const startY = e.clientY;
    const startXOff = x;
    const startYOff = y;

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const nx = Math.round(startXOff + (ev.clientX - startX));
      const ny = Math.round(startYOff + (ev.clientY - startY));
      onUpdateEditor(sectionId, field, { ...(editor || {}), x: nx, y: ny });
    };
    const cleanup = () => {
      try { target.releasePointerCapture(e.pointerId); } catch {}
      target.removeEventListener("pointermove", onMove as EventListener);
      target.removeEventListener("pointerup", cleanup);
      target.removeEventListener("pointercancel", cleanup);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
    };
    target.addEventListener("pointermove", onMove as EventListener);
    target.addEventListener("pointerup", cleanup);
    target.addEventListener("pointercancel", cleanup);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
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

  // Non-editor mode: plain element, apply any saved position/size overrides.
  if (!isEditable) {
    const finalStyle: CSSProperties = { ...style };
    if (fsPx != null) finalStyle.fontSize = `${fsPx}px`;
    if (widthPx) finalStyle.maxWidth = widthPx;
    if (x || y) finalStyle.transform = `translate(${x}px, ${y}px)`;
    return <Tag className={className} style={finalStyle}>{children}</Tag>;
  }

  const innerStyle: CSSProperties = {
    ...style,
    position: "relative",
    fontSize: fsPx != null ? `${fsPx}px` : style?.fontSize,
    maxWidth: widthPx ? `${widthPx}px` : style?.maxWidth,
    transform: (x || y) ? `translate(${x}px, ${y}px)` : style?.transform,
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
      {selected && (
        <span
          contentEditable={false}
          onPointerDown={startDrag}
          onMouseDown={(e) => e.preventDefault()}
          title="Drag to move this text block"
          style={{
            position: "absolute",
            top: -22,
            left: 0,
            zIndex: 100,
            background: "#1877F2",
            color: "#fff",
            borderRadius: "4px 4px 0 0",
            padding: "3px 8px",
            cursor: "move",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            fontWeight: 600,
            userSelect: "none",
            touchAction: "none",
            whiteSpace: "nowrap",
          }}
        >
          <GripHorizontal size={10} />
        </span>
      )}
      {children}
    </Tag>
  );
}
