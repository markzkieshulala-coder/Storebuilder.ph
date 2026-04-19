"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 text-center">
      <div className="text-8xl font-bold text-white/5 mb-4" style={{ fontFamily: "'Product Sans', 'Google Sans', Roboto, system-ui, sans-serif" }}>
        404
      </div>
      <h1 className="text-2xl font-bold mb-3">Page not found</h1>
      <p className="text-white/40 mb-8 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium transition-colors"
      >
        <ArrowLeft size={18} />
        Back to home
      </Link>
    </div>
  );
}
