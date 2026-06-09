"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";

type ActionState = { error?: string } | undefined;

export async function markNotificationReadAction(notificationId: string): Promise<ActionState> {
  try {
    await api.patch(`/dashboard/notifications/${notificationId}/read`);
    revalidatePath("/", "layout");
    return undefined;
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to mark notification as read." };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  try {
    await api.patch("/dashboard/notifications/read-all");
    revalidatePath("/", "layout");
    return undefined;
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to mark all notifications as read." };
  }
}
