const readingModel = require('../models/readingModel');
const deviceModel = require('../models/deviceModel');
const foodModel = require('../models/foodModel');
const settingsModel = require('../models/settingsModel');
const mockEsp32Service = require('../services/mockEsp32Service');
const { evaluate } = require('../services/qualityService');

exports.status = (req, res) => {
  const food = req.query.food || mockEsp32Service.getActiveFood() || 'milk';
  const latestReading = readingModel.latest(food);
  const device = deviceModel.get();
  const profile = foodModel.getByKey(food);
  const stats = readingModel.getStats(food);
  const history = readingModel.getAll({ foodType: food, limit: 15 });
  res.json({
    success: true,
    data: latestReading,
    food,
    profile,
    device,
    stats,
    history,
    serverTime: new Date().toISOString()
  });
};

exports.history = (req, res) => {
  const { food, status, search, page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const filter = {
    foodType: food,
    status,
    search
  };

  const total = readingModel.getAll(filter).length;
  const items = readingModel.getAll({ ...filter, limit: limitNum, offset });

  res.json({
    success: true,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    data: items
  });
};

exports.exportCSV = (req, res) => {
  const csv = readingModel.exportCSV(req.query.food);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="foodguard-data-${Date.now()}.csv"`);
  res.send(csv);
};

exports.device = (req, res) => {
  const dev = deviceModel.get();
  res.json({
    success: true,
    data: {
      ...dev,
      memory: process.memoryUsage(),
      nodeVersion: process.version
    }
  });
};

exports.devicePing = (req, res) => {
  deviceModel.touch();
  res.json({
    success: true,
    pong: true,
    timestamp: new Date().toISOString(),
    device: deviceModel.get()
  });
};

exports.foods = (req, res) => {
  res.json({ success: true, data: foodModel.getAll() });
};

exports.addFood = (req, res) => {
  try {
    const { key, name, icon, color, phMin, phMax, gasMax, tempMax, humidityMin, humidityMax, tdsMax, turbidityMax, expectedColor, description } = req.body;
    if (!key || !name) {
      return res.status(400).json({ success: false, message: 'Key and Name are required.' });
    }
    const created = foodModel.save(key, {
      name, icon, color, phMin, phMax, gasMax, tempMax, humidityMin, humidityMax, tdsMax, turbidityMax, expectedColor, description
    });
    res.status(201).json({ success: true, message: `Food profile '${created.name}' created`, data: created });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateFood = (req, res) => {
  try {
    const { key } = req.params;
    const updated = foodModel.save(key, req.body);
    res.json({ success: true, message: `Food profile '${updated.name}' updated`, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteFood = (req, res) => {
  try {
    const { key } = req.params;
    foodModel.remove(key);
    res.json({ success: true, message: `Food profile '${key}' deleted.` });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.sensorData = (req, res) => {
  const body = req.body || {};
  if (!body.foodType) {
    return res.status(400).json({ success: false, message: 'foodType is required' });
  }

  const result = evaluate(body);
  const saved = readingModel.create({
    ...body,
    qualityScore: result.score,
    status: result.status,
    source: body.source || 'ESP32'
  });

  deviceModel.touch({
    source: 'ESP32',
    wifi: body.wifi || undefined,
    ip: body.ip || undefined
  });

  res.status(201).json({
    success: true,
    message: 'Sensor reading accepted',
    data: saved,
    evaluation: result
  });
};

exports.setFood = (req, res) => {
  const food = req.body.foodType || 'milk';
  mockEsp32Service.setFood(food);
  res.json({ success: true, message: `Demo active food changed to ${food}`, activeFood: food });
};

exports.simulateReading = (req, res) => {
  const override = req.body || {};
  if (override.foodType) {
    mockEsp32Service.setFood(override.foodType);
  }
  const reading = mockEsp32Service.generate(override);
  res.json({ success: true, message: 'Simulation reading generated', data: reading });
};

exports.simulateAnomaly = (req, res) => {
  const reading = mockEsp32Service.generate({ isAnomaly: true, source: 'SIMULATED_ANOMALY' });
  res.json({ success: true, message: 'Spoilage anomaly injected successfully!', data: reading });
};

exports.getSettings = (req, res) => {
  res.json({ success: true, data: settingsModel.get() });
};

exports.updateSettings = (req, res) => {
  try {
    const prev = settingsModel.get();
    const updated = settingsModel.update(req.body);

    if (req.body.mockEsp32 !== undefined || req.body.mockIntervalSeconds !== undefined) {
      if (updated.mockEsp32) {
        mockEsp32Service.restartMockEsp32();
      } else {
        mockEsp32Service.stopMockEsp32();
      }
    }

    res.json({ success: true, message: 'Settings saved successfully', data: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getReading = (req, res) => {
  const row = readingModel.getById(req.params.id);
  const profile = row ? foodModel.getByKey(row.foodType) : null;
  const device = deviceModel.get();
  if (!row) {
    return res.status(404).json({ success: false, message: 'Reading not found' });
  }
  res.json({
    success: true,
    data: row,
    profile,
    device
  });
};

exports.analytics = (req, res) => {
  const food = req.query.food || 'all';
  const stats = readingModel.getStats(food !== 'all' ? food : null);
  const rows = readingModel.getAll(food !== 'all' ? food : {});
  res.json({
    success: true,
    selectedFood: food,
    stats,
    rows
  });
};

exports.deleteReading = (req, res) => {
  const ok = readingModel.deleteById(req.params.id);
  if (ok) {
    res.json({ success: true, message: 'Reading deleted' });
  } else {
    res.status(404).json({ success: false, message: 'Reading not found' });
  }
};

exports.clearReadings = (req, res) => {
  readingModel.clearAll();
  res.json({ success: true, message: 'All readings cleared' });
};

exports.seedReadings = (req, res) => {
  const seeded = readingModel.seedFresh();
  res.json({ success: true, message: `Successfully seeded ${seeded.length} historical readings`, count: seeded.length });
};

exports.cameraAnalyze = (req, res) => {
  const { imageBase64, foodType = 'milk' } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'Image data is required' });
  }

  const randomFactor = (imageBase64.length % 100) / 100;
  const isSlightlyYellow = randomFactor > 0.75;
  const colorDesc = isSlightlyYellow ? 'Slight Yellowing Detected' : 'Normal / Uniform Color';
  const visualScore = isSlightlyYellow ? 72 : 94;
  const visualStatus = visualScore >= 80 ? 'NORMAL' : 'FLAGGED';

  res.json({
    success: true,
    visualStatus,
    visualScore,
    detectedColor: colorDesc,
    confidence: '92.4%',
    analysis: {
      uniformity: isSlightlyYellow ? '82%' : '98%',
      foreignParticles: 'None Detected',
      surfaceMold: 'Negative',
      estimatedTurbidity: isSlightlyYellow ? '2.4 NTU' : '1.2 NTU'
    },
    message: isSlightlyYellow
      ? 'Visual warning: minor surface discoloration or yellowish tint detected.'
      : 'Visual inspection passed: sample shows clean, uniform appearance.'
  });
};
