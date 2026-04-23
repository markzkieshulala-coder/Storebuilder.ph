"use client";
import { createContext, useContext } from "react";

export type EditorContextType = {
  isEditable: boolean;
  onTextChange: (sectionId: string, field: string, value: string) => void;
  onNestedTextChange: (sectionId: string, arrayField: string, index: number, key: string, value: string) => void;
  onImageUpload: (sectionId: string, field: string) => void;
  onSectionClick: (sectionId: string) => void;
};

const DEFAULT: EditorContextType = {
  isEditable: false,
  onTextChange: () => {},
  onNestedTextChange: () => {},
  onImageUpload: () => {},
  onSectionClick: () => {},
};

export const EditorContext = createContext<EditorContextType>(DEFAULT);
export const useEditor = () => useContext(EditorContext);
