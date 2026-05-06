"use client";
import { useState } from "react";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { ShoppingCart, ImagePlus, Pencil, X } from "lucide-react";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";
import { useImageDropZone } from "@/components/editor/useImageDropZone";

function ProductImageDropOverlay({
  sectionId, productIndex, hasImage, onImageUpload,
}: {
  sectionId: string;
  productIndex: number;
  hasImage: boolean;
  onImageUpload: (sectionId: string, field: string) => void;
}) {
  const drop = useImageDropZone(sectionId, `products.${productIndex}.image`);
  return (
    <div
      className="absolute inset-0 z-10"
      {...drop.handlers}
      style={{ outline: drop.active ? "3px dashed #1877F2" : undefined, outlineOffset: drop.active ? "-3px" : undefined }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onImageUpload(sectionId, `products.${productIndex}.image`); }}
        className={`absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium transition-opacity ${drop.active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={{ background: drop.active ? "rgba(24,119,242,0.92)" : "rgba(24,119,242,0.75)", color: "#fff", cursor: "pointer", border: "none" }}
      >
        <ImagePlus size={16} /> {drop.active ? "Drop to replace" : (hasImage ? "Replace image (or drop)" : "Upload image (or drop)")}
      </button>
    </div>
  );
}

export default function ProductsSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const [activeCategory, setActiveCategory] = useState("All");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";
  const products: any[] = d.products || [];
  const filtered = activeCategory === "All" ? products : products.filter((p: any) => p.category === activeCategory);

  const ctx = useEditor();
  const {
    isEditable, onTextChange, onNestedTextChange, onImageUpload, onSectionClick, onShowToolbar,
    selectedField, onSelectField, onUpdateEditor, onResetEditor, getEditorState,
  } = ctx;
  const bgDrop = useImageDropZone(section.id, "backgroundImage");

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

  // Resolve filtered index back to real products[] index
  function realIdx(product: any): number {
    return products.findIndex((p) => (product.id && p.id === product.id) || p === product);
  }

  return (
    <section
      className="relative py-14 px-4 sm:py-20 sm:px-6 lg:py-24 overflow-hidden"
      style={{ background: bg }}
      onClick={() => isEditable && onSectionClick(section.id)}
      {...(isEditable ? bgDrop.handlers : {})}
    >
      {d.backgroundImage && (
        <>
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${d.backgroundImage})` }} />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} />
        </>
      )}
      {isEditable && bgDrop.active && (
        <div
          className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
          style={{ background: "rgba(24,119,242,0.18)", border: "3px dashed #1877F2" }}
        >
          <div className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2">
            <ImagePlus size={15} /> Drop image to set as background
          </div>
        </div>
      )}
      {isEditable && (
        <button
          onClick={(e) => { e.stopPropagation(); onImageUpload(section.id, "backgroundImage"); }}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: "rgba(24,119,242,0.9)", color: "#fff", cursor: "pointer" }}
        >
          <ImagePlus size={13} /> Change background <span className="opacity-70 ml-1">or drop</span>
        </button>
      )}
      <div className="max-w-7xl mx-auto relative z-10">
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
          {filtered.map((product: any) => {
            const ri = realIdx(product);
            return (
              <div
                key={product.id || ri}
                className="group rounded-2xl overflow-hidden border transition-all hover:-translate-y-1 relative"
                style={{ background: `${accent}06`, borderColor: `${accent}15`, cursor: isEditable ? "default" : "pointer" }}
                onClick={() => {
                  if (isEditable) return;
                  if (website.subdomain) {
                    const pid = product.id || String(ri);
                    window.location.href = `/sites/${website.subdomain}/checkout/${pid}`;
                  }
                }}
              >
                {/* Edit button — only in editor mode */}
                {isEditable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingIdx(ri); }}
                    title="Edit product"
                    className="absolute top-2 right-2 z-20 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-medium"
                    style={{ background: "rgba(24,119,242,0.92)", color: "#fff" }}
                  >
                    <Pencil size={11} /> Edit
                  </button>
                )}

                <div className="relative aspect-square overflow-hidden bg-black/20">
                  {product.image
                    ? <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center opacity-20"><ShoppingCart size={40} /></div>
                  }
                  {isEditable && (
                    <ProductImageDropOverlay
                      sectionId={section.id}
                      productIndex={ri}
                      hasImage={Boolean(product.image)}
                      onImageUpload={onImageUpload}
                    />
                  )}
                  {product.badge && (
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
                      {product.badge}
                    </div>
                  )}
                  {product.stock != null && product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-xs font-semibold" style={{ background: "#ef444490", color: "#fff" }}>
                      Only {product.stock} left
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                      <span className="text-white text-sm font-bold">Out of stock</span>
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-4 lg:p-5">
                  <h3
                    key={`name-${product.id || ri}-${product.name}`}
                    className="font-bold text-sm sm:text-base lg:text-lg mb-1 line-clamp-2"
                    style={{ fontFamily: "var(--heading-font)", color: textColor, outline: "none" }}
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => isEditable && onNestedTextChange(section.id, "products", ri, "name", e.currentTarget.innerText)}
                    onFocus={(e) => isEditable && showToolbar(e)}
                    onClick={(e) => isEditable && e.stopPropagation()}
                  >
                    {product.name}
                  </h3>
                  {(product.description || isEditable) && (
                    <p
                      key={`desc-${product.id || ri}-${product.description || ""}`}
                      className="text-xs sm:text-sm opacity-60 mb-2 leading-relaxed line-clamp-2"
                      style={{ color: textColor, outline: "none", cursor: isEditable ? "text" : undefined }}
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => isEditable && onNestedTextChange(section.id, "products", ri, "description", e.currentTarget.innerText)}
                      onClick={(e) => isEditable && e.stopPropagation()}
                    >
                      {product.description}
                    </p>
                  )}

                  {/* Sizes */}
                  {Array.isArray(product.sizes) && product.sizes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {product.sizes.map((size: string) => (
                        <span key={size} className="px-1.5 py-0.5 rounded text-xs font-medium border" style={{ borderColor: `${textColor}30`, color: textColor, opacity: 0.7 }}>
                          {size}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Colors */}
                  {Array.isArray(product.colors) && product.colors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {product.colors.map((color: string) => (
                        <span
                          key={color}
                          title={color}
                          className="w-4 h-4 rounded-full border-2 border-white/60 shadow-sm"
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-1.5 sm:mt-0">
                    <div className="min-w-0">
                      <span
                        key={`price-${product.id || ri}-${product.price}`}
                        className="text-sm sm:text-lg lg:text-xl font-bold whitespace-nowrap"
                        style={{ color: accent, outline: "none" }}
                        contentEditable={isEditable}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          if (!isEditable) return;
                          const raw = e.currentTarget.innerText.replace(/[₱,\s]/g, "");
                          const num = parseFloat(raw);
                          onNestedTextChange(section.id, "products", ri, "price", isNaN(num) ? "0" : String(num));
                        }}
                        onClick={(e) => isEditable && e.stopPropagation()}
                      >
                        ₱{Number(product.price || 0).toLocaleString()}
                      </span>
                      {product.originalPrice && (
                        <span className="hidden sm:inline ml-2 text-xs sm:text-sm line-through opacity-40" style={{ color: textColor }}>₱{Number(product.originalPrice).toLocaleString()}</span>
                      )}
                    </div>
                    {!isEditable && website.subdomain && (product.stock == null || product.stock > 0) && (
                      <button
                        className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-opacity hover:opacity-80 shrink-0 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
                        style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const pid = product.id || String(ri);
                          window.location.href = `/sites/${website.subdomain}/checkout/${pid}`;
                        }}
                      >
                        <ShoppingCart size={15} className="sm:w-[17px] sm:h-[17px]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product edit drawer */}
      {isEditable && editingIdx !== null && (
        <ProductEditDrawer
          product={products[editingIdx]}
          productIndex={editingIdx}
          sectionId={section.id}
          accent={accent}
          onClose={() => setEditingIdx(null)}
          onSave={(idx, updates) => {
            ctx.onUpdateNestedItem?.(section.id, "products", idx, updates);
            setEditingIdx(null);
          }}
          onImageUpload={onImageUpload}
        />
      )}
    </section>
  );
}

// ── ProductEditDrawer ─────────────────────────────────────────────────────────

function ProductEditDrawer({
  product, productIndex, sectionId, accent,
  onClose, onSave, onImageUpload,
}: {
  product: any;
  productIndex: number;
  sectionId: string;
  accent: string;
  onClose: () => void;
  onSave: (index: number, updates: Record<string, any>) => void;
  onImageUpload: (sectionId: string, field: string) => void;
}) {
  const [form, setForm] = useState({
    name: product.name ?? "",
    description: product.description ?? "",
    price: String(product.price ?? 0),
    originalPrice: product.originalPrice != null ? String(product.originalPrice) : "",
    badge: product.badge ?? "",
    category: product.category ?? "",
    sizes: Array.isArray(product.sizes) ? product.sizes.join(", ") : (product.sizes ?? ""),
    colors: Array.isArray(product.colors) ? product.colors.join(", ") : (product.colors ?? ""),
    stock: product.stock != null ? String(product.stock) : "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  function handleSave() {
    onSave(productIndex, {
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price) || 0,
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
      badge: form.badge || undefined,
      category: form.category || undefined,
      sizes: form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      colors: form.colors ? form.colors.split(",").map((c) => c.trim()).filter(Boolean) : undefined,
      stock: form.stock !== "" ? parseInt(form.stock) : undefined,
    });
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors bg-white";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1.5";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-[9999] w-full sm:w-[400px] bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ fontFamily: "'Google Sans', Roboto, Arial, system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Edit Product</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Image */}
          <div>
            <label className={labelCls}>Product Image</label>
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group cursor-pointer"
              onClick={() => onImageUpload(sectionId, `products.${productIndex}.image`)}>
              {product.image
                ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400"><ShoppingCart size={28} /><span className="text-xs">Click to add image</span></div>
              }
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <ImagePlus size={16} /> Change image
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={labelCls}>Product Name</label>
            <input type="text" value={form.name} onChange={set("name")} placeholder="Product name" className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={set("description")} placeholder="Short product description" rows={3} className={inputCls + " resize-none"} />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price (₱)</label>
              <input type="number" value={form.price} onChange={set("price")} min={0} step={1} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                Original Price <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="number" value={form.originalPrice} onChange={set("originalPrice")} min={0} step={1} placeholder="—" className={inputCls} />
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label className={labelCls}>
              Sizes <span className="text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input type="text" value={form.sizes} onChange={set("sizes")} placeholder="S, M, L, XL, XXL" className={inputCls} />
            {form.sizes.trim() && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.sizes.split(",").map((s) => s.trim()).filter(Boolean).map((size) => (
                  <span key={size} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">{size}</span>
                ))}
              </div>
            )}
          </div>

          {/* Colors */}
          <div>
            <label className={labelCls}>
              Colors <span className="text-gray-400 font-normal">(CSS names or hex, comma-separated)</span>
            </label>
            <input type="text" value={form.colors} onChange={set("colors")} placeholder="Red, Blue, #2563eb, Black" className={inputCls} />
            {form.colors.trim() && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.colors.split(",").map((c) => c.trim()).filter(Boolean).map((color) => (
                  <span key={color} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-700">
                    <span className="w-3.5 h-3.5 rounded-full border border-white shadow-sm shrink-0" style={{ background: color }} />
                    {color}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stock + Badge */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                Stock <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="number" value={form.stock} onChange={set("stock")} min={0} placeholder="Unlimited" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                Badge <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="text" value={form.badge} onChange={set("badge")} placeholder="Sale, New, Hot" className={inputCls} />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Category</label>
            <input type="text" value={form.category} onChange={set("category")} placeholder="Tops, Bottoms, Accessories…" className={inputCls} />
          </div>

        </div>

        {/* Footer — always uses brand blue for the save button so it's
            visible regardless of the website's accent colour */}
        <div className="shrink-0 border-t border-gray-200 px-5 py-4 flex gap-3 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#1877F2] hover:bg-[#1565C0] transition-colors shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}
