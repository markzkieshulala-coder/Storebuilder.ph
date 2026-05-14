"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HtmlEditor from "@/components/editor/HtmlEditor";

type Website = {
  id: string;
  name: string;
  subdomain: string | null;
  published: boolean;
  htmlContent: string | null;
};

export default function EditorPage({ params }: { params: { id: string } }) {
  const { status } = useSession();
  const router = useRouter();
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/websites/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        const w = data.website as Website;
        setWebsite(w);
        setPublished(w.published);
        if (!w.htmlContent) {
          setError(
            "This website was created with an older format that's no longer supported. " +
              "Please delete it from your dashboard and generate a new one."
          );
        }
      })
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [status, params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading editor…</p>
        </div>
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            This website can't be edited
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {error || "Website not found."}
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <HtmlEditor
      websiteId={params.id}
      initialHtml={website.htmlContent || ""}
      siteName={website.name}
      subdomain={website.subdomain || undefined}
      published={published}
      onPublishChange={setPublished}
    />
  );
}
