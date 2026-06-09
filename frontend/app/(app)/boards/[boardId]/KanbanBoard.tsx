"use client";

import { useEffect, useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { AvatarStack } from "@/components/ui/Avatar";
import { moveTaskAction } from "@/lib/board-actions";
import { AddListForm } from "./AddListForm";
import { AddTaskForm } from "./AddTaskForm";

type Person = { id: string; display_name: string; username: string };
type Label = { id: string; name: string; color: string };
type Task = {
  id: string;
  name: string;
  status: string;
  position: number;
  start_date: string | null;
  end_date: string | null;
  checklist: { checklist_items: { status: boolean }[] } | null;
  task_members: { user: Person }[];
  task_labels: { label: Label }[];
  creator: Person;
};
type List = { id: string; name: string; tasks: Task[] };

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TaskCard({
  boardId,
  task,
  onDragStart,
}: {
  boardId: string;
  task: Task;
  onDragStart: (e: DragEvent<HTMLAnchorElement>, taskId: string) => void;
}) {
  const checklistItems = task.checklist?.checklist_items ?? [];
  const dueDate = formatDate(task.end_date ?? task.start_date);

  return (
    <Link
      href={`/boards/${boardId}/tasks/${task.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h4 className="font-label-md text-label-md text-on-surface font-semibold line-clamp-1">{task.name}</h4>
          {task.task_labels.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {task.task_labels.map(({ label }) => (
                <span
                  key={label.id}
                  className="inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider"
                  style={{ backgroundColor: `${label.color}26`, color: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant/70 mt-1 tracking-wider">
            Assigned by {task.creator.display_name}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          className="text-outline hover:text-on-surface shrink-0"
          aria-label="Task actions"
        >
          <Icon name="more_vert" className="text-[18px]" />
        </button>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-surface-variant">
        {task.task_members.length > 0 ? (
          <AvatarStack people={task.task_members.map((m) => m.user)} max={3} size="xs" />
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3 text-outline text-[10px]">
          {dueDate && (
            <div className="flex items-center gap-1">
              <Icon name="calendar_today" className="text-[12px]" />
              <span>{dueDate}</span>
            </div>
          )}
          {checklistItems.length > 0 && (
            <div className="flex items-center gap-1">
              <Icon name="check_box" className="text-[12px]" />
              <span>
                {checklistItems.filter((i) => i.status).length}/{checklistItems.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function KanbanBoard({ teamId, boardId, lists }: { teamId: string; boardId: string; lists: List[] }) {
  const [columns, setColumns] = useState(lists);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [, startTransition] = useTransition();
  useEffect(() => {
    startTransition(() => setColumns(lists));
  }, [lists, startTransition]);

  useEffect(() => {
    if (!moveError) return;
    const timer = setTimeout(() => setMoveError(null), 4000);
    return () => clearTimeout(timer);
  }, [moveError]);

  function handleDragStart(e: DragEvent<HTMLAnchorElement>, taskId: string) {
    e.dataTransfer.effectAllowed = "move";
    setDragTaskId(taskId);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, listId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverListId !== listId) setDragOverListId(listId);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, targetListId: string) {
    e.preventDefault();
    setDragOverListId(null);
    const taskId = dragTaskId;
    setDragTaskId(null);
    if (!taskId) return;

    const sourceList = columns.find((list) => list.tasks.some((t) => t.id === taskId));
    const task = sourceList?.tasks.find((t) => t.id === taskId);
    if (!sourceList || !task || sourceList.id === targetListId) return;

    const targetList = columns.find((list) => list.id === targetListId);
    if (!targetList) return;

    const position = targetList.tasks.length > 0 ? Math.max(...targetList.tasks.map((t) => t.position)) + 1 : 1;
    const previousColumns = columns;

    setMoveError(null);
    setColumns((prev) =>
      prev.map((list) => {
        if (list.id === sourceList.id) return { ...list, tasks: list.tasks.filter((t) => t.id !== taskId) };
        if (list.id === targetListId) return { ...list, tasks: [...list.tasks, { ...task, position }] };
        return list;
      }),
    );

    moveTaskAction(teamId, boardId, taskId, targetListId, position).catch(() => {
      setColumns(previousColumns);
      setMoveError("You don't have permission to move this task.");
    });
  }

  return (
    <div className="relative flex-1 min-w-0 flex flex-col">
      {moveError && (
        <div className="absolute top-0 right-0 z-20 px-4 py-2 rounded-lg bg-error-container text-on-error-container font-label-md text-label-md shadow-md border border-error-container">
          {moveError}
        </div>
      )}
      <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden flex gap-6 kanban-scroll items-start pb-4">
      {columns.map((list) => (
        <div
          key={list.id}
          onDragOver={(e) => handleDragOver(e, list.id)}
          onDragLeave={() => setDragOverListId((current) => (current === list.id ? null : current))}
          onDrop={(e) => handleDrop(e, list.id)}
          className={`flex-shrink-0 w-[300px] flex flex-col max-h-full rounded-xl transition-colors ${
            dragOverListId === list.id ? "bg-primary-fixed/30" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4 px-1 pt-1">
            <div className="flex items-center gap-2">
              <h3 className="font-title-lg text-title-lg text-on-surface">{list.name}</h3>
              <span className="px-2 py-0.5 bg-surface-container-high rounded-full text-xs font-medium text-secondary">
                {list.tasks.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-2 kanban-scroll pr-1 px-1">
            {list.tasks.map((task) => (
              <TaskCard key={task.id} boardId={boardId} task={task} onDragStart={handleDragStart} />
            ))}
          </div>

          <div className="px-1">
            <AddTaskForm teamId={teamId} boardId={boardId} listId={list.id} />
          </div>
        </div>
      ))}

      <div className="flex-shrink-0 w-[300px]">
        <AddListForm teamId={teamId} boardId={boardId} />
      </div>

        <div className="flex-shrink-0 w-4" />
      </div>
    </div>
  );
}
