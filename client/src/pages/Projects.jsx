import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { IconPlus, IconTasks, IconUsers } from "../components/Icons";
import Modal from "../components/Modal";
import { roleLabel } from "../utils/format";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/projects", { name, description });
      setProjects((prev) => [data, ...prev]);
      setName("");
      setDescription("");
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header row">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle">Manage and collaborate on team projects</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModalOpen(true)}
        >
          <IconPlus /> Create Project
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loading">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="card empty-state">
          <h3>No projects yet</h3>
          <p>Create your first project to start organizing tasks.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
          >
            <IconPlus /> Create Project
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="project-card"
            >
              <div className="project-card-top">
                <h3>{project.name}</h3>
                <span className={`role-badge ${project.role.toLowerCase()}`}>
                  {roleLabel(project.role)}
                </span>
              </div>
              {project.description && (
                <p className="project-card-desc">{project.description}</p>
              )}
              <div className="project-card-meta">
                <span>
                  <IconUsers /> {project.memberCount} members
                </span>
                <span>
                  <IconTasks /> {project.taskCount} tasks
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Project"
      >
        <form onSubmit={handleCreate} className="form">
          <label>
            Project name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Website Redesign"
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
            />
          </label>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
