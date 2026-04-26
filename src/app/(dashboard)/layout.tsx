import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!verifySessionToken(token)) {
    redirect("/login");
  }

  return (
    <main className="relative mx-auto w-full max-w-[1820px] px-3 py-4 md:px-6 md:py-6 xl:px-8">
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <AdminSidebar />
        <section>{children}</section>
      </div>
    </main>
  );
}
