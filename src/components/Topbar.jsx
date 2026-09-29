import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Topbar({ title = 'Smart Food Quality Dashboard' }) {
  const {
    device,
    pingLatency,
    pingDevice,
    soundAlerts,
    toggleSoundAlerts,
    theme,
    toggleTheme,
    toggleSidebar
  } = useApp();

  const isMock = device?.mode?.includes('MOCK');

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-toggle"
          id="mobileMenuBtn"
          aria-label="Toggle navigation"
          onClick={toggleSidebar}
        >
          ☰
        </button>
        <div className="crumb">
          <span className="crumb-icon">🍃</span>
          <span className="crumb-title">{title}</span>
        </div>
      </div>

      <div className="topbar-right">
        <div
          className="device-pill"
          id="topbarDevicePill"
          title="Click to test device ping"
          onClick={pingDevice}
          style={{ cursor: 'pointer' }}
        >
          <i className="status-pulse"></i>
          <span className="pill-title">{isMock ? 'ESP32 Sim' : 'ESP32 HW'}</span>
          <span className="pill-badge" id="topbarPingLabel">{pingLatency}</span>
        </div>

        <button
          className="topbar-btn"
          id="soundToggleBtn"
          onClick={toggleSoundAlerts}
          title="Toggle spoilage alarm sound"
        >
          <span id="soundIcon">{soundAlerts ? '🔔' : '🔕'}</span>
        </button>

        <button
          className="topbar-btn"
          id="themeToggleBtn"
          onClick={toggleTheme}
          title="Toggle Dark/Light Mode"
        >
          <span id="themeIcon">{theme === 'dark' ? '☀️' : '🌓'}</span>
        </button>

        <Link to="/about" className="profile-card" title="View Developers & Project Team">
          <div className="avatar" style={{ background: 'linear-gradient(135deg, #0f766e, #10b981)' }}>
            DT
          </div>
          <div className="profile-details">
            <b>Divyanshu &amp; Pranjal</b>
            <small>Developers &amp; Team ↗</small>
          </div>
        </Link>
      </div>
    </header>
  );
}
