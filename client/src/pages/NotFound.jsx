import { Link } from "react-router-dom";
import Logo from "../components/Logo";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <Logo size="lg" />
        <p className="not-found-code">404</p>
        <h1>Page not found</h1>
        <p className="not-found-text">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="not-found-actions">
          <Link to="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
          <Link to="/login" className="btn btn-secondary">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
