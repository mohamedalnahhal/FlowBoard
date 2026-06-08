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
  await api.patch(`/teams/${teamId}/boards/${boardId}/tasks/${taskId}`, { list_id: listId, position });
  revalidatePath(`/boards/${boardId}`);
}
