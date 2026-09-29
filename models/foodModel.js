const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'foodProfiles.json');

const DEFAULT_PROFILES = {
  milk: {
    key: 'milk',
    name: 'Fresh Milk',
    icon: '🥛',
    color: '#2d9cdb',
    phMin: 6.4,
    phMax: 6.8,
    phOpt: 6.6,
    gasMax: 180,
    tempMax: 7.0,
    humidityMin: 50,
    humidityMax: 75,
    tdsMax: 6.0,
    turbidityMax: 2.5,
    expectedColor: 'White / Off-White',
    description: 'Raw or pasteurized dairy milk monitored for lactic acidification and bacterial gas emission.'
  },
  paneer: {
    key: 'paneer',
    name: 'Paneer (Cottage Cheese)',
    icon: '🧀',
    color: '#6fcf97',
    phMin: 5.3,
    phMax: 6.3,
    phOpt: 5.8,
    gasMax: 210,
    tempMax: 8.0,
    humidityMin: 55,
    humidityMax: 75,
    tdsMax: 6.5,
    turbidityMax: 3.0,
    expectedColor: 'Creamy White',
    description: 'Fresh dairy curd cheese susceptible to proteolysis and surface mold degradation.'
  },
  curd: {
    key: 'curd',
    name: 'Curd / Yogurt',
    icon: '🥣',
    color: '#bb6bd9',
    phMin: 3.9,
    phMax: 4.8,
    phOpt: 4.3,
    gasMax: 220,
    tempMax: 8.0,
    humidityMin: 50,
    humidityMax: 70,
    tdsMax: 6.0,
    turbidityMax: 3.0,
    expectedColor: 'White / Pale Cream',
    description: 'Cultured fermented milk product monitored for over-acidification and spoilage.'
  },
  water: {
    key: 'water',
    name: 'Drinking Water',
    icon: '💧',
    color: '#56ccf2',
    phMin: 6.5,
    phMax: 8.5,
    phOpt: 7.2,
    gasMax: 60,
    tempMax: 28.0,
    humidityMin: 30,
    humidityMax: 70,
    tdsMax: 5.0,
    turbidityMax: 1.5,
    expectedColor: 'Clear / Colorless',
    description: 'Potable water tested for dissolved solids, turbidity, and chemical neutrality.'
  },
  packaged: {
    key: 'packaged',
    name: 'Packed Food / Snacks',
    icon: '📦',
    color: '#f2994a',
    phMin: 5.5,
    phMax: 7.2,
    phOpt: 6.5,
    gasMax: 190,
    tempMax: 25.0,
    humidityMin: 30,
    humidityMax: 60,
    tdsMax: 5.0,
    turbidityMax: 2.0,
    expectedColor: 'Standard Packaging',
    description: 'Sealed food containers monitored for packet bloating, volatile gas leaks, and seal breach.'
  }
};

function ensureFile() {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(DEFAULT_PROFILES, null, 2));
  }
}

function getMap() {
  ensureFile();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_PROFILES;
  }
}

function saveMap(map) {
  fs.writeFileSync(file, JSON.stringify(map, null, 2));
}

function getAll() {
  return Object.values(getMap());
}

function getByKey(key) {
  const map = getMap();
  return map[key] || map['milk'] || null;
}

function save(key, data) {
  const map = getMap();
  const existing = map[key] || {};
  map[key] = {
    ...existing,
    ...data,
    key: key.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_'),
    name: data.name || key,
    icon: data.icon || '🍽️',
    color: data.color || '#2d9cdb',
    phMin: Number(data.phMin ?? existing.phMin ?? 6.0),
    phMax: Number(data.phMax ?? existing.phMax ?? 7.0),
    phOpt: Number(data.phOpt ?? existing.phOpt ?? ((Number(data.phMin ?? 6.0) + Number(data.phMax ?? 7.0)) / 2).toFixed(2)),
    gasMax: Number(data.gasMax ?? existing.gasMax ?? 200),
    tempMax: Number(data.tempMax ?? existing.tempMax ?? 10.0),
    humidityMin: Number(data.humidityMin ?? existing.humidityMin ?? 40),
    humidityMax: Number(data.humidityMax ?? existing.humidityMax ?? 75),
    tdsMax: Number(data.tdsMax ?? existing.tdsMax ?? 6.0),
    turbidityMax: Number(data.turbidityMax ?? existing.turbidityMax ?? 3.0),
    expectedColor: data.expectedColor || existing.expectedColor || 'Normal',
    description: data.description || existing.description || 'Monitored food profile.'
  };
  saveMap(map);
  return map[key];
}

function remove(key) {
  const map = getMap();
  if (['milk', 'water'].includes(key)) {
    throw new Error('Default system profiles (milk, water) cannot be deleted.');
  }
  if (map[key]) {
    delete map[key];
    saveMap(map);
    return true;
  }
  return false;
}

module.exports = {
  getAll,
  getByKey,
  getMap,
  save,
  remove,
  DEFAULT_PROFILES
};
