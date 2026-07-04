export type RecurrenceEnd =
  | { type: "never" }
  | { type: "count"; count: number }
  | { type: "until"; until: string };

export type RecurrenceRule = {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  end: RecurrenceEnd;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string | null;
  recurrence_rule?: RecurrenceRule | null;
  parent_event_id?: string | null;
  is_recurring?: boolean;
  exception_date?: string;
};

export type TaskDeadline = {
  id: string;
  name: string;
  end_date: string;
  status: string;
  board: { id: string; name: string };
};

export type CalendarItem =
  | { type: "event"; data: CalendarEvent }
  | { type: "task"; data: TaskDeadline };

export type CalendarView = "month" | "week" | "day" | "agenda";
