import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Sidebar() {
  const {
    sidebarOpen,
    closeSidebar,
    device,
    triggerQuickRead,
    triggerQuickAnomaly
  } = useApp();

  const isMock = device?.mode?.includes('MOCK');

  return (
    <>
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`} id="sidebar">
        <div className="brand">
          <div className="brand-mark">🍃</div>
          <div className="brand-text">
            <strong>FoodGuard</strong>
            <span>Smart IoT Quality Monitor</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="nav-icon">⌂</span>
          <span className="nav-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/live"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="nav-icon">▥</span>
          <span className="nav-label">Live Monitoring</span>
          <span className="pulse-dot" title="Live stream active"></span>
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="nav-icon">◷</span>
          <span className="nav-label">Test History</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="nav-icon">⌁</span>
          <span className="nav-label">Analytics</span>
        </NavLink>

        <NavLink
          to="/food-types"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="nav-icon">◇</span>
          <span className="nav-label">Food Profiles</span>
        </NavLink>

        <NavLink
          to="/device"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="nav-icon">⚡</span>
          <span className="nav-label">Device &amp; ESP32</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="nav-icon">⚙</span>
          <span className="nav-label">Settings</span>
        </NavLink>

        <NavLink
          to="/about"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={closeSidebar}
        >
          <span className="nav-icon">👥</span>
          <span className="nav-label">About Us</span>
        </NavLink>
      </nav>

      <div className="sidebar-widget">
        <div className="widget-header">
          <span>SIMULATOR STATUS</span>
          <span className={`badge ${isMock ? 'badge-demo' : 'badge-hw'}`}>
            {isMock ? 'DEMO' : 'ESP32'}
          </span>
        </div>
        <div className="widget-body">
          <div className="widget-row">
            <span>Active Node:</span>
            <b>{device?.id || 'ESP32-FOODGUARD'}</b>
          </div>
          <div className="widget-row">
            <span>Status:</span>
            <b className="text-green">● Connected</b>
          </div>
        </div>
        <div className="widget-actions">
          <button
            className="btn-xs btn-outline-white"
            id="sidebarReadBtn"
            onClick={() => triggerQuickRead()}
          >
            ⚡ Read Sensor
          </button>
          <button
            className="btn-xs btn-outline-amber"
            id="sidebarAnomalyBtn"
            onClick={() => triggerQuickAnomaly()}
          >
            ⚠️ Anomaly
          </button>
        </div>
      </div>

      <div className="sidebar-footer">
        <p>Multi-Parameter Food Quality System</p>
        <small>IoT &amp; Sensor Analytics · v1.5</small>
      </div>
    </aside>
    </>
  );
}
