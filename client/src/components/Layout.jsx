import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconDashboard,
  IconLogout,
  IconProjects,
} from "./Icons";
import Logo from "./Logo";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Logo size="lg" />
          <nav className="sidebar-nav">
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              <IconDashboard />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/projects" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} end>
              <IconProjects />
              <span>Projects</span>
            </NavLink>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="user-block">
            <span className="user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</span>
            <div>
              <p className="user-name">{user?.name}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button type="button" className="btn-logout" onClick={logout}>
            <IconLogout />
            <span>Log out</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
