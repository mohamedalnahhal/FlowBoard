"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";

type ActionState = { error?: string; success?: string } | undefined;

export async function createUserAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const display_name = formData.get("display_name")?.toString().trim();
  const username = formData.get("username")?.toString().trim();
  const email = formData.get("email")?.toString().trim() || null;
  const password = formData.get("password")?.toString();
  const role = Number.parseInt(formData.get("role")?.toString() ?? "3", 10);

  if (!display_name || !username || !password) {
    return { error: "Name, username, and password are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  try {
    await api.post("/users", { display_name, username, email, password, role });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create user." };
  }

  revalidatePath("/users");
  return { success: `User @${username} created successfully.` };
}

export async function updateUserAction(userId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const display_name = formData.get("display_name")?.toString().trim();
  const email = formData.get("email")?.toString().trim() || null;

  if (!display_name) return { error: "Display name is required." };

  try {
    await api.patch(`/users/${userId}`, { display_name, email });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update user." };
  }

  revalidatePath("/users");
  return { success: "User updated successfully." };
}

export async function changeUserRoleAction(
  userId: string,
  role: number,
  syncPermissions: boolean,
): Promise<{ error?: string; success?: string } | undefined> {
  try {
    await api.patch(`/users/${userId}/role`, { role, sync_permissions: syncPermissions });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update role." };
  }
  revalidatePath("/workspace/permissions");
  revalidatePath("/users");
  return { success: "Role updated successfully." };
}

export async function removeUserFromWorkspaceAction(
  workspaceId: string,
  userId: string,
): Promise<{ error?: string } | undefined> {
  try {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to remove user." };
  }
  revalidatePath("/users");
  return undefined;
}
