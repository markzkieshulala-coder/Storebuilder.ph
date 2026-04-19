import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const totalUsers = await prisma.user.count();
  const proUsers = await prisma.user.count({ where: { plan: "PRO" } });
  const totalWebsites = await prisma.website.count();

  return (
    <div style={{ padding: "40px", fontFamily: "'Product Sans', 'Google Sans', Roboto, system-ui, sans-serif" }}>
      <h1>Admin Dashboard</h1>
      <p>Total Users: {totalUsers}</p>
      <p>Pro Users: {proUsers}</p>
      <p>Total Websites: {totalWebsites}</p>
      <p>Revenue: ₱{proUsers * 499}</p>
    </div>
  );
}
