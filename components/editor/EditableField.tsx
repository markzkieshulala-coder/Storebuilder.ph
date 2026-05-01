"use client";

import { useRef, useState, useEffect, ReactNode, CSSProperties } from "react";
import { useEditor } from "./EditorContext";

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
  const [isTextEditing, setIsTextEditing] = useState(false);

  const Tag = tag as any;

  const fsPx = (editor?.fontSize != null && editor.fontSize > 4) ? editor.fontSize : null;
  const widthPx = editor?.width;
  const x = editor?.x ?? 0;
  const y = editor?.y ?? 0;

  // Exit text editing when deselected from outside
  useEffect(() => {
    if (!selected && isTextEditing) {
      setIsTextEditing(false);
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePaste(e: React.ClipboardEvent<HTMLElement>) {
    if (!onTextChange) return;
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

  // Single click/pointer down: select + start drag (5px threshold before drag kicks in)
  function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
    if (!isEditable || isTextEditing) return;
    e.stopPropagation();
    onSelect(sectionId, field);

    if (onShowToolbar) {
      const r = e.currentTarget.getBoundingClientRect();
      onShowToolbar({
        sectionId, textColor, bgColor, accentColor,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      });
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const startXOff = x;
    const startYOff = y;
    let dragging = false;
    const target = e.currentTarget;

    try { target.setPointerCapture(e.pointerId); } catch {}

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) < 5) return;
      dragging = true;
      ev.preventDefault();
      const nx = Math.round(startXOff + dx);
      const ny = Math.round(startYOff + dy);
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

  // Double click: enter text editing mode (like Canva)
  function handleDoubleClick(e: React.MouseEvent) {
    if (!isEditable || !onTextChange) return;
    e.stopPropagation();
    setIsTextEditing(true);
    setTimeout(() => {
      const el = innerRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }, 0);
  }

  // Non-editor mode: plain element with any saved position/size overrides
  if (!isEditable) {
    const finalStyle: CSSProperties = { ...style };
    if (fsPx != null) finalStyle.fontSize = `${fsPx}px`;
    if (widthPx) finalStyle.maxWidth = widthPx;
    if (x || y) finalStyle.transform = `translate(${x}px, ${y}px)`;
    return <Tag className={className} style={finalStyle}>{children}</Tag>;
  }

  // Editor mode: position:relative on Tag so flex/grid is not disrupted.
  const innerStyle: CSSProperties = {
    ...style,
    position: "relative",
    fontSize: fsPx != null ? `${fsPx}px` : style?.fontSize,
    maxWidth: widthPx ? `${widthPx}px` : style?.maxWidth,
    transform: (x || y) ? `translate(${x}px, ${y}px)` : style?.transform,
    cursor: isTextEditing ? "text" : (selected ? "move" : "default"),
    outline: selected ? "2px solid #1877F2" : "2px solid transparent",
    outlineOffset: "2px",
    borderRadius: "4px",
    transition: "outline-color 0.12s ease",
    userSelect: (selected && !isTextEditing) ? "none" : undefined,
  };

  // Only become contentEditable after double-click (Canva behaviour)
  const editingProps = isTextEditing && onTextChange ? {
    contentEditable: true as const,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      onTextChange(sectionId, field, e.currentTarget.innerText);
      setIsTextEditing(false);
    },
    onPaste: handlePaste,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  } : {};

  return (
    <Tag
      ref={innerRef as any}
      className={className}
      style={innerStyle}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      {...editingProps}
    >
      {children}
    </Tag>
  );
}
