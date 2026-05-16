import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import Avatar from "../components/Avatar";
import { IconCalendar, IconPlus, IconTrash, IconUsers } from "../components/Icons";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import {
  formatDate,
  isOverdue,
  priorityBadgeClass,
  roleLabel,
} from "../utils/format";
import { notifyTasksUpdated } from "../utils/taskEvents";

const COLUMNS = [
  { key: "TODO", label: "To Do", color: "slate" },
  { key: "IN_PROGRESS", label: "In Progress", color: "amber" },
  { key: "DONE", label: "Done", color: "green" },
];

function TaskCard({
  task,
  isAdmin,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
  canDrag,
}) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <article
      className={`task-card ${isDragging ? "task-card-dragging" : ""} ${
        overdue ? "task-card-overdue" : ""
      }`}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
    >
      <div className="task-card-top">
        <h4>{task.title}</h4>
        {isAdmin && (
          <button
            type="button"
            className="btn-icon danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Delete task"
          >
            <IconTrash />
          </button>
        )}
      </div>
      {task.description && <p className="task-desc">{task.description}</p>}
      <div className="task-card-footer">
        <span className={priorityBadgeClass(task.priority)}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className={`task-due ${overdue ? "task-due-overdue" : ""}`}>
            <IconCalendar />
            {formatDate(task.dueDate)}
            {overdue && " · Overdue"}
          </span>
        )}
      </div>
      <div className="task-assignee">
        {task.assignee ? (
          <>
            <Avatar name={task.assignee.name} size="xs" />
            <span>{task.assignee.name}</span>
          </>
        ) : (
          <span className="task-unassigned">Unassigned</span>
        )}
      </div>
    </article>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const draggedTaskRef = useRef(null);

  const [taskModal, setTaskModal] = useState(false);
  const [memberModal, setMemberModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberError, setMemberError] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const isAdmin = project?.role === "ADMIN";

  const canDragTask = (task) => {
    if (isAdmin) return true;
    return task.assigneeId === user?.id;
  };

  const updateTaskStatus = async (taskId, status) => {
    const prev = project.tasks.find((t) => t.id === taskId);
    if (!prev || prev.status === status || updating) return;

    setUpdating(true);
    setError("");

    setProject((p) => ({
      ...p,
      tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    }));

    try {
      const { data } = await api.patch(`/tasks/${taskId}`, { status });
      setProject((p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === taskId ? data : t)),
      }));
      notifyTasksUpdated();
    } catch (err) {
      setProject((p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === taskId ? prev : t)),
      }));
      setError(err.response?.data?.error || "Failed to update task");
    } finally {
      setUpdating(false);
    }
  };

  const handleDragStart = (e, task) => {
    if (!canDragTask(task)) {
      e.preventDefault();
      return;
    }
    draggedTaskRef.current = task;
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.setData("application/task-id", task.id);
    requestAnimationFrame(() => {
      e.currentTarget?.classList.add("task-card-dragging");
    });
  };

  const handleDragEnd = (e) => {
    e.currentTarget?.classList.remove("task-card-dragging");
    draggedTaskRef.current = null;
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleColumnDragOver = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnKey);
  };

  const handleColumnDragLeave = (e, columnKey) => {
    const related = e.relatedTarget;
    if (related && e.currentTarget.contains(related)) return;
    if (dragOverColumn === columnKey) setDragOverColumn(null);
  };

  const handleColumnDrop = (e, status) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);

    const taskId =
      e.dataTransfer.getData("application/task-id") ||
      e.dataTransfer.getData("text/plain");
    const task =
      project?.tasks.find((t) => t.id === taskId) || draggedTaskRef.current;

    if (!task || task.status === status) {
      draggedTaskRef.current = null;
      setDraggedTask(null);
      return;
    }

    if (!canDragTask(task)) {
      setError("You can only move tasks assigned to you");
      return;
    }

    updateTaskStatus(task.id, status);
    draggedTaskRef.current = null;
    setDraggedTask(null);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmittingTask(true);
    setError("");
    try {
      const { data } = await api.post(`/projects/${id}/tasks`, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        dueDate: taskDueDate || null,
        priority: taskPriority,
        assigneeId: taskAssigneeId || null,
      });
      setProject((prev) => ({
        ...prev,
        tasks: [data, ...prev.tasks],
        taskCount: prev.taskCount + 1,
      }));
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");
      setTaskPriority("MEDIUM");
      setTaskAssigneeId("");
      setTaskModal(false);
      notifyTasksUpdated();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create task");
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setProject((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId),
        taskCount: Math.max(0, prev.taskCount - 1),
      }));
      notifyTasksUpdated();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete task");
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError("");
    try {
      const { data } = await api.post(`/projects/${id}/members`, {
        email: memberEmail,
        role: "MEMBER",
      });
      setProject((prev) => ({
        ...prev,
        members: [...prev.members, data],
        memberCount: prev.memberCount + 1,
      }));
      setMemberEmail("");
    } catch (err) {
      setMemberError(err.response?.data?.error || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Remove this member from the project?")) return;
    setMemberError("");
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setProject((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.userId !== userId),
        memberCount: prev.memberCount - 1,
      }));
    } catch (err) {
      setMemberError(err.response?.data?.error || "Failed to remove member");
    }
  };

  if (loading) return <div className="page-loading">Loading project…</div>;
  if (!project) {
    return <div className="alert alert-error">{error || "Project not found"}</div>;
  }

  const tasksByStatus = (status) =>
    project.tasks.filter((t) => t.status === status);

  return (
    <div className="page page-detail">
      <header className="page-header">
        <Link to="/projects" className="back-link">
          ← Projects
        </Link>
        <div className="detail-header">
          <div>
            <h1>{project.name}</h1>
            {project.description && (
              <p className="page-subtitle">{project.description}</p>
            )}
            <div className="detail-meta">
              <span>
                <IconUsers /> {project.memberCount} members
              </span>
              <span>
                {isAdmin
                  ? `${project.taskCount} tasks`
                  : `${project.tasks.length} tasks assigned to you`}
              </span>
            </div>
          </div>
          <div className="detail-actions">
            <span className={`role-badge ${project.role.toLowerCase()}`}>
              {roleLabel(project.role)}
            </span>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setMemberError("");
                  setMemberModal(true);
                }}
              >
                <IconUsers /> Members
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setTaskModal(true)}
              >
                <IconPlus /> Add Task
              </button>
            )}
          </div>
        </div>
      </header>

      {!isAdmin && (
        <p className="member-hint">
          You are viewing tasks assigned to you. Drag cards to update status.
        </p>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <section className="kanban-board">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className={`kanban-column col-${col.color} ${
              dragOverColumn === col.key ? "kanban-column-dragover" : ""
            }`}
            onDragOver={(e) => handleColumnDragOver(e, col.key)}
            onDragLeave={(e) => handleColumnDragLeave(e, col.key)}
            onDrop={(e) => handleColumnDrop(e, col.key)}
          >
            <div className="kanban-col-header">
              <h3>{col.label}</h3>
              <span className="col-count">{tasksByStatus(col.key).length}</span>
            </div>
            <div
              className="kanban-tasks"
              onDragOver={(e) => handleColumnDragOver(e, col.key)}
              onDrop={(e) => handleColumnDrop(e, col.key)}
            >
              {tasksByStatus(col.key).length === 0 && !draggedTask && (
                <p className="kanban-empty">Drop tasks here</p>
              )}
              {tasksByStatus(col.key).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isAdmin={isAdmin}
                  canDrag={canDragTask(task)}
                  onDelete={handleDeleteTask}
                  isDragging={draggedTask?.id === task.id}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Add Task">
        <form onSubmit={handleCreateTask} className="form">
          <label>
            Title
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              required
              placeholder="What needs to be done?"
            />
          </label>
          <label>
            Description
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={3}
              placeholder="Add details (optional)"
            />
          </label>
          <div className="form-row">
            <label>
              Due date
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </label>
            <label>
              Priority
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
          </div>
          <label>
            Assignee
            <select
              value={taskAssigneeId}
              onChange={(e) => setTaskAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {project.members.map((m) => (
                <option key={m.userId} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </label>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTaskModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingTask}
            >
              {submittingTask ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={memberModal}
        onClose={() => setMemberModal(false)}
        title="Manage Members"
      >
        {isAdmin && (
          <form onSubmit={handleAddMember} className="form member-add-form">
            <label>
              Add by email
              <div className="input-row">
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                />
                <button type="submit" className="btn btn-primary">
                  Add
                </button>
              </div>
            </label>
          </form>
        )}
        {memberError && <div className="alert alert-error">{memberError}</div>}
        <ul className="members-modal-list">
          {project.members.map((m) => (
            <li key={m.userId} className="member-item">
              <Avatar name={m.user.name} size="md" />
              <div className="member-info">
                <p className="member-name">{m.user.name}</p>
                <p className="member-email">{m.user.email}</p>
              </div>
              <span className={`role-badge ${m.role.toLowerCase()}`}>
                {roleLabel(m.role)}
              </span>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-icon danger"
                  onClick={() => handleRemoveMember(m.userId)}
                  title="Remove member"
                >
                  <IconTrash />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setMemberModal(false)}
          >
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}
