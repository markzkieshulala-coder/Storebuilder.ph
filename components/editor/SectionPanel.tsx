"use client";

import { ChevronUp, ChevronDown, Trash2, Copy, GripVertical } from "lucide-react";
import { Section } from "@/lib/ai/generate";

const SECTION_LABELS: Record<string, string> = {
  nav: "Navigation", hero: "Hero", features: "Features", products: "Products",
  testimonials: "Testimonials", about: "About", footer: "Footer", newsletter: "Newsletter",
  pricing: "Pricing", faq: "FAQ", stats: "Stats", contact: "Contact",
  cta: "CTA Banner", team: "Team", gallery: "Gallery", process: "Process",
};

interface Props {
  section: Section;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export default function SectionPanel({ section, index, total, isSelected, onSelect, onMoveUp, onMoveDown, onDelete, onDuplicate }: Props) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-2 p-2.5 rounded-lg mb-0.5 cursor-pointer transition-all ${
        isSelected
          ? "bg-blue-50 border border-blue-200"
          : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      <GripVertical size={14} className="text-gray-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-blue-700" : "text-gray-700"}`}>
          {SECTION_LABELS[section.type] || section.type}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {(section.data as any).headline || (section.data as any).logo || section.type}
        </p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button onClick={onMoveUp} disabled={index === 0} className="p-1 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20 transition-colors">
          <ChevronUp size={12} />
        </button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20 transition-colors">
          <ChevronDown size={12} />
        </button>
        <button onClick={onDuplicate} className="p-1 hover:bg-gray-100 rounded text-gray-400 transition-colors">
          <Copy size={12} />
        </button>
        <button onClick={onDelete} className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-gray-400 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
