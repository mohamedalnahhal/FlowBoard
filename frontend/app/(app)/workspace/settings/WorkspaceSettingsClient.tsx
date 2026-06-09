"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { updateWorkspaceAction } from "@/lib/workspace-actions";

type Workspace = { id: string; name: string; created_at: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkspaceSettingsClient({
  workspace,
  currentUserRole,
}: {
  workspace: Workspace | null;
  currentUserRole: number;
}) {
  const router = useRouter();
  const canEdit = currentUserRole <= 2;

  const boundAction = workspace
    ? updateWorkspaceAction.bind(null, workspace.id)
    : null;

  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => ({ error: "No workspace found." })),
    undefined,
  );

  const wasSubmittingRef = useRef(false);

  useEffect(() => {
    if (pending) { wasSubmittingRef.current = true; return; }
    if (wasSubmittingRef.current && state?.success) {
      wasSubmittingRef.current = false;
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Icon name="error_outline" className="text-[48px] text-on-surface-variant" />
        <p className="font-body-lg text-on-surface-variant">No workspace found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[672px] flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1">
          Workspace Settings
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Manage your workspace configuration and preferences.
        </p>
      </div>

      {/* General section */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/50 bg-surface-container-low/40">
          <h2 className="font-title-md text-title-md text-on-surface">General</h2>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Workspace ID info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Workspace ID
              </span>
              <span className="font-body-md text-body-md text-on-surface font-mono bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant/50 text-[12px] truncate select-all">
                {workspace.id}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Created
              </span>
              <span className="font-body-md text-body-md text-on-surface px-3 py-2">
                {formatDate(workspace.created_at)}
              </span>
            </div>
          </div>

          {/* Rename form */}
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ws-name"
                className="font-label-md text-label-md text-on-surface-variant"
              >
                Workspace Name
              </label>
              <input
                id="ws-name"
                name="name"
                required
                defaultValue={workspace.name}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {!canEdit && (
                <p className="font-body-md text-[12px] text-on-surface-variant flex items-center gap-1">
                  <Icon name="lock" className="text-[14px]" />
                  Only workspace owners and admins can rename the workspace.
                </p>
              )}
            </div>

            {state?.error && (
              <div className="flex items-center gap-2 p-3 bg-error-container/20 rounded-lg text-error font-body-md text-[13px]">
                <Icon name="error" className="text-[16px] shrink-0" />
                {state.error}
              </div>
            )}

            {state?.success && (
              <div className="flex items-center gap-2 p-3 bg-[#e6f4ea] rounded-lg text-[#137333] font-body-md text-[13px]">
                <Icon name="check_circle" className="text-[16px] shrink-0" />
                {state.success}
              </div>
            )}

            {canEdit && (
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Members quick-link */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/50 bg-surface-container-low/40">
          <h2 className="font-title-md text-title-md text-on-surface">Members &amp; Permissions</h2>
        </div>
        <div className="p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-fixed/50 flex items-center justify-center">
                <Icon name="group" className="text-primary text-[18px]" />
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">Users</p>
                <p className="font-body-md text-[12px] text-on-surface-variant">
                  Manage workspace members
                </p>
              </div>
            </div>
            <a
              href="/users"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-sm text-label-sm hover:bg-surface-container-low transition-colors"
            >
              Manage
              <Icon name="chevron_right" className="text-[16px]" />
            </a>
          </div>

          {canEdit && (
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary-container/50 flex items-center justify-center">
                  <Icon name="admin_panel_settings" className="text-secondary text-[18px]" />
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface font-semibold">
                    Workspace Permissions
                  </p>
                  <p className="font-body-md text-[12px] text-on-surface-variant">
                    Control workspace-level access roles
                  </p>
                </div>
              </div>
              <a
                href="/workspace/permissions"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-sm text-label-sm hover:bg-surface-container-low transition-colors"
              >
                Manage
                <Icon name="chevron_right" className="text-[16px]" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Danger zone — owners only */}
      {currentUserRole <= 1 && (
        <section className="border border-error/30 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-error/20 bg-error-container/10">
            <h2 className="font-title-md text-title-md text-error">Danger Zone</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">
                  Delete this workspace
                </p>
                <p className="font-body-md text-[13px] text-on-surface-variant mt-0.5">
                  Permanently deletes all teams, boards, and tasks. This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                disabled
                title="Contact support to delete a workspace"
                className="shrink-0 px-4 py-2 rounded-lg border border-error/40 text-error font-label-md text-label-md hover:bg-error-container/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Workspace
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
