import { PrismaClient, BoardStatus, TaskStatus, PermissionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Workspace ──────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a1' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-0000000000a1',
      name: 'Acme Corp',
    },
  });
  console.log('✓ Workspace');

  // ── Users ──────────────────────────────────────────────────────────────────
  const [alice, bob, carol, dave] = await Promise.all([
    prisma.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        display_name: 'Alice Admin',
        username: 'alice',
        email: 'alice@taskboard.dev',
        phone_number: '+1-555-0101',
        password: passwordHash,
        role: 1,
      },
    }),
    prisma.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        display_name: 'Bob Manager',
        username: 'bob',
        email: 'bob@taskboard.dev',
        phone_number: '+1-555-0102',
        password: passwordHash,
        role: 2,
      },
    }),
    prisma.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        display_name: 'Carol Developer',
        username: 'carol',
        email: 'carol@taskboard.dev',
        password: passwordHash,
        role: 3,
      },
    }),
    prisma.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000004',
        display_name: 'Dave Designer',
        username: 'dave',
        email: 'dave@taskboard.dev',
        password: passwordHash,
        role: 3,
      },
    }),
  ]);
  console.log('✓ Users (password for all: "password123")');

  // ── Teams ──────────────────────────────────────────────────────────────────
  const [frontendTeam, backendTeam] = await Promise.all([
    prisma.team.upsert({
      where: { id: '00000000-0000-0000-0001-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000001',
        name: 'Frontend Team',
        workspace_id: workspace.id,
      },
    }),
    prisma.team.upsert({
      where: { id: '00000000-0000-0000-0001-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000002',
        name: 'Backend Team',
        workspace_id: workspace.id,
      },
    }),
  ]);
  console.log('✓ Teams');

  // ── Groups ─────────────────────────────────────────────────────────────────
  const [feAllGroup, feDevsGroup, beAllGroup] = await Promise.all([
    prisma.group.upsert({
      where: { id: '00000000-0000-0000-0002-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0002-000000000001',
        team_id: frontendTeam.id,
        all_members: true,
      },
    }),
    prisma.group.upsert({
      where: { id: '00000000-0000-0000-0002-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0002-000000000002',
        team_id: frontendTeam.id,
        all_members: false,
      },
    }),
    prisma.group.upsert({
      where: { id: '00000000-0000-0000-0002-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0002-000000000003',
        team_id: backendTeam.id,
        all_members: true,
      },
    }),
  ]);
  console.log('✓ Groups');

  // ── UserTeam memberships ───────────────────────────────────────────────────
  await Promise.all([
    prisma.userTeam.upsert({
      where: { user_id_team_id: { user_id: alice.id, team_id: frontendTeam.id } },
      update: {},
      create: { user_id: alice.id, team_id: frontendTeam.id, role: 1 },
    }),
    prisma.userTeam.upsert({
      where: { user_id_team_id: { user_id: bob.id, team_id: frontendTeam.id } },
      update: {},
      create: { user_id: bob.id, team_id: frontendTeam.id, role: 2 },
    }),
    prisma.userTeam.upsert({
      where: { user_id_team_id: { user_id: carol.id, team_id: frontendTeam.id } },
      update: {},
      create: { user_id: carol.id, team_id: frontendTeam.id, role: 3 },
    }),
    prisma.userTeam.upsert({
      where: { user_id_team_id: { user_id: alice.id, team_id: backendTeam.id } },
      update: {},
      create: { user_id: alice.id, team_id: backendTeam.id, role: 1 },
    }),
    prisma.userTeam.upsert({
      where: { user_id_team_id: { user_id: dave.id, team_id: backendTeam.id } },
      update: {},
      create: { user_id: dave.id, team_id: backendTeam.id, role: 3 },
    }),
  ]);
  console.log('✓ UserTeams');

  // ── UserGroup memberships ──────────────────────────────────────────────────
  await Promise.all([
    prisma.userGroup.upsert({
      where: { user_id_group_id: { user_id: alice.id, group_id: feAllGroup.id } },
      update: {},
      create: { user_id: alice.id, group_id: feAllGroup.id },
    }),
    prisma.userGroup.upsert({
      where: { user_id_group_id: { user_id: bob.id, group_id: feAllGroup.id } },
      update: {},
      create: { user_id: bob.id, group_id: feAllGroup.id },
    }),
    prisma.userGroup.upsert({
      where: { user_id_group_id: { user_id: carol.id, group_id: feAllGroup.id } },
      update: {},
      create: { user_id: carol.id, group_id: feAllGroup.id },
    }),
    prisma.userGroup.upsert({
      where: { user_id_group_id: { user_id: carol.id, group_id: feDevsGroup.id } },
      update: {},
      create: { user_id: carol.id, group_id: feDevsGroup.id },
    }),
    prisma.userGroup.upsert({
      where: { user_id_group_id: { user_id: alice.id, group_id: beAllGroup.id } },
      update: {},
      create: { user_id: alice.id, group_id: beAllGroup.id },
    }),
    prisma.userGroup.upsert({
      where: { user_id_group_id: { user_id: dave.id, group_id: beAllGroup.id } },
      update: {},
      create: { user_id: dave.id, group_id: beAllGroup.id },
    }),
  ]);
  console.log('✓ UserGroups');

  // ── Boards ─────────────────────────────────────────────────────────────────
  const [sprintBoard, designBoard, apiBoard] = await Promise.all([
    prisma.board.upsert({
      where: { id: '00000000-0000-0000-0003-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0003-000000000001',
        name: 'Sprint 1',
        team_id: frontendTeam.id,
        status: BoardStatus.ACTIVE,
      },
    }),
    prisma.board.upsert({
      where: { id: '00000000-0000-0000-0003-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0003-000000000002',
        name: 'Design System',
        team_id: frontendTeam.id,
        status: BoardStatus.ACTIVE,
      },
    }),
    prisma.board.upsert({
      where: { id: '00000000-0000-0000-0003-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0003-000000000003',
        name: 'API Development',
        team_id: backendTeam.id,
        status: BoardStatus.ACTIVE,
      },
    }),
  ]);
  console.log('✓ Boards');

  // ── Lists ──────────────────────────────────────────────────────────────────
  const [todoList, inProgressList, reviewList, doneList, apiTodoList, apiDoneList] =
    await Promise.all([
      prisma.list.upsert({
        where: { id: '00000000-0000-0000-0004-000000000001' },
        update: {},
        create: { id: '00000000-0000-0000-0004-000000000001', name: 'To Do', board_id: sprintBoard.id },
      }),
      prisma.list.upsert({
        where: { id: '00000000-0000-0000-0004-000000000002' },
        update: {},
        create: { id: '00000000-0000-0000-0004-000000000002', name: 'In Progress', board_id: sprintBoard.id },
      }),
      prisma.list.upsert({
        where: { id: '00000000-0000-0000-0004-000000000003' },
        update: {},
        create: { id: '00000000-0000-0000-0004-000000000003', name: 'Review', board_id: sprintBoard.id },
      }),
      prisma.list.upsert({
        where: { id: '00000000-0000-0000-0004-000000000004' },
        update: {},
        create: { id: '00000000-0000-0000-0004-000000000004', name: 'Done', board_id: sprintBoard.id },
      }),
      prisma.list.upsert({
        where: { id: '00000000-0000-0000-0004-000000000005' },
        update: {},
        create: { id: '00000000-0000-0000-0004-000000000005', name: 'Backlog', board_id: apiBoard.id },
      }),
      prisma.list.upsert({
        where: { id: '00000000-0000-0000-0004-000000000006' },
        update: {},
        create: { id: '00000000-0000-0000-0004-000000000006', name: 'Shipped', board_id: apiBoard.id },
      }),
    ]);
  console.log('✓ Lists');

  // ── Checklists ─────────────────────────────────────────────────────────────
  const [deployChecklist] = await Promise.all([
    prisma.checklist.upsert({
      where: { id: '00000000-0000-0000-0005-000000000001' },
      update: {},
      create: { id: '00000000-0000-0000-0005-000000000001', board_id: sprintBoard.id },
    }),
  ]);

  await Promise.all([
    prisma.checklistItem.upsert({
      where: { id: '00000000-0000-0000-0006-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0006-000000000001',
        checklist_id: deployChecklist.id,
        name: 'Write unit tests',
        status: true,
      },
    }),
    prisma.checklistItem.upsert({
      where: { id: '00000000-0000-0000-0006-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0006-000000000002',
        checklist_id: deployChecklist.id,
        name: 'Update documentation',
        status: false,
      },
    }),
    prisma.checklistItem.upsert({
      where: { id: '00000000-0000-0000-0006-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0006-000000000003',
        checklist_id: deployChecklist.id,
        name: 'Get PR approved',
        status: false,
      },
    }),
  ]);
  console.log('✓ Checklists & Items');

  // ── Labels ─────────────────────────────────────────────────────────────────
  const [bugLabel, featureLabel, urgentLabel] = await Promise.all([
    prisma.label.upsert({
      where: { id: '00000000-0000-0000-0007-000000000001' },
      update: {},
      create: { id: '00000000-0000-0000-0007-000000000001', name: 'Bug', color: '#ef4444', board_id: sprintBoard.id },
    }),
    prisma.label.upsert({
      where: { id: '00000000-0000-0000-0007-000000000002' },
      update: {},
      create: { id: '00000000-0000-0000-0007-000000000002', name: 'Feature', color: '#3b82f6', board_id: sprintBoard.id },
    }),
    prisma.label.upsert({
      where: { id: '00000000-0000-0000-0007-000000000003' },
      update: {},
      create: { id: '00000000-0000-0000-0007-000000000003', name: 'Urgent', color: '#f97316', board_id: sprintBoard.id },
    }),
  ]);
  console.log('✓ Labels');

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const [loginTask, navbarTask, apiAuthTask, apiUsersTask] = await Promise.all([
    prisma.task.upsert({
      where: { id: '00000000-0000-0000-0008-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0008-000000000001',
        name: 'Implement login page',
        description: 'Build the login form with email/password fields and JWT integration.',
        list_id: inProgressList.id,
        checklist_id: deployChecklist.id,
        created_by: bob.id,
        status: TaskStatus.IN_PROGRESS,
        position: 1,
        start_date: new Date('2026-06-01'),
        end_date: new Date('2026-06-10'),
      },
    }),
    prisma.task.upsert({
      where: { id: '00000000-0000-0000-0008-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0008-000000000002',
        name: 'Responsive navbar',
        description: 'Create a mobile-friendly navigation bar using Tailwind CSS.',
        list_id: todoList.id,
        created_by: alice.id,
        status: TaskStatus.TODO,
        position: 1,
        end_date: new Date('2026-06-15'),
      },
    }),
    prisma.task.upsert({
      where: { id: '00000000-0000-0000-0008-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0008-000000000003',
        name: 'Auth middleware',
        description: 'JWT validation middleware for all protected API routes.',
        list_id: apiTodoList.id,
        created_by: alice.id,
        status: TaskStatus.TODO,
        position: 1,
      },
    }),
    prisma.task.upsert({
      where: { id: '00000000-0000-0000-0008-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0008-000000000004',
        name: 'Users CRUD endpoints',
        description: 'REST endpoints for creating, reading, updating and deleting users.',
        list_id: apiDoneList.id,
        created_by: dave.id,
        status: TaskStatus.DONE,
        position: 1,
        start_date: new Date('2026-05-20'),
        end_date: new Date('2026-05-31'),
      },
    }),
  ]);
  console.log('✓ Tasks');

  // ── TaskMembers ────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.taskMember.upsert({
      where: { user_id_task_id: { user_id: carol.id, task_id: loginTask.id } },
      update: {},
      create: { user_id: carol.id, task_id: loginTask.id, role: 1 },
    }),
    prisma.taskMember.upsert({
      where: { user_id_task_id: { user_id: bob.id, task_id: loginTask.id } },
      update: {},
      create: { user_id: bob.id, task_id: loginTask.id, role: 2 },
    }),
    prisma.taskMember.upsert({
      where: { user_id_task_id: { user_id: carol.id, task_id: navbarTask.id } },
      update: {},
      create: { user_id: carol.id, task_id: navbarTask.id, role: 1 },
    }),
    prisma.taskMember.upsert({
      where: { user_id_task_id: { user_id: dave.id, task_id: apiAuthTask.id } },
      update: {},
      create: { user_id: dave.id, task_id: apiAuthTask.id, role: 1 },
    }),
    prisma.taskMember.upsert({
      where: { user_id_task_id: { user_id: dave.id, task_id: apiUsersTask.id } },
      update: {},
      create: { user_id: dave.id, task_id: apiUsersTask.id, role: 1 },
    }),
  ]);
  console.log('✓ TaskMembers');

  // ── TaskLabels ─────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.taskLabel.upsert({
      where: { task_id_label_id: { task_id: loginTask.id, label_id: featureLabel.id } },
      update: {},
      create: { task_id: loginTask.id, label_id: featureLabel.id },
    }),
    prisma.taskLabel.upsert({
      where: { task_id_label_id: { task_id: loginTask.id, label_id: urgentLabel.id } },
      update: {},
      create: { task_id: loginTask.id, label_id: urgentLabel.id },
    }),
    prisma.taskLabel.upsert({
      where: { task_id_label_id: { task_id: navbarTask.id, label_id: featureLabel.id } },
      update: {},
      create: { task_id: navbarTask.id, label_id: featureLabel.id },
    }),
  ]);
  console.log('✓ TaskLabels');

  // ── Attachments ────────────────────────────────────────────────────────────
  const [mockupAttachment] = await Promise.all([
    prisma.attachment.upsert({
      where: { id: '00000000-0000-0000-0009-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0009-000000000001',
        type: 'image/png',
        name: 'login-mockup.png',
        url: 'https://storage.taskboard.dev/attachments/login-mockup.png',
      },
    }),
  ]);

  await prisma.taskAttachment.upsert({
    where: { task_id_attachment_id: { task_id: loginTask.id, attachment_id: mockupAttachment.id } },
    update: {},
    create: { task_id: loginTask.id, attachment_id: mockupAttachment.id },
  });
  console.log('✓ Attachments');

  // ── TaskComments ───────────────────────────────────────────────────────────
  const parentComment = await prisma.taskComment.upsert({
    where: { id: '00000000-0000-0000-0010-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0010-000000000001',
      task_id: loginTask.id,
      user_id: bob.id,
      content: 'Make sure to handle the "remember me" checkbox as well.',
    },
  });

  await Promise.all([
    prisma.taskComment.upsert({
      where: { id: '00000000-0000-0000-0010-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0010-000000000002',
        task_id: loginTask.id,
        user_id: carol.id,
        parent_comment_id: parentComment.id,
        content: 'On it! I\'ll use a 30-day cookie with httpOnly flag.',
      },
    }),
    prisma.taskComment.upsert({
      where: { id: '00000000-0000-0000-0010-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0010-000000000003',
        task_id: navbarTask.id,
        user_id: alice.id,
        content: 'Check the Figma design file for breakpoints.',
      },
    }),
  ]);
  console.log('✓ TaskComments');

  // ── TaskHistory ────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.taskHistory.upsert({
      where: { id: '00000000-0000-0000-0011-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0011-000000000001',
        task_id: loginTask.id,
        user_id: bob.id,
        type: 'status_change',
        activity: { from: 'TODO', to: 'IN_PROGRESS' },
      },
    }),
    prisma.taskHistory.upsert({
      where: { id: '00000000-0000-0000-0011-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0011-000000000002',
        task_id: apiUsersTask.id,
        user_id: dave.id,
        type: 'status_change',
        activity: { from: 'IN_REVIEW', to: 'DONE' },
      },
    }),
  ]);
  console.log('✓ TaskHistory');

  // ── Permissions ────────────────────────────────────────────────────────────
  await Promise.all([
    // Team-wide: all frontend members can view their team (and its boards list)
    prisma.permission.upsert({
      where: { id: '00000000-0000-0000-0012-000000000005' },
      update: {},
      create: {
        id: '00000000-0000-0000-0012-000000000005',
        action: 'team:view',
        type: PermissionType.ALLOW,
        priority: 10,
        group_id: feAllGroup.id,
        description: 'All frontend team members can view the team',
      },
    }),
    // Team-wide: all backend members can view their team (and its boards list)
    prisma.permission.upsert({
      where: { id: '00000000-0000-0000-0012-000000000006' },
      update: {},
      create: {
        id: '00000000-0000-0000-0012-000000000006',
        action: 'team:view',
        type: PermissionType.ALLOW,
        priority: 10,
        group_id: beAllGroup.id,
        description: 'All backend team members can view the team',
      },
    }),
    // All frontend members can view Sprint board
    prisma.permission.upsert({
      where: { id: '00000000-0000-0000-0012-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0012-000000000001',
        action: 'board:view',
        type: PermissionType.ALLOW,
        priority: 10,
        group_id: feAllGroup.id,
        board_id: sprintBoard.id,
      },
    }),
    // Devs group can create tasks
    prisma.permission.upsert({
      where: { id: '00000000-0000-0000-0012-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0012-000000000002',
        action: 'task:create',
        type: PermissionType.ALLOW,
        priority: 20,
        group_id: feDevsGroup.id,
        board_id: sprintBoard.id,
      },
    }),
    // Backend all-members can view API board
    prisma.permission.upsert({
      where: { id: '00000000-0000-0000-0012-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0012-000000000003',
        action: 'board:view',
        type: PermissionType.ALLOW,
        priority: 10,
        group_id: beAllGroup.id,
        board_id: apiBoard.id,
      },
    }),
    // Team-wide fallback: frontend members can view any board in their team
    // (e.g. Design System board, which has no explicit board-level rule)
    prisma.permission.upsert({
      where: { id: '00000000-0000-0000-0012-000000000007' },
      update: {},
      create: {
        id: '00000000-0000-0000-0012-000000000007',
        action: 'board:view',
        type: PermissionType.ALLOW,
        priority: 5,
        group_id: feAllGroup.id,
        description: 'Frontend members can view any team board by default',
      },
    }),
    // Team-wide baseline grants for all members (view tasks/history, comment, toggle checklist items)
    ...['task:view', 'history:view', 'comment:create', 'comment:edit_own', 'comment:delete_own', 'checklist_item:toggle', 'checklist_item:mutate', 'attachment:upload']
      .flatMap((action, i) => [
        prisma.permission.upsert({
          where: { id: `00000000-0000-0000-0012-0000000000${(20 + i * 2).toString().padStart(2, '0')}` },
          update: {},
          create: {
            id: `00000000-0000-0000-0012-0000000000${(20 + i * 2).toString().padStart(2, '0')}`,
            action,
            type: PermissionType.ALLOW,
            priority: 5,
            group_id: feAllGroup.id,
            description: `Frontend members baseline: ${action}`,
          },
        }),
        prisma.permission.upsert({
          where: { id: `00000000-0000-0000-0012-0000000000${(21 + i * 2).toString().padStart(2, '0')}` },
          update: {},
          create: {
            id: `00000000-0000-0000-0012-0000000000${(21 + i * 2).toString().padStart(2, '0')}`,
            action,
            type: PermissionType.ALLOW,
            priority: 5,
            group_id: beAllGroup.id,
            description: `Backend members baseline: ${action}`,
          },
        }),
      ]),
    // Task-level permission — only devs can edit the login task
    prisma.permission.upsert({
      where: { id: '00000000-0000-0000-0012-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0012-000000000004',
        action: 'task:edit',
        type: PermissionType.ALLOW,
        priority: 30,
        group_id: feDevsGroup.id,
        task_id: loginTask.id,
        description: 'Only developers may edit this task',
      },
    }),
  ]);
  console.log('✓ Permissions');

  // ── Announcements ──────────────────────────────────────────────────────────
  await Promise.all([
    prisma.announcement.upsert({
      where: { id: '00000000-0000-0000-0013-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0013-000000000001',
        workspace_id: workspace.id,
        author_id: alice.id,
        title: 'Q3 Planning kickoff next Monday',
        body: 'Join us for the Q3 planning session — agenda and pre-reads will be shared by EOD Friday.',
      },
    }),
    prisma.announcement.upsert({
      where: { id: '00000000-0000-0000-0013-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0013-000000000002',
        workspace_id: workspace.id,
        author_id: bob.id,
        title: 'New design system release',
        body: 'The updated component library is now available — see the Design System board for details.',
      },
    }),
  ]);
  console.log('✓ Announcements');

  // ── CalendarEvents ─────────────────────────────────────────────────────────
  await Promise.all([
    prisma.calendarEvent.upsert({
      where: { id: '00000000-0000-0000-0014-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0014-000000000001',
        team_id: frontendTeam.id,
        title: 'Sprint 1 Review',
        starts_at: new Date('2026-06-12T15:00:00Z'),
        ends_at: new Date('2026-06-12T16:00:00Z'),
        color: '#4648d4',
      },
    }),
    prisma.calendarEvent.upsert({
      where: { id: '00000000-0000-0000-0014-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0014-000000000002',
        team_id: backendTeam.id,
        title: 'API Design Review',
        starts_at: new Date('2026-06-16T13:00:00Z'),
        ends_at: new Date('2026-06-16T14:30:00Z'),
        color: '#6366f1',
      },
    }),
  ]);
  console.log('✓ CalendarEvents');

  // ── Favorites ──────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.favorite.upsert({
      where: { user_id_board_id: { user_id: alice.id, board_id: sprintBoard.id } },
      update: {},
      create: { user_id: alice.id, board_id: sprintBoard.id },
    }),
    prisma.favorite.upsert({
      where: { user_id_board_id: { user_id: alice.id, board_id: designBoard.id } },
      update: {},
      create: { user_id: alice.id, board_id: designBoard.id },
    }),
    prisma.favorite.upsert({
      where: { user_id_board_id: { user_id: carol.id, board_id: sprintBoard.id } },
      update: {},
      create: { user_id: carol.id, board_id: sprintBoard.id },
    }),
  ]);
  console.log('✓ Favorites');

  // ── Notifications ──────────────────────────────────────────────────────────
  await Promise.all([
    prisma.notification.upsert({
      where: { id: '00000000-0000-0000-0015-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0015-000000000001',
        user_id: carol.id,
        message: 'Bob commented on "Implement login page"',
        link: `/boards/${sprintBoard.id}/tasks/${loginTask.id}`,
        is_read: false,
      },
    }),
    prisma.notification.upsert({
      where: { id: '00000000-0000-0000-0015-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0015-000000000002',
        user_id: carol.id,
        message: 'You were assigned to "Responsive navbar"',
        link: `/boards/${sprintBoard.id}/tasks/${navbarTask.id}`,
        is_read: true,
      },
    }),
    prisma.notification.upsert({
      where: { id: '00000000-0000-0000-0015-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0015-000000000003',
        user_id: alice.id,
        message: 'New announcement: "New design system release"',
        link: `/`,
        is_read: false,
      },
    }),
  ]);
  console.log('✓ Notifications');

  console.log('\nSeeding complete. All seeded users have password "password123".');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
