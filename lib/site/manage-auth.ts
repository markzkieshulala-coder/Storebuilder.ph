import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";

// Shared authorization gate for every store-management API endpoint.
// Returns { error, status } on failure or { website, userId } on success.
// Enforces three rules:
//   1. The caller must be signed in.
//   2. The website must belong to the caller.
//   3. The caller must be on an Enterprise (canGenerateCRM) plan.
export async function authorizeManage(siteId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 as const };
  }
  const website = await prisma.website.findFirst({
    where: { id: siteId, userId: session.user.id },
    select: { id: true, name: true, subdomain: true, published: true, type: true },
  });
  if (!website) return { error: "Website not found", status: 404 as const };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  if (!getPlan(user?.plan).canGenerateCRM) {
    return {
      error: "Enterprise plan required",
      status: 403 as const,
      currentPlan: user?.plan ?? "FREE",
    };
  }
  return { website, userId: session.user.id };
}
