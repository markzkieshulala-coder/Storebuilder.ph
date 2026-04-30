"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Minus, Plus, ArrowLeft, Loader2, CreditCard, Phone, User, Mail } from "lucide-react";

interface Product {
  id?: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  badge?: string;
}

interface StoreData {
  storeName: string;
  accent: string;
  primary: string;
  textColor: string;
  bg: string;
  product: Product;
}

export default function ProductCheckoutPage() {
  const params = useParams<{ subdomain: string; productId: string }>();
  const router = useRouter();

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/checkout/product-info?subdomain=${params.subdomain}&productId=${params.productId}`);
        if (!res.ok) { setError("Product not found"); return; }
        const data = await res.json();
        setStore(data);
      } catch {
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.subdomain, params.productId]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    setPaying(true);
    try {
      const res = await fetch("/api/checkout/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: params.subdomain,
          productId: params.productId,
          quantity,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not start checkout"); return; }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <ShoppingCart size={40} className="text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-700 mb-2">{error || "Product not found"}</h1>
        <p className="text-gray-400 text-sm mb-6">This product may have been removed or the link is invalid.</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "#1877F2" }}
        >
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    );
  }

  const { product, accent, storeName, bg } = store;
  const total = product.price * quantity;
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  return (
    <div className="min-h-screen" style={{ background: "#f3f4f6", fontFamily: "'Google Sans',Roboto,Arial,system-ui,sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <span className="font-semibold text-gray-900 text-sm">{storeName}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Product Card */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          {product.image ? (
            <div className="aspect-square relative">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              {product.badge && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: accent, color: "#fff" }}>
                  {product.badge}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square flex items-center justify-center" style={{ background: `${accent}12` }}>
              <ShoppingCart size={48} style={{ color: accent, opacity: 0.4 }} />
            </div>
          )}
          <div className="p-5">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h1>
            {product.description && (
              <p className="text-gray-500 text-sm leading-relaxed mb-3">{product.description}</p>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: accent }}>
                ₱{product.price.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-gray-400 line-through text-sm">
                  ₱{product.originalPrice!.toLocaleString()}
                </span>
              )}
              {hasDiscount && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: "#ef4444" }}>
                  {Math.round((1 - product.price / product.originalPrice!) * 100)}% OFF
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Order Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Complete your order</h2>
          <form onSubmit={handlePay} className="space-y-4">

            {/* Quantity */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center font-semibold text-gray-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Plus size={14} />
                </button>
                <span className="text-sm text-gray-400">× ₱{product.price.toLocaleString()}</span>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Juan dela Cruz"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="juan@example.com"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone number</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="09XX XXX XXXX"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>

            {/* Order Total */}
            <div className="flex items-center justify-between py-3 border-t border-gray-100">
              <span className="text-sm text-gray-600">Total ({quantity} {quantity === 1 ? "item" : "items"})</span>
              <span className="text-xl font-bold text-gray-900">₱{total.toLocaleString()}</span>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={paying}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ background: "#1877F2" }}
            >
              {paying ? (
                <><Loader2 size={15} className="animate-spin" /> Processing…</>
              ) : (
                <><CreditCard size={15} /> Pay ₱{total.toLocaleString()}</>
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              Secure payment powered by PayMongo
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
