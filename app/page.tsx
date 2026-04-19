"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, Globe, Shield, Star, ChevronDown, Check, X, Sparkles } from "lucide-react";

const BLUE = "#1877F2";

const EXAMPLE_PROMPTS = [
  "Online shoe store with elegant and modern design",
  "Filipino restaurant with warm and vibrant colors",
  "Minimalist and modern photography portfolio",
  "Barbershop with bold and energetic design",
  "Online store selling handmade jewelry",
  "Modern dental clinic website for Cebu",
  "Personal trainer landing page with energy",
  "Coffee shop called Brew and Co",
];

const PF = "'Product Sans','Google Sans',Roboto,system-ui,sans-serif";

function EthicaPreview() {
  return (
    <div style={{ width: 900, fontFamily: PF, background: "#fff", lineHeight: "normal" }}>
      <div style={{ height: 52, background: "#fff", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", padding: "0 32px", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.04em", color: "#0f172a" }}>ETHICA</span>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {["Men","Women","Collections","Sale"].map(n => <span key={n} style={{ fontSize: 14, color: "#6B7280" }}>{n}</span>)}
          <div style={{ padding: "8px 20px", background: "#0f172a", color: "#fff", borderRadius: 6, fontSize: 14, fontWeight: 600 }}>Shop Now</div>
        </div>
      </div>
      <div style={{ height: 232, background: "linear-gradient(135deg,#0f172a 60%,#1e3a5f 100%)", display: "flex", alignItems: "center", padding: "0 48px", gap: 32, overflow: "hidden" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#93C5FD", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>New Arrivals · 2025</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#fff", lineHeight: 1.08, marginBottom: 14 }}>Step Into<br/>Your Style</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 22 }}>Free shipping on orders ₱2,000+</div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ padding: "12px 28px", background: "#1877F2", color: "#fff", borderRadius: 8, fontSize: 15, fontWeight: 700 }}>Shop Collection</div>
            <div style={{ padding: "12px 28px", border: "1px solid rgba(255,255,255,0.35)", color: "#fff", borderRadius: 8, fontSize: 15 }}>View Lookbook</div>
          </div>
        </div>
        <div style={{ width: 244, height: 208, borderRadius: 16, overflow: "hidden", flexShrink: 0, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=488&h=416&q=80" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        </div>
      </div>
      <div style={{ padding: "20px 32px 22px", background: "#F8FAFC" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Featured Picks</span>
          <span style={{ fontSize: 13, color: "#1877F2", fontWeight: 600 }}>View all →</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { name: "Air Runner Pro", price: "₱3,490", badge: "New", bc: "#1877F2", img: "1549298916-b41d501d3772" },
            { name: "Urban Classic",  price: "₱2,290", badge: "−20%", bc: "#EF4444", img: "1600185365483-26d0a9ccafcb" },
            { name: "Canvas Lite",    price: "₱1,890", badge: null, bc: null,      img: "1608231387042-66d1773d3028" },
          ].map(p => (
            <div key={p.name} style={{ flex: 1, background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid #E5E7EB", position: "relative" }}>
              {p.badge && <div style={{ position: "absolute", top: 8, left: 8, padding: "2px 8px", background: p.bc!, color: "#fff", borderRadius: 4, fontSize: 10, fontWeight: 700, zIndex: 1 }}>{p.badge}</div>}
              <img src={`https://images.unsplash.com/photo-${p.img}?auto=format&fit=crop&w=286&h=164&q=80`} style={{ width: "100%", height: 82, objectFit: "cover", display: "block" }} alt="" />
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{p.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrewCoPreview() {
  return (
    <div style={{ width: 900, fontFamily: PF, background: "#1C0A00", lineHeight: "normal" }}>
      <div style={{ height: 52, background: "#1C0A00", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", padding: "0 32px", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 20, color: "#F59E0B", letterSpacing: "0.04em" }}>☕ Brew & Co</span>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {["Menu","About","Locations","Rewards"].map(n => <span key={n} style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>{n}</span>)}
          <div style={{ padding: "8px 20px", background: "#F59E0B", color: "#1C0A00", borderRadius: 6, fontSize: 14, fontWeight: 700 }}>Order Now</div>
        </div>
      </div>
      <div style={{ height: 232, background: "linear-gradient(120deg,#3D1A00 0%,#1C0A00 100%)", display: "flex", alignItems: "center", padding: "0 48px", gap: 36, overflow: "hidden" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#FCD34D", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Artisan · Since 2019</div>
          <div style={{ fontSize: 46, fontWeight: 800, color: "#fff", lineHeight: 1.07, marginBottom: 14 }}>Crafted with<br/>Passion</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 22 }}>Single-origin beans, expertly brewed daily</div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ padding: "12px 28px", background: "#F59E0B", color: "#1C0A00", borderRadius: 8, fontSize: 15, fontWeight: 700 }}>See Our Menu</div>
            <div style={{ padding: "12px 28px", border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.85)", borderRadius: 8, fontSize: 15 }}>Find a Branch</div>
          </div>
        </div>
        <div style={{ width: 240, height: 210, borderRadius: 120, overflow: "hidden", flexShrink: 0, boxShadow: "0 20px 60px rgba(245,158,11,0.2)" }}>
          <img src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=480&h=420&q=80" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        </div>
      </div>
      <div style={{ padding: "20px 32px 22px", background: "#2C1000" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#FCD34D", marginBottom: 14 }}>Today&apos;s Menu</div>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { name: "Signature Latte", desc: "Smooth espresso & steamed milk", price: "₱155", img: "1461023058943-07fcbe16d735" },
            { name: "Cold Brew",       desc: "12-hour steeped, served iced",   price: "₱130", img: "1495474472287-4d71bcdd2085" },
            { name: "Matcha Miel",     desc: "Ceremonial grade & honey",       price: "₱165", img: "1556679343-c7306c1976bc" },
          ].map(item => (
            <div key={item.name} style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
              <img src={`https://images.unsplash.com/photo-${item.img}?auto=format&fit=crop&w=286&h=130&q=80`} style={{ width: "100%", height: 65, objectFit: "cover", display: "block" }} alt="" />
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{item.desc}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#F59E0B" }}>{item.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KingsCutPreview() {
  return (
    <div style={{ width: 900, fontFamily: PF, background: "#0a0a0a", lineHeight: "normal" }}>
      <div style={{ height: 52, background: "#0a0a0a", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 32px", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 900, fontSize: 20, color: "#F59E0B", letterSpacing: "0.1em", textTransform: "uppercase" }}>✂ KingsCut</span>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {["Services","Gallery","Barbers","Contact"].map(n => <span key={n} style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>{n}</span>)}
          <div style={{ padding: "8px 20px", background: "#F59E0B", color: "#0a0a0a", borderRadius: 6, fontSize: 14, fontWeight: 800 }}>Book Now</div>
        </div>
      </div>
      <div style={{ height: 232, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
        <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&h=464&q=80" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,0.88) 50%,rgba(0,0,0,0.25) 100%)" }} />
        <div style={{ position: "relative", padding: "0 48px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>Quezon City · Est. 2018</div>
          <div style={{ fontSize: 46, fontWeight: 900, color: "#fff", lineHeight: 1.05, marginBottom: 14, letterSpacing: "-0.02em" }}>Precision Cuts.<br/>Royal Treatment.</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 22 }}>Walk-ins welcome · Mon–Sat 9AM–8PM</div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ padding: "12px 30px", background: "#F59E0B", color: "#0a0a0a", borderRadius: 8, fontSize: 15, fontWeight: 800 }}>Book Appointment</div>
            <div style={{ padding: "12px 26px", border: "1px solid rgba(255,255,255,0.35)", color: "#fff", borderRadius: 8, fontSize: 15 }}>View Services</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "20px 32px 22px", background: "#111" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Our Services</div>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { name: "Classic Haircut", desc: "Consultation, cut & style", price: "₱250", icon: "✂" },
            { name: "Beard Grooming",  desc: "Shape, trim & hot towel",   price: "₱180", icon: "🪒" },
            { name: "Full Package",    desc: "Haircut + beard + wash",     price: "₱420", icon: "👑" },
          ].map(s => (
            <div key={s.name} style={{ flex: 1, background: "#1a1a1a", borderRadius: 10, padding: "14px 16px", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>{s.desc}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#F59E0B" }}>{s.price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LumenPreview() {
  return (
    <div style={{ width: 900, fontFamily: PF, background: "#0d0d0d", lineHeight: "normal" }}>
      <div style={{ height: 52, background: "#0d0d0d", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 32px", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 300, fontSize: 22, color: "#fff", letterSpacing: "0.22em", textTransform: "uppercase" }}>LUMEN</span>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {["Portfolio","Weddings","Events","About"].map(n => <span key={n} style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{n}</span>)}
          <div style={{ padding: "8px 20px", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 6, fontSize: 14 }}>Contact</div>
        </div>
      </div>
      <div style={{ height: 232, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
        <img src="https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=900&h=464&q=80" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.32)" }} alt="" />
        <div style={{ position: "relative", padding: "0 48px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 14 }}>Manila · Photography Studio</div>
          <div style={{ fontSize: 50, fontWeight: 700, color: "#fff", lineHeight: 1.05, marginBottom: 16, letterSpacing: "-0.02em" }}>We Capture<br/>Your Story</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>Weddings · Portraits · Brand Photography</div>
          <div style={{ padding: "12px 30px", background: "#fff", color: "#0d0d0d", borderRadius: 8, fontSize: 15, fontWeight: 700, display: "inline-block" }}>View Portfolio</div>
        </div>
      </div>
      <div style={{ padding: "20px 32px 22px", background: "#111" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Recent Work</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>See full gallery →</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { img: "1531746020798-e6953c6e8e04", label: "Portraits" },
            { img: "1606216794079-af76b9a3e799", label: "Weddings" },
            { img: "1492684223347-c5ea5d39c05e", label: "Events" },
          ].map(g => (
            <div key={g.label} style={{ flex: 1, borderRadius: 8, overflow: "hidden", position: "relative" }}>
              <img src={`https://images.unsplash.com/photo-${g.img}?auto=format&fit=crop&w=270&h=160&q=80`} style={{ width: "100%", height: 90, objectFit: "cover", display: "block", filter: "brightness(0.8)" }} alt="" />
              <div style={{ position: "absolute", bottom: 8, left: 10, fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: "0.06em" }}>{g.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SelahPreview() {
  return (
    <div style={{ width: 900, fontFamily: PF, background: "#fff", lineHeight: "normal" }}>
      <div style={{ height: 52, background: "#fff", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", padding: "0 32px", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 20, color: "#065F46", letterSpacing: "0.04em" }}>✿ Selah</span>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {["Classes","Schedule","Pricing","Contact"].map(n => <span key={n} style={{ fontSize: 14, color: "#6B7280" }}>{n}</span>)}
          <div style={{ padding: "8px 20px", background: "#065F46", color: "#fff", borderRadius: 6, fontSize: 14, fontWeight: 600 }}>Join Now</div>
        </div>
      </div>
      <div style={{ height: 232, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
        <img src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&h=464&q=80" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(6,95,70,0.88) 45%,rgba(6,95,70,0.2) 100%)" }} />
        <div style={{ position: "relative", padding: "0 48px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6EE7B7", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>BGC · Taguig City</div>
          <div style={{ fontSize: 46, fontWeight: 800, color: "#fff", lineHeight: 1.08, marginBottom: 14 }}>Find Your<br/>Balance</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", marginBottom: 22 }}>Yoga · Pilates · Meditation · Sound Healing</div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ padding: "12px 28px", background: "#10B981", color: "#fff", borderRadius: 8, fontSize: 15, fontWeight: 700 }}>View Schedule</div>
            <div style={{ padding: "12px 28px", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 8, fontSize: 15 }}>Free Trial Class</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "20px 32px 22px", background: "#F0FDF4" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#065F46", marginBottom: 14 }}>Today&apos;s Classes</div>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { name: "Morning Flow",  time: "7:00 AM", instructor: "Maya R.", spots: "3 spots left", color: "#10B981" },
            { name: "Deep Stretch",  time: "9:00 AM", instructor: "Lia S.",  spots: "Available",    color: "#059669" },
            { name: "Meditation",    time: "6:00 PM", instructor: "Kai T.",  spots: "8 spots left", color: "#065F46" },
          ].map(cls => (
            <div key={cls.name} style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #D1FAE5" }}>
              <div style={{ width: 32, height: 4, background: cls.color, borderRadius: 2, marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{cls.name}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 2 }}>{cls.time} · {cls.instructor}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: cls.color, marginTop: 8 }}>{cls.spots}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SolanaPreview() {
  return (
    <div style={{ width: 900, fontFamily: PF, background: "#faf8f5", lineHeight: "normal" }}>
      <div style={{ height: 52, background: "#faf8f5", borderBottom: "1px solid #e8e0d5", display: "flex", alignItems: "center", padding: "0 32px", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 300, fontSize: 22, color: "#4C1D95", letterSpacing: "0.24em", textTransform: "uppercase" }}>SOLANA</span>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {["Collections","Bespoke","About","Stores"].map(n => <span key={n} style={{ fontSize: 14, color: "#9CA3AF" }}>{n}</span>)}
          <div style={{ padding: "8px 22px", background: "#4C1D95", color: "#fff", borderRadius: 6, fontSize: 14, fontWeight: 500 }}>Explore</div>
        </div>
      </div>
      <div style={{ height: 232, background: "linear-gradient(135deg,#2E1065 0%,#4C1D95 100%)", display: "flex", alignItems: "center", padding: "0 48px", gap: 36, overflow: "hidden" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#C4B5FD", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>Makati City · Fine Jewelry</div>
          <div style={{ fontSize: 46, fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 14, letterSpacing: "-0.02em" }}>Timeless<br/>Elegance</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 22 }}>Handcrafted fine jewelry, made to last forever</div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ padding: "12px 28px", background: "#C4B5FD", color: "#2E1065", borderRadius: 8, fontSize: 15, fontWeight: 700 }}>Shop Now</div>
            <div style={{ padding: "12px 28px", border: "1px solid rgba(196,181,253,0.4)", color: "rgba(255,255,255,0.85)", borderRadius: 8, fontSize: 15 }}>Bespoke Orders</div>
          </div>
        </div>
        <div style={{ width: 240, height: 210, borderRadius: 14, overflow: "hidden", flexShrink: 0, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <img src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=480&h=420&q=80" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        </div>
      </div>
      <div style={{ padding: "20px 32px 22px", background: "#faf8f5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#1f1235" }}>Our Collections</span>
          <span style={{ fontSize: 13, color: "#7C3AED", fontWeight: 600 }}>See all →</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { name: "Lunar Rings",    price: "From ₱4,500", img: "1515562141207-7a88fb7ce338" },
            { name: "Eden Necklaces", price: "From ₱6,200", img: "1602173574767-37ac01994b2a" },
            { name: "Bloom Earrings", price: "From ₱2,800", img: "1535632066927-ab7c9ab60908" },
          ].map(c => (
            <div key={c.name} style={{ flex: 1, background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid #e8e0d5" }}>
              <img src={`https://images.unsplash.com/photo-${c.img}?auto=format&fit=crop&w=286&h=154&q=80`} style={{ width: "100%", height: 77, objectFit: "cover", display: "block" }} alt="" />
              <div style={{ padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1f1235", marginBottom: 3 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#7C3AED", fontWeight: 600 }}>{c.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const EXAMPLE_SITES = [
  { name: "Ethica",       type: "Online Shoe Store", Component: EthicaPreview  },
  { name: "Brew & Co",    type: "Coffee Shop",        Component: BrewCoPreview  },
  { name: "KingsCut",     type: "Barbershop",         Component: KingsCutPreview },
  { name: "Lumen Studio", type: "Photography",        Component: LumenPreview   },
  { name: "Selah",        type: "Wellness Studio",    Component: SelahPreview   },
  { name: "Solana",       type: "Fine Jewelry",       Component: SolanaPreview  },
];


const FEATURES = [
  {
    icon: Zap,
    title: "Build in seconds",
    description: "Type your idea, click generate. Get a complete beautiful website instantly. No design skills needed.",
  },
  {
    icon: Globe,
    title: "Built for the Philippines",
    description: "GCash payments, prices in Philippine Peso, local aesthetics. Everything your business needs to go online.",
  },
  {
    icon: Sparkles,
    title: "AI-designed, not templated",
    description: "Every website is uniquely created by Claude AI. No cookie-cutter templates. Truly creative output.",
  },
  {
    icon: Shield,
    title: "Edit everything visually",
    description: "Click any element to edit. Change text, images, colors — all without writing code.",
  },
];

const FAQS = [
  {
    q: "Do I need coding skills?",
    a: "Not at all. Just type what you want and the AI builds it for you. Then click any element to edit.",
  },
  {
    q: "How many websites can I create?",
    a: "Free users get 3 AI generations per month. Pro users get 30 AI generations per day.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes! Pro users can connect a custom domain (e.g. yourbusiness.com). Free users get a free subdomain at storebuilder.ph.",
  },
  {
    q: "What payment methods are supported?",
    a: "GCash, Maya, GoTyme, credit/debit cards, and BancNet — all major Philippine payment methods.",
  },
  {
    q: "Are the websites mobile-friendly?",
    a: "Yes! Every generated website is fully responsive and looks great on mobile, tablet, and desktop.",
  },
  {
    q: "Can I edit my website after creating it?",
    a: "Yes! Editing is completely free. Use the drag-and-drop editor to make any changes you want.",
  },
];

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [displayedPrompt, setDisplayedPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (prompt) return;
    const currentExample = EXAMPLE_PROMPTS[currentPromptIndex];
    let charIndex = 0;
    setIsTyping(true);
    const typeInterval = setInterval(() => {
      if (charIndex <= currentExample.length) {
        setDisplayedPrompt(currentExample.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setTimeout(() => {
          setCurrentPromptIndex((i) => (i + 1) % EXAMPLE_PROMPTS.length);
        }, 2000);
      }
    }, 38);
    return () => clearInterval(typeInterval);
  }, [currentPromptIndex, prompt]);

  async function handleGenerate() {
    const finalPrompt = prompt || displayedPrompt;
    if (!finalPrompt.trim()) return;
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/dashboard`);
      return;
    }
    setIsGenerating(true);
    router.push(`/dashboard?generate=${encodeURIComponent(finalPrompt)}`);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Product Sans', 'Google Sans', Roboto, system-ui, sans-serif" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Storebuilder.ph logo" width={32} height={32} />
            <span className="font-bold text-lg text-gray-900" style={{ letterSpacing: "-0.02em" }}>
              Storebuilder<span style={{ color: BLUE }}>.ph</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
            <Link href="/upgrade" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: BLUE }}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/signin" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: BLUE }}
                >
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-28 px-4 text-center" style={{ background: "linear-gradient(180deg, #EBF3FF 0%, #fff 100%)" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{ background: "#EBF3FF", color: BLUE, border: `1px solid #c7dcfd` }}
          >
            <span>🇵🇭</span>
            <span>#1 AI Website Builder for Filipino Businesses</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-5 leading-tight tracking-tight text-gray-900">
            Build your website{" "}
            <span style={{ color: BLUE }}>in seconds</span>{" "}
            with AI
          </h1>

          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Describe your business. Get a complete, beautiful, fully editable website instantly. Made for every Filipino entrepreneur.
          </p>

          {/* Prompt input */}
          <div className="max-w-2xl mx-auto">
            <div className="prompt-glow rounded-xl bg-white border border-gray-200 p-2 flex gap-2 shadow-sm">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder={isTyping ? displayedPrompt + "|" : displayedPrompt}
                className="flex-1 bg-transparent px-4 py-3 text-gray-900 placeholder-gray-400 outline-none text-base"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-60 whitespace-nowrap"
                style={{ backgroundColor: BLUE }}
              >
                {isGenerating ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {["Shoe store", "Restaurant", "Photography", "Barbershop", "Online store", "Salon"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setPrompt(chip)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 bg-white transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-5 text-gray-400 text-sm">
            Free to start · No credit card · 3 free generations per month
          </p>
        </motion.div>
      </section>

      {/* Example websites */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-2 text-gray-900">
            See what you can build
          </h2>
          <p className="text-center text-gray-500 mb-10">AI-generated websites, not templates</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {EXAMPLE_SITES.map(({ name, type, Component: SitePreview }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="website-card rounded-xl overflow-hidden border border-gray-100 cursor-pointer"
              >
                <div style={{ height: "176px", overflow: "hidden", position: "relative", background: "#f1f5f9" }}>
                  <div style={{ transform: "scale(0.355)", transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
                    <SitePreview />
                  </div>
                </div>
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-100">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{name}</span>
                    <span className="text-xs text-gray-400 ml-2">{type}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Sparkles size={11} />
                    AI Generated
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4" style={{ background: "#F7FAFF" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-3 text-gray-900">
              Everything you need to{" "}
              <span style={{ color: BLUE }}>go online</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From AI generation to publishing — all in one place, built for Filipino businesses.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "#EBF3FF" }}
                >
                  <f.icon size={20} style={{ color: BLUE }} />
                </div>
                <h3 className="text-base font-semibold mb-1.5 text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl md:text-4xl font-bold mb-12 text-gray-900">
            Just 3 steps
          </h2>
          <div className="space-y-8">
            {[
              { step: "01", title: "Describe your website", desc: "Tell the AI what kind of website you need. Be specific or general — it understands." },
              { step: "02", title: "AI builds it instantly", desc: "Claude AI creates a complete, unique website with custom sections, colors, content, and layout in seconds." },
              { step: "03", title: "Edit, publish, and grow", desc: "Click any element to edit. Publish instantly on a free subdomain or your own custom domain." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="flex gap-5 items-start"
              >
                <div className="text-4xl font-bold shrink-0 w-12" style={{ color: "#EBF3FF", WebkitTextStroke: `1px ${BLUE}` }}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1 text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4" style={{ background: "#F7FAFF" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 text-gray-900">Simple, transparent pricing</h2>
            <p className="text-gray-500">Start free. Upgrade when you are ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Free */}
            <div className="p-7 rounded-xl border border-gray-200 bg-white">
              <h3 className="text-lg font-bold mb-1 text-gray-900">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">₱0 <span className="text-base font-normal text-gray-400">/ forever</span></div>
              <p className="text-xs text-gray-400 mb-5">No credit card required</p>
              <ul className="space-y-2.5 mb-7">
                {[
                  "3 AI website generations per month",
                  "Limited editing",
                  "Free subdomain (yourname.storebuilder.ph)",
                  "All editor features",
                  "Powered by Claude Haiku",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check size={15} className="mt-0.5 shrink-0" style={{ color: BLUE }} />
                    {item}
                  </li>
                ))}
                {["Custom domain", "Remove branding"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                    <X size={15} className="mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register" className="block text-center py-2.5 px-5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors">
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="p-7 rounded-xl border-2 bg-white relative overflow-hidden" style={{ borderColor: BLUE }}>
              <div
                className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ background: BLUE }}
              >
                POPULAR
              </div>
              <h3 className="text-lg font-bold mb-1 text-gray-900">Pro</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">₱499 <span className="text-base font-normal text-gray-400">/ month</span></div>
              <p className="text-xs text-gray-400 mb-5">or ₱4,299/year (save 25%)</p>
              <ul className="space-y-2.5 mb-7">
                {[
                  "30 AI website generations per day",
                  "Unlimited editing",
                  "Custom domain connection",
                  "All editor features",
                  "Powered by Claude Sonnet (smarter AI)",
                  "Priority support",
                  "Remove Storebuilder.ph branding",
                  "Advanced section library",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check size={15} className="mt-0.5 shrink-0" style={{ color: BLUE }} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/upgrade"
                className="block text-center py-2.5 px-5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: BLUE }}
              >
                Start Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 px-4 bg-white text-center">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={18} className="fill-amber-400 text-amber-400" />)}
          </div>
          <p className="text-gray-600 italic mb-3 text-base">
            "I built my barbershop website in under 3 minutes. My clients can now book online. The results are amazing!"
          </p>
          <p className="text-gray-400 text-sm">Carlo M., Kings Cut Barbershop, Quezon City</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-4" style={{ background: "#F7FAFF" }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-900">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-sm text-gray-900">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform shrink-0 ml-4 ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 text-center" style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1464d8 100%)` }}>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
            Your website is 30 seconds away
          </h2>
          <p className="text-blue-100 text-base mb-8">Free forever. No credit card. No code.</p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white rounded-lg font-semibold text-base transition-opacity hover:opacity-90"
            style={{ color: BLUE }}
          >
            Build my website now
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Image src="/logo.svg" alt="Storebuilder.ph" width={28} height={28} />
                <span className="font-bold text-white">Storebuilder<span style={{ color: "#60a5fa" }}>.ph</span></span>
              </div>
              <p className="text-xs leading-relaxed text-gray-500">
                The #1 AI-powered website builder for Filipino entrepreneurs and small business owners.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-3">Company</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/upgrade" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-3">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-3">Contact</p>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:Storebuilderph@gmail.com" className="hover:text-white transition-colors">Storebuilderph@gmail.com</a></li>
                <li><span>Philippines 🇵🇭</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">© 2025 Storebuilder.ph. All rights reserved. 🇵🇭</p>
            <p className="text-xs text-gray-600">Proudly built for Filipino entrepreneurs by Mark Ocdenaria</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
