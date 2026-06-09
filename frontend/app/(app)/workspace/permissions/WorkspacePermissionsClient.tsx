"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { changeUserRoleAction } from "@/lib/user-actions";

type WorkspaceMember = {
  id: string;
  display_name: string;
  username: string;
  email: string | null;
  role: number;
};

const ROLE_LABELS: Record<number, string> = {
  0: "System Admin",
  1: "Workspace Owner",
  2: "Workspace Admin",
  3: "Member",
  4: "Viewer",
};

const ROLE_TONES: Record<number, string> = {
  0: "bg-tertiary-container/30 text-tertiary border border-tertiary/20",
  1: "bg-tertiary-container/30 text-tertiary border border-tertiary/20",
  2: "bg-secondary-container text-on-secondary-container border border-on-secondary-container/30",
  3: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
  4: "bg-surface-container text-on-surface-variant border border-outline-variant",
};

function ChangeRoleModal({
  member,
  onClose,
}: {
  member: WorkspaceMember;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(member.role);
  const [syncPermissions, setSyncPermissions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const lowerPermissions = selectedRole > member.role;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await changeUserRoleAction(member.id, selectedRole, syncPermissions);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
    } else {
      onClose();
      startTransition(() => router.refresh());
    }
  }

  return (
    <Modal open onClose={onClose} title="Change Role" width="md"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || selectedRole === member.role}>
            {submitting ? "Saving…" : "Save Role"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg">
          <Avatar person={member} size="md" />
          <div>
            <p className="font-label-md text-label-md text-on-surface font-semibold">{member.display_name}</p>
            <p className="font-body-md text-on-surface-variant text-[12px]">@{member.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[13px] text-on-surface-variant">
          <span>Current role:</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold uppercase tracking-wide ${ROLE_TONES[member.role] ?? ROLE_TONES[3]}`}>
            {ROLE_LABELS[member.role] ?? "Member"}
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">New Role</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(Number(e.target.value))}
            className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            <option value={1}>Workspace Owner</option>
            <option value={2}>Workspace Admin</option>
            <option value={3}>Member</option>
            <option value={4}>Viewer</option>
          </select>
        </label>

        <p className="text-[12px] text-on-surface-variant">
          Changing this role will update the user&apos;s workspace access level.
        </p>

        {lowerPermissions && (
          <div className="flex items-start gap-2 p-3 bg-[#fdedc8]/40 border border-[#8a5a00]/20 rounded-lg text-[12px] text-on-surface-variant">
            <Icon name="warning" className="text-[16px] text-[#8a5a00] shrink-0 mt-0.5" />
            <span>This will revoke non-default permissions if you choose &ldquo;Revoke extra permissions&rdquo;.</span>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={syncPermissions}
            onChange={(e) => setSyncPermissions(e.target.checked)}
            className="rounded border-outline-variant text-primary focus:ring-primary"
          />
          <span className="font-body-md text-[13px] text-on-surface">
            Sync permissions (assign default permissions for new role)
          </span>
        </label>

        {error && (
          <p className="flex items-center gap-2 text-error font-body-md text-[13px]">
            <Icon name="error" className="text-[16px]" />{error}
          </p>
        )}
      </form>
    </Modal>
  );
}

export function WorkspacePermissionsClient({
  members,
  currentUserRole,
}: {
  members: WorkspaceMember[];
  currentUserRole: number;
}) {
  const canEdit = currentUserRole <= 2;
  const [editMember, setEditMember] = useState<WorkspaceMember | null>(null);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-display text-on-surface mb-1">Workspace Permissions</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Manage who can access and administer this workspace.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 mb-6 bg-surface-container-low border border-outline-variant rounded-xl text-[13px] text-on-surface-variant">
        <Icon name="info" className="text-[18px] text-primary shrink-0 mt-0.5" />
        <p>
          Workspace permission editing is restricted to Workspace Owners and Admins. These permissions cannot be
          delegated to other roles.
        </p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-4 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Member</th>
                <th className="px-4 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Email</th>
                <th className="px-4 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Role</th>
                {canEdit && (
                  <th className="px-4 py-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 4 : 3} className="px-4 py-8 text-center font-body-md text-body-md text-on-surface-variant">
                    No members found.
                  </td>
                </tr>
              ) : members.map((member) => (
                <tr key={member.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar person={member} size="md" />
                      <div>
                        <div className="font-label-md text-label-md text-on-surface font-semibold">{member.display_name}</div>
                        <div className="font-body-md text-on-surface-variant text-[12px]">@{member.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-body-md text-[13px] text-on-surface-variant">
                    {member.email ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold uppercase tracking-wide ${ROLE_TONES[member.role] ?? ROLE_TONES[3]}`}>
                      {ROLE_LABELS[member.role] ?? "Member"}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      {member.role !== 1 && (
                        <button
                          type="button"
                          onClick={() => setEditMember(member)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-label-sm text-[12px]"
                        >
                          <Icon name="edit" className="text-[14px]" />
                          Edit Role
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editMember && (
        <ChangeRoleModal member={editMember} onClose={() => setEditMember(null)} />
      )}
    </>
  );
}
