import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import FoodTabs from '../components/FoodTabs';
import Chart from 'chart.js/auto';

export default function LiveMonitoring() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    device,
    foods,
    selectedFood,
    switchActiveFood,
    triggerQuickRead,
    triggerQuickAnomaly,
    playBuzzerSound,
    showToast
  } = useApp();

  const activeFoodParam = searchParams.get('food') || selectedFood || 'milk';

  const [livePaused, setLivePaused] = useState(false);
  const [latest, setLatest] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pingMs, setPingMs] = useState('18ms');
  const [packetCount, setPacketCount] = useState(device?.packetsReceived || 1);

  // Event terminal log lines
  const [eventLogs, setEventLogs] = useState([
    { id: 1, text: '[System] FoodGuard Live Telemetry initialized.', color: 'text-muted' },
    { id: 2, text: `[Connected] Active sensor profile: ${activeFoodParam.toUpperCase()}`, color: 'text-emerald' },
    { id: 3, text: '[Stream] Listening on POST /api/sensor-data and Mock Simulator...', color: 'text-muted' }
  ]);
  const terminalRef = useRef(null);

  // Quick tester sliders
  const [sliderPh, setSliderPh] = useState(6.65);
  const [sliderGas, setSliderGas] = useState(110);
  const [sliderTemp, setSliderTemp] = useState(5.8);
  const [quickFood, setQuickFood] = useState(activeFoodParam);

  // Live Chart Ref
  const chartCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const prevStatusRef = useRef(null);

  const fetchLiveStatus = useCallback(async (foodKey) => {
    const start = performance.now();
    try {
      const res = await fetch(`/api/status?food=${encodeURIComponent(foodKey)}`);
      const latency = Math.round(performance.now() - start);
      setPingMs(`${latency}ms`);

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setLatest(d);
        setProfile(json.profile);
        if (json.device) {
          setPacketCount(json.device.packetsReceived || 1);
        }

        // Sound alarm on spoilage transition
        if (d.status === 'SPOILED' && prevStatusRef.current !== 'SPOILED') {
          playBuzzerSound();
        }
        prevStatusRef.current = d.status;

        // Push into streaming chart
        if (chartInstanceRef.current) {
          const t = new Date(d.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          const labels = chartInstanceRef.current.data.labels;
          labels.push(t);
          if (labels.length > 15) labels.shift();

          chartInstanceRef.current.data.datasets[0].data.push(d.gas);
          if (chartInstanceRef.current.data.datasets[0].data.length > 15) {
            chartInstanceRef.current.data.datasets[0].data.shift();
          }

          chartInstanceRef.current.data.datasets[1].data.push(d.ph);
          if (chartInstanceRef.current.data.datasets[1].data.length > 15) {
            chartInstanceRef.current.data.datasets[1].data.shift();
          }

          chartInstanceRef.current.update('none');
        }

        // Append to terminal
        const timeStr = new Date(d.timestamp).toLocaleTimeString();
        const statusColor =
          d.status === 'FRESH'
            ? 'text-emerald'
            : d.status === 'WARNING'
            ? 'text-amber'
            : 'text-rose';
        setEventLogs(prev => [
          ...prev.slice(-49),
          {
            id: Date.now() + Math.random(),
            text: `[${timeStr}] ${d.foodType.toUpperCase()}: pH ${d.ph} | Gas ${d.gas}ppm | Temp ${d.temperature}°C -> ${d.status} (Score ${d.qualityScore}/100)`,
            color: statusColor
          }
        ]);
      }
    } catch (e) {
      console.error('Error polling live stream:', e);
    }
  }, [playBuzzerSound]);

  // Handle active food change
  const handleSelectFood = (foodKey) => {
    switchActiveFood(foodKey);
    setQuickFood(foodKey);
    setSearchParams({ food: foodKey });
  };

  useEffect(() => {
    fetchLiveStatus(activeFoodParam);
  }, [activeFoodParam, fetchLiveStatus]);

  // Polling loop
  useEffect(() => {
    if (livePaused) return;
    const timer = setInterval(() => {
      fetchLiveStatus(activeFoodParam);
    }, 2500);
    return () => clearInterval(timer);
  }, [livePaused, activeFoodParam, fetchLiveStatus]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [eventLogs]);

  // Init Live Streaming Chart
  useEffect(() => {
    if (!chartCanvasRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const points = 12;
    const initialLabels = Array.from({ length: points }, (_, i) => `-${(points - i) * 3}s`);
    const initialGas = Array.from({ length: points }, () =>
      Math.round(105 + (Math.random() - 0.5) * 15)
    );
    const initialPh = Array.from({ length: points }, () =>
      Number((6.6 + (Math.random() - 0.5) * 0.1).toFixed(2))
    );

    const ctx = chartCanvasRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
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

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, []);

  const toggleLiveStream = () => {
    setLivePaused(prev => {
      const next = !prev;
      showToast(next ? 'Live telemetry paused' : 'Live telemetry running', 'info');
      return next;
    });
  };

  const clearEventLog = () => {
    setEventLogs([{ id: 1, text: '[System] Event log cleared.', color: 'text-muted' }]);
  };

  const submitQuickTest = async () => {
    try {
      const res = await fetch('/api/simulate/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodType: quickFood,
          ph: parseFloat(sliderPh),
          gas: parseInt(sliderGas, 10),
          temperature: parseFloat(sliderTemp)
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          `Quick Test evaluated: ${json.data.status} (Score ${json.data.qualityScore})`,
          json.data.status === 'FRESH' ? 'success' : 'warning'
        );
        fetchLiveStatus(quickFood);
      }
    } catch (e) {
      showToast('Error submitting test', 'error');
    }
  };

  const score = latest?.qualityScore ?? 95;
  const status = latest?.status || 'FRESH';
  const statusColor = status === 'FRESH' ? '#27ae60' : status === 'WARNING' ? '#f39c12' : '#e74c3c';
  const circumference = 264;
  const strokeOffset = circumference - (circumference * score) / 100;

  // Safe checks
  const phSafe = profile
    ? latest?.ph >= profile.phMin && latest?.ph <= profile.phMax
    : true;
  const gasSafe = profile ? (latest?.gas ?? 105) <= profile.gasMax : true;
  const tempSafe = profile ? (latest?.temperature ?? 5.8) <= profile.tempMax : true;
  const humSafe = profile
    ? (latest?.humidity ?? 62) >= profile.humidityMin &&
      (latest?.humidity ?? 62) <= profile.humidityMax
    : true;

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <div className="live-status-pill">
            <span className="live-dot-pulse"></span>
            <span className="live-dot-text">LIVE TELEMETRY STREAM</span>
          </div>
          <h1>Live Sensor Cockpit</h1>
          <p>Continuous data streaming from ESP32 microcontroller and real-time rule evaluation engine.</p>
        </div>
        <div className="live-toolbar">
          <button
            className={livePaused ? 'btn btn-primary' : 'btn btn-outline'}
            id="livePauseBtn"
            onClick={toggleLiveStream}
          >
            {livePaused ? '▶ Resume Stream' : '⏸ Pause Stream'}
          </button>
          <button
            className="btn btn-emerald"
            onClick={() => triggerQuickRead(() => fetchLiveStatus(activeFoodParam))}
          >
            ⚡ Trigger Read
          </button>
          <button
            className="btn btn-amber"
            onClick={() => triggerQuickAnomaly(() => fetchLiveStatus(activeFoodParam))}
          >
            ⚠️ Inject Anomaly
          </button>
        </div>
      </div>

      {/* Food selector tabs */}
      <FoodTabs activeFood={activeFoodParam} onSelectFood={handleSelectFood} />

      {/* Live Telemetry Top Row */}
      <div className="live-cockpit-grid">
        {/* Big Live Verdict Panel */}
        <section className="card live-verdict-card">
          <div className="live-verdict-inner">
            <div className="live-node-badge">
              <span className="node-icon">⚡</span>
              <div>
                <small>ACTIVE SENSOR NODE</small>
                <b>{device?.id || 'ESP32-FOODGUARD'}</b>
              </div>
            </div>
            <div className="live-score-circle">
              <svg className="score-svg" viewBox="0 0 100 100">
                <circle className="score-bg" cx="50" cy="50" r="42"></circle>
                <circle
                  className="score-fill"
                  id="liveScoreCircle"
                  cx="50"
                  cy="50"
                  r="42"
                  strokeDasharray="264"
                  strokeDashoffset={strokeOffset}
                  style={{ stroke: statusColor }}
                ></circle>
              </svg>
              <div className="score-center-text">
                <span className="score-val" id="liveScoreNum">{score}</span>
                <small>SCORE</small>
              </div>
            </div>
            <div className="live-verdict-status">
              <span className={`status-chip ${status.toLowerCase()}`} id="liveStatusChip">
                {status}
              </span>
              <span className="live-eval-msg text-muted" id="liveRecommendation">
                {latest?.recommendation || 'Parameters optimal. Safe for consumption.'}
              </span>
            </div>
          </div>
        </section>

        {/* Sensor Gauges / Parameter Meters Grid */}
        <section className="card live-meters-card">
          <div className="card-header">
            <div className="card-title">
              <span>🎛</span>
              <b>Active Sensor Meters</b>
            </div>
            <div className="live-latency">
              <span>Ping: <b id="livePingMs">{pingMs}</b></span>
              <span>Packets: <b id="livePacketCount">{packetCount}</b></span>
            </div>
          </div>

          <div className="meters-grid">
            {/* pH Meter */}
            <div className="meter-box">
              <div className="meter-top">
                <span className="meter-label">pH Sensor</span>
                <span className={`meter-badge ${phSafe ? 'safe' : 'alert'}`} id="live-tag-ph">
                  {phSafe ? 'SAFE' : 'ALERT'}
                </span>
              </div>
              <div className="meter-body">
                <span className="meter-val" id="live-val-ph">{latest?.ph ?? 6.65}</span>
                <div className="meter-gauge-bar">
                  <div
                    className="meter-gauge-fill ph-color"
                    id="live-gauge-ph"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((latest?.ph ?? 6.65) / 14) * 100))}%`
                    }}
                  ></div>
                </div>
                <div className="meter-scale">
                  <span>0 (Acidic)</span>
                  <span className="target-marker">Target: {profile ? profile.phOpt : 6.6}</span>
                  <span>14 (Basic)</span>
                </div>
              </div>
            </div>

            {/* MQ-135 Gas Meter */}
            <div className="meter-box">
              <div className="meter-top">
                <span className="meter-label">MQ-135 Gas</span>
                <span className={`meter-badge ${gasSafe ? 'safe' : 'alert'}`} id="live-tag-gas">
                  {gasSafe ? 'SAFE' : 'ALERT'}
                </span>
              </div>
              <div className="meter-body">
                <span className="meter-val" id="live-val-gas">
                  {latest?.gas ?? 105} <small>ppm</small>
                </span>
                <div className="meter-gauge-bar">
                  <div
                    className="meter-gauge-fill gas-color"
                    id="live-gauge-gas"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((latest?.gas ?? 105) / 300) * 100))}%`
                    }}
                  ></div>
                </div>
                <div className="meter-scale">
                  <span>0 ppm</span>
                  <span className="target-marker">Max: {profile ? profile.gasMax : 180}</span>
                  <span>500 ppm</span>
                </div>
              </div>
            </div>

            {/* Temperature Meter */}
            <div className="meter-box">
              <div className="meter-top">
                <span className="meter-label">Temperature</span>
                <span className={`meter-badge ${tempSafe ? 'safe' : 'alert'}`} id="live-tag-temp">
                  {tempSafe ? 'SAFE' : 'ALERT'}
                </span>
              </div>
              <div className="meter-body">
                <span className="meter-val" id="live-val-temp">
                  {latest?.temperature ?? 5.8} <small>°C</small>
                </span>
                <div className="meter-gauge-bar">
                  <div
                    className="meter-gauge-fill temp-color"
                    id="live-gauge-temp"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((latest?.temperature ?? 5.8) / 35) * 100))}%`
                    }}
                  ></div>
                </div>
                <div className="meter-scale">
                  <span>0°C</span>
                  <span className="target-marker">Limit: {profile ? profile.tempMax : 7.0}°C</span>
                  <span>40°C</span>
                </div>
              </div>
            </div>

            {/* Humidity Meter */}
            <div className="meter-box">
              <div className="meter-top">
                <span className="meter-label">Humidity</span>
                <span className={`meter-badge ${humSafe ? 'safe' : 'warning'}`} id="live-tag-humidity">
                  {humSafe ? 'SAFE' : 'WARNING'}
                </span>
              </div>
              <div className="meter-body">
                <span className="meter-val" id="live-val-humidity">
                  {latest?.humidity ?? 62} <small>%</small>
                </span>
                <div className="meter-gauge-bar">
                  <div
                    className="meter-gauge-fill hum-color"
                    id="live-gauge-humidity"
                    style={{ width: `${latest?.humidity ?? 62}%` }}
                  ></div>
                </div>
                <div className="meter-scale">
                  <span>0%</span>
                  <span className="target-marker">
                    {profile ? `${profile.humidityMin}–${profile.humidityMax}%` : '50–75%'}
                  </span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Live Stream Chart & Live Event Log */}
      <div className="grid mid-grid">
        {/* Streaming Chart */}
        <section className="card chart-card">
          <div className="card-header">
            <div className="card-title">
              <span>📈</span>
              <b>Real-Time Continuous Stream</b>
            </div>
            <span className="badge badge-subtle">Auto-Pushing Packets</span>
          </div>
          <div className="chart-container" style={{ position: 'relative', height: '270px' }}>
            <canvas ref={chartCanvasRef} id="liveStreamChart"></canvas>
          </div>
        </section>

        {/* Live Event Log Console */}
        <section className="card event-log-card">
          <div className="card-header">
            <div className="card-title">
              <span>📟</span>
              <b>Sensor Event Stream</b>
            </div>
            <button className="btn-xs btn-outline" onClick={clearEventLog}>
              Clear Log
            </button>
          </div>
          <div className="terminal-window" ref={terminalRef} id="eventTerminal">
            {eventLogs.map(l => (
              <div key={l.id} className={`terminal-line ${l.color}`}>
                {l.text}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Interactive On-The-Fly Manual Sample Tester */}
      <section className="card quick-tester-card">
        <div className="card-header">
          <div className="card-title">
            <span>🧪</span>
            <b>Interactive Sensor Testing Console</b>
          </div>
          <span className="text-muted">Adjust sliders or values to test instant rule classification</span>
        </div>

        <div className="quick-tester-grid">
          <div className="tester-control">
            <label>Food Item</label>
            <select
              id="quickFoodType"
              className="form-control"
              value={quickFood}
              onChange={(e) => setQuickFood(e.target.value)}
            >
              {(foods || []).map(f => (
                <option key={f.key} value={f.key}>
                  {f.icon} {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="tester-control">
            <label>pH Level: <b id="sliderPhVal">{sliderPh}</b></label>
            <input
              type="range"
              id="sliderPh"
              min="3.0"
              max="9.5"
              step="0.05"
              value={sliderPh}
              onChange={(e) => setSliderPh(parseFloat(e.target.value))}
            />
          </div>
          <div className="tester-control">
            <label>MQ-135 Gas: <b id="sliderGasVal">{sliderGas}</b> ppm</label>
            <input
              type="range"
              id="sliderGas"
              min="40"
              max="450"
              step="5"
              value={sliderGas}
              onChange={(e) => setSliderGas(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="tester-control">
            <label>Temperature: <b id="sliderTempVal">{sliderTemp}</b> °C</label>
            <input
              type="range"
              id="sliderTemp"
              min="0"
              max="35"
              step="0.2"
              value={sliderTemp}
              onChange={(e) => setSliderTemp(parseFloat(e.target.value))}
            />
          </div>
          <div className="tester-control tester-action">
            <button className="btn btn-primary btn-block" onClick={submitQuickTest}>
              🧪 Submit &amp; Evaluate
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
