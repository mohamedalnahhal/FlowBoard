"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";

type ActionState = { error?: string } | undefined;

export async function createAnnouncementAction(
  workspaceId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = formData.get("title")?.toString().trim();
  const body = formData.get("body")?.toString().trim();

  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Body is required." };

  try {
    await api.post(`/workspaces/${workspaceId}/announcements`, { title, body });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create announcement." };
  }

  revalidatePath("/", "layout");
  return undefined;
}

export async function updateAnnouncementAction(
  workspaceId: string,
  announcementId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = formData.get("title")?.toString().trim();
  const body = formData.get("body")?.toString().trim();

  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Body is required." };

  try {
    await api.patch(`/workspaces/${workspaceId}/announcements/${announcementId}`, { title, body });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update announcement." };
  }

  revalidatePath("/", "layout");
  return undefined;
}

export async function deleteAnnouncementAction(workspaceId: string, announcementId: string): Promise<ActionState> {
  try {
    await api.delete(`/workspaces/${workspaceId}/announcements/${announcementId}`);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to delete announcement." };
  }

  revalidatePath("/", "layout");
  return undefined;
}
