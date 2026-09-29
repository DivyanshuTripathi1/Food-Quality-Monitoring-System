const readingModel = require('../models/readingModel');
const deviceModel = require('../models/deviceModel');
const foodModel = require('../models/foodModel');
const settingsModel = require('../models/settingsModel');

const base = (title, active) => ({
  title,
  active,
  foods: foodModel.getAll(),
  settings: settingsModel.get(),
  device: deviceModel.get()
});

exports.dashboard = (req, res) => {
  const food = req.query.food || 'milk';
  const profile = foodModel.getByKey(food);
  const latest = readingModel.latest(food);
  const history = readingModel.getAll({ foodType: food, limit: 12 });
  const stats = readingModel.getStats(food);

  res.render('pages/dashboard', {
    ...base('Smart Food Quality Dashboard', 'dashboard'),
    selectedFood: food,
    profile,
    latest,
    history,
    stats
  });
};

exports.live = (req, res) => {
  const food = req.query.food || 'milk';
  const profile = foodModel.getByKey(food);
  const latest = readingModel.latest(food);

  res.render('pages/live', {
    ...base('Live Sensor Stream', 'live'),
    selectedFood: food,
    profile,
    latest
  });
};

exports.history = (req, res) => {
  const food = req.query.food || 'all';
  const status = req.query.status || 'all';
  const search = req.query.search || '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const filter = {
    foodType: food !== 'all' ? food : null,
    status: status !== 'all' ? status : null,
    search: search.trim() || null
  };

  const allFiltered = readingModel.getAll(filter);
  const total = allFiltered.length;
  const rows = allFiltered.slice(offset, offset + limit);
  const totalPages = Math.ceil(total / limit) || 1;

  res.render('pages/history', {
    ...base('Test History & Logs', 'history'),
    rows,
    selectedFood: food,
    selectedStatus: status,
    searchQuery: search,
    currentPage: page,
    totalPages,
    totalRecords: total
  });
};

exports.analytics = (req, res) => {
  const food = req.query.food || 'all';
  const stats = readingModel.getStats(food !== 'all' ? food : null);
  const rows = readingModel.getAll(food !== 'all' ? food : {});

  res.render('pages/analytics', {
    ...base('Quality Analytics & Trends', 'analytics'),
    selectedFood: food,
    stats,
    rows
  });
};

exports.foodTypes = (req, res) => {
  res.render('pages/food-types', {
    ...base('Food Types & Safety Thresholds', 'food-types'),
    allProfiles: foodModel.getAll()
  });
};

exports.device = (req, res) => {
  res.render('pages/device-status', {
    ...base('ESP32 Device & Hardware Integration', 'device'),
    device: deviceModel.get(),
    settings: settingsModel.get()
  });
};

exports.settings = (req, res) => {
  res.render('pages/settings', {
    ...base('System Settings & Calibration', 'settings'),
    settings: settingsModel.get(),
    device: deviceModel.get()
  });
};

exports.about = (req, res) => {
  const developers = [
    {
      name: 'Divyanshu Tripathi',
      role: 'Lead Full-Stack Developer & System Architect',
      photo: '/images/divyanshu.jpg',
      bio: 'Architected the core MVC framework, Express REST APIs, multi-parameter food quality evaluation engine, real-time telemetry streaming, and frontend UI design system.',
      skills: ['Node.js', 'Express', 'IoT Architecture', 'Sensor Integration', 'Full-Stack Web']
    },
    {
      name: 'Pranjal Shahi',
      role: 'IoT Hardware Engineer & Embedded Systems Developer',
      photo: '/images/pranjal.png',
      bio: 'Engineered the ESP32 microcontroller firmware, analog sensor signal acquisition (MQ-135, pH probe, TDS), cold chain monitoring, and hardware-to-cloud HTTP telemetry.',
      skills: ['ESP32', 'Embedded C/C++', 'Circuit Design', 'Sensor Interfacing', 'Wi-Fi Telemetry']
    }
  ];

  const teamMembers = [
    {
      name: 'Divyanshu Tripathi',
      role: 'Developer & System Architect',
      photo: '/images/divyanshu.jpg',
      contribution: 'System architecture, backend development, real-time algorithms, and dashboard engineering.'
    },
    {
      name: 'Pranjal Shahi',
      role: 'Developer & IoT Engineer',
      photo: '/images/pranjal.png',
      contribution: 'ESP32 firmware programming, analog sensor calibration, hardware testing, and circuit layout.'
    },
    {
      name: 'Kritika Singh',
      role: 'Quality Research & Sensor Testing',
      initials: 'KS',
      avatarColor: 'linear-gradient(135deg, #ec4899, #be185d)',
      contribution: 'Food spoilage biochemical threshold research, reference standards verification, and test sample data collection.'
    },
    {
      name: 'Pallavi Dubey',
      role: 'Data Analytics & Documentation',
      initials: 'PD',
      avatarColor: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      contribution: 'Experimental documentation, sensor data validation, accuracy evaluation, and project presentation.'
    }
  ];

  res.render('pages/about', {
    ...base('About Project & Team', 'about'),
    developers,
    teamMembers
  });
};

exports.detail = (req, res) => {
  const row = readingModel.getById(req.params.id);
  const profile = row ? foodModel.getByKey(row.foodType) : null;

  res.render('pages/detail', {
    ...base('Quality Inspection Certificate', 'history'),
    row,
    profile
  });
};

