import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (verifySessionToken(token)) {
    redirect("/logs");
  }

  return <AdminLoginForm />;
}
