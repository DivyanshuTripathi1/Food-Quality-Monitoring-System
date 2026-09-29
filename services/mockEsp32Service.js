const readingModel = require('../models/readingModel');
const deviceModel = require('../models/deviceModel');
const foodModel = require('../models/foodModel');
const settingsModel = require('../models/settingsModel');

let activeFood = 'milk';
let intervalId = null;

function jitter(n, amount) {
  return Number((n + (Math.random() - 0.5) * amount).toFixed(2));
}

function generate(override = {}) {
  const profile = foodModel.getByKey(activeFood) || foodModel.getByKey('milk');
  const settings = settingsModel.get();

  const isAnomaly = override.isAnomaly || false;

  let ph = jitter(profile.phOpt, 0.15) + (settings.phCalibrationOffset || 0);
  let gas = Math.round(profile.gasMax * (0.45 + Math.random() * 0.25));
  let temp = jitter(profile.tempMax * 0.7, 0.8) + (settings.tempOffset || 0);
  let humidity = Math.round(55 + Math.random() * 12);
  let tds = jitter(profile.tdsMax * 0.8, 0.4);
  let turbidity = jitter(1.4, 0.4);
  let color = profile.expectedColor || 'Normal';

  if (isAnomaly) {
    // Generate clear anomaly (spoiled sample) for live alert testing
    ph = jitter(profile.phMin - 0.6, 0.2);
    gas = Math.round(profile.gasMax * (1.25 + Math.random() * 0.4));
    temp = jitter(profile.tempMax + 5, 1.5);
    color = 'Discolored / Elevated Odor';
  }

  const payload = {
    foodType: activeFood,
    ph: Number(override.ph ?? ph.toFixed(2)),
    gas: Number(override.gas ?? gas),
    temperature: Number(override.temperature ?? temp.toFixed(1)),
    humidity: Number(override.humidity ?? humidity),
    tds: Number(override.tds ?? tds),
    turbidity: Number(override.turbidity ?? turbidity),
    color: override.color || color,
    weight: Math.round(240 + Math.random() * 20),
    source: override.source || 'MOCK_ESP32'
  };

  const saved = readingModel.create(payload);
  deviceModel.touch({
    source: payload.source,
    mode: settings.mockEsp32 ? 'DEMO / MOCK ESP32' : 'HARDWARE / ESP32'
  });

  return saved;
}

function startMockEsp32() {
  readingModel.seedIfEmpty();
  const settings = settingsModel.get();

  if (intervalId) clearInterval(intervalId);

  if (settings.mockEsp32) {
    const sec = Math.max(2, settings.mockIntervalSeconds || 10);
    // Initial reading
    generate();
    intervalId = setInterval(() => {
      const curSettings = settingsModel.get();
      if (curSettings.mockEsp32) {
        generate();
      }
    }, sec * 1000);
    console.log(`Mock ESP32 simulator running (interval: ${sec}s, active food: ${activeFood}).`);
  } else {
    console.log('Mock ESP32 simulator is turned OFF in settings.');
  }
}

function stopMockEsp32() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('Mock ESP32 simulator stopped.');
}

function restartMockEsp32() {
  stopMockEsp32();
  startMockEsp32();
}

function setFood(food) {
  if (food) {
    activeFood = food.toLowerCase().trim();
  }
  return activeFood;
}

function getActiveFood() {
  return activeFood;
}

module.exports = {
  startMockEsp32,
  stopMockEsp32,
  restartMockEsp32,
  setFood,
  getActiveFood,
  generate
};
