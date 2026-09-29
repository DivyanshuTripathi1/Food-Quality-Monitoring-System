import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function CertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { device, showToast } = useApp();

  const [row, setRow] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/readings/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setRow(json.data);
          setProfile(json.profile);
        } else {
          setRow(null);
        }
      })
      .catch(e => {
        console.error(e);
        setRow(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this certificate and inspection record?')) return;
    try {
      const res = await fetch(`/api/readings/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Record deleted successfully', 'success');
        navigate('/history');
      } else {
        showToast(json.message || 'Delete failed', 'error');
      }
    } catch (e) {
      showToast('Failed to delete reading', 'error');
    }
  };

  if (loading) {
    return (
      <section className="content">
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <p className="text-muted">Loading Certificate...</p>
        </div>
      </section>
    );
  }

  if (!row) {
    return (
      <section className="content">
        <div className="card empty-certificate">
          <h2>Record Not Found</h2>
          <p className="text-muted">The requested sensor reading could not be located in the database.</p>
          <Link to="/history" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Return to History
          </Link>
        </div>
      </section>
    );
  }

  const params = row.parameters && row.parameters.length > 0
    ? row.parameters
    : [
        {
          name: 'pH Level',
          value: row.ph,
          safeRange: profile ? `${profile.phMin} – ${profile.phMax}` : '6.4 – 6.8',
          status: row.ph >= (profile?.phMin || 6.4) && row.ph <= (profile?.phMax || 6.8) ? 'SAFE' : 'WARNING'
        },
        {
          name: 'Gas (MQ-135)',
          value: `${row.gas} ppm`,
          safeRange: `< ${profile ? profile.gasMax : 180} ppm`,
          status: row.gas <= (profile?.gasMax || 180) ? 'SAFE' : 'DANGER'
        },
        {
          name: 'Temperature',
          value: `${row.temperature} °C`,
          safeRange: `≤ ${profile ? profile.tempMax : 7.0} °C`,
          status: row.temperature <= (profile?.tempMax || 7.0) ? 'SAFE' : 'WARNING'
        },
        {
          name: 'Relative Humidity',
          value: `${row.humidity} %`,
          safeRange: profile ? `${profile.humidityMin} – ${profile.humidityMax}%` : '50 – 75%',
          status: 'SAFE'
        },
        {
          name: 'TDS Solids',
          value: row.tds,
          safeRange: `≤ ${profile ? profile.tdsMax : 6.0}`,
          status: 'SAFE'
        },
        {
          name: 'Optical Color',
          value: row.color || 'Normal',
          safeRange: profile?.expectedColor || 'Normal',
          status: row.color && row.color.toLowerCase().includes('yellow') ? 'WARNING' : 'SAFE'
        }
      ];

  const statusLower = (row.status || 'fresh').toLowerCase();

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <h1>Quality Inspection Certificate</h1>
          <p>Comprehensive sensor verification report and compliance audit.</p>
        </div>
        <div className="heading-actions">
          <Link to="/history" className="btn btn-outline">
            ← Back to History
          </Link>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ Print Certificate
          </button>
          <button className="btn btn-outline-danger" onClick={handleDelete}>
            🗑️ Delete Record
          </button>
        </div>
      </div>

      {/* Official Certificate Card */}
      <section className="card certificate-sheet" id="certificateSheet">
        <div className="certificate-top">
          <div className="cert-brand">
            <span className="cert-leaf">🍃</span>
            <div>
              <h2>FoodGuard IoT Inspection Lab</h2>
              <small>Multi-Parameter Food Quality &amp; Safety Analysis Certificate</small>
            </div>
          </div>
          <div className="cert-meta">
            <div><span>Certificate ID:</span> <code>{row.id}</code></div>
            <div><span>Timestamp:</span> <b>{new Date(row.timestamp).toLocaleString('en-IN')}</b></div>
            <div><span>Source:</span> <span className="badge badge-source">{row.source || 'ESP32'}</span></div>
          </div>
        </div>

        <div className="certificate-divider"></div>

        <div className="cert-hero">
          <div className="cert-food-title">
            <span className="cert-food-icon">{profile ? profile.icon : '🍽️'}</span>
            <div>
              <h3>{profile ? profile.name : row.foodType}</h3>
              <p className="text-muted">{profile ? profile.description : 'Standard food sample.'}</p>
            </div>
          </div>

          <div className={`cert-verdict-seal ${statusLower}`}>
            <div className="seal-score">
              <b>{row.qualityScore}</b>
              <small>/ 100</small>
            </div>
            <div className="seal-status">{row.status}</div>
          </div>
        </div>

        {/* Parameter Breakdown Table */}
        <h4 className="cert-section-title">Physicochemical &amp; Gas Sensor Breakdown</h4>
        <div className="table-wrap">
          <table className="cert-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Measured Value</th>
                <th>Target Reference Range</th>
                <th>Compliance Status</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p, idx) => (
                <tr key={idx}>
                  <td><b>{p.name}</b></td>
                  <td><code>{p.value}</code></td>
                  <td>{p.safeRange}</td>
                  <td>
                    <span className={`status-chip ${p.status.toLowerCase()}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Evaluation Reasons & Diagnostics */}
        <div className="cert-diagnostics">
          <h4 className="cert-section-title">Diagnostic Findings</h4>
          {row.reasons && row.reasons.length > 0 ? (
            <ul className="reasons-list">
              {row.reasons.map((r, i) => (
                <li key={i} className="reason-item text-amber">⚠️ {r}</li>
              ))}
            </ul>
          ) : (
            <p className="text-emerald">✓ All monitored physical and chemical markers are in full compliance with the reference profile standards.</p>
          )}
        </div>

        {/* Recommendations */}
        <div className="cert-recommendations">
          <h4 className="cert-section-title">Recommended Storage &amp; Handling Action</h4>
          <div className={`recommendation-box ${statusLower}`}>
            <p>
              {row.recommendation || (row.status === 'FRESH'
                ? 'Sample quality is optimal. Safe for distribution and direct consumption.'
                : row.status === 'WARNING'
                ? 'Sample exhibits early degradation signs or cold chain deviation. Inspect organoleptic properties before use.'
                : 'CRITICAL HAZARD: Spoilage vapors or chemical degradation detected. Condemn and discard immediately.')}
            </p>
          </div>
        </div>

        <div className="cert-footer">
          <div className="cert-sign">
            <span className="sign-line"></span>
            <small>Automated IoT Sensor Telemetry Verification</small>
          </div>
          <div className="cert-date">
            <small>Verified on Node: {device?.id || 'ESP32-FOODGUARD'}</small>
          </div>
        </div>
      </section>
    </section>
  );
}
