"use client";

import { useRef, ReactNode, CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, RotateCcw } from "lucide-react";

export type EditorFieldState = {
  x?: number;       // pixel offset from natural position
  y?: number;       // pixel offset from natural position
  fontSize?: number; // actual font size in px (undefined = use natural size from CSS)
  width?: number;   // pixel width override (max-width)
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
  onSelect, onUpdateEditor, onResetEditor,
  onTextChange, onShowToolbar,
  textColor = "#fff", bgColor = "#0d0d1a", accentColor = "#c9a84c",
  tag = "div", className, style, children,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLElement>(null);

  const Tag = tag as any;

  const x = editor?.x ?? 0;
  const y = editor?.y ?? 0;
  // fontSize is a real px value (> 4) or undefined (use Tailwind/CSS)
  const fsPx = (editor?.fontSize != null && editor.fontSize > 4) ? editor.fontSize : null;
  const widthPx = editor?.width;
  const hasOverrides = !!(editor && (editor.x || editor.y || fsPx != null || editor.width != null));

  // ── Drag handler (move the entire field via transform) ────────────────────
  function startDrag(e: ReactPointerEvent<HTMLElement>) {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(sectionId, field);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = x;
    const startY = y;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      onUpdateEditor(sectionId, field, { x: startX + dx, y: startY + dy });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // ── Resize handlers ───────────────────────────────────────────────────────
  function startResize(corner: "se" | "e" | "s") {
    return (e: ReactPointerEvent<HTMLElement>) => {
      if (!isEditable) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect(sectionId, field);

      const rect = innerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startW = widthPx ?? rect.width;

      // Capture the actual rendered font size in px as the drag baseline
      const computedFs = innerRef.current
        ? parseFloat(getComputedStyle(innerRef.current as HTMLElement).fontSize)
        : 16;
      const startFsPx = fsPx ?? computedFs;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        const updates: EditorFieldState = {};
        if (corner === "se" || corner === "e") {
          updates.width = Math.max(60, Math.round(startW + dx));
        }
        if (corner === "se" || corner === "s") {
          // 100px of drag = +/- 50% of current font size
          const scale = 1 + dy / 200;
          const next = Math.max(8, Math.min(120, Math.round(startFsPx * scale)));
          updates.fontSize = next;
        }
        onUpdateEditor(sectionId, field, updates);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };
  }

  // ── Inline edit props (for the inner element) ─────────────────────────────
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
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  } : {};

  // ── Render: non-editor mode is a plain element ─────────────────────────────
  if (!isEditable) {
    const finalStyle: CSSProperties = { ...style };
    if (fsPx != null) finalStyle.fontSize = `${fsPx}px`;
    if (widthPx) finalStyle.maxWidth = widthPx;
    if (x || y) finalStyle.transform = `translate(${x}px, ${y}px)`;
    return <Tag className={className} style={finalStyle}>{children}</Tag>;
  }

  // ── Render: editor mode wraps inner element with selection UI ─────────────
  const wrapperStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
    transform: x || y ? `translate(${x}px, ${y}px)` : undefined,
    maxWidth: widthPx ? `${widthPx}px` : undefined,
    width: widthPx ? `${widthPx}px` : "auto",
    transition: selected ? "none" : "outline-color 0.12s ease",
    outline: selected ? "2px solid #1877F2" : "2px solid transparent",
    outlineOffset: "2px",
    borderRadius: "4px",
  };

  const innerStyle: CSSProperties = {
    ...style,
    fontSize: fsPx != null ? `${fsPx}px` : style?.fontSize,
    cursor: "text",
    outline: "none",
  };

  return (
    <div
      ref={wrapperRef}
      style={wrapperStyle}
      onClick={(e) => {
        if (isEditable) {
          e.stopPropagation();
          onSelect(sectionId, field);
        }
      }}
    >
      <Tag
        ref={innerRef as any}
        className={className}
        style={innerStyle}
        {...editableProps}
      >
        {children}
      </Tag>

      {/* Selection chrome (only when selected) */}
      {selected && (
        <>
          {/* Drag handle — top-left, drags the whole element */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={startDrag}
            title="Drag to move"
            className="absolute -top-3 -left-3 z-50 flex items-center justify-center w-6 h-6 rounded-full bg-[#1877F2] text-white shadow-md"
            style={{ cursor: "move", touchAction: "none" }}
          >
            <GripVertical size={11} />
          </button>

          {/* Reset button — top-right */}
          {hasOverrides && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); onResetEditor(sectionId, field); }}
              title="Reset position & size"
              className="absolute -top-3 -right-3 z-50 flex items-center justify-center w-6 h-6 rounded-full bg-white text-gray-600 shadow-md border border-gray-200 hover:bg-gray-50"
            >
              <RotateCcw size={10} />
            </button>
          )}

          {/* Resize handles */}
          {/* Right edge — width only */}
          <div
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={startResize("e")}
            title="Drag to resize width"
            className="absolute top-1/2 -right-1.5 z-50 w-3 h-8 -translate-y-1/2 rounded-sm bg-white border-2 border-[#1877F2]"
            style={{ cursor: "ew-resize", touchAction: "none" }}
          />
          {/* Bottom edge — font-size only */}
          <div
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={startResize("s")}
            title="Drag to resize text size"
            className="absolute -bottom-1.5 left-1/2 z-50 w-8 h-3 -translate-x-1/2 rounded-sm bg-white border-2 border-[#1877F2]"
            style={{ cursor: "ns-resize", touchAction: "none" }}
          />
          {/* Bottom-right corner — both */}
          <div
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={startResize("se")}
            title="Drag to resize text size and width"
            className="absolute -bottom-1.5 -right-1.5 z-50 w-3.5 h-3.5 rounded-sm bg-[#1877F2] border-2 border-white"
            style={{ cursor: "nwse-resize", touchAction: "none" }}
          />
        </>
      )}
    </div>
  );
}
