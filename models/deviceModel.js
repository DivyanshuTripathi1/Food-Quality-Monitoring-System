const settingsModel = require('./settingsModel');

let state = {
  online: true,
  lastSeen: new Date().toISOString(),
  packetsReceived: 0,
  hardwarePackets: 0,
  mockPackets: 0,
  uptimeStart: Date.now()
};

function touch(meta = {}) {
  const settings = settingsModel.get();
  state = {
    ...state,
    ...meta,
    online: true,
    lastSeen: new Date().toISOString(),
    packetsReceived: (state.packetsReceived || 0) + 1,
    hardwarePackets: meta.source === 'ESP32' ? (state.hardwarePackets || 0) + 1 : state.hardwarePackets,
    mockPackets: meta.source === 'MOCK_ESP32' ? (state.mockPackets || 0) + 1 : state.mockPackets
  };
  return get();
}

function get() {
  const settings = settingsModel.get();
  const uptimeSeconds = Math.floor((Date.now() - state.uptimeStart) / 1000);
  return {
    id: settings.deviceId,
    online: state.online,
    mode: settings.mockEsp32 ? 'DEMO / MOCK ESP32' : 'HARDWARE / ESP32',
    lastSeen: state.lastSeen,
    wifi: settings.wifiSsid,
    ip: settings.ipAddress,
    packetsReceived: state.packetsReceived,
    hardwarePackets: state.hardwarePackets,
    mockPackets: state.mockPackets,
    uptimeSeconds,
    uptimeFormatted: formatUptime(uptimeSeconds),
    phOffset: settings.phCalibrationOffset,
    tempOffset: settings.tempOffset,
    gasBaseline: settings.gasBaseline
  };
}

function formatUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

module.exports = { touch, get };
