"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/auth-actions";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField label="Username" name="username" type="text" placeholder="alice" required autoComplete="username" />
      <TextField label="Password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
      {state?.error && (
        <p className="font-body-md text-[13px] text-error -mt-1">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} fullWidth>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
