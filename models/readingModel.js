const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const foodModel = require('./foodModel');
const settingsModel = require('./settingsModel');
const { evaluate } = require('../services/qualityService');

const file = path.join(__dirname, '..', 'data', 'readings.json');

function ensureFile() {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '[]');
  }
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeAll(items) {
  fs.writeFileSync(file, JSON.stringify(items, null, 2));
}

function cutoff() {
  const days = settingsModel.get().historyDays || 20;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function cleanup(items) {
  const minTime = cutoff();
  const fresh = items.filter(x => new Date(x.timestamp).getTime() >= minTime);
  if (fresh.length !== items.length) {
    writeAll(fresh);
  }
  return fresh;
}

function create(data) {
  const items = readAll();
  const evalResult = evaluate(data);

  const item = {
    id: data.id || randomUUID(),
    foodType: (data.foodType || 'milk').toLowerCase().trim(),
    timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
    ph: Number(data.ph ?? 7.0),
    gas: Number(data.gas ?? 100),
    temperature: Number(data.temperature ?? 20.0),
    humidity: Number(data.humidity ?? 60),
    tds: Number(data.tds ?? 5.0),
    turbidity: Number(data.turbidity ?? 1.5),
    color: data.color || 'Normal',
    weight: Number(data.weight ?? 250),
    qualityScore: Number(evalResult.score),
    status: evalResult.status,
    reasons: evalResult.reasons || [],
    parameters: evalResult.parameters || [],
    recommendation: evalResult.recommendation || '',
    source: data.source || 'ESP32'
  };

  items.unshift(item);
  // Keep rolling window up to 2000 items
  const clean = cleanup(items).slice(0, 2000);
  writeAll(clean);
  return item;
}

function getAll(options = {}) {
  let items = cleanup(readAll());

  if (!options) return items;

  if (typeof options === 'string') {
    return items.filter(x => x.foodType === options);
  }

  const { foodType, status, search, limit, offset = 0 } = options || {};

  if (foodType && foodType !== 'all') {
    items = items.filter(x => x.foodType === foodType);
  }

  if (status && status !== 'all') {
    items = items.filter(x => x.status.toUpperCase() === status.toUpperCase());
  }

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(x =>
      x.foodType.toLowerCase().includes(q) ||
      x.status.toLowerCase().includes(q) ||
      (x.color && x.color.toLowerCase().includes(q)) ||
      (x.id && x.id.toLowerCase().includes(q))
    );
  }

  if (limit) {
    return items.slice(offset, offset + Number(limit));
  }

  return items;
}

function getCount(options = {}) {
  return getAll(options).length;
}

function latest(foodType = 'milk') {
  const items = getAll(foodType);
  return items[0] || null;
}

function getById(id) {
  return readAll().find(x => x.id === id) || null;
}

function deleteById(id) {
  const items = readAll();
  const filtered = items.filter(x => x.id !== id);
  if (filtered.length !== items.length) {
    writeAll(filtered);
    return true;
  }
  return false;
}

function clearAll() {
  writeAll([]);
  return true;
}

function seedIfEmpty() {
  const items = readAll();
  if (items.length > 0) return;
  seedFresh();
}

function seedFresh() {
  const foods = ['milk', 'paneer', 'curd', 'water', 'packaged'];
  const newItems = [];
  const now = Date.now();

  // Generate 20 days of historical data, 2-3 readings per day
  for (let day = 19; day >= 0; day--) {
    for (let r = 0; r < 2; r++) {
      const ts = new Date(now - day * 86400000 - r * 14400000 + Math.random() * 3600000);
      const foodType = foods[(day + r) % foods.length];
      const profile = foodModel.getByKey(foodType);

      // Create mostly fresh, occasional warning or spoiled
      const isSpoiled = Math.random() < 0.12;
      const isWarning = !isSpoiled && Math.random() < 0.22;

      let ph = profile.phOpt + (Math.random() - 0.5) * 0.2;
      let gas = profile.gasMax * (0.45 + Math.random() * 0.35);
      let temp = profile.tempMax * (0.6 + Math.random() * 0.3);
      let color = profile.expectedColor || 'Normal';

      if (isSpoiled) {
        ph = foodType === 'milk' ? 5.8 : profile.phMin - 0.6;
        gas = profile.gasMax * (1.15 + Math.random() * 0.5);
        temp = profile.tempMax + 4 + Math.random() * 3;
        color = 'Discolored / Sour';
      } else if (isWarning) {
        gas = profile.gasMax * 0.88;
        temp = profile.tempMax + 1.2;
        color = 'Slight Yellow';
      }

      const sample = {
        foodType,
        timestamp: ts.toISOString(),
        ph: Number(ph.toFixed(2)),
        gas: Math.round(gas),
        temperature: Number(temp.toFixed(1)),
        humidity: Math.round(55 + Math.random() * 18),
        tds: Number((profile.tdsMax * (0.7 + Math.random() * 0.4)).toFixed(1)),
        turbidity: Number((1.2 + Math.random() * 1.5).toFixed(2)),
        color,
        weight: Math.round(200 + Math.random() * 100),
        source: 'DEMO_SEED'
      };

      const evalResult = evaluate(sample);
      newItems.push({
        id: randomUUID(),
        ...sample,
        qualityScore: evalResult.score,
        status: evalResult.status,
        reasons: evalResult.reasons,
        parameters: evalResult.parameters,
        recommendation: evalResult.recommendation
      });
    }
  }

  // Sort descending by timestamp
  newItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  writeAll(newItems);
  return newItems;
}

function getStats(foodType = null) {
  const items = getAll(foodType);
  const total = items.length;

  if (total === 0) {
    return {
      total: 0,
      fresh: 0,
      warning: 0,
      spoiled: 0,
      freshRate: 0,
      warningRate: 0,
      spoiledRate: 0,
      avgScore: 0,
      foodCounts: {},
      avgParams: { ph: 0, gas: 0, temp: 0, humidity: 0, tds: 0 },
      gasScoreCorrelation: []
    };
  }

  let fresh = 0, warning = 0, spoiled = 0;
  let scoreSum = 0;
  let phSum = 0, gasSum = 0, tempSum = 0, humSum = 0, tdsSum = 0;
  const foodCounts = {};
  const foodScoreSum = {};

  items.forEach(r => {
    if (r.status === 'FRESH') fresh++;
    else if (r.status === 'WARNING') warning++;
    else if (r.status === 'SPOILED') spoiled++;

    scoreSum += r.qualityScore;
    phSum += r.ph;
    gasSum += r.gas;
    tempSum += r.temperature;
    humSum += r.humidity;
    tdsSum += r.tds;

    foodCounts[r.foodType] = (foodCounts[r.foodType] || 0) + 1;
    foodScoreSum[r.foodType] = (foodScoreSum[r.foodType] || 0) + r.qualityScore;
  });

  const avgParams = {
    ph: Number((phSum / total).toFixed(2)),
    gas: Math.round(gasSum / total),
    temp: Number((tempSum / total).toFixed(1)),
    humidity: Math.round(humSum / total),
    tds: Number((tdsSum / total).toFixed(1))
  };

  const gasScoreCorrelation = items.slice(0, 30).map(r => ({
    gas: r.gas,
    score: r.qualityScore,
    status: r.status,
    food: r.foodType,
    time: r.timestamp
  }));

  return {
    total,
    fresh,
    warning,
    spoiled,
    freshRate: Math.round((fresh / total) * 100),
    warningRate: Math.round((warning / total) * 100),
    spoiledRate: Math.round((spoiled / total) * 100),
    avgScore: Math.round(scoreSum / total),
    foodCounts,
    avgParams,
    gasScoreCorrelation
  };
}

function exportCSV(foodType = null) {
  const items = getAll(foodType);
  const headers = [
    'ID', 'Date & Time', 'Food Type', 'Quality Score', 'Status',
    'pH', 'Gas (ppm)', 'Temperature (C)', 'Humidity (%)', 'TDS', 'Turbidity (NTU)',
    'Color', 'Weight (g)', 'Source', 'Reasons'
  ];

  const rows = items.map(r => [
    `"${r.id}"`,
    `"${new Date(r.timestamp).toISOString()}"`,
    `"${r.foodType}"`,
    r.qualityScore,
    `"${r.status}"`,
    r.ph,
    r.gas,
    r.temperature,
    r.humidity,
    r.tds,
    r.turbidity,
    `"${r.color || 'Normal'}"`,
    r.weight,
    `"${r.source || 'ESP32'}"`,
    `"${(r.reasons || []).join('; ').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

module.exports = {
  create,
  getAll,
  getCount,
  latest,
  getById,
  deleteById,
  clearAll,
  seedIfEmpty,
  seedFresh,
  getStats,
  exportCSV
};
