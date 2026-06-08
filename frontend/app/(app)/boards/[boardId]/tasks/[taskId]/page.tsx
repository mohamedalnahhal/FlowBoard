import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { TaskDetailModal } from "./TaskDetailModal";

type Person = { id: string; display_name: string; username: string };
type Label = { id: string; name: string; color: string };
type ChecklistItem = { id: string; name: string; status: boolean };
type Comment = {
  id: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  user: Person;
  replies: Comment[];
};
type HistoryEntry = {
  id: string;
  type: string;
  activity: { from?: string; to?: string } | Record<string, unknown>;
  user: Person;
};
type TaskDetail = {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  list: { id: string; name: string; board_id: string; board: { id: string; name: string; team_id: string } };
  creator: Person;
  task_members: { user: Person }[];
  task_labels: { label: Label }[];
  task_attachments: { attachment: { id: string; type: string; name: string; url: string } }[];
  checklist: { id: string; checklist_items: ChecklistItem[] } | null;
  task_comments: Comment[];
  task_history: HistoryEntry[];
};

export default async function TaskDetailPage({ params }: PageProps<"/boards/[boardId]/tasks/[taskId]">) {
  const { boardId, taskId } = await params;

  let task: TaskDetail;
  try {
    task = await api.get<TaskDetail>(`/tasks/${taskId}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  return <TaskDetailModal boardId={boardId} task={task} />;
}
