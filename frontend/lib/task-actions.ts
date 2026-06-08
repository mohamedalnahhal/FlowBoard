"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";

type ActionState = { error?: string } | undefined;

export async function addCommentAction(
  boardId: string,
  taskId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const content = formData.get("content")?.toString().trim();
  if (!content) return { error: "Please write a comment first." };

  try {
    await api.post(`/tasks/${taskId}/comments`, { content });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to post comment." };
  }

  revalidatePath(`/boards/${boardId}/tasks/${taskId}`);
  return undefined;
}

export async function addChecklistItemAction(
  boardId: string,
  taskId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Please enter an item name." };

  try {
    await api.post(`/tasks/${taskId}/checklist-items`, { name });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to add checklist item." };
  }

  revalidatePath(`/boards/${boardId}/tasks/${taskId}`);
  revalidatePath(`/boards/${boardId}`);
  return undefined;
}

export async function toggleChecklistItemAction(boardId: string, taskId: string, itemId: string, status: boolean) {
  await api.patch(`/tasks/${taskId}/checklist-items/${itemId}`, { status });
  revalidatePath(`/boards/${boardId}/tasks/${taskId}`);
  revalidatePath(`/boards/${boardId}`);
}
