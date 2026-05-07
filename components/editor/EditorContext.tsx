"use client";
import { createContext, useContext } from "react";
import type { EditorFieldState } from "./EditableField";

export type FloatingToolbarTarget = {
  sectionId: string;
  textColor: string;
  bgColor: string;
  accentColor: string;
  fontScale?: number;
  textAlign?: "left" | "center" | "right";
  rect: { top: number; left: number; width: number; height: number };
};

export type SelectedField = { sectionId: string; field: string } | null;

export type ViewMode = "desktop" | "tablet" | "mobile";

export type EditorContextType = {
  isEditable: boolean;
  // Preview mode: not editable, but also not a real published site, so internal
  // page-route hrefs like "/about" should not actually navigate (those pages
  // only exist under a published subdomain). Set true on the editor preview.
  isPreview?: boolean;
  viewMode: ViewMode;
  onTextChange: (sectionId: string, field: string, value: string) => void;
  onNestedTextChange: (sectionId: string, arrayField: string, index: number, key: string, value: string) => void;
  onImageUpload: (sectionId: string, field: string) => void;
  onImagePaste?: (sectionId: string, field: string, file: File) => void;
  onSectionClick: (sectionId: string) => void;
  onShowToolbar: (target: FloatingToolbarTarget) => void;

  // Drag-resize editor state — scoped per viewport so desktop/tablet/mobile
  // edits are fully independent.
  selectedField: SelectedField;
  onSelectField: (sectionId: string, field: string) => void;
  onUpdateEditor: (sectionId: string, field: string, updates: EditorFieldState) => void;
  onResetEditor: (sectionId: string, field: string) => void;
  getEditorState: (sectionId: string, field: string) => EditorFieldState | undefined;

  // Section-level adjustments (height per-viewport + reorder)
  onResizeSection?: (sectionId: string, minHeight: number, mode: ViewMode) => void;
  onReorderSections?: (fromIndex: number, toIndex: number) => void;

  // Batch-update one item inside an array field (e.g. a single product)
  onUpdateNestedItem?: (sectionId: string, arrayField: string, index: number, updates: Record<string, any>) => void;

  // Multi-page editor navigation — "/" = homepage, "/services" = services page
  currentEditorPage?: string;
  onEditorPageChange?: (page: string) => void;
};

const DEFAULT: EditorContextType = {
  isEditable: false,
  isPreview: false,
  viewMode: "desktop",
  onTextChange: () => {},
  onNestedTextChange: () => {},
  onImageUpload: () => {},
  onSectionClick: () => {},
  onShowToolbar: () => {},
  selectedField: null,
  onSelectField: () => {},
  onUpdateEditor: () => {},
  onResetEditor: () => {},
  getEditorState: () => undefined,
};

export const EditorContext = createContext<EditorContextType>(DEFAULT);
export const useEditor = () => useContext(EditorContext);
