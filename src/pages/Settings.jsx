import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Settings() {
  const { showToast } = useApp();

  const [settings, setSettings] = useState({
    mockEsp32: true,
    mockIntervalSeconds: 10,
    historyDays: 20,
    soundAlerts: true,
    deviceId: 'ESP32-FOODGUARD',
    wifiSsid: 'FoodGuard_IoT_Net',
    ipAddress: '192.168.4.1',
    phCalibrationOffset: 0,
    tempOffset: 0
  });

  const [nodeVersion, setNodeVersion] = useState('v24.3.0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) {
          setSettings(j.data);
        }
      })
      .catch(() => {});

    fetch('/api/device')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.nodeVersion) {
          setNodeVersion(j.data.nodeVersion);
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
          ? (value === '' ? '' : parseFloat(value))
          : value
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        mockEsp32: settings.mockEsp32,
        mockIntervalSeconds: parseInt(settings.mockIntervalSeconds, 10),
        historyDays: parseInt(settings.historyDays, 10),
        soundAlerts: settings.soundAlerts,
        deviceId: settings.deviceId,
        wifiSsid: settings.wifiSsid,
        ipAddress: settings.ipAddress,
        phCalibrationOffset: parseFloat(settings.phCalibrationOffset || 0),
        tempOffset: parseFloat(settings.tempOffset || 0)
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        showToast('System configuration & hardware offsets saved successfully!', 'success');
      } else {
        showToast(json.message || 'Error saving settings', 'error');
      }
    } catch (err) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reseedDemoData = async () => {
    if (!window.confirm('Re-seed the database with 20 days of realistic multi-parameter sensor records?')) return;
    try {
      const res = await fetch('/api/readings/seed', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast(`Database reseeded with ${json.count} historical records!`, 'success');
      } else {
        showToast('Failed to seed database', 'error');
      }
    } catch (e) {
      showToast('Failed to seed database', 'error');
    }
  };

  const confirmClearHistory = async () => {
    if (
      !window.confirm(
        '⚠️ WARNING: This will permanently delete ALL recorded sensor readings from the database. Are you sure?'
      )
    ) {
      return;
    }
    try {
      const res = await fetch('/api/readings/clear', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('All historical readings cleared', 'info');
      } else {
        showToast('Failed to clear database', 'error');
      }
    } catch (e) {
      showToast('Failed to clear database', 'error');
    }
  };

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <h1>System Settings &amp; Calibration</h1>
          <p>
            Operational modes, sensor calibration offsets, simulator toggles, and data retention policies.
          </p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            💾 Save Settings
          </button>
        </div>
      </div>

      <div className="settings-grid-layout">
        {/* Settings Form Card */}
        <section className="card settings-card">
          <div className="card-header">
            <div className="card-title">
              <span>⚙</span>
              <b>Operational Configuration</b>
            </div>
            <span className="badge badge-emerald">Persisted</span>
          </div>

          <form id="settingsForm" onSubmit={handleSave}>
            <div className="setting-item">
              <div className="setting-text">
                <b>ESP32 Simulator (Mock Engine)</b>
                <p>Simulates continuous sensor telemetry when real ESP32 hardware is not currently streaming.</p>
              </div>
              <label className="switch-control">
                <input
                  type="checkbox"
                  id="setMockEsp32"
                  name="mockEsp32"
                  checked={settings.mockEsp32}
                  onChange={handleChange}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-text">
                <b>Simulator Interval (Seconds)</b>
                <p>Frequency in seconds at which the background simulator generates new food readings.</p>
              </div>
              <div className="setting-input">
                <input
                  type="number"
                  id="setMockInterval"
                  name="mockIntervalSeconds"
                  min="2"
                  max="300"
                  value={settings.mockIntervalSeconds}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '100px' }}
                />
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-text">
                <b>Historical Data Retention (Days)</b>
                <p>Sensor readings older than this threshold are purged during rolling cleanup.</p>
              </div>
              <div className="setting-input">
                <select
                  id="setHistoryDays"
                  name="historyDays"
                  className="form-control"
                  value={settings.historyDays}
                  onChange={handleChange}
                  style={{ width: '130px' }}
                >
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="20">20 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-text">
                <b>Audible Spoilage Buzzer Alarm</b>
                <p>Play browser alarm sound when a SPOILED reading is received.</p>
              </div>
              <label className="switch-control">
                <input
                  type="checkbox"
                  id="setSoundAlerts"
                  name="soundAlerts"
                  checked={settings.soundAlerts}
                  onChange={handleChange}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-text">
                <b>Device Identifier (Node Name)</b>
                <p>Unique hardware ID advertised by the ESP32 node.</p>
              </div>
              <div className="setting-input">
                <input
                  type="text"
                  id="setDeviceId"
                  name="deviceId"
                  value={settings.deviceId}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '220px' }}
                />
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-text">
                <b>Wi-Fi Network SSID</b>
                <p>Default access point name the device connects to.</p>
              </div>
              <div className="setting-input">
                <input
                  type="text"
                  id="setWifiSsid"
                  name="wifiSsid"
                  value={settings.wifiSsid}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '220px' }}
                />
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-text">
                <b>Local Server IP Address</b>
                <p>Host machine address for ESP32 HTTP POST target.</p>
              </div>
              <div className="setting-input">
                <input
                  type="text"
                  id="setIpAddress"
                  name="ipAddress"
                  value={settings.ipAddress}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '220px' }}
                />
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-text">
                <b>pH Sensor Calibration Offset</b>
                <p>Offset added to raw pH readings to correct probe drift (e.g. ±0.15).</p>
              </div>
              <div className="setting-input">
                <input
                  type="number"
                  id="setPhOffset"
                  name="phCalibrationOffset"
                  step="0.01"
                  value={settings.phCalibrationOffset}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '100px' }}
                />
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-text">
                <b>Temperature Sensor Offset (°C)</b>
                <p>Calibrated temperature compensation offset.</p>
              </div>
              <div className="setting-input">
                <input
                  type="number"
                  id="setTempOffset"
                  name="tempOffset"
                  step="0.1"
                  value={settings.tempOffset}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '100px' }}
                />
              </div>
            </div>

            <div className="form-submit-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                💾 Save All Settings
              </button>
            </div>
          </form>
        </section>

        {/* Database Maintenance Card */}
        <section className="card db-card">
          <div className="card-header">
            <div className="card-title">
              <span>🗄️</span>
              <b>Database Operations &amp; Demo Seeding</b>
            </div>
          </div>

          <div className="db-actions-list">
            <div className="db-action-item">
              <div>
                <b>Re-Seed Realistic Demo Data</b>
                <p className="text-muted">
                  Generates 20 days of historical sensor readings across all 5 food categories for testing and demonstrations.
                </p>
              </div>
              <button className="btn btn-emerald" onClick={reseedDemoData}>
                🌱 Re-Seed Data
              </button>
            </div>

            <div className="db-action-item">
              <div>
                <b>Full JSON Database Backup</b>
                <p className="text-muted">
                  Download all stored sensor records in JSON format for offline backup or research analysis.
                </p>
              </div>
              <a href="/api/history" className="btn btn-outline" target="_blank" rel="noreferrer">
                ⇩ Download JSON
              </a>
            </div>

            <div className="db-action-item">
              <div>
                <b>Wipe Database (Clear All Readings)</b>
                <p className="text-muted">
                  Permanently deletes all historical readings from the local store. Useful before starting a fresh hardware test session.
                </p>
              </div>
              <button className="btn btn-outline-danger" onClick={confirmClearHistory}>
                🗑️ Wipe Database
              </button>
            </div>
          </div>

          <div className="system-meta-box">
            <small className="text-muted">SYSTEM TELEMETRY</small>
            <div className="meta-row">
              <span>Node.js:</span>
              <b>{nodeVersion}</b>
            </div>
            <div className="meta-row">
              <span>Storage Engine:</span>
              <b>Local Atomic JSON Store</b>
            </div>
            <div className="meta-row">
              <span>Hardware Ingestion:</span>
              <code>POST /api/sensor-data</code>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
