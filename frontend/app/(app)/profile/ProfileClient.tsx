"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { updateProfileAction, changePasswordAction } from "@/lib/profile-actions";
import { logoutAction } from "@/lib/auth-actions";

type User = {
  id: string;
  display_name: string;
  username: string;
  email: string | null;
  phone_number: string | null;
  role: number;
};

const ROLE_LABELS: Record<number, string> = { 0: "System Admin", 1: "Owner", 2: "Leader", 3: "Member" };

export function ProfileClient({ user }: { user: User }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, undefined);
  const [pwState, pwAction, pwPending] = useActionState(changePasswordAction, undefined);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  return (
    <div className="max-w-[672px] flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-display text-on-surface mb-1">Profile Settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Manage your account information and security.
        </p>
      </div>

      {/* Profile info card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/60 flex items-center gap-3">
          <Icon name="person" className="text-[20px] text-on-surface-variant" />
          <h2 className="font-title-lg text-title-lg text-on-surface">Personal Information</h2>
        </div>

        {/* Avatar section */}
        <div className="px-6 py-5 border-b border-outline-variant/30 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-primary text-2xl font-bold shrink-0">
            {user.display_name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-title-md text-title-md text-on-surface">{user.display_name}</p>
            <p className="font-body-md text-body-md text-on-surface-variant">@{user.username}</p>
            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-tertiary-container/30 text-tertiary border border-tertiary/20">
              {ROLE_LABELS[user.role] ?? "Member"}
            </span>
          </div>
        </div>

        <form action={profileAction} className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface-variant">Display Name</span>
              <input
                name="display_name"
                defaultValue={user.display_name}
                required
                className="px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface-variant">Username</span>
              <input
                value={user.username}
                disabled
                className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-md font-body-md text-on-surface-variant cursor-not-allowed"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface-variant">Email</span>
              <input
                name="email"
                type="email"
                defaultValue={user.email ?? ""}
                placeholder="your@email.com"
                className="px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface-variant">Phone</span>
              <input
                name="phone_number"
                type="tel"
                defaultValue={user.phone_number ?? ""}
                placeholder="+1 234 567 8900"
                className="px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </label>
          </div>

          {profileState?.error && (
            <p className="flex items-center gap-2 text-error font-body-md text-[13px]">
              <Icon name="error" className="text-[16px]" /> {profileState.error}
            </p>
          )}
          {profileState?.success && (
            <p className="flex items-center gap-2 text-[#137333] font-body-md text-[13px]">
              <Icon name="check_circle" className="text-[16px]" /> {profileState.success}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={profilePending}>
              {profilePending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>

      {/* Password card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/60 flex items-center gap-3">
          <Icon name="lock" className="text-[20px] text-on-surface-variant" />
          <h2 className="font-title-lg text-title-lg text-on-surface">Change Password</h2>
        </div>
        <form action={pwAction} className="px-6 py-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface-variant">Current Password</span>
            <div className="relative">
              <input
                name="current_password"
                type={showCurrentPw ? "text" : "password"}
                required
                placeholder="Enter current password"
                className="w-full px-3 py-2 pr-10 bg-surface-container-lowest border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <Icon name={showCurrentPw ? "visibility_off" : "visibility"} className="text-[18px]" />
              </button>
            </div>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface-variant">New Password</span>
              <div className="relative">
                <input
                  name="new_password"
                  type={showNewPw ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 pr-10 bg-surface-container-lowest border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <Icon name={showNewPw ? "visibility_off" : "visibility"} className="text-[18px]" />
                </button>
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface-variant">Confirm New Password</span>
              <input
                name="confirm_password"
                type="password"
                required
                placeholder="Repeat new password"
                className="px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </label>
          </div>

          {pwState?.error && (
            <p className="flex items-center gap-2 text-error font-body-md text-[13px]">
              <Icon name="error" className="text-[16px]" /> {pwState.error}
            </p>
          )}
          {pwState?.success && (
            <p className="flex items-center gap-2 text-[#137333] font-body-md text-[13px]">
              <Icon name="check_circle" className="text-[16px]" /> {pwState.success}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pwPending}>
              {pwPending ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-surface-container-lowest border border-error/20 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-error/20 flex items-center gap-3">
          <Icon name="warning" className="text-[20px] text-error" />
          <h2 className="font-title-lg text-title-lg text-on-surface">Account Actions</h2>
        </div>
        <div className="px-6 py-5">
          <form action={logoutAction}>
            <Button type="submit" variant="danger" icon={<Icon name="logout" className="text-[18px]" />}>
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
