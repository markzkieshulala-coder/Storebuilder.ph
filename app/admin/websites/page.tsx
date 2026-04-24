"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, Trash2, ExternalLink, CheckCircle2, Clock } from "lucide-react";
import toast from "react-hot-toast";

const BLUE = "#1877F2";

type Website = {
  id: string;
  name: string;
  type: string;
  published: boolean;
  subdomain: string | null;
  customDomain: string | null;
  prompt: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
};

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  STORE:      { color: "#1877F2", bg: "#EBF3FF" },
  BUSINESS:   { color: "#059669", bg: "#ECFDF5" },
  PORTFOLIO:  { color: "#7C3AED", bg: "#F5F3FF" },
  RESTAURANT: { color: "#DC2626", bg: "#FEF2F2" },
  SALON:      { color: "#DB2777", bg: "#FDF2F8" },
  LANDING:    { color: "#D97706", bg: "#FFFBEB" },
};

export default function AdminWebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");

  const fetchWebsites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/websites");
      const data = await res.json();
      setWebsites(data.websites ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load websites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  async function deleteWebsite(id: string, name: string) {
    if (
      !confirm(
        `Delete website "${name}"?\n\nThis will permanently remove the site and its data. This cannot be undone.`
      )
    )
      return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/websites/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWebsites((prev) => prev.filter((w) => w.id !== id));
        setTotal((prev) => prev - 1);
        toast.success("Website deleted");
      } else {
        toast.error("Failed to delete website");
      }
    } finally {
      setLoadingId(null);
    }
  }

  const displayed =
    filter === "ALL"
      ? websites
      : filter === "PUBLISHED"
      ? websites.filter((w) => w.published)
      : websites.filter((w) => !w.published);

  const publishedCount = websites.filter((w) => w.published).length;
  const draftCount = websites.filter((w) => !w.published).length;

  return (
    <div className="p-8" style={{ fontFamily: "'Google Sans', Roboto, Arial, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Websites</h1>
        <p className="text-gray-500 text-sm mt-1">
          {total.toLocaleString()} AI-generated websites ·{" "}
          <span className="text-green-600 font-medium">
            {publishedCount} live
          </span>{" "}
          · {draftCount} draft
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(
          [
            { key: "ALL", label: `All (${total})` },
            { key: "PUBLISHED", label: `Live (${publishedCount})` },
            { key: "DRAFT", label: `Draft (${draftCount})` },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={
              filter === key
                ? { background: BLUE, color: "#fff" }
                : { background: "#F3F4F6", color: "#6B7280" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div
              className="w-7 h-7 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: "#e5e7eb", borderTopColor: BLUE }}
            />
            <p className="text-sm">Loading websites...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Website
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Owner
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Created
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((site) => {
                  const tc = TYPE_COLORS[site.type] ?? {
                    color: "#6B7280",
                    bg: "#F3F4F6",
                  };
                  const domain =
                    site.customDomain ||
                    (site.subdomain
                      ? `${site.subdomain}.storebuilder.ph`
                      : null);

                  return (
                    <tr
                      key={site.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Website */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: tc.bg }}
                          >
                            <Globe size={14} style={{ color: tc.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[160px]">
                              {site.name}
                            </p>
                            {domain && (
                              <p className="text-xs text-gray-400 truncate max-w-[160px]">
                                {domain}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4">
                        <p className="text-gray-700 truncate max-w-[140px]">
                          {site.user.name || "No name"}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-[140px]">
                          {site.user.email}
                        </p>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ color: tc.color, background: tc.bg }}
                        >
                          {site.type}
                        </span>
                      </td>

                      {/* Published */}
                      <td className="py-3.5 px-4">
                        {site.published ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
                            <CheckCircle2 size={12} /> Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <Clock size={12} /> Draft
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs text-gray-400">
                        {new Date(site.createdAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {site.published && domain && (
                            <a
                              href={`https://${domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="View live site"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => deleteWebsite(site.id, site.name)}
                            disabled={loadingId === site.id}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete website"
                          >
                            {loadingId === site.id ? (
                              <span
                                className="w-3.5 h-3.5 border border-red-300 border-t-red-500 rounded-full animate-spin inline-block"
                              />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayed.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-14 text-center text-gray-400 text-sm"
                    >
                      No websites found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && displayed.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing {displayed.length} of {total.toLocaleString()} websites
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
