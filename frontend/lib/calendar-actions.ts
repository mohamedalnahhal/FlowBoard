"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";
import type { RecurrenceRule } from "@/app/(app)/[workspaceId]/[teamId]/calendar/types";

type ActionState = { error?: string } | undefined;

// The calendar page is nested under the (app) route group + [workspaceId]/
// [teamId] segments; this pattern revalidates every matching calendar page
// without purging the entire app's client cache.
const CALENDAR_PATH_PATTERN = "/(app)/[workspaceId]/[teamId]/calendar";

export type CalendarEventInput = {
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  all_day?: boolean;
  color?: string;
  recurrence_rule?: RecurrenceRule | null;
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
  const recurrence_raw = formData.get("recurrence_rule")?.toString();

  if (!title) return { error: "Title is required." };
  if (!starts_at) return { error: "Start date is required." };
  if (!ends_at) return { error: "End date is required." };

  const body: CalendarEventInput = {
    title,
    description,
    starts_at,
    ends_at,
    all_day,
  };
  if (color) body.color = color;
  if (recurrence_raw) {
    try {
      body.recurrence_rule = JSON.parse(recurrence_raw);
    } catch {
      return { error: "Invalid recurrence rule." };
    }
  }

  try {
    await api.post(`/teams/${teamId}/calendar-events`, body);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to create event." };
  }

  revalidatePath(CALENDAR_PATH_PATTERN, "page");
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
  const recurrence_raw = formData.get("recurrence_rule")?.toString();

  if (!title) return { error: "Title is required." };
  if (!starts_at) return { error: "Start date is required." };
  if (!ends_at) return { error: "End date is required." };

  const body: CalendarEventInput = {
    title,
    description,
    starts_at,
    ends_at,
    all_day,
  };
  if (color) body.color = color;
  if (recurrence_raw) {
    try {
      body.recurrence_rule = JSON.parse(recurrence_raw);
    } catch {
      return { error: "Invalid recurrence rule." };
    }
  } else if (formData.has("recurrence_rule")) {
    // Explicitly cleared recurrence.
    body.recurrence_rule = null;
  }

  try {
    await api.patch(`/teams/${teamId}/calendar-events/${eventId}`, body);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update event." };
  }

  revalidatePath(CALENDAR_PATH_PATTERN, "page");
  return undefined;
}

export async function deleteCalendarEventAction(teamId: string, eventId: string): Promise<ActionState> {
  try {
    await api.delete(`/teams/${teamId}/calendar-events/${eventId}`);
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to delete event." };
  }

  revalidatePath(CALENDAR_PATH_PATTERN, "page");
  return undefined;
}

export async function moveCalendarEventAction(
  teamId: string,
  eventId: string,
  startsAt: string,
  endsAt: string,
): Promise<ActionState> {
  try {
    await api.patch(`/teams/${teamId}/calendar-events/${eventId}`, { starts_at: startsAt, ends_at: endsAt });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to move event." };
  }

  revalidatePath(CALENDAR_PATH_PATTERN, "page");
  return undefined;
}

export async function editCalendarEventExceptionAction(
  teamId: string,
  eventId: string,
  exceptionDate: string,
  override: {
    title?: string;
    description?: string;
    starts_at: string;
    ends_at: string;
    all_day?: boolean;
    color?: string;
  },
  deleted = false,
): Promise<ActionState> {
  try {
    await api.post(`/teams/${teamId}/calendar-events/${eventId}/exceptions`, {
      exception_date: exceptionDate,
      deleted,
      override: deleted ? undefined : override,
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update occurrence." };
  }

  revalidatePath(CALENDAR_PATH_PATTERN, "page");
  return undefined;
}
