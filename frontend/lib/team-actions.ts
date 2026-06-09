"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";

type ActionState = { error?: string; success?: string } | undefined;

export async function createTeamAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim();
  const workspace_id = formData.get("workspace_id")?.toString().trim();
  if (!name) return { error: "Please enter a team name." };
  if (!workspace_id) return { error: "Workspace not found." };

  try {
    await api.post("/teams", { name, workspace_id });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create team." };
  }

  revalidatePath("/teams");
  return undefined;
}

export async function updateTeamAction(teamId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Team name is required." };

  try {
    await api.patch(`/teams/${teamId}`, { name });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update team." };
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  return { success: "Team renamed successfully." };
}

export async function addTeamMemberAction(teamId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user_id = formData.get("user_id")?.toString().trim();
  const role = Number.parseInt(formData.get("role")?.toString() ?? "3", 10);
  if (!user_id) return { error: "Please select a user." };

  try {
    await api.post(`/teams/${teamId}/members`, { user_id, role });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to add member." };
  }

  revalidatePath(`/teams/${teamId}`);
  return { success: "Member added successfully." };
}

export async function removeTeamMemberAction(teamId: string, userId: string): Promise<ActionState> {
  try {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to remove member." };
  }

  revalidatePath(`/teams/${teamId}`);
  return undefined;
}
