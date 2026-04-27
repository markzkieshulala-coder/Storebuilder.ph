"use client";
import { useState } from "react";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { ShoppingCart, ImagePlus } from "lucide-react";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";

export default function ProductsSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const [activeCategory, setActiveCategory] = useState("All");
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";
  const products = d.products || [];
  const filtered = activeCategory === "All" ? products : products.filter((p: any) => p.category === activeCategory);
  const {
    isEditable, onTextChange, onNestedTextChange, onImageUpload, onSectionClick, onShowToolbar,
    selectedField, onSelectField, onUpdateEditor, onResetEditor, getEditorState,
  } = useEditor();

  const isSelected = (field: string) =>
    !!selectedField && selectedField.sectionId === section.id && selectedField.field === field;

  const fieldProps = (field: string) => ({
    sectionId: section.id, field,
    editor: getEditorState(section.id, field),
    isEditable, selected: isSelected(field),
    onSelect: onSelectField, onUpdateEditor, onResetEditor,
    onTextChange, onShowToolbar,
    textColor, bgColor: bg, accentColor: accent,
  });

  function showToolbar(e: React.FocusEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    onShowToolbar({ sectionId: section.id, textColor, bgColor: bg, accentColor: accent, rect: { top: r.top, left: r.left, width: r.width, height: r.height } });
  }

  return (
    <section className="py-14 px-4 sm:py-20 sm:px-6 lg:py-24" style={{ background: bg }} onClick={() => isEditable && onSectionClick(section.id)}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <EditableField
            {...fieldProps("headline")}
            tag="h2"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3"
            style={{ fontFamily: "var(--heading-font)", color: textColor }}
          >
            {d.headline}
          </EditableField>
          {d.subheadline !== undefined && (
            <EditableField
              {...fieldProps("subheadline")}
              tag="p"
              className="text-sm sm:text-base lg:text-lg opacity-60 mb-6 sm:mb-8"
              style={{ color: textColor }}
            >
              {d.subheadline}
            </EditableField>
          )}
          {d.categories && (
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {d.categories.map((cat: string) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all min-h-[36px]"
                  style={activeCategory === cat
                    ? { background: accent, color: website.colors?.primary || "#1a1a2e" }
                    : { background: `${accent}15`, color: textColor, border: `1px solid ${accent}30` }}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {filtered.map((product: any, i: number) => (
            <div key={product.id || i} className="group rounded-2xl overflow-hidden border transition-all hover:-translate-y-1" style={{ background: `${accent}06`, borderColor: `${accent}15` }}>
              <div className="relative aspect-square overflow-hidden bg-black/20">
                {product.image
                  ? <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  : <div className="w-full h-full flex items-center justify-center opacity-20"><ShoppingCart size={40} /></div>
                }
                {isEditable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onImageUpload(section.id, `products.${i}.image`); }}
                    className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(24,119,242,0.75)", color: "#fff", cursor: "pointer", border: "none" }}
                  >
                    <ImagePlus size={16} /> Replace image
                  </button>
                )}
                {product.badge && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
                    {product.badge}
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4 lg:p-5">
                <h3
                  className="font-bold text-sm sm:text-base lg:text-lg mb-1 line-clamp-2"
                  style={{ fontFamily: "var(--heading-font)", color: textColor, outline: "none" }}
                  contentEditable={isEditable}
                  suppressContentEditableWarning
                  onBlur={(e) => isEditable && onNestedTextChange(section.id, "products", i, "name", e.currentTarget.innerText)}
                  onFocus={(e) => isEditable && showToolbar(e)}
                  onClick={(e) => isEditable && e.stopPropagation()}
                >
                  {product.name}
                </h3>
                {product.description && <p className="hidden sm:block text-xs sm:text-sm opacity-60 mb-3 leading-relaxed line-clamp-2" style={{ color: textColor }}>{product.description}</p>}
                <div className="flex items-center justify-between gap-2 mt-1.5 sm:mt-0">
                  <div className="min-w-0">
                    <span
                      className="text-sm sm:text-lg lg:text-xl font-bold whitespace-nowrap"
                      style={{ color: accent, outline: "none" }}
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => isEditable && onNestedTextChange(section.id, "products", i, "price", e.currentTarget.innerText.replace(/[₱,]/g, ""))}
                      onClick={(e) => isEditable && e.stopPropagation()}
                    >
                      ₱{product.price?.toLocaleString()}
                    </span>
                    {product.originalPrice && (
                      <span className="hidden sm:inline ml-2 text-xs sm:text-sm line-through opacity-40" style={{ color: textColor }}>₱{product.originalPrice?.toLocaleString()}</span>
                    )}
                  </div>
                  <button className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-opacity hover:opacity-80 shrink-0 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
                    <ShoppingCart size={15} className="sm:w-[17px] sm:h-[17px]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
