import type { PrismaClient, Prisma } from '@prisma/client';

// Records a single entry in a task's activity/history feed. `type` is a short
// machine slug (e.g. 'status_change', 'task_assigned') and `activity` is a
// structured JSON detail the UI formats for display.
export async function recordTaskActivity(
  prisma: PrismaClient,
  taskId: string,
  userId: string,
  type: string,
  activity: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.taskHistory.create({
    data: { task_id: taskId, user_id: userId, type, activity },
  });
}
