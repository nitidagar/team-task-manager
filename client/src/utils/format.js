export function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(dueDate, status) {
  if (!dueDate || status === "DONE") return false;
  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

export function priorityClass(priority) {
  return `priority-${(priority || "MEDIUM").toLowerCase()}`;
}

export function priorityBadgeClass(priority) {
  const p = (priority || "MEDIUM").toLowerCase();
  if (p === "high") return "priority-badge high";
  if (p === "low") return "priority-badge low";
  return "priority-badge medium";
}

export function roleLabel(role) {
  return role === "ADMIN" ? "Admin" : "Member";
}

export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
