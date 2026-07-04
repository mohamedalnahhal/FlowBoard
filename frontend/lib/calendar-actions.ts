"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";

type ActionState = { error?: string } | undefined;

function normalizeDateInput(value: string, isAllDay: boolean, isEnd: boolean): string {
  if (!isAllDay) return value;
  const date = value.length <= 10 ? value : value.slice(0, 10);
  return `${date}T${isEnd ? "23:59" : "00:00"}`;
}

export type CalendarEventInput = {
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  all_day?: boolean;
  color?: string;
};

export async function createCalendarEventAction(
  teamId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString() ?? "";
  const starts_at = formData.get("starts_at")?.toString();
  const ends_at = formData.get("ends_at")?.toString();
  const all_day = formData.get("all_day") === "on";
  const color = formData.get("color")?.toString().trim();

  if (!title) return { error: "Title is required." };
  if (!starts_at) return { error: "Start date is required." };
  if (!ends_at) return { error: "End date is required." };

  const body: CalendarEventInput = {
    title,
    description,
    starts_at: normalizeDateInput(starts_at, all_day, false),
    ends_at: normalizeDateInput(ends_at, all_day, true),
    all_day,
  };
  if (color) body.color = color;

  try {
    await api.post(`/teams/${teamId}/calendar-events`, body);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create event." };
  }

  revalidatePath("/", "layout");
  return undefined;
}

export async function updateCalendarEventAction(
  teamId: string,
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString() ?? "";
  const starts_at = formData.get("starts_at")?.toString();
  const ends_at = formData.get("ends_at")?.toString();
  const all_day = formData.get("all_day") === "on";
  const color = formData.get("color")?.toString().trim();

  if (!title) return { error: "Title is required." };
  if (!starts_at) return { error: "Start date is required." };
  if (!ends_at) return { error: "End date is required." };

  const body: CalendarEventInput = {
    title,
    description,
    starts_at: normalizeDateInput(starts_at, all_day, false),
    ends_at: normalizeDateInput(ends_at, all_day, true),
    all_day,
  };
  if (color) body.color = color;

  try {
    await api.patch(`/teams/${teamId}/calendar-events/${eventId}`, body);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update event." };
  }

  revalidatePath("/", "layout");
  return undefined;
}

export async function deleteCalendarEventAction(teamId: string, eventId: string): Promise<ActionState> {
  try {
    await api.delete(`/teams/${teamId}/calendar-events/${eventId}`);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to delete event." };
  }

  revalidatePath("/", "layout");
  return undefined;
}
