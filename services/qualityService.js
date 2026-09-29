const foodModel = require('../models/foodModel');

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function evaluate(data) {
  const foodKey = (data.foodType || 'milk').toLowerCase().trim();
  const profile = foodModel.getByKey(foodKey) || foodModel.getByKey('milk');

  const ph = Number(data.ph ?? 0);
  const gas = Number(data.gas ?? 0);
  const temp = Number(data.temperature ?? 0);
  const humidity = Number(data.humidity ?? 0);
  const tds = Number(data.tds ?? 0);
  const turbidity = Number(data.turbidity ?? 0);
  const color = data.color || 'Normal';

  let score = 100;
  const reasons = [];
  const parameters = [];

  // 1. pH Evaluation
  let phStatus = 'SAFE';
  let phDiff = 0;
  if (ph < profile.phMin) {
    phDiff = profile.phMin - ph;
    const penalty = Math.min(35, Math.round(phDiff * 25 + 10));
    score -= penalty;
    phStatus = phDiff > 0.4 ? 'DANGER' : 'WARNING';
    reasons.push(`pH ${ph.toFixed(2)} is below safe threshold (${profile.phMin}–${profile.phMax}) — acidic degradation / bacterial fermentation.`);
  } else if (ph > profile.phMax) {
    phDiff = ph - profile.phMax;
    const penalty = Math.min(35, Math.round(phDiff * 25 + 10));
    score -= penalty;
    phStatus = phDiff > 0.4 ? 'DANGER' : 'WARNING';
    reasons.push(`pH ${ph.toFixed(2)} is above safe threshold (${profile.phMin}–${profile.phMax}) — alkaline adulteration or basic amine release.`);
  }
  const phPercent = clamp(Math.round(((ph - 0) / 14) * 100), 0, 100);
  parameters.push({
    name: 'pH Level',
    key: 'ph',
    value: ph.toFixed(2),
    unit: '',
    safeRange: `${profile.phMin} – ${profile.phMax}`,
    status: phStatus,
    percent: phPercent,
    icon: '💧'
  });

  // 2. Gas (MQ-135) Evaluation
  let gasStatus = 'SAFE';
  if (gas > profile.gasMax) {
    const penalty = Math.min(40, Math.round(20 + ((gas - profile.gasMax) / profile.gasMax) * 30));
    score -= penalty;
    gasStatus = 'DANGER';
    reasons.push(`MQ135 Gas level ${gas} ppm exceeds safe threshold (${profile.gasMax} ppm) — elevated microbial decomposition vapors.`);
  } else if (gas > profile.gasMax * 0.8) {
    score -= 12;
    gasStatus = 'WARNING';
    reasons.push(`MQ135 Gas level ${gas} ppm approaching threshold limit (${profile.gasMax} ppm).`);
  }
  const gasPercent = clamp(Math.round((gas / (profile.gasMax * 1.5)) * 100), 0, 100);
  parameters.push({
    name: 'Gas (MQ135)',
    key: 'gas',
    value: `${gas} ppm`,
    unit: 'ppm',
    safeRange: `< ${profile.gasMax} ppm`,
    status: gasStatus,
    percent: gasPercent,
    icon: '☁'
  });

  // 3. Temperature Evaluation
  let tempStatus = 'SAFE';
  if (temp > profile.tempMax + 3) {
    const penalty = Math.min(25, Math.round(15 + (temp - profile.tempMax) * 2));
    score -= penalty;
    tempStatus = 'DANGER';
    reasons.push(`Temperature ${temp}°C is significantly above safe threshold (${profile.tempMax}°C) — cold chain failure.`);
  } else if (temp > profile.tempMax) {
    score -= 10;
    tempStatus = 'WARNING';
    reasons.push(`Temperature ${temp}°C exceeds recommended cold storage (${profile.tempMax}°C).`);
  }
  const tempPercent = clamp(Math.round((temp / 40) * 100), 0, 100);
  parameters.push({
    name: 'Temperature',
    key: 'temperature',
    value: `${temp.toFixed(1)} °C`,
    unit: '°C',
    safeRange: `≤ ${profile.tempMax} °C`,
    status: tempStatus,
    percent: tempPercent,
    icon: '♨'
  });

  // 4. Humidity Evaluation
  let humStatus = 'SAFE';
  if (humidity > profile.humidityMax) {
    score -= 8;
    humStatus = 'WARNING';
    reasons.push(`Humidity ${humidity}% exceeds optimal storage range (${profile.humidityMin}–${profile.humidityMax}%).`);
  } else if (humidity < profile.humidityMin && profile.humidityMin > 0) {
    score -= 5;
    humStatus = 'WARNING';
  }
  parameters.push({
    name: 'Humidity',
    key: 'humidity',
    value: `${humidity}%`,
    unit: '%',
    safeRange: `${profile.humidityMin} – ${profile.humidityMax}%`,
    status: humStatus,
    percent: clamp(humidity, 0, 100),
    icon: '💧'
  });

  // 5. TDS Evaluation
  let tdsStatus = 'SAFE';
  if (tds > profile.tdsMax) {
    score -= 15;
    tdsStatus = 'WARNING';
    reasons.push(`TDS ${tds} is elevated above safe baseline (${profile.tdsMax}).`);
  }
  parameters.push({
    name: 'TDS',
    key: 'tds',
    value: `${tds}`,
    unit: '',
    safeRange: `≤ ${profile.tdsMax}`,
    status: tdsStatus,
    percent: clamp(Math.round((tds / (profile.tdsMax * 1.5)) * 100), 0, 100),
    icon: '◉'
  });

  // 6. Color / Visual Evaluation
  let colorStatus = 'SAFE';
  const normColor = color.toLowerCase();
  if (normColor.includes('yellow') || normColor.includes('brown') || normColor.includes('spoil') || normColor.includes('discolor')) {
    score -= 20;
    colorStatus = normColor.includes('brown') || normColor.includes('spoil') ? 'DANGER' : 'WARNING';
    reasons.push(`Visual appearance indicates discoloration (${color}) compared to expected ${profile.expectedColor}.`);
  }
  parameters.push({
    name: 'Color / Appearance',
    key: 'color',
    value: color,
    unit: '',
    safeRange: profile.expectedColor || 'Normal',
    status: colorStatus,
    percent: colorStatus === 'SAFE' ? 100 : colorStatus === 'WARNING' ? 50 : 20,
    icon: '👁'
  });

  score = clamp(Math.round(score), 0, 100);
  const status = score >= 80 ? 'FRESH' : score >= 55 ? 'WARNING' : 'SPOILED';

  let recommendation = 'Quality parameters meet safety standards. Food sample is fresh and safe for consumption.';
  if (status === 'WARNING') {
    recommendation = 'Quality parameters show mild degradation or elevated temperature. Inspect visual/odor condition and consume promptly or refrigerate immediately.';
  } else if (status === 'SPOILED') {
    recommendation = 'CRITICAL ALERT: Spoilage detected. Microbial gas emission or chemical degradation exceeds safe consumption limits. Do not consume.';
  }

  return {
    score,
    status,
    reasons,
    parameters,
    recommendation,
    profile
  };
}

module.exports = { evaluate };
