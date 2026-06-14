"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";

type ActionState = { error?: string } | undefined;

export async function createListAction(
  teamId: string,
  boardId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Please enter a list name." };

  try {
    await api.post(`/teams/${teamId}/boards/${boardId}/lists`, { name });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create list." };
  }

  revalidatePath(`/boards/${boardId}`);
  return undefined;
}

export async function createTaskAction(
  teamId: string,
  boardId: string,
  listId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Please enter a task name." };

  const start_date = formData.get("start_date")?.toString() || undefined;
  const end_date = formData.get("end_date")?.toString() || undefined;

  try {
    await api.post(`/teams/${teamId}/boards/${boardId}/lists/${listId}/tasks`, {
      name,
      start_date,
      end_date,
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create task." };
  }

  revalidatePath(`/boards/${boardId}`);
  return undefined;
}

export async function moveTaskAction(teamId: string, boardId: string, taskId: string, listId: string, position: number) {
  await api.patch(`/teams/${teamId}/boards/${boardId}/tasks/${taskId}/move`, { list_id: listId, position });
  revalidatePath(`/boards/${boardId}`);
}

export async function createLabelAction(
  teamId: string,
  boardId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name  = formData.get("name")?.toString().trim();
  const color = formData.get("color")?.toString().trim();
  if (!name)  return { error: "Label name is required." };
  if (!color) return { error: "Label color is required." };

  try {
    await api.post(`/teams/${teamId}/boards/${boardId}/labels`, { name, color });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create label." };
  }

  revalidatePath(`/boards/${boardId}`);
  return undefined;
}

export async function deleteLabelAction(
  teamId: string,
  boardId: string,
  labelId: string,
): Promise<ActionState> {
  try {
    await api.delete(`/teams/${teamId}/boards/${boardId}/labels/${labelId}`);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to delete label." };
  }

  revalidatePath(`/boards/${boardId}`);
  return undefined;
}

export async function deleteBoardAction(teamId: string, boardId: string): Promise<ActionState> {
  try {
    await api.delete(`/teams/${teamId}/boards/${boardId}`);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to delete board." };
  }
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/[workspaceId]/[teamId]/boards", "page");
  return undefined;
}

export async function createBoardAction(
  teamId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Please enter a board name." };
  try {
    await api.post(`/teams/${teamId}/boards`, { name, status: "ACTIVE" });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create board." };
  }
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/[workspaceId]/[teamId]/boards", "page");
  return undefined;
}

export async function createBoardFromTeamAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim();
  const teamId = formData.get("team_id")?.toString();
  if (!name) return { error: "Please enter a board name." };
  if (!teamId) return { error: "Please select a team." };
  try {
    await api.post(`/teams/${teamId}/boards`, { name, status: "ACTIVE" });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create board." };
  }
  revalidatePath("/[workspaceId]/[teamId]/boards", "page");
  return undefined;
}
