import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Admin Panel — Storebuilder.ph",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <AdminSidebar />
      <main className="flex-1 min-w-0 bg-gray-50 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
