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

export type EditorContextType = {
  isEditable: boolean;
  onTextChange: (sectionId: string, field: string, value: string) => void;
  onNestedTextChange: (sectionId: string, arrayField: string, index: number, key: string, value: string) => void;
  onImageUpload: (sectionId: string, field: string) => void;
  onImagePaste?: (sectionId: string, field: string, file: File) => void;
  onSectionClick: (sectionId: string) => void;
  onShowToolbar: (target: FloatingToolbarTarget) => void;

  // Drag-resize editor state (per-field, kept for backwards-compat with
  // existing _editor data on saved sites — UI handles are now disabled).
  selectedField: SelectedField;
  onSelectField: (sectionId: string, field: string) => void;
  onUpdateEditor: (sectionId: string, field: string, updates: EditorFieldState) => void;
  onResetEditor: (sectionId: string, field: string) => void;
  getEditorState: (sectionId: string, field: string) => EditorFieldState | undefined;

  // Section-level adjustments (height + reorder)
  onResizeSection?: (sectionId: string, minHeight: number) => void;
  onReorderSections?: (fromIndex: number, toIndex: number) => void;
};

const DEFAULT: EditorContextType = {
  isEditable: false,
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
