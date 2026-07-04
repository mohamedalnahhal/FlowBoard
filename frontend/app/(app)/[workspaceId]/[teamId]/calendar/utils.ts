import {
  format,
  parseISO,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  eachHourOfInterval,
  startOfDay,
  endOfDay,
  isToday as dateFnsIsToday,
} from "date-fns";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string | null;
};

export type TaskDeadline = {
  id: string;
  name: string;
  end_date: string;
  status: string;
  board: { id: string; name: string };
};

export const PALETTE = ["#4648d4", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2"];
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LABELS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function toDate(d: string | Date): Date {
  return typeof d === "string" ? parseISO(d) : d;
}

export function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function formatTime(iso: string): string {
  return format(toDate(iso), "h:mm a");
}

export function formatDate(iso: string): string {
  return format(toDate(iso), "MMM d, yyyy");
}

export function formatDateShort(iso: string): string {
  return format(toDate(iso), "MMM d");
}

export function formatMonthYear(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function isToday(d: Date): boolean {
  return dateFnsIsToday(d);
}

export function eventSpansDate(event: CalendarEvent, d: Date): boolean {
  const start = startOfDay(toDate(event.starts_at));
  const end = endOfDay(toDate(event.ends_at));
  const target = startOfDay(d);
  return target >= start && target <= end;
}

export function taskOnDate(task: TaskDeadline, d: Date): boolean {
  return isSameDay(toDate(task.end_date), d);
}

export function getMonthCells(year: number, month: number): { date: Date; currentMonth: boolean; isToday: boolean }[] {
  const anchor = new Date(year, month - 1, 1);
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  return days.map((date) => ({
    date,
    currentMonth: isSameMonth(date, anchor),
    isToday: isToday(date),
  }));
}

export function getWeekDays(year: number, month: number, day: number): Date[] {
  const anchor = new Date(year, month - 1, day);
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  const end = endOfWeek(anchor, { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function getDayHours(): Date[] {
  const start = startOfDay(new Date());
  const end = endOfDay(new Date());
  return eachHourOfInterval({ start, end });
}

export function navigateMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = addMonths(new Date(year, month - 1, 1), delta);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

export function navigateWeek(year: number, month: number, day: number, delta: number): { year: number; month: number; day: number } {
  const next = addWeeks(new Date(year, month - 1, day), delta);
  return { year: next.getFullYear(), month: next.getMonth() + 1, day: next.getDate() };
}

export function navigateDay(year: number, month: number, day: number, delta: number): { year: number; month: number; day: number } {
  const next = addDays(new Date(year, month - 1, day), delta);
  return { year: next.getFullYear(), month: next.getMonth() + 1, day: next.getDate() };
}
