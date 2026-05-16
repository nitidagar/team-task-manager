const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.userId },
      include: {
        project: {
          include: {
            tasks: {
              include: {
                assignee: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
              },
            },
            _count: { select: { members: true, tasks: true } },
          },
        },
      },
      orderBy: { project: { createdAt: "desc" } },
    });

    const tasks = memberships.flatMap((m) => m.project.tasks);
    const now = new Date();

    const byStatus = {
      TODO: tasks.filter((t) => t.status === "TODO").length,
      IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      DONE: tasks.filter((t) => t.status === "DONE").length,
    };

    const userCounts = {};
    for (const task of tasks) {
      const key = task.assignee?.name || "Unassigned";
      userCounts[key] = (userCounts[key] || 0) + 1;
    }

    const byUser = Object.entries(userCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const overdue = tasks
      .filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== "DONE"
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
        projectId: t.projectId,
        projectName: t.project.name,
        assignee: t.assignee,
      }))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const projects = memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      description: m.project.description,
      role: m.role,
      createdAt: m.project.createdAt,
      memberCount: m.project._count.members,
      taskCount: m.project._count.tasks,
    }));

    res.json({
      user,
      totalTasks: tasks.length,
      byStatus,
      byUser,
      overdue,
      projects,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
