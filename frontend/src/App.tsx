import { Link, Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark">SW</span>
          <span className="brand-name">Sweepstakes</span>
        </Link>
        <Link to="/" className="btn btn-ghost">
          New sweepstake
        </Link>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        Fair, seeded draws. Self-hosted with Docker.
      </footer>
    </div>
  );
}
