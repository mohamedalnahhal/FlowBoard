"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "./api";

type ActionState = { error?: string; success?: string } | undefined;

export async function updateProfileAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const display_name = formData.get("display_name")?.toString().trim();
  const email = formData.get("email")?.toString().trim() || null;
  const phone_number = formData.get("phone_number")?.toString().trim() || null;

  if (!display_name) return { error: "Display name is required." };

  try {
    await api.patch("/auth/me", { display_name, email, phone_number });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to update profile." };
  }

  revalidatePath("/", "layout");
  return { success: "Profile updated successfully." };
}

export async function changePasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const current_password = formData.get("current_password")?.toString();
  const new_password = formData.get("new_password")?.toString();
  const confirm_password = formData.get("confirm_password")?.toString();

  if (!current_password || !new_password) return { error: "All fields are required." };
  if (new_password !== confirm_password) return { error: "New passwords do not match." };
  if (new_password.length < 6) return { error: "New password must be at least 6 characters." };

  try {
    await api.post("/auth/change-password", { current_password, new_password });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Failed to change password." };
  }

  return { success: "Password changed successfully." };
}
