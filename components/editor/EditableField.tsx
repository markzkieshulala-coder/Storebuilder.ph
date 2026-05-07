"use client";

import { useRef, useState, useEffect, ReactNode, CSSProperties } from "react";
import { useEditor } from "./EditorContext";
import { Trash2 } from "lucide-react";

export type EditorFieldState = {
  x?: number;
  y?: number;
  fontSize?: number;
  width?: number;
  hidden?: boolean;
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
  const hidden = editor?.hidden === true;

  useEffect(() => {
    if (!selected && isTextEditing) setIsTextEditing(false);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delete element: clear text + flag as hidden so the renderer skips it.
  function handleDelete() {
    onUpdateEditor(sectionId, field, { ...(editor || {}), hidden: true });
    if (onTextChange) onTextChange(sectionId, field, "");
  }

  // Keyboard delete while selected (and NOT actively editing text).
  useEffect(() => {
    if (!selected || isTextEditing || !isEditable) return;
    function handleKey(e: KeyboardEvent) {
      // Ignore when focus is in another contentEditable / input
      const ae = document.activeElement as HTMLElement | null;
      if (ae && ae !== innerRef.current) {
        const tag = ae.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || ae.isContentEditable) return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, isTextEditing, isEditable]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Single click: select + start drag (5px threshold before drag activates)
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
      onUpdateEditor(sectionId, field, { ...(editor || {}), x: Math.round(startXOff + dx), y: Math.round(startYOff + dy) });
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

  // Double-click: enter text editing mode (Canva behaviour)
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

  // Corner handle: drag down to grow font, drag up to shrink
  function handleResizeStart(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const el = innerRef.current;
    const computedFs = el ? parseFloat(window.getComputedStyle(el).fontSize) : 16;
    const startFs = fsPx ?? computedFs;
    const startY = e.clientY;
    const target = e.currentTarget;

    try { target.setPointerCapture(e.pointerId); } catch {}

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const delta = ev.clientY - startY; // drag down → larger (natural direction)
      const next = Math.max(8, Math.min(200, Math.round(startFs + delta * 0.4)));
      onUpdateEditor(sectionId, field, { ...(editor || {}), fontSize: next });
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

  // Side handle: drag right to widen text block, drag left to narrow
  function handleWidthResizeStart(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const el = innerRef.current;
    const startW = widthPx ?? (el ? el.getBoundingClientRect().width : 200);
    const startX = e.clientX;
    const target = e.currentTarget;

    try { target.setPointerCapture(e.pointerId); } catch {}

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const delta = ev.clientX - startX; // drag right → wider
      const next = Math.max(60, Math.round(startW + delta));
      onUpdateEditor(sectionId, field, { ...(editor || {}), width: next });
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

  // Non-editor mode: plain element with any saved position/size overrides.
  // Hidden fields (deleted by the user) are skipped entirely on the live site.
  if (!isEditable) {
    if (hidden) return null;
    const finalStyle: CSSProperties = { ...style };
    if (fsPx != null) finalStyle.fontSize = `${fsPx}px`;
    if (widthPx) finalStyle.maxWidth = widthPx;
    if (x || y) finalStyle.transform = `translate(${x}px, ${y}px)`;
    return <Tag className={className} style={finalStyle}>{children}</Tag>;
  }

  // Editor mode but the user has marked this field hidden — don't render.
  if (hidden) return null;

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

      {/* Side handle — right edge pill, drag left/right to resize text width */}
      {selected && !isTextEditing && (
        <div
          contentEditable={false}
          onPointerDown={handleWidthResizeStart}
          onMouseDown={(e) => e.preventDefault()}
          title="Drag to resize text width"
          style={{
            position: "absolute",
            right: -5,
            top: "50%",
            transform: "translateY(-50%)",
            width: 4,
            height: 20,
            background: "#1877F2",
            border: "2px solid #fff",
            borderRadius: 2,
            cursor: "ew-resize",
            zIndex: 102,
            touchAction: "none",
            userSelect: "none",
          }}
        />
      )}

      {/* Font-size resize handle — bottom-right corner dot, drag down/up */}
      {selected && !isTextEditing && (
        <div
          contentEditable={false}
          onPointerDown={handleResizeStart}
          onMouseDown={(e) => e.preventDefault()}
          title="Drag down to increase font size, up to decrease"
          style={{
            position: "absolute",
            bottom: -5,
            right: -5,
            width: 10,
            height: 10,
            background: "#1877F2",
            border: "2px solid #fff",
            borderRadius: 2,
            cursor: "s-resize",
            zIndex: 102,
            touchAction: "none",
            userSelect: "none",
          }}
        />
      )}

      {/* Delete button — top-right when selected */}
      {selected && !isTextEditing && (
        <button
          type="button"
          contentEditable={false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          title="Delete element (or press Delete / Backspace)"
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: "#ef4444",
            color: "#fff",
            border: "2px solid #fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 103,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            padding: 0,
          }}
        >
          <Trash2 size={11} />
        </button>
      )}

      {/* Live dimension labels */}
      {selected && !isTextEditing && (fsPx != null || widthPx != null) && (
        <div
          contentEditable={false}
          style={{
            position: "absolute",
            bottom: -24,
            right: 0,
            display: "flex",
            gap: 4,
            pointerEvents: "none",
            zIndex: 102,
          }}
        >
          {widthPx != null && (
            <span style={{ background: "#1877F2", color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", lineHeight: 1.4 }}>
              {widthPx}w
            </span>
          )}
          {fsPx != null && (
            <span style={{ background: "#1877F2", color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", lineHeight: 1.4 }}>
              {fsPx}px
            </span>
          )}
        </div>
      )}
    </Tag>
  );
}
