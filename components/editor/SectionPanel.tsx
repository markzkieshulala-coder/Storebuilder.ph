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
      className={`group flex items-center gap-2 p-2.5 rounded-lg mb-1 cursor-pointer transition-colors ${isSelected ? "bg-violet-600/20 border border-violet-500/30" : "hover:bg-white/5 border border-transparent"}`}
    >
      <GripVertical size={14} className="text-white/20 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{SECTION_LABELS[section.type] || section.type}</p>
        <p className="text-xs text-white/30 truncate">{(section.data as any).headline || (section.data as any).logo || section.type}</p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button onClick={onMoveUp} disabled={index === 0} className="p-1 hover:bg-white/10 rounded disabled:opacity-20">
          <ChevronUp size={12} />
        </button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 hover:bg-white/10 rounded disabled:opacity-20">
          <ChevronDown size={12} />
        </button>
        <button onClick={onDuplicate} className="p-1 hover:bg-white/10 rounded">
          <Copy size={12} />
        </button>
        <button onClick={onDelete} className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
