"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";

type ActionState = { error?: string } | undefined;

export async function createGroupAction(
  teamId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Please enter a group name." };
  try {
    await api.post(`/teams/${teamId}/groups`, { name });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create group." };
  }
  revalidatePath("/[workspaceId]/[teamId]/permissions", "page");
  return undefined;
}

export async function deleteGroupAction(
  teamId: string,
  groupId: string,
): Promise<ActionState> {
  try {
    await api.delete(`/teams/${teamId}/groups/${groupId}`);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to delete group." };
  }
  revalidatePath("/[workspaceId]/[teamId]/permissions", "page");
  return undefined;
}
