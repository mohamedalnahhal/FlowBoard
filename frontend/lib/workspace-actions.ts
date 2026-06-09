"use server";

import { api, ApiError } from "@/lib/api";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string; success?: string } | undefined;

export async function updateWorkspaceAction(
  workspaceId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Please enter a workspace name." };
  try {
    await api.patch(`/workspaces/${workspaceId}`, { name });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update workspace." };
  }
  revalidatePath("/");
  revalidatePath("/workspace/settings");
  return { success: "Workspace updated successfully." };
}

export async function createWorkspaceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Please enter a workspace name." };
  try {
    await api.post("/workspaces", { name });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create workspace." };
  }
  revalidatePath("/");
  return { success: "Workspace created!" };
}
