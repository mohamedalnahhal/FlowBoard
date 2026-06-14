import { notFound } from "next/navigation";
import { api, ApiError, getCurrentUser } from "@/lib/api";
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
  reactions: { emoji: string; user_id: string }[];
};
type HistoryEntry = {
  id: string;
  type: string;
  activity: { from?: string; to?: string } | Record<string, unknown>;
  user: Person;
  created_at: string;
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
  task_members: { user: Person; role: number }[];
  task_labels: { label: Label }[];
  task_attachments: { attachment: { id: string; type: string; name: string; url: string } }[];
  checklist: { id: string; checklist_items: ChecklistItem[] } | null;
  task_comments: Comment[];
  task_history: HistoryEntry[];
};

type TeamMember = { id: string; display_name: string; username: string };

export default async function TaskDetailPage({ params }: PageProps<"/boards/[boardId]/tasks/[taskId]">) {
  const { boardId, taskId } = await params;

  const [task, currentUser, boardData] = await Promise.all([
    api.get<TaskDetail>(`/tasks/${taskId}`).catch((err: unknown) => {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
      throw err;
    }),
    getCurrentUser(),
    api.get<{ team: { user_teams: { user: TeamMember }[] }; labels: Label[] }>(`/boards/${boardId}`)
      .catch(() => null),
  ]);

  const teamMembers: TeamMember[] = boardData?.team.user_teams.map((ut) => ut.user) ?? [];

  return (
    <TaskDetailModal
      boardId={boardId}
      task={task}
      currentUserId={currentUser?.id ?? null}
      teamMembers={teamMembers}
      boardLabels={boardData?.labels ?? []}
    />
  );
}
