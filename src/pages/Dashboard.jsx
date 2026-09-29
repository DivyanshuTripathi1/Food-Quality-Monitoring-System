import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import FoodTabs from '../components/FoodTabs';
import Chart from 'chart.js/auto';

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    foods,
    selectedFood,
    switchActiveFood,
    openManualModal,
    triggerQuickAnomaly,
    playBuzzerSound,
    showToast
  } = useApp();

  const activeFoodParam = searchParams.get('food') || selectedFood || 'milk';

  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const [latest, setLatest] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const [activeChartFilter, setActiveChartFilter] = useState('all');

  // Camera & Visual Inspection state
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [visualResult, setVisualResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Chart ref
  const chartCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const prevStatusRef = useRef(null);

  // Fetch dashboard data
  const fetchData = useCallback(async (foodKey) => {
    try {
      const res = await fetch(`/api/status?food=${encodeURIComponent(foodKey)}`);
      const json = await res.json();
      if (json.success) {
        setLatest(json.data);
        setProfile(json.profile);
        if (json.stats) setStats(json.stats);
        if (json.history) setHistory(json.history);
        setLastUpdated('Just now');

        // Check if spoiled and play buzzer
        if (json.data?.status === 'SPOILED' && prevStatusRef.current !== 'SPOILED') {
          playBuzzerSound();
        }
        prevStatusRef.current = json.data?.status;

        // Push new point into chart if exists
        if (chartInstanceRef.current && json.data) {
          const d = json.data;
          const timeLabel = new Date(d.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          const labels = chartInstanceRef.current.data.labels;
          if (labels[labels.length - 1] !== timeLabel) {
            labels.push(timeLabel);
            if (labels.length > 15) labels.shift();

            chartInstanceRef.current.data.datasets.forEach(ds => {
              if (ds.label.includes('pH')) ds.data.push(d.ph);
              else if (ds.label.includes('Gas')) ds.data.push(d.gas);
              else if (ds.label.includes('Temp')) ds.data.push(d.temperature);
              else if (ds.label.includes('Score')) ds.data.push(d.qualityScore);

              if (ds.data.length > 15) ds.data.shift();
            });
            chartInstanceRef.current.update('none');
          }
        }
      }
    } catch (e) {
      console.error('Error fetching dashboard status:', e);
    }
  }, [playBuzzerSound]);

  // Handle active food change
  const handleSelectFood = (foodKey) => {
    switchActiveFood(foodKey);
    setSearchParams({ food: foodKey });
  };

  useEffect(() => {
    fetchData(activeFoodParam);
  }, [activeFoodParam, fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefreshActive) return;
    const timer = setInterval(() => {
      fetchData(activeFoodParam);
    }, 3000);
    return () => clearInterval(timer);
  }, [autoRefreshActive, activeFoodParam, fetchData]);

  const toggleAutoRefresh = () => {
    setAutoRefreshActive(prev => {
      const next = !prev;
      showToast(next ? 'Telemetry stream resumed' : 'Telemetry stream paused', 'info');
      return next;
    });
  };

  // Initialize Trend Chart
  useEffect(() => {
    if (!chartCanvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const historyReversed = [...history].slice(0, 15).reverse();
    const labels = historyReversed.map(x =>
      new Date(x.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );

    const ctx = chartCanvasRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'pH Level',
            data: historyReversed.map(x => x.ph),
            borderColor: '#2d9cdb',
            backgroundColor: 'rgba(45,156,219,0.1)',
            yAxisID: 'yPh',
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3
          },
          {
            label: 'MQ135 Gas (ppm)',
            data: historyReversed.map(x => x.gas),
            borderColor: '#f2994a',
            backgroundColor: 'rgba(242,153,74,0.1)',
            yAxisID: 'yGas',
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3
          },
          {
            label: 'Temperature (°C)',
            data: historyReversed.map(x => x.temperature),
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
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
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

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [history.length === 0]); // Init on first history load

  const handleChartFilter = (type) => {
    setActiveChartFilter(type);
    if (!chartInstanceRef.current) return;

    if (type === 'all') {
      chartInstanceRef.current.data.datasets.forEach(ds => (ds.hidden = false));
    } else if (type === 'ph') {
      chartInstanceRef.current.data.datasets.forEach(ds => (ds.hidden = !ds.label.includes('pH')));
    } else if (type === 'gas') {
      chartInstanceRef.current.data.datasets.forEach(ds => (ds.hidden = !ds.label.includes('Gas')));
    } else if (type === 'temp') {
      chartInstanceRef.current.data.datasets.forEach(ds => (ds.hidden = !ds.label.includes('Temp')));
    } else if (type === 'score') {
      let scoreDs = chartInstanceRef.current.data.datasets.find(ds => ds.label.includes('Score'));
      if (!scoreDs) {
        const historyReversed = [...history].slice(0, 15).reverse();
        chartInstanceRef.current.data.datasets.push({
          label: 'Quality Score (/100)',
          data: historyReversed.map(x => x.qualityScore),
          borderColor: '#27ae60',
          backgroundColor: 'rgba(39,174,96,0.1)',
          yAxisID: 'yGas',
          tension: 0.35,
          borderWidth: 2
        });
      }
      chartInstanceRef.current.data.datasets.forEach(ds => (ds.hidden = !ds.label.includes('Score')));
    }
    chartInstanceRef.current.update();
  };

  // Webcam Controls
  const toggleWebcam = async () => {
    if (isWebcamActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsWebcamActive(false);
      showToast('Webcam closed', 'info');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 320 }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsWebcamActive(true);
        setCapturedImage(null);
        showToast('Webcam stream active', 'success');
      } catch (err) {
        console.warn('Camera access denied:', err);
        showToast('Camera access unavailable. You can upload an image sample instead.', 'warning');
      }
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 320;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(base64);
    setIsWebcamActive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    showToast('Analyzing sample optical properties...', 'info');
    await sendImageForAnalysis(base64);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target.result;
      setCapturedImage(base64);
      setIsWebcamActive(false);
      showToast('Analyzing uploaded food sample image...', 'info');
      await sendImageForAnalysis(base64);
    };
    reader.readAsDataURL(file);
  };

  const sendImageForAnalysis = async (base64) => {
    try {
      const res = await fetch('/api/camera/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, foodType: activeFoodParam })
      });
      const result = await res.json();
      if (result.success) {
        setVisualResult(result);
        showToast(
          `Visual Analysis complete: ${result.visualStatus}`,
          result.visualStatus === 'NORMAL' ? 'success' : 'warning'
        );
      }
    } catch (err) {
      console.error('Visual analysis error:', err);
      showToast('Visual analysis failed', 'error');
    }
  };

  const statusLower = (latest?.status || 'fresh').toLowerCase();
  const statusIcon =
    latest?.status === 'SPOILED' ? '✕' : latest?.status === 'WARNING' ? '!' : '✓';

  // Sensor safety status calculations
  const phSafe = profile
    ? latest?.ph >= profile.phMin && latest?.ph <= profile.phMax
    : true;
  const gasSafe = profile ? (latest?.gas ?? 100) <= profile.gasMax : true;
  const gasTag = gasSafe
    ? (latest?.gas ?? 100) > (profile?.gasMax || 180) * 0.8
      ? 'WARNING'
      : 'SAFE'
    : 'DANGER';
  const tempSafe = profile ? (latest?.temperature ?? 5) <= profile.tempMax : true;
  const humSafe = profile
    ? (latest?.humidity ?? 60) >= profile.humidityMin &&
      (latest?.humidity ?? 60) <= profile.humidityMax
    : true;
  const tdsSafe = profile ? (latest?.tds ?? 4) <= profile.tdsMax : true;
  const colorSafe =
    !latest?.color ||
    latest?.color === 'Normal' ||
    latest?.color === profile?.expectedColor;

  // Parameter list data
  const paramData = latest?.parameters && latest.parameters.length > 0
    ? latest.parameters
    : [
        { name: 'pH Level', value: latest?.ph ?? 6.65, safeRange: profile ? `${profile.phMin} – ${profile.phMax}` : '6.4 – 6.8', status: phSafe ? 'SAFE' : 'ALERT', percent: 75 },
        { name: 'Gas (MQ135)', value: `${latest?.gas ?? 105} ppm`, safeRange: `< ${profile ? profile.gasMax : '180'} ppm`, status: gasTag, percent: 45 },
        { name: 'Temperature', value: `${latest?.temperature ?? 5.8} °C`, safeRange: `≤ ${profile ? profile.tempMax : '7.0'} °C`, status: tempSafe ? 'SAFE' : 'ALERT', percent: 55 },
        { name: 'Humidity', value: `${latest?.humidity ?? 62} %`, safeRange: profile ? `${profile.humidityMin} – ${profile.humidityMax}%` : '50 – 75%', status: humSafe ? 'SAFE' : 'WARNING', percent: 62 },
        { name: 'TDS Solids', value: latest?.tds ?? 4.9, safeRange: `≤ ${profile ? profile.tdsMax : '6.0'}`, status: tdsSafe ? 'SAFE' : 'WARNING', percent: 49 },
        { name: 'Color Quality', value: latest?.color ?? 'Normal', safeRange: profile?.expectedColor || 'Normal', status: colorSafe ? 'SAFE' : 'WARNING', percent: 100 }
      ];

  return (
    <section className="content">
      {/* Hero Banner */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-badge">
            <span className="live-blink"></span>
            <span>IoT Hardware &amp; Simulator Connected</span>
          </div>
          <h1>Multi-Parameter Food Quality Detection System</h1>
          <p>
            Real-time continuous monitoring of physicochemical and volatile gas markers using IoT sensors, rule-based AI diagnostics, and threshold compliance.
          </p>
          <div className="hero-actions">
            <button className="btn btn-emerald" onClick={openManualModal}>
              🔬 Test Sample Now
            </button>
            <button
              className="btn btn-amber"
              onClick={() => triggerQuickAnomaly(() => fetchData(activeFoodParam))}
            >
              ⚠️ Simulate Spoilage Anomaly
            </button>
            <button
              className={autoRefreshActive ? 'btn btn-ghost' : 'btn btn-primary'}
              onClick={toggleAutoRefresh}
              id="autoRefreshBtn"
            >
              {autoRefreshActive ? '⏸ Pause Stream' : '▶ Resume Stream'}
            </button>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="hero-stat">
            <small>Monitored Sample</small>
            <b>{profile ? profile.name : activeFoodParam}</b>
          </div>
          <div className="hero-stat">
            <small>Safe Pass Rate</small>
            <b className="text-emerald">{stats ? stats.freshRate : 85}%</b>
          </div>
          <div className="hero-stat">
            <small>Database Records</small>
            <b>{stats ? stats.total : 0}</b>
          </div>
        </div>
      </div>

      {/* Food Profile Tabs */}
      <FoodTabs activeFood={activeFoodParam} onSelectFood={handleSelectFood} />

      {/* Top Grid */}
      <div className="grid top-grid">
        {/* 1. Quality Status Verdict Card */}
        <section className="card status-card" id="statusCard">
          <div className="card-header">
            <div className="card-title">
              <span>♨</span>
              <b>Food Quality Verdict</b>
            </div>
            <select
              id="foodSelect"
              className="form-select-sm"
              value={activeFoodParam}
              onChange={(e) => handleSelectFood(e.target.value)}
            >
              {(foods || []).map(f => (
                <option key={f.key} value={f.key}>
                  {f.icon} {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className={`status-badge ${statusLower}`} id="verdictBadge">
            <span className="badge-icon" id="verdictIcon">
              {statusIcon}
            </span>
            <strong id="verdictText">{latest?.status || 'FRESH'}</strong>
          </div>

          <div className="score-display">
            <div className="score-header">
              <span className="score-label">Freshness Quality Score</span>
              <span className="score-relative text-muted" id="lastUpdatedLabel">
                {lastUpdated}
              </span>
            </div>
            <div className="score-row">
              <span className="score-num" id="verdictScore">
                {latest?.qualityScore ?? 95}
              </span>
              <small className="score-max">/ 100</small>
            </div>
            <div className="progress-bar-wrap">
              <div
                className={`progress-bar-fill ${statusLower}`}
                id="scoreProgressBar"
                style={{ width: `${latest?.qualityScore ?? 95}%` }}
              ></div>
            </div>
          </div>

          <div className="verdict-analysis">
            <small className="analysis-title">DIAGNOSTIC VERDICT</small>
            <p id="verdictAnalysisText">
              {latest?.reasons && latest.reasons.length > 0
                ? latest.reasons.join(' ')
                : 'All monitored sensor parameters are within recommended reference thresholds. Food is fresh and safe.'}
            </p>
          </div>
        </section>

        {/* 2. Live Sensor Telemetry Grid */}
        <section className="card sensor-card">
          <div className="card-header">
            <div className="card-title">
              <span>♧</span>
              <b>Live Sensor Readings</b>
            </div>
            <div className="card-header-badge" id="refreshBadge">
              <span className="pulse-dot"></span>
              <span id="refreshLabel">
                {autoRefreshActive ? 'Auto-refresh (3s)' : 'Paused'}
              </span>
            </div>
          </div>

          <div className="sensor-grid" id="sensorGrid">
            {/* pH Sensor */}
            <div className="sensor-box sensor-ph" id="box-ph">
              <div className="sensor-box-top">
                <span className="sensor-icon">💧</span>
                <span className={`sensor-tag ${phSafe ? 'safe' : 'alert'}`} id="tag-ph">
                  {phSafe ? 'SAFE' : 'ALERT'}
                </span>
              </div>
              <div className="sensor-box-body">
                <span className="sensor-name">pH Level</span>
                <b className="sensor-value" id="val-ph">{latest?.ph ?? '6.65'}</b>
                <small className="sensor-safe" id="safe-ph">
                  Safe: {profile ? `${profile.phMin} – ${profile.phMax}` : '6.4 – 6.8'}
                </small>
              </div>
            </div>

            {/* MQ-135 Gas Sensor */}
            <div className="sensor-box sensor-gas" id="box-gas">
              <div className="sensor-box-top">
                <span className="sensor-icon">☁</span>
                <span className={`sensor-tag ${gasTag.toLowerCase()}`} id="tag-gas">
                  {gasTag}
                </span>
              </div>
              <div className="sensor-box-body">
                <span className="sensor-name">Gas (MQ135)</span>
                <b className="sensor-value" id="val-gas">{latest?.gas ?? '105'} ppm</b>
                <small className="sensor-safe" id="safe-gas">
                  Safe: &lt; {profile ? profile.gasMax : '180'} ppm
                </small>
              </div>
            </div>

            {/* Temperature */}
            <div className="sensor-box sensor-temp" id="box-temp">
              <div className="sensor-box-top">
                <span className="sensor-icon">♨</span>
                <span className={`sensor-tag ${tempSafe ? 'safe' : 'alert'}`} id="tag-temp">
                  {tempSafe ? 'SAFE' : 'ALERT'}
                </span>
              </div>
              <div className="sensor-box-body">
                <span className="sensor-name">Temperature</span>
                <b className="sensor-value" id="val-temp">{latest?.temperature ?? '5.8'} °C</b>
                <small className="sensor-safe" id="safe-temp">
                  Safe: ≤ {profile ? profile.tempMax : '7.0'} °C
                </small>
              </div>
            </div>

            {/* Humidity */}
            <div className="sensor-box sensor-humidity" id="box-humidity">
              <div className="sensor-box-top">
                <span className="sensor-icon">💧</span>
                <span className={`sensor-tag ${humSafe ? 'safe' : 'warning'}`} id="tag-humidity">
                  {humSafe ? 'SAFE' : 'WARNING'}
                </span>
              </div>
              <div className="sensor-box-body">
                <span className="sensor-name">Humidity</span>
                <b className="sensor-value" id="val-humidity">{latest?.humidity ?? '62'} %</b>
                <small className="sensor-safe" id="safe-humidity">
                  Safe: {profile ? `${profile.humidityMin} – ${profile.humidityMax}%` : '50 – 75%'}
                </small>
              </div>
            </div>

            {/* TDS / Turbidity */}
            <div className="sensor-box sensor-tds" id="box-tds">
              <div className="sensor-box-top">
                <span className="sensor-icon">◉</span>
                <span className={`sensor-tag ${tdsSafe ? 'safe' : 'warning'}`} id="tag-tds">
                  {tdsSafe ? 'SAFE' : 'WARNING'}
                </span>
              </div>
              <div className="sensor-box-body">
                <span className="sensor-name">TDS / Solids</span>
                <b className="sensor-value" id="val-tds">{latest?.tds ?? '4.9'}</b>
                <small className="sensor-safe" id="safe-tds">
                  Safe: ≤ {profile ? profile.tdsMax : '6.0'}
                </small>
              </div>
            </div>

            {/* Optical Color */}
            <div className="sensor-box sensor-color" id="box-color">
              <div className="sensor-box-top">
                <span className="sensor-icon">👁</span>
                <span className={`sensor-tag ${colorSafe ? 'safe' : 'flagged'}`} id="tag-color">
                  {colorSafe ? 'NORMAL' : 'FLAGGED'}
                </span>
              </div>
              <div className="sensor-box-body">
                <span className="sensor-name">Optical Color</span>
                <b className="sensor-value" id="val-color">{latest?.color ?? 'Normal'}</b>
                <small className="sensor-safe" id="safe-color">
                  {profile?.expectedColor || 'White / Off-White'}
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Interactive Camera & Visual Inspection */}
        <section className="card camera-card">
          <div className="card-header">
            <div className="card-title">
              <span>📷</span>
              <b>Sample Visual Camera</b>
            </div>
            <span className="badge badge-subtle">WebCam / ESP32-CAM</span>
          </div>

          <div className="camera-viewport" id="cameraViewport">
            <video
              ref={videoRef}
              id="cameraVideo"
              autoPlay
              playsInline
              style={{
                display: isWebcamActive ? 'block' : 'none',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '10px'
              }}
            />
            <canvas ref={canvasRef} id="cameraCanvas" style={{ display: 'none' }} />
            {capturedImage && (
              <img
                src={capturedImage}
                id="capturedImagePreview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '10px'
                }}
                alt="Sample snapshot"
              />
            )}
            {!isWebcamActive && !capturedImage && (
              <div className="camera-placeholder" id="cameraPlaceholder">
                <div className="cam-lens">
                  <div className="cam-lens-inner">👁</div>
                </div>
                <p>Live WebCam or ESP32-CAM stream</p>
                <small className="text-muted">Click below to activate device webcam</small>
              </div>
            )}
          </div>

          <div className="camera-controls">
            <button className="btn btn-sm btn-primary" id="startCamBtn" onClick={toggleWebcam}>
              {isWebcamActive ? '⏹ Close WebCam' : '📹 Open WebCam'}
            </button>
            {isWebcamActive && (
              <button className="btn btn-sm btn-emerald" id="snapCamBtn" onClick={captureAndAnalyze}>
                ▣ Snap &amp; Analyze
              </button>
            )}
            <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer' }}>
              📁 Upload
              <input
                type="file"
                id="imageUploadInput"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
            </label>
          </div>

          {visualResult && (
            <div className="visual-analysis-box" id="visualAnalysisResult">
              <div className="analysis-status-row">
                <span
                  className={`badge ${visualResult.visualStatus === 'NORMAL' ? 'badge-emerald' : 'badge-amber'}`}
                  id="visualStatusBadge"
                >
                  {visualResult.visualStatus === 'NORMAL' ? '✓ Visual Clean' : '⚠️ Flagged'}
                </span>
                <small id="visualConfidence">Confidence: {visualResult.confidence}</small>
              </div>
              <p id="visualAnalysisSummary">
                {visualResult.message} Detected: {visualResult.detectedColor}.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Mid Grid: Charts & Parameter Breakdown */}
      <div className="grid mid-grid">
        {/* Multi-Parameter Trend Chart */}
        <section className="card chart-card">
          <div className="card-header">
            <div className="card-title">
              <span>📊</span>
              <b>Real-Time Parameter Trend</b>
            </div>
            <div className="chart-tab-group">
              {['all', 'ph', 'gas', 'temp', 'score'].map(type => (
                <button
                  key={type}
                  className={`chart-tab ${activeChartFilter === type ? 'active' : ''}`}
                  onClick={() => handleChartFilter(type)}
                >
                  {type === 'all' ? 'All' : type === 'gas' ? 'MQ135 Gas' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: '260px' }}>
            <canvas ref={chartCanvasRef} id="trendChart"></canvas>
          </div>
        </section>

        {/* Parameter Safety Compliance Bars */}
        <section className="card param-status-card">
          <div className="card-header">
            <div className="card-title">
              <span>⚙</span>
              <b>Parameter Safety Compliance</b>
            </div>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Safe Margin Check
            </span>
          </div>

          <div className="param-list" id="paramStatusList">
            {paramData.map((p, idx) => (
              <div className="param-row" key={idx}>
                <div className="param-info">
                  <span className="param-name">{p.name}</span>
                  <span className="param-safe text-muted">({p.safeRange})</span>
                </div>
                <div className="param-bar-wrap">
                  <div
                    className={`param-bar-fill ${p.status.toLowerCase()}`}
                    style={{ width: `${p.percent}%` }}
                  ></div>
                </div>
                <div className="param-meta">
                  <b className="param-val">{p.value}</b>
                  <span className={`param-status-tag ${p.status.toLowerCase()}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent Test History Section */}
      <section className="card history-card">
        <div className="card-header">
          <div className="card-title">
            <span>◷</span>
            <b>Recent Sensor Records</b>
          </div>
          <div className="history-actions">
            <button className="btn btn-sm btn-outline" onClick={openManualModal}>
              ＋ New Record
            </button>
            <a className="btn btn-sm btn-outline" href="/api/history/export-csv" download>
              ⇩ Download CSV
            </a>
            <Link className="btn btn-sm btn-primary" to="/history">
              View Full History →
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          <table id="recentHistoryTable">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Food Item</th>
                <th>pH</th>
                <th>Gas (ppm)</th>
                <th>Temp (°C)</th>
                <th>Humidity (%)</th>
                <th>TDS</th>
                <th>Color</th>
                <th>Quality Score</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="recentHistoryBody">
              {history.slice(0, 8).map(r => {
                const foodObj = foods.find(f => f.key === r.foodType);
                const scoreClass =
                  r.qualityScore >= 80 ? 'high' : r.qualityScore >= 55 ? 'med' : 'low';
                return (
                  <tr key={r.id} id={`row-${r.id}`}>
                    <td>
                      {new Date(r.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td>
                      <span className="food-chip">
                        {foodObj ? foodObj.icon : '🍽️'} {foodObj ? foodObj.name : r.foodType}
                      </span>
                    </td>
                    <td><b>{r.ph}</b></td>
                    <td>{r.gas} ppm</td>
                    <td>{r.temperature} °C</td>
                    <td>{r.humidity} %</td>
                    <td>{r.tds}</td>
                    <td>{r.color || 'Normal'}</td>
                    <td>
                      <span className={`score-badge ${scoreClass}`}>
                        {r.qualityScore} / 100
                      </span>
                    </td>
                    <td>
                      <span className={`status-chip ${r.status.toLowerCase()}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/reading/${r.id}`}
                        className="btn-table-action"
                        title="View Full Inspection Certificate"
                      >
                        Certificate ↗
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Engineering Team & About Us Quick Section */}
      <section className="card dashboard-about-card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title">
            <span>👥</span>
            <b>Project Engineering Team &amp; Developers</b>
          </div>
          <Link to="/about" className="btn btn-sm btn-outline">
            Full About Us Page →
          </Link>
        </div>
        <div className="dashboard-team-grid">
          <div className="dev-mini-card">
            <img
              src="/images/divyanshu.jpg"
              alt="Divyanshu Tripathi"
              className="dev-mini-photo"
            />
            <div>
              <b>Divyanshu Tripathi</b>
              <small className="text-emerald">Lead Full-Stack Developer</small>
              <p>System architecture, backend algorithms, real-time live telemetry, UI/UX.</p>
            </div>
          </div>
          <div className="dev-mini-card">
            <img
              src="/images/pranjal.png"
              alt="Pranjal Shahi"
              className="dev-mini-photo"
            />
            <div>
              <b>Pranjal Shahi</b>
              <small className="text-emerald">IoT Hardware Engineer</small>
              <p>ESP32 microcontroller firmware, analog sensor calibration &amp; circuits.</p>
            </div>
          </div>
          <div className="team-mini-list">
            <span className="team-mini-title">PROJECT TEAM MEMBERS:</span>
            <div className="team-pills">
              <span className="team-pill"><b>Divyanshu Tripathi</b> (Developer)</span>
              <span className="team-pill"><b>Pranjal Shahi</b> (Developer)</span>
              <span className="team-pill"><b>Kritika Singh</b> (Quality Research)</span>
              <span className="team-pill"><b>Pallavi Dubey</b> (Documentation)</span>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
