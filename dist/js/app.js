/**
 * FoodGuard - Smart Multi-Parameter Food Quality Monitoring System
 * Comprehensive Client-Side Application Script
 */

let autoRefreshActive = true;
let refreshTimer = null;
let liveStreamChartInstance = null;
let trendChartInstance = null;
let activeWebcamStream = null;
let soundAlertsEnabled = true;

// --- 1. Audio Alarm Buzzer (Synthesized Web Audio API) ---
function playBuzzerSound() {
  if (!soundAlertsEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch alarm tone
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15); // Drop tone
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3); // High pitch

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

function toggleSoundAlerts() {
  soundAlertsEnabled = !soundAlertsEnabled;
  const icon = document.getElementById('soundIcon');
  if (icon) {
    icon.textContent = soundAlertsEnabled ? '🔔' : '🔕';
  }
  showToast(soundAlertsEnabled ? 'Spoilage alarm buzzer ENABLED' : 'Spoilage alarm buzzer MUTED', soundAlertsEnabled ? 'info' : 'warning');
}

// --- 2. Toast Notification System ---
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠️',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || 'ℹ'}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- 3. Theme Toggle ---
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('foodguard_theme', isDark ? 'dark' : 'light');
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = isDark ? '☀️' : '🌓';
  showToast(`Switched to ${isDark ? 'Dark Mode' : 'Light Mode'}`, 'info');
}

// Initialize theme from storage
(function initTheme() {
  const saved = localStorage.getItem('foodguard_theme');
  if (saved === 'dark') {
    document.body.classList.add('dark-theme');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = '☀️';
  }
})();

// Mobile Menu Toggle
const mobileBtn = document.getElementById('mobileMenuBtn');
if (mobileBtn) {
  mobileBtn.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('mobile-open');
  });
}

// --- 4. Dashboard Real-Time Live Auto-Refresh ---
async function fetchLatestData(foodKey) {
  try {
    const res = await fetch(`/api/status?food=${encodeURIComponent(foodKey)}`);
    const json = await res.json();
    return json.success ? json : null;
  } catch (e) {
    console.error('Error fetching latest status:', e);
    return null;
  }
}

function updateDashboardUI(result) {
  if (!result || !result.data) return;
  const d = result.data;
  const profile = result.profile;

  // 1. Verdict badge
  const badge = document.getElementById('verdictBadge');
  const icon = document.getElementById('verdictIcon');
  const text = document.getElementById('verdictText');
  const score = document.getElementById('verdictScore');
  const progress = document.getElementById('scoreProgressBar');
  const analysis = document.getElementById('verdictAnalysisText');
  const lastUpdated = document.getElementById('lastUpdatedLabel');

  const statusLower = (d.status || 'FRESH').toLowerCase();

  if (badge) {
    badge.className = `status-badge ${statusLower}`;
  }
  if (icon) {
    icon.textContent = d.status === 'SPOILED' ? '✕' : d.status === 'WARNING' ? '!' : '✓';
  }
  if (text) text.textContent = d.status || 'FRESH';
  if (score) score.textContent = d.qualityScore ?? 95;
  if (progress) {
    progress.className = `progress-bar-fill ${statusLower}`;
    progress.style.width = `${d.qualityScore ?? 95}%`;
  }
  if (analysis) {
    analysis.textContent = (d.reasons && d.reasons.length > 0)
      ? d.reasons.join(' ')
      : 'All monitored sensor parameters are within recommended reference thresholds. Food is fresh and safe.';
  }
  if (lastUpdated) {
    lastUpdated.textContent = 'Just now';
  }

  // Spoilage alert sound trigger
  if (d.status === 'SPOILED') {
    playBuzzerSound();
  }

  // 2. Sensor reading cards
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setTag = (id, status) => {
    const el = document.getElementById(id);
    if (el) {
      el.className = `sensor-tag ${status.toLowerCase()}`;
      el.textContent = status;
    }
  };

  setVal('val-ph', d.ph);
  setVal('val-gas', `${d.gas} ppm`);
  setVal('val-temp', `${d.temperature} °C`);
  setVal('val-humidity', `${d.humidity} %`);
  setVal('val-tds', `${d.tds}`);
  setVal('val-color', d.color || 'Normal');

  // Compute status tags dynamically against profile thresholds
  if (profile) {
    const phSafe = d.ph >= profile.phMin && d.ph <= profile.phMax;
    setTag('tag-ph', phSafe ? 'SAFE' : 'ALERT');

    const gasSafe = d.gas <= profile.gasMax;
    setTag('tag-gas', gasSafe ? (d.gas > profile.gasMax * 0.8 ? 'WARNING' : 'SAFE') : 'DANGER');

    const tempSafe = d.temperature <= profile.tempMax;
    setTag('tag-temp', tempSafe ? 'SAFE' : 'ALERT');

    const humSafe = d.humidity >= profile.humidityMin && d.humidity <= profile.humidityMax;
    setTag('tag-humidity', humSafe ? 'SAFE' : 'WARNING');

    const tdsSafe = d.tds <= profile.tdsMax;
    setTag('tag-tds', tdsSafe ? 'SAFE' : 'WARNING');

    const colorSafe = !d.color || d.color === 'Normal' || d.color === profile.expectedColor;
    setTag('tag-color', colorSafe ? 'NORMAL' : 'FLAGGED');
  }

  // 3. Dynamic Parameter Compliance Bars
  const paramList = document.getElementById('paramStatusList');
  if (paramList && d.parameters && d.parameters.length > 0) {
    paramList.innerHTML = d.parameters.map(p => `
      <div class="param-row">
        <div class="param-info">
          <span class="param-name">${p.name}</span>
          <span class="param-safe text-muted">(${p.safeRange})</span>
        </div>
        <div class="param-bar-wrap">
          <div class="param-bar-fill ${p.status.toLowerCase()}" style="width: ${p.percent}%"></div>
        </div>
        <div class="param-meta">
          <b class="param-val">${p.value}</b>
          <span class="param-status-tag ${p.status.toLowerCase()}">${p.status}</span>
        </div>
      </div>
    `).join('');
  }

  // 4. Update Trend Chart with smooth push
  if (trendChartInstance) {
    const timeLabel = new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const labels = trendChartInstance.data.labels;
    if (labels[labels.length - 1] !== timeLabel) {
      labels.push(timeLabel);
      if (labels.length > 15) labels.shift();

      trendChartInstance.data.datasets.forEach(ds => {
        if (ds.label.includes('pH')) ds.data.push(d.ph);
        else if (ds.label.includes('Gas')) ds.data.push(d.gas);
        else if (ds.label.includes('Temp')) ds.data.push(d.temperature);
        else if (ds.label.includes('Score')) ds.data.push(d.qualityScore);

        if (ds.data.length > 15) ds.data.shift();
      });
      trendChartInstance.update('none');
    }
  }

  // 5. Prepend to Recent History Table if not already present
  const historyBody = document.getElementById('recentHistoryBody');
  if (historyBody && !document.getElementById(`row-${d.id}`)) {
    const tr = document.createElement('tr');
    tr.id = `row-${d.id}`;
    tr.className = 'highlight-new-row';
    const dateStr = new Date(d.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const scoreClass = d.qualityScore >= 80 ? 'high' : d.qualityScore >= 55 ? 'med' : 'low';
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td><span class="food-chip">${profile ? profile.icon : '🍽️'} ${profile ? profile.name : d.foodType}</span></td>
      <td><b>${d.ph}</b></td>
      <td>${d.gas} ppm</td>
      <td>${d.temperature} °C</td>
      <td>${d.humidity} %</td>
      <td>${d.tds}</td>
      <td>${d.color || 'Normal'}</td>
      <td><span class="score-badge ${scoreClass}">${d.qualityScore} / 100</span></td>
      <td><span class="status-chip ${d.status.toLowerCase()}">${d.status}</span></td>
      <td><a href="/reading/${d.id}" class="btn-table-action">Certificate ↗</a></td>
    `;
    historyBody.insertBefore(tr, historyBody.firstChild);
    if (historyBody.children.length > 10) {
      historyBody.lastChild.remove();
    }
  }
}

// Start auto-refresh loop for dashboard
function startDashboardAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    if (!autoRefreshActive) return;
    const food = (window.FOODGUARD_CONFIG && window.FOODGUARD_CONFIG.selectedFood) ||
                 new URLSearchParams(location.search).get('food') || 'milk';
    const res = await fetchLatestData(food);
    if (res) updateDashboardUI(res);
  }, 3000);
}

function toggleAutoRefresh() {
  autoRefreshActive = !autoRefreshActive;
  const btn = document.getElementById('autoRefreshBtn');
  const label = document.getElementById('refreshLabel');
  if (btn) {
    btn.textContent = autoRefreshActive ? '⏸ Pause Stream' : '▶ Resume Stream';
    btn.className = autoRefreshActive ? 'btn btn-ghost' : 'btn btn-primary';
  }
  if (label) {
    label.textContent = autoRefreshActive ? 'Auto-refresh (3s)' : 'Paused';
  }
  showToast(autoRefreshActive ? 'Telemetry stream resumed' : 'Telemetry stream paused', 'info');
}

// Switch active food via dropdown or tabs
async function switchFoodDropdown(foodKey) {
  await switchActiveFood(foodKey);
  location.href = `/?food=${encodeURIComponent(foodKey)}`;
}

async function switchActiveFood(foodKey) {
  try {
    await fetch('/api/demo/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodType: foodKey })
    });
    if (window.FOODGUARD_CONFIG) {
      window.FOODGUARD_CONFIG.selectedFood = foodKey;
    }
  } catch (e) {
    console.error('Error switching food profile:', e);
  }
}

// --- 5. Interactive Webcam & Visual Analysis ---
async function toggleWebcam() {
  const video = document.getElementById('cameraVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const startBtn = document.getElementById('startCamBtn');
  const snapBtn = document.getElementById('snapCamBtn');
  const preview = document.getElementById('capturedImagePreview');

  if (activeWebcamStream) {
    // Stop camera
    activeWebcamStream.getTracks().forEach(track => track.stop());
    activeWebcamStream = null;
    if (video) video.style.display = 'none';
    if (placeholder) placeholder.style.display = 'grid';
    if (preview) preview.style.display = 'none';
    if (startBtn) startBtn.textContent = '📹 Open WebCam';
    if (snapBtn) snapBtn.style.display = 'none';
    showToast('Webcam closed', 'info');
  } else {
    // Start camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 320 } });
      activeWebcamStream = stream;
      if (video) {
        video.srcObject = stream;
        video.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
      if (preview) preview.style.display = 'none';
      if (startBtn) startBtn.textContent = '⏹ Close WebCam';
      if (snapBtn) snapBtn.style.display = 'inline-block';
      showToast('Webcam stream active', 'success');
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      showToast('Camera access unavailable. You can upload an image sample instead.', 'warning');
    }
  }
}

async function captureAndAnalyze() {
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  const preview = document.getElementById('capturedImagePreview');

  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 480;
  canvas.height = video.videoHeight || 320;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const base64 = canvas.toDataURL('image/jpeg', 0.85);

  if (preview) {
    preview.src = base64;
    preview.style.display = 'block';
    video.style.display = 'none';
  }

  showToast('Analyzing sample optical properties...', 'info');
  await sendImageForAnalysis(base64);
}

function handleImageUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    const base64 = evt.target.result;
    const preview = document.getElementById('capturedImagePreview');
    const placeholder = document.getElementById('cameraPlaceholder');
    const video = document.getElementById('cameraVideo');

    if (video) video.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';
    if (preview) {
      preview.src = base64;
      preview.style.display = 'block';
    }

    showToast('Analyzing uploaded food sample image...', 'info');
    await sendImageForAnalysis(base64);
  };
  reader.readAsDataURL(file);
}

async function sendImageForAnalysis(base64) {
  try {
    const food = (window.FOODGUARD_CONFIG && window.FOODGUARD_CONFIG.selectedFood) || 'milk';
    const res = await fetch('/api/camera/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, foodType: food })
    });
    const result = await res.json();

    const resultBox = document.getElementById('visualAnalysisResult');
    const statusBadge = document.getElementById('visualStatusBadge');
    const confidence = document.getElementById('visualConfidence');
    const summary = document.getElementById('visualAnalysisSummary');

    if (resultBox && result.success) {
      resultBox.style.display = 'block';
      if (statusBadge) {
        statusBadge.textContent = result.visualStatus === 'NORMAL' ? '✓ Visual Clean' : '⚠️ Flagged';
        statusBadge.className = `badge ${result.visualStatus === 'NORMAL' ? 'badge-emerald' : 'badge-amber'}`;
      }
      if (confidence) confidence.textContent = `Confidence: ${result.confidence}`;
      if (summary) summary.textContent = `${result.message} Detected: ${result.detectedColor}.`;
      showToast(`Visual Analysis complete: ${result.visualStatus}`, result.visualStatus === 'NORMAL' ? 'success' : 'warning');
    }
  } catch (err) {
    console.error('Visual analysis error:', err);
    showToast('Visual analysis failed', 'error');
  }
}

// --- 6. Quick Simulator Triggers ---
async function triggerQuickRead() {
  try {
    const food = (window.FOODGUARD_CONFIG && window.FOODGUARD_CONFIG.selectedFood) ||
                 new URLSearchParams(location.search).get('food') || 'milk';
    const res = await fetch('/api/simulate/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodType: food })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Sensor reading accepted: ${json.data.foodType.toUpperCase()} (Score: ${json.data.qualityScore})`, 'success');
      const statusRes = await fetchLatestData(food);
      if (statusRes) updateDashboardUI(statusRes);
    }
  } catch (e) {
    console.error(e);
    showToast('Failed to trigger reading', 'error');
  }
}

async function triggerQuickAnomaly() {
  try {
    const res = await fetch('/api/simulate/anomaly', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      playBuzzerSound();
      showToast(`⚠️ SPOILAGE ANOMALY INJECTED: Gas ${json.data.gas} ppm, pH ${json.data.ph} -> SPOILED!`, 'error', 5000);
      const food = (window.FOODGUARD_CONFIG && window.FOODGUARD_CONFIG.selectedFood) || 'milk';
      const statusRes = await fetchLatestData(food);
      if (statusRes) updateDashboardUI(statusRes);
    }
  } catch (e) {
    console.error(e);
    showToast('Failed to inject anomaly', 'error');
  }
}

// --- 7. Manual Sample Test Modal ---
function openManualModal() {
  const modal = document.getElementById('manualSampleModal');
  if (modal) modal.style.display = 'flex';
}

function closeManualModal() {
  const modal = document.getElementById('manualSampleModal');
  if (modal) modal.style.display = 'none';
}

async function submitManualSample(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    foodType: form.foodType.value,
    ph: parseFloat(form.ph.value),
    gas: parseInt(form.gas.value, 10),
    temperature: parseFloat(form.temperature.value),
    humidity: parseInt(form.humidity.value, 10),
    tds: parseFloat(form.tds.value),
    color: form.color.value,
    weight: parseInt(form.weight.value, 10),
    source: 'MANUAL_TEST'
  };

  try {
    const res = await fetch('/api/sensor-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      closeManualModal();
      showToast(`Sample evaluated: ${json.data.status} (Score: ${json.data.qualityScore}/100)`, json.data.status === 'FRESH' ? 'success' : 'warning');
      const statusRes = await fetchLatestData(payload.foodType);
      if (statusRes) updateDashboardUI(statusRes);
    }
  } catch (err) {
    console.error(err);
    showToast('Error evaluating sample', 'error');
  }
}

// --- 8. Trend Chart Initialization & Controls ---
function initDashboardTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas || !window.FOODGUARD_CONFIG) return;

  const history = window.FOODGUARD_CONFIG.recentHistory || [];
  const labels = history.map(x => new Date(x.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  trendChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'pH Level',
          data: history.map(x => x.ph),
          borderColor: '#2d9cdb',
          backgroundColor: 'rgba(45,156,219,0.1)',
          yAxisID: 'yPh',
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: 'MQ135 Gas (ppm)',
          data: history.map(x => x.gas),
          borderColor: '#f2994a',
          backgroundColor: 'rgba(242,153,74,0.1)',
          yAxisID: 'yGas',
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: 'Temperature (°C)',
          data: history.map(x => x.temperature),
          borderColor: '#eb5757',
          backgroundColor: 'rgba(235,87,87,0.1)',
          yAxisID: 'yPh',
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11 } } },
        tooltip: { padding: 10, cornerRadius: 8 }
      },
      scales: {
        x: { grid: { display: false } },
        yPh: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'pH / Temp (°C)' },
          min: 0,
          max: 14,
          grid: { color: 'rgba(0,0,0,0.04)' }
        },
        yGas: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'MQ135 Gas (ppm)' },
          min: 0,
          max: 450,
          grid: { display: false }
        }
      }
    }
  });
}

function setChartDataset(type) {
  if (!trendChartInstance) return;
  const history = window.FOODGUARD_CONFIG?.recentHistory || [];

  document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');

  if (type === 'all') {
    trendChartInstance.data.datasets.forEach(ds => ds.hidden = false);
  } else if (type === 'ph') {
    trendChartInstance.data.datasets.forEach(ds => ds.hidden = !ds.label.includes('pH'));
  } else if (type === 'gas') {
    trendChartInstance.data.datasets.forEach(ds => ds.hidden = !ds.label.includes('Gas'));
  } else if (type === 'temp') {
    trendChartInstance.data.datasets.forEach(ds => ds.hidden = !ds.label.includes('Temp'));
  } else if (type === 'score') {
    // Add or show score dataset
    let scoreDs = trendChartInstance.data.datasets.find(ds => ds.label.includes('Score'));
    if (!scoreDs) {
      trendChartInstance.data.datasets.push({
        label: 'Quality Score (/100)',
        data: history.map(x => x.qualityScore),
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39,174,96,0.1)',
        yAxisID: 'yGas',
        tension: 0.35,
        borderWidth: 2
      });
    }
    trendChartInstance.data.datasets.forEach(ds => ds.hidden = !ds.label.includes('Score'));
  }
  trendChartInstance.update();
}

// --- 9. Live Cockpit Page Functionality ---
function initLivePage() {
  const canvas = document.getElementById('liveStreamChart');
  if (!canvas) return;

  const points = 12;
  const initialLabels = Array.from({ length: points }, (_, i) => `-${(points - i) * 3}s`);
  const initialGas = Array.from({ length: points }, () => 105 + Math.round((Math.random() - 0.5) * 15));
  const initialPh = Array.from({ length: points }, () => Number((6.6 + (Math.random() - 0.5) * 0.1).toFixed(2)));

  liveStreamChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: initialLabels,
      datasets: [
        {
          label: 'MQ-135 Gas (ppm)',
          data: initialGas,
          borderColor: '#f2994a',
          yAxisID: 'y1',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 2
        },
        {
          label: 'pH Level',
          data: initialPh,
          borderColor: '#2d9cdb',
          yAxisID: 'y2',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { grid: { display: false } },
        y1: { type: 'linear', position: 'left', min: 40, max: 400 },
        y2: { type: 'linear', position: 'right', min: 3, max: 10, grid: { display: false } }
      }
    }
  });

  // Start live stream poll
  setInterval(pollLiveStream, 2500);
}

let livePaused = false;
function toggleLiveStream() {
  livePaused = !livePaused;
  const btn = document.getElementById('livePauseBtn');
  if (btn) {
    btn.textContent = livePaused ? '▶ Resume Stream' : '⏸ Pause Stream';
    btn.className = livePaused ? 'btn btn-primary' : 'btn btn-outline';
  }
  showToast(livePaused ? 'Live telemetry paused' : 'Live telemetry running', 'info');
}

async function pollLiveStream() {
  if (livePaused) return;
  const food = new URLSearchParams(location.search).get('food') || 'milk';
  const res = await fetchLatestData(food);
  if (!res || !res.data) return;
  const d = res.data;

  // Update gauges
  const setEl = (id, text) => { const el = document.getElementById(id); if (el) el.innerHTML = text; };
  setEl('live-val-ph', d.ph);
  setEl('live-val-gas', `${d.gas} <small>ppm</small>`);
  setEl('live-val-temp', `${d.temperature} <small>°C</small>`);
  setEl('live-val-humidity', `${d.humidity} <small>%</small>`);
  setEl('liveScoreNum', d.qualityScore);

  const chip = document.getElementById('liveStatusChip');
  if (chip) {
    chip.className = `status-chip ${d.status.toLowerCase()}`;
    chip.textContent = d.status;
  }

  const rec = document.getElementById('liveRecommendation');
  if (rec) rec.textContent = d.recommendation || 'Parameters compliant with safety standard.';

  // Update circular score gauge
  const circle = document.getElementById('liveScoreCircle');
  if (circle) {
    const circumference = 264;
    const offset = circumference - (circumference * d.qualityScore) / 100;
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = d.status === 'FRESH' ? '#27ae60' : d.status === 'WARNING' ? '#f39c12' : '#e74c3c';
  }

  // Update gauge bars
  const gaugePh = document.getElementById('live-gauge-ph');
  if (gaugePh) gaugePh.style.width = `${Math.min(100, Math.max(0, (d.ph / 14) * 100))}%`;

  const gaugeGas = document.getElementById('live-gauge-gas');
  if (gaugeGas) gaugeGas.style.width = `${Math.min(100, Math.max(0, (d.gas / 300) * 100))}%`;

  const gaugeTemp = document.getElementById('live-gauge-temp');
  if (gaugeTemp) gaugeTemp.style.width = `${Math.min(100, Math.max(0, (d.temperature / 35) * 100))}%`;

  // Push to chart
  if (liveStreamChartInstance) {
    const t = new Date(d.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const labels = liveStreamChartInstance.data.labels;
    labels.push(t);
    if (labels.length > 15) labels.shift();

    liveStreamChartInstance.data.datasets[0].data.push(d.gas);
    if (liveStreamChartInstance.data.datasets[0].data.length > 15) liveStreamChartInstance.data.datasets[0].data.shift();

    liveStreamChartInstance.data.datasets[1].data.push(d.ph);
    if (liveStreamChartInstance.data.datasets[1].data.length > 15) liveStreamChartInstance.data.datasets[1].data.shift();

    liveStreamChartInstance.update('none');
  }

  // Append event to terminal
  appendEventLog(d);

  // Sound alarm if spoiled
  if (d.status === 'SPOILED') playBuzzerSound();
}

function appendEventLog(d) {
  const terminal = document.getElementById('eventTerminal');
  if (!terminal) return;
  const line = document.createElement('div');
  const time = new Date(d.timestamp).toLocaleTimeString();
  const statusColor = d.status === 'FRESH' ? 'text-emerald' : d.status === 'WARNING' ? 'text-amber' : 'text-rose';
  line.className = `terminal-line ${statusColor}`;
  line.innerHTML = `[${time}] ${d.foodType.toUpperCase()}: pH ${d.ph} | Gas ${d.gas}ppm | Temp ${d.temperature}°C -> <b>${d.status}</b> (Score ${d.qualityScore}/100)`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
  if (terminal.children.length > 50) terminal.firstChild.remove();
}

function clearEventLog() {
  const terminal = document.getElementById('eventTerminal');
  if (terminal) terminal.innerHTML = '<div class="terminal-line text-muted">[System] Event log cleared.</div>';
}

function updateSliderVal(param, val) {
  const el = document.getElementById(`slider${param}Val`);
  if (el) el.textContent = val;
}

async function submitQuickTest() {
  const food = document.getElementById('quickFoodType').value;
  const ph = parseFloat(document.getElementById('sliderPh').value);
  const gas = parseInt(document.getElementById('sliderGas').value, 10);
  const temp = parseFloat(document.getElementById('sliderTemp').value);

  try {
    const res = await fetch('/api/simulate/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodType: food, ph, gas, temperature: temp })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Quick Test evaluated: ${json.data.status} (Score ${json.data.qualityScore})`, json.data.status === 'FRESH' ? 'success' : 'warning');
      pollLiveStream();
    }
  } catch (e) {
    showToast('Error submitting test', 'error');
  }
}

// --- 10. Test History Management ---
async function deleteHistoryRow(id, redirect = false) {
  if (!confirm('Are you sure you want to delete this sensor reading record?')) return;
  try {
    const res = await fetch(`/api/readings/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('Record deleted successfully', 'success');
      if (redirect) {
        location.href = '/history';
      } else {
        const row = document.getElementById(`row-${id}`);
        if (row) {
          row.style.opacity = '0';
          setTimeout(() => row.remove(), 300);
        }
      }
    } else {
      showToast(json.message || 'Delete failed', 'error');
    }
  } catch (e) {
    showToast('Failed to delete reading', 'error');
  }
}

async function confirmClearHistory() {
  if (!confirm('⚠️ WARNING: This will permanently delete ALL recorded sensor readings from the database. Are you sure?')) return;
  try {
    const res = await fetch('/api/readings/clear', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast('All historical readings cleared', 'info');
      setTimeout(() => location.reload(), 800);
    }
  } catch (e) {
    showToast('Failed to clear database', 'error');
  }
}

// --- 11. Analytics Page Visualizations ---
function initAnalyticsCharts() {
  if (!window.FOODGUARD_ANALYTICS_DATA) return;
  const { stats, rows, foods } = window.FOODGUARD_ANALYTICS_DATA;

  // Chart 1: Donut Quality Breakdown
  const donutCanvas = document.getElementById('qualityDonutChart');
  if (donutCanvas) {
    new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Fresh (Safe)', 'Warning (Borderline)', 'Spoiled (Unsafe)'],
        datasets: [{
          data: [stats.fresh || 0, stats.warning || 0, stats.spoiled || 0],
          backgroundColor: ['#27ae60', '#f39c12', '#e74c3c'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  // Chart 2: Sample Volume by Food Category
  const foodCanvas = document.getElementById('foodVolumeChart');
  if (foodCanvas) {
    const counts = stats.foodCounts || {};
    const labels = Object.keys(counts).map(k => (foods.find(f => f.key === k)?.name || k));
    const data = Object.values(counts);

    new Chart(foodCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Total Samples',
          data,
          backgroundColor: '#2d9cdb',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Chart 3: Average Physicochemical Values Across Foods
  const avgCanvas = document.getElementById('avgParamsChart');
  if (avgCanvas) {
    new Chart(avgCanvas, {
      type: 'bar',
      data: {
        labels: ['Average pH', 'Average Temp (°C)', 'Average TDS'],
        datasets: [{
          label: 'Measured Average',
          data: [stats.avgParams?.ph || 0, stats.avgParams?.temp || 0, stats.avgParams?.tds || 0],
          backgroundColor: ['#3498db', '#e67e22', '#9b59b6'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Chart 4: Gas vs Quality Score Correlation
  const gasCanvas = document.getElementById('gasScoreTimelineChart');
  if (gasCanvas) {
    const sampleRows = (rows || []).slice(0, 20);
    new Chart(gasCanvas, {
      type: 'line',
      data: {
        labels: sampleRows.map((_, i) => `#${i + 1}`),
        datasets: [
          {
            label: 'MQ135 Gas (ppm)',
            data: sampleRows.map(r => r.gas),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231,76,60,0.1)',
            yAxisID: 'yGas',
            tension: 0.35,
            borderWidth: 2
          },
          {
            label: 'Freshness Score (/100)',
            data: sampleRows.map(r => r.qualityScore),
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46,204,113,0.1)',
            yAxisID: 'yScore',
            tension: 0.35,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          yGas: { type: 'linear', position: 'left', title: { display: true, text: 'Gas (ppm)' } },
          yScore: { type: 'linear', position: 'right', min: 0, max: 100, title: { display: true, text: 'Score' }, grid: { display: false } }
        }
      }
    });
  }
}

// --- 12. Food Profile Management ---
function openAddFoodModal() {
  const modal = document.getElementById('addFoodModal');
  if (modal) modal.style.display = 'flex';
}

function closeAddFoodModal() {
  const modal = document.getElementById('addFoodModal');
  if (modal) modal.style.display = 'none';
}

async function submitAddFood(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    key: form.key.value,
    name: form.name.value,
    icon: form.icon.value,
    color: form.color.value,
    phMin: parseFloat(form.phMin.value),
    phMax: parseFloat(form.phMax.value),
    gasMax: parseInt(form.gasMax.value, 10),
    tempMax: parseFloat(form.tempMax.value),
    humidityMin: parseInt(form.humidityMin.value, 10),
    humidityMax: parseInt(form.humidityMax.value, 10),
    tdsMax: parseFloat(form.tdsMax.value),
    expectedColor: form.expectedColor.value,
    description: form.description.value
  };

  try {
    const res = await fetch('/api/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Food profile '${json.data.name}' added`, 'success');
      closeAddFoodModal();
      setTimeout(() => location.reload(), 700);
    } else {
      showToast(json.message || 'Error creating profile', 'error');
    }
  } catch (err) {
    showToast('Failed to add profile', 'error');
  }
}

function openEditFoodModal(food) {
  const modal = document.getElementById('editFoodModal');
  if (!modal) return;
  document.getElementById('editFoodKey').value = food.key;
  document.getElementById('editFoodName').value = food.name;
  document.getElementById('editFoodIcon').value = food.icon;
  document.getElementById('editFoodPhMin').value = food.phMin;
  document.getElementById('editFoodPhMax').value = food.phMax;
  document.getElementById('editFoodGasMax').value = food.gasMax;
  document.getElementById('editFoodTempMax').value = food.tempMax;
  document.getElementById('editFoodHumidityMin').value = food.humidityMin;
  document.getElementById('editFoodHumidityMax').value = food.humidityMax;
  document.getElementById('editFoodTdsMax').value = food.tdsMax;
  document.getElementById('editFoodColorDesc').value = food.expectedColor || '';
  document.getElementById('editFoodDesc').value = food.description || '';
  modal.style.display = 'flex';
}

function closeEditFoodModal() {
  const modal = document.getElementById('editFoodModal');
  if (modal) modal.style.display = 'none';
}

async function submitEditFood(e) {
  e.preventDefault();
  const form = e.target;
  const key = form.key.value;
  const payload = {
    name: form.name.value,
    icon: form.icon.value,
    phMin: parseFloat(form.phMin.value),
    phMax: parseFloat(form.phMax.value),
    gasMax: parseInt(form.gasMax.value, 10),
    tempMax: parseFloat(form.tempMax.value),
    humidityMin: parseInt(form.humidityMin.value, 10),
    humidityMax: parseInt(form.humidityMax.value, 10),
    tdsMax: parseFloat(form.tdsMax.value),
    expectedColor: form.expectedColor.value,
    description: form.description.value
  };

  try {
    const res = await fetch(`/api/foods/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Thresholds updated for ${json.data.name}`, 'success');
      closeEditFoodModal();
      setTimeout(() => location.reload(), 700);
    } else {
      showToast(json.message || 'Update failed', 'error');
    }
  } catch (err) {
    showToast('Failed to update thresholds', 'error');
  }
}

async function deleteFoodProfile(key, name) {
  if (!confirm(`Are you sure you want to delete '${name}' food profile?`)) return;
  try {
    const res = await fetch(`/api/foods/${key}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast(`Food profile '${name}' deleted`, 'info');
      const card = document.getElementById(`card-${key}`);
      if (card) card.remove();
    } else {
      showToast(json.message || 'Cannot delete profile', 'error');
    }
  } catch (e) {
    showToast('Error deleting profile', 'error');
  }
}

// --- 13. Device Status Page Features ---
async function pingDevice() {
  const start = performance.now();
  try {
    const res = await fetch('/api/device/ping', { method: 'POST' });
    const latency = Math.round(performance.now() - start);
    const json = await res.json();

    const label = document.getElementById('topbarPingLabel');
    if (label) label.textContent = `${latency}ms`;

    const pingMs = document.getElementById('livePingMs');
    if (pingMs) pingMs.textContent = `${latency}ms`;

    showToast(`ESP32 Node Ping Response: ${latency}ms latency (Status: 200 OK)`, 'success');
  } catch (e) {
    showToast('ESP32 Node Ping Timeout', 'error');
  }
}

async function sendApiTestPayload(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    foodType: form.foodType.value,
    ph: parseFloat(form.ph.value),
    gas: parseInt(form.gas.value, 10),
    temperature: parseFloat(form.temperature.value),
    humidity: parseInt(form.humidity.value, 10),
    tds: parseFloat(form.tds.value),
    color: form.color.value,
    source: form.source.value
  };

  const start = performance.now();
  const responseBox = document.getElementById('apiResponseJson');
  const badge = document.getElementById('apiResponseBadge');

  if (responseBox) responseBox.textContent = 'Transmitting packet to /api/sensor-data...';

  try {
    const res = await fetch('/api/sensor-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const ms = Math.round(performance.now() - start);
    const json = await res.json();

    if (badge) {
      badge.textContent = `${res.status} (${ms}ms)`;
      badge.className = `response-badge ${res.ok ? 'safe' : 'alert'}`;
    }
    if (responseBox) {
      responseBox.textContent = JSON.stringify(json, null, 2);
    }
    showToast(`Packet ingested successfully in ${ms}ms`, 'success');
  } catch (err) {
    if (responseBox) responseBox.textContent = `Error: ${err.message}`;
    showToast('HTTP POST failed', 'error');
  }
}

function copyArduinoCode() {
  const code = document.getElementById('arduinoCodeBlock')?.innerText;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    showToast('ESP32 Arduino (.ino) code copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

function downloadArduinoSketch() {
  const code = document.getElementById('arduinoCodeBlock')?.innerText;
  if (!code) return;
  const blob = new Blob([code], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'FoodGuard_ESP32.ino';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Downloaded FoodGuard_ESP32.ino sketch', 'success');
}

// --- 14. Settings Page Features ---
async function saveSettings(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    mockEsp32: form.mockEsp32.checked,
    mockIntervalSeconds: parseInt(form.mockIntervalSeconds.value, 10),
    historyDays: parseInt(form.historyDays.value, 10),
    soundAlerts: form.soundAlerts.checked,
    deviceId: form.deviceId.value,
    wifiSsid: form.wifiSsid.value,
    ipAddress: form.ipAddress.value,
    phCalibrationOffset: parseFloat(form.phCalibrationOffset.value),
    tempOffset: parseFloat(form.tempOffset.value)
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      soundAlertsEnabled = payload.soundAlerts;
      showToast('System configuration & hardware offsets saved successfully!', 'success');
    }
  } catch (err) {
    showToast('Failed to save settings', 'error');
  }
}

async function reseedDemoData() {
  if (!confirm('Re-seed the database with 20 days of realistic multi-parameter sensor records?')) return;
  try {
    const res = await fetch('/api/readings/seed', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast(`Database reseeded with ${json.count} historical records!`, 'success');
      setTimeout(() => location.reload(), 900);
    }
  } catch (e) {
    showToast('Failed to seed database', 'error');
  }
}

// --- 15. DOM Content Loaded Orchestration ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. If on dashboard, init trend chart and auto-refresh
  if (document.getElementById('trendChart')) {
    initDashboardTrendChart();
    startDashboardAutoRefresh();
  }

  // 2. If on live stream cockpit, init meters and streaming chart
  if (document.getElementById('liveStreamChart')) {
    initLivePage();
  }

  // 3. If on analytics page, render all 4 analytical charts
  if (document.getElementById('qualityDonutChart')) {
    initAnalyticsCharts();
  }
});
