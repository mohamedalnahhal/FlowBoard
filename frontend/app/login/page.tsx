import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
import { LoginForm } from "./LoginForm";
import { Icon } from "@/components/ui/Icon";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-screen-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Icon name="flowsheet" className="text-primary text-[32px]" filled />
          <h1 className="font-display text-headline-lg text-primary">FlowBoard</h1>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8">
          <h2 className="font-title-lg text-title-lg text-on-surface mb-1">Sign in</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6">
            Welcome back — enter your credentials to continue.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
