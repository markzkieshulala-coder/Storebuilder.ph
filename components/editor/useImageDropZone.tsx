"use client";

import { useState, useCallback, DragEvent } from "react";
import { useEditor } from "./EditorContext";

// Drag-and-drop helper for image fields. Wires onDragEnter/Over/Leave/Drop
// handlers that, when the user drops an image file onto the target element,
// upload it to the section/field via the existing `onImagePaste` editor
// callback. Falls back to the file picker (`onImageUpload`) flow for non-image
// drops so users always get feedback.
//
// Usage:
//   const drop = useImageDropZone(section.id, "backgroundImage");
//   <button {...drop.handlers} style={{ ...drop.activeStyle }}>...</button>
export function useImageDropZone(sectionId: string, field: string) {
  const { isEditable, onImagePaste } = useEditor();
  const [active, setActive] = useState(false);

  const onDragEnter = useCallback((e: DragEvent) => {
    if (!isEditable) return;
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(true);
  }, [isEditable]);

  const onDragOver = useCallback((e: DragEvent) => {
    if (!isEditable) return;
    if (!hasFiles(e)) return;
    // preventDefault is required so the drop event fires.
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    if (!active) setActive(true);
  }, [isEditable, active]);

  const onDragLeave = useCallback((e: DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    // Only clear when leaving the wrapper itself, not a child element.
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget instanceof Node && e.currentTarget.contains(related)) return;
    setActive(false);
  }, [isEditable]);

  const onDrop = useCallback((e: DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(false);
    const file = pickImageFile(e);
    if (!file) return;
    onImagePaste?.(sectionId, field, file);
  }, [isEditable, onImagePaste, sectionId, field]);

  return {
    active,
    handlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}

function hasFiles(e: DragEvent): boolean {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  // `Files` entry is what we want; some browsers also expose "application/x-…"
  // for in-page drags so we explicitly check for the Files type.
  for (let i = 0; i < types.length; i++) {
    if (types[i] === "Files") return true;
  }
  return false;
}

function pickImageFile(e: DragEvent): File | null {
  const dt = e.dataTransfer;
  if (!dt) return null;
  if (dt.files && dt.files.length > 0) {
    for (let i = 0; i < dt.files.length; i++) {
      const f = dt.files[i];
      if (f.type.startsWith("image/")) return f;
    }
    // No matching image file but at least one was dropped — return the first
    // so we surface a clearer error via the upload endpoint instead of
    // silently doing nothing.
    return dt.files[0] ?? null;
  }
  if (dt.items) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) return f;
      }
    }
  }
  return null;
}
