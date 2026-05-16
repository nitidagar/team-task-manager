const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");

const router = express.Router();

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const VALID_STATUSES = ["TODO", "IN_PROGRESS", "DONE"];

async function getTaskWithMembership(userId, taskId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, assigneeId: true },
  });
  if (!task) return null;

  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId: task.projectId } },
  });

  if (!membership) return null;
  return { task, membership };
}

router.post("/projects/:id/tasks", auth, async (req, res) => {
  try {
    const membership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: req.user.userId,
          projectId: req.params.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { title, description, dueDate, priority, assigneeId } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Task title is required" });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }

    if (assigneeId) {
      const assigneeMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: assigneeId, projectId: req.params.id },
        },
      });
      if (!assigneeMember) {
        return res
          .status(400)
          .json({ error: "Assignee must be a project member" });
      }
    }

    const task = await prisma.task.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority && VALID_PRIORITIES.includes(priority) ? priority : "MEDIUM",
        projectId: req.params.id,
        assigneeId: assigneeId || null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tasks/:id", auth, async (req, res) => {
  try {
    const result = await getTaskWithMembership(req.user.userId, req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Task not found" });
    }

    const { task, membership } = result;
    const { status, title, description, dueDate, priority, assigneeId } =
      req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }

    let data;

    if (membership.role === "ADMIN") {
      data = {
        ...(status && { status }),
        ...(title !== undefined && { title: String(title).trim() }),
        ...(description !== undefined && {
          description: description ? String(description).trim() : null,
        }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(priority && { priority }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      };
    } else {
      const extraFields = [
        "title",
        "description",
        "dueDate",
        "priority",
        "assigneeId",
      ].filter((f) => req.body[f] !== undefined);
      if (extraFields.length > 0) {
        return res
          .status(403)
          .json({ error: "Members can only update task status" });
      }
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      if (task.assigneeId !== req.user.userId) {
        return res.status(403).json({
          error: "You can only update tasks assigned to you",
        });
      }
      data = { status };
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    if (data.assigneeId) {
      const assigneeMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: data.assigneeId,
            projectId: task.projectId,
          },
        },
      });
      if (!assigneeMember) {
        return res
          .status(400)
          .json({ error: "Assignee must be a project member" });
      }
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tasks/:id", auth, async (req, res) => {
  try {
    const result = await getTaskWithMembership(req.user.userId, req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (result.membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
