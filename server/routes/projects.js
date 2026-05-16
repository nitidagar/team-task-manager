const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");

const router = express.Router();

async function getMembership(userId, projectId) {
  return prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
}

router.get("/", auth, async (req, res) => {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.userId },
      include: {
        project: {
          include: {
            _count: { select: { members: true, tasks: true } },
          },
        },
      },
      orderBy: { project: { createdAt: "desc" } },
    });

    res.json(
      memberships.map((m) => ({
        id: m.project.id,
        name: m.project.name,
        description: m.project.description,
        createdAt: m.project.createdAt,
        role: m.role,
        memberCount: m.project._count.members,
        taskCount: m.project._count.tasks,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        members: {
          create: {
            userId: req.user.userId,
            role: "ADMIN",
          },
        },
      },
      include: {
        _count: { select: { members: true, tasks: true } },
      },
    });

    res.status(201).json({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      role: "ADMIN",
      memberCount: project._count.members,
      taskCount: project._count.tasks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const membership = await getMembership(req.user.userId, req.params.id);
    if (!membership) {
      return res.status(403).json({ error: "Access denied" });
    }

    const taskFilter =
      membership.role === "MEMBER"
        ? { assigneeId: req.user.userId }
        : {};

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: {
          where: taskFilter,
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { members: true, tasks: true } },
      },
    });

    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      role: membership.role,
      memberCount: project._count.members,
      taskCount: project._count.tasks,
      tasks: project.tasks,
      members: project.members,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/members", auth, async (req, res) => {
  try {
    const membership = await getMembership(req.user.userId, req.params.id);
    if (!membership || membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = await getMembership(user.id, req.params.id);
    if (existing) {
      return res.status(400).json({ error: "User is already a member" });
    }

    const member = await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId: req.params.id,
        role: role === "ADMIN" ? "ADMIN" : "MEMBER",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/members/:userId", auth, async (req, res) => {
  try {
    const membership = await getMembership(req.user.userId, req.params.id);
    if (!membership || membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const target = await getMembership(req.params.userId, req.params.id);
    if (!target) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (target.role === "ADMIN") {
      const adminCount = await prisma.projectMember.count({
        where: { projectId: req.params.id, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return res
          .status(400)
          .json({ error: "Cannot remove the only admin" });
      }
    }

    await prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId: req.params.userId,
          projectId: req.params.id,
        },
      },
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
