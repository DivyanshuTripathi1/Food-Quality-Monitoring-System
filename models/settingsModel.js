const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'settings.json');

const DEFAULT_SETTINGS = {
  mockEsp32: process.env.MOCK_ESP32 !== 'false',
  mockIntervalSeconds: 10,
  historyDays: Number(process.env.HISTORY_DAYS || 20),
  deviceId: process.env.DEVICE_ID || 'ESP32-FOODGUARD-01',
  wifiSsid: 'FoodGuard-DemoWiFi',
  ipAddress: '192.168.4.2',
  soundAlerts: true,
  tempUnit: 'C',
  phCalibrationOffset: 0.0,
  tempOffset: 0.0,
  gasBaseline: 100,
  autoRefreshSeconds: 3,
  emailAlerts: false,
  alertEmail: 'lab@foodguard.edu'
};

function ensureFile() {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  }
}

function get() {
  ensureFile();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

function update(partial) {
  const current = get();
  const updated = { ...current, ...partial };
  fs.writeFileSync(file, JSON.stringify(updated, null, 2));
  return updated;
}

module.exports = { get, update, DEFAULT_SETTINGS };
