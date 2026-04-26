"use client";
import { createContext, useContext } from "react";

export type FloatingToolbarTarget = {
  sectionId: string;
  textColor: string;
  bgColor: string;
  accentColor: string;
  fontScale?: number; // 0.7..1.6 multiplier on default font sizes
  textAlign?: "left" | "center" | "right";
  rect: { top: number; left: number; width: number; height: number };
};

export type EditorContextType = {
  isEditable: boolean;
  onTextChange: (sectionId: string, field: string, value: string) => void;
  onNestedTextChange: (sectionId: string, arrayField: string, index: number, key: string, value: string) => void;
  onImageUpload: (sectionId: string, field: string) => void;
  onSectionClick: (sectionId: string) => void;
  onShowToolbar: (target: FloatingToolbarTarget) => void;
};

const DEFAULT: EditorContextType = {
  isEditable: false,
  onTextChange: () => {},
  onNestedTextChange: () => {},
  onImageUpload: () => {},
  onSectionClick: () => {},
  onShowToolbar: () => {},
};

export const EditorContext = createContext<EditorContextType>(DEFAULT);
export const useEditor = () => useContext(EditorContext);
