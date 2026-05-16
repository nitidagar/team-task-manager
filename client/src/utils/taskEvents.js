const TASKS_UPDATED = "tasks-updated";

export function notifyTasksUpdated() {
  window.dispatchEvent(new CustomEvent(TASKS_UPDATED));
}

export function subscribeTasksUpdated(handler) {
  window.addEventListener(TASKS_UPDATED, handler);
  return () => window.removeEventListener(TASKS_UPDATED, handler);
}
