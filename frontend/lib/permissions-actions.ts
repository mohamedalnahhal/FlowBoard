"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";

type ActionState = { error?: string } | undefined;

export async function createPermissionRuleAction(
  teamId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const action = formData.get("action")?.toString();
  const type = formData.get("type")?.toString();
  const group_id = formData.get("group_id")?.toString();
  const scope_type = formData.get("scope_type")?.toString();
  const scope_id = formData.get("scope_id")?.toString() || undefined;
  const priority = Number.parseInt(formData.get("priority")?.toString() ?? "0", 10);

  if (!action || !type || !group_id || !scope_type) {
    return { error: "Please fill in all required fields." };
  }

  try {
    await api.post(`/teams/${teamId}/permissions`, { action, type, group_id, scope_type, scope_id, priority });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create permission rule." };
  }

  revalidatePath("/permissions");
  return undefined;
}

export async function deletePermissionRuleAction(teamId: string, permissionId: string): Promise<ActionState> {
  try {
    await api.delete(`/teams/${teamId}/permissions/${permissionId}`);
    revalidatePath("/permissions");
    return undefined;
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to delete permission rule." };
  }
}

export async function togglePermissionTypeAction(teamId: string, permissionId: string, currentType: string): Promise<ActionState> {
  try {
    await api.patch(`/teams/${teamId}/permissions/${permissionId}`, {
      type: currentType === "ALLOW" ? "DENY" : "ALLOW",
    });
    revalidatePath("/permissions");
    return undefined;
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to toggle permission type." };
  }
}

export async function updatePermissionRuleAction(
  teamId: string,
  permissionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const type = formData.get("type")?.toString();
  const priority = formData.get("priority")?.toString();
  const description = formData.get("description")?.toString() || undefined;
  try {
    await api.patch(`/teams/${teamId}/permissions/${permissionId}`, {
      type,
      priority: priority ? Number.parseInt(priority, 10) : undefined,
      description,
    });
    revalidatePath("/permissions");
    return undefined;
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update permission rule." };
  }
}

export async function updateUserGroupsAction(
  teamId: string,
  userId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const selected = new Set(formData.getAll("group_id").map(String));
  const allGroupIds = formData.get("all_group_ids")?.toString().split(",").filter(Boolean) ?? [];

  try {
    await Promise.all(
      allGroupIds.map((groupId) => {
        if (selected.has(groupId)) {
          return api.post(`/teams/${teamId}/groups/${groupId}/members`, { user_id: userId }).catch((err) => {
            if (err instanceof ApiError && err.status === 409) return undefined;
            throw err;
          });
        }
        return api.delete(`/teams/${teamId}/groups/${groupId}/members/${userId}`);
      }),
    );
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update group memberships." };
  }

  revalidatePath("/permissions");
  return undefined;
}
