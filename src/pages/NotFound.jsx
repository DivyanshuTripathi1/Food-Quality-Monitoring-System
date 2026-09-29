import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="content">
      <div className="card error-page">
        <div className="error-emoji">🍃 404</div>
        <h1>Page Not Found</h1>
        <p className="text-muted">The food monitoring view or endpoint you requested does not exist.</p>
        <div className="error-actions" style={{ marginTop: '24px' }}>
          <Link to="/" className="btn btn-primary">Return to Dashboard</Link>
          <Link to="/live" className="btn btn-outline">Live Monitoring</Link>
          <Link to="/history" className="btn btn-outline">Test History</Link>
        </div>
      </div>
    </section>
  );
}
