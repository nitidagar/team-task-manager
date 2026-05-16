import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/axios";
import { IconAlert, IconTasks, IconUsers } from "../components/Icons";
import { formatDate } from "../utils/format";
import { subscribeTasksUpdated } from "../utils/taskEvents";

const STAT_CARDS = [
  { key: "total", label: "Total Tasks", color: "blue", icon: "📋" },
  { key: "TODO", label: "To Do", color: "slate", icon: "○" },
  { key: "IN_PROGRESS", label: "In Progress", color: "amber", icon: "◐" },
  { key: "DONE", label: "Done", color: "green", icon: "✓" },
];

const STATUS_CHART = [
  { name: "To Do", key: "TODO", color: "#64748b" },
  { name: "In Progress", key: "IN_PROGRESS", color: "#f59e0b" },
  { name: "Done", key: "DONE", color: "#22c55e" },
];

export default function Dashboard() {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: d } = await api.get("/dashboard");
      setData(d);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load dashboard");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, location.pathname]);

  useEffect(() => {
    const unsubscribe = subscribeTasksUpdated(() => {
      fetchDashboard(true);
    });
    return unsubscribe;
  }, [fetchDashboard]);

  if (loading && !data) {
    return <div className="page-loading">Loading dashboard…</div>;
  }
  if (error && !data) {
    return <div className="alert alert-error">{error}</div>;
  }
  if (!data) return null;

  const { user, totalTasks, byStatus, byUser, overdue, projects } = data;

  const statValues = {
    total: totalTasks,
    TODO: byStatus.TODO ?? 0,
    IN_PROGRESS: byStatus.IN_PROGRESS ?? 0,
    DONE: byStatus.DONE ?? 0,
  };

  const barData = byUser.map((row) => ({
    name: row.name.length > 12 ? `${row.name.slice(0, 12)}…` : row.name,
    fullName: row.name,
    count: row.count,
  }));

  const pieData = STATUS_CHART.map((s) => ({
    name: s.name,
    value: byStatus[s.key] || 0,
    color: s.color,
  })).filter((d) => d.value > 0);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Good day, {user.name.split(" ")[0]} 👋</h1>
        <p className="page-subtitle">
          Here&apos;s what&apos;s happening across your projects
        </p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="stats-grid">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className={`stat-card stat-${card.color}`}>
            <div className="stat-icon">{card.icon}</div>
            <div>
              <p className="stat-label">{card.label}</p>
              <p className="stat-value">{statValues[card.key]}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="charts-grid">
        <div className="card panel chart-panel">
          <h2>Tasks per assignee</h2>
          {barData.length === 0 ? (
            <p className="empty-hint">No assigned tasks yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={barData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [value, "Tasks"]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullName || ""
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card panel chart-panel">
          <h2>Tasks by status</h2>
          {totalTasks === 0 ? (
            <p className="empty-hint">No tasks yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, "Tasks"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value) => (
                    <span style={{ color: "#64748b", fontSize: 13 }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="card panel">
        <div className="panel-header">
          <h2>
            <IconAlert /> Overdue Tasks
          </h2>
          <span className="count-badge danger">{overdue.length}</span>
        </div>
        {overdue.length === 0 ? (
          <p className="empty-hint">No overdue tasks — great work!</p>
        ) : (
          <ul className="overdue-list">
            {overdue.map((task) => (
              <li key={task.id}>
                <Link
                  to={`/projects/${task.projectId}`}
                  className="overdue-item"
                >
                  <div>
                    <p className="overdue-title">{task.title}</p>
                    <p className="overdue-meta">
                      {task.projectName} · Due {formatDate(task.dueDate)}
                    </p>
                  </div>
                  <span
                    className={`priority-badge ${task.priority.toLowerCase()}`}
                  >
                    {task.priority}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="section-header">
          <h2>Recent Projects</h2>
          <Link to="/projects" className="link-btn">
            View all →
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="card empty-state">
            <p>No projects yet.</p>
            <Link to="/projects" className="btn btn-primary">
              Create a project
            </Link>
          </div>
        ) : (
          <div className="project-grid">
            {projects.slice(0, 6).map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
                <div className="project-card-top">
                  <h3>{p.name}</h3>
                  <span className={`role-badge ${p.role.toLowerCase()}`}>
                    {p.role === "ADMIN" ? "Admin" : "Member"}
                  </span>
                </div>
                {p.description && (
                  <p className="project-card-desc">{p.description}</p>
                )}
                <div className="project-card-meta">
                  <span>
                    <IconUsers /> {p.memberCount} members
                  </span>
                  <span>
                    <IconTasks /> {p.taskCount} tasks
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
