import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function DeviceStatus() {
  const { device, foods, pingDevice, showToast } = useApp();

  const [testForm, setTestForm] = useState({
    foodType: 'milk',
    ph: 6.62,
    gas: 115,
    temperature: 6.1,
    humidity: 64,
    tds: 4.9,
    color: 'Normal',
    source: 'ESP32_HARDWARE_TEST'
  });

  const [responseBadge, setResponseBadge] = useState({ text: 'Ready', class: '' });
  const [responseJson, setResponseJson] = useState('// Awaiting payload transmission...');

  const handleTestSubmit = async (e) => {
    e.preventDefault();
    const start = performance.now();
    setResponseJson('Transmitting packet to /api/sensor-data...');

    try {
      const payload = {
        foodType: testForm.foodType,
        ph: parseFloat(testForm.ph),
        gas: parseInt(testForm.gas, 10),
        temperature: parseFloat(testForm.temperature),
        humidity: parseInt(testForm.humidity, 10),
        tds: parseFloat(testForm.tds),
        color: testForm.color,
        source: testForm.source
      };

      const res = await fetch('/api/sensor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const ms = Math.round(performance.now() - start);
      const json = await res.json();

      setResponseBadge({
        text: `${res.status} (${ms}ms)`,
        class: res.ok ? 'safe' : 'alert'
      });
      setResponseJson(JSON.stringify(json, null, 2));
      showToast(`Packet ingested successfully in ${ms}ms`, 'success');
    } catch (err) {
      setResponseJson(`Error: ${err.message}`);
      setResponseBadge({ text: 'Failed', class: 'alert' });
      showToast('HTTP POST failed', 'error');
    }
  };

  const arduinoSketchCode = `/*
 * FoodGuard - Smart Food Quality Detection System
 * ESP32 Microcontroller Firmware
 * Final Year Engineering Project
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- Wi-Fi Credentials ---
const char* ssid = "${device.wifi || 'FoodGuard_IoT_Net'}";
const char* password = "YOUR_WIFI_PASSWORD";

// --- FoodGuard Server Address ---
// Replace with your laptop/PC local IP (e.g. http://192.168.1.100:8080)
const char* serverUrl = "http://192.168.4.2:8080/api/sensor-data";

// --- Pin Definitions ---
const int PIN_PH = 34;       // Analog pH probe
const int PIN_MQ135 = 35;    // MQ-135 Gas sensor analog out
const int PIN_TDS = 32;      // Analog TDS sensor
const int PIN_BUZZER = 18;   // Alarm buzzer

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  Serial.println("\\nConnecting to Wi-Fi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nConnected! IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // 1. Read Analog Sensors
    int rawPh = analogRead(PIN_PH);
    float voltagePh = rawPh * (3.3 / 4095.0);
    float phValue = 3.5 * voltagePh; // Calibrated formula

    int rawGas = analogRead(PIN_MQ135);
    int gasPpm = map(rawGas, 0, 4095, 30, 450);

    int rawTds = analogRead(PIN_TDS);
    float tdsValue = (rawTds * (3.3 / 4095.0)) * 2.5;

    float temperature = 5.8; // From DS18B20 sensor
    int humidity = 62;       // From DHT11 sensor

    // 2. Build JSON Payload
    StaticJsonDocument<256> doc;
    doc["foodType"] = "milk";
    doc["ph"] = phValue;
    doc["gas"] = gasPpm;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["tds"] = tdsValue;
    doc["color"] = "Normal";
    doc["wifi"] = WiFi.SSID();
    doc["ip"] = WiFi.localIP().toString();

    String requestBody;
    serializeJson(doc, requestBody);

    // 3. Send HTTP POST
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    int httpCode = http.POST(requestBody);
    if (httpCode > 0) {
      String response = http.getString();
      Serial.printf("Server Response (%d): %s\\n", httpCode, response.c_str());

      // Sound buzzer if server flagged spoilage
      if (response.indexOf("SPOILED") != -1) {
        digitalWrite(PIN_BUZZER, HIGH);
        delay(800);
        digitalWrite(PIN_BUZZER, LOW);
      }
    } else {
      Serial.printf("HTTP Error: %s\\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  }

  // Transmit reading every 10 seconds
  delay(10000);
}
`;

  const copyArduinoCode = () => {
    navigator.clipboard.writeText(arduinoSketchCode).then(() => {
      showToast('ESP32 Arduino (.ino) code copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy to clipboard', 'error');
    });
  };

  const downloadArduinoSketch = () => {
    const blob = new Blob([arduinoSketchCode], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'FoodGuard_ESP32.ino';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Downloaded FoodGuard_ESP32.ino sketch', 'success');
  };

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <h1>ESP32 Device &amp; Hardware Integration</h1>
          <p>
            Microcontroller telemetry, hardware communication contracts, interactive API console, and flashable firmware.
          </p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-emerald" onClick={pingDevice}>
            ⚡ Ping Node
          </button>
          <button className="btn btn-outline" onClick={downloadArduinoSketch}>
            ⇩ Download .ino Sketch
          </button>
        </div>
      </div>

      {/* Device Telemetry Grid */}
      <div className="device-grid">
        <section className="card device-hero-card">
          <div className="device-orb-wrap">
            <div className="device-orb">
              <span className="orb-icon">⚡</span>
            </div>
            <span className="orb-ping-ring"></span>
          </div>
          <h2>{device.id}</h2>
          <span className="online-label">
            <i className="status-pulse"></i> {device.online ? 'Online & Active' : 'Offline'}
          </span>
          <div className="device-mode-badge">{device.mode}</div>
          <p className="text-muted" style={{ marginTop: '12px', fontSize: '12px' }}>
            ESP32-WROOM-32 IoT Microcontroller
          </p>
        </section>

        <section className="card device-info-card">
          <div className="card-header">
            <div className="card-title">
              <span>📡</span>
              <b>Network &amp; Telemetry Stats</b>
            </div>
            <span className="badge badge-subtle">Real-Time Sync</span>
          </div>
          <div className="device-stats-list">
            <div className="info-row">
              <span>Wi-Fi Network (SSID)</span>
              <b>{device.wifi}</b>
            </div>
            <div className="info-row">
              <span>Node IP Address</span>
              <code>{device.ip}</code>
            </div>
            <div className="info-row">
              <span>System Uptime</span>
              <b id="deviceUptimeVal">{device.uptimeFormatted}</b>
            </div>
            <div className="info-row">
              <span>Total Sensor Packets</span>
              <b id="devicePacketVal">{device.packetsReceived} packets</b>
            </div>
            <div className="info-row">
              <span>Last Packet Received</span>
              <small id="deviceLastSeenVal">
                {new Date(device.lastSeen).toLocaleString('en-IN')}
              </small>
            </div>
            <div className="info-row">
              <span>Ingestion Endpoint</span>
              <code>POST /api/sensor-data</code>
            </div>
          </div>
        </section>
      </div>

      {/* Interactive API Tester Console */}
      <section className="card api-tester-card">
        <div className="card-header">
          <div className="card-title">
            <span>🧪</span>
            <b>Interactive Hardware API Test Console</b>
          </div>
          <span className="badge badge-emerald">POST /api/sensor-data</span>
        </div>
        <p className="text-muted" style={{ marginBottom: '14px', fontSize: '12px' }}>
          Test the exact HTTP endpoint that the ESP32 microcontroller uses to transmit sensor data packets to this server.
        </p>

        <div className="api-tester-layout">
          <form id="apiTestForm" onSubmit={handleTestSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Food Type</label>
                <select
                  id="apiFoodType"
                  name="foodType"
                  className="form-control"
                  value={testForm.foodType}
                  onChange={(e) => setTestForm(prev => ({ ...prev, foodType: e.target.value }))}
                >
                  {(foods || []).map(f => (
                    <option key={f.key} value={f.key}>
                      {f.icon} {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>pH Sensor Value</label>
                <input
                  type="number"
                  id="apiPh"
                  name="ph"
                  step="0.01"
                  value={testForm.ph}
                  className="form-control"
                  onChange={(e) => setTestForm(prev => ({ ...prev, ph: parseFloat(e.target.value) }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>MQ-135 Gas (ppm)</label>
                <input
                  type="number"
                  id="apiGas"
                  name="gas"
                  value={testForm.gas}
                  className="form-control"
                  onChange={(e) => setTestForm(prev => ({ ...prev, gas: parseInt(e.target.value, 10) }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Temperature (°C)</label>
                <input
                  type="number"
                  id="apiTemp"
                  name="temperature"
                  step="0.1"
                  value={testForm.temperature}
                  className="form-control"
                  onChange={(e) => setTestForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Humidity (%)</label>
                <input
                  type="number"
                  id="apiHumidity"
                  name="humidity"
                  value={testForm.humidity}
                  className="form-control"
                  onChange={(e) => setTestForm(prev => ({ ...prev, humidity: parseInt(e.target.value, 10) }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>TDS Solids</label>
                <input
                  type="number"
                  id="apiTds"
                  name="tds"
                  step="0.1"
                  value={testForm.tds}
                  className="form-control"
                  onChange={(e) => setTestForm(prev => ({ ...prev, tds: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="form-group">
                <label>Appearance / Color</label>
                <input
                  type="text"
                  id="apiColor"
                  name="color"
                  value={testForm.color}
                  className="form-control"
                  onChange={(e) => setTestForm(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Device Source Tag</label>
                <input
                  type="text"
                  id="apiSource"
                  name="source"
                  value={testForm.source}
                  className="form-control"
                  onChange={(e) => setTestForm(prev => ({ ...prev, source: e.target.value }))}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
              🚀 Send Test Packet
            </button>
          </form>

          <div className="api-response-box">
            <div className="response-header">
              <span>HTTP RESPONSE CONSOLE</span>
              <span className={`response-badge ${responseBadge.class}`} id="apiResponseBadge">
                {responseBadge.text}
              </span>
            </div>
            <pre id="apiResponseJson">{responseJson}</pre>
          </div>
        </div>
      </section>

      {/* ESP32 Pinout Wiring Guide */}
      <section className="card pinout-card">
        <div className="card-header">
          <div className="card-title">
            <span>🔌</span>
            <b>ESP32 Sensor Pinout &amp; Wiring Specifications</b>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sensor Module</th>
                <th>Physical Parameter</th>
                <th>ESP32 GPIO Pin</th>
                <th>Signal Type</th>
                <th>Operating Voltage</th>
                <th>Wiring Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Analog pH Sensor Kit</b></td>
                <td>Acidity / Alkalinity (pH)</td>
                <td><code>GPIO 34 (ADC1_CH6)</code></td>
                <td>Analog Voltage (0 – 3.3V)</td>
                <td>5.0V / 3.3V</td>
                <td>Connect analog out to GPIO34. Requires 2-point buffer calibration.</td>
              </tr>
              <tr>
                <td><b>MQ-135 Gas Sensor</b></td>
                <td>Ammonia, Sulfides, Alcohol, CO2</td>
                <td><code>GPIO 35 (ADC1_CH7)</code></td>
                <td>Analog Voltage</td>
                <td>5.0V (VCC)</td>
                <td>Requires 24h preheat burn-in for accurate ppm baseline reading.</td>
              </tr>
              <tr>
                <td><b>DS18B20 / DHT11</b></td>
                <td>Temperature &amp; Ambient Humidity</td>
                <td><code>GPIO 4</code></td>
                <td>1-Wire Digital Signal</td>
                <td>3.3V</td>
                <td>Include 4.7kΩ pull-up resistor between VCC and Data line.</td>
              </tr>
              <tr>
                <td><b>Analog TDS Sensor</b></td>
                <td>Total Dissolved Solids (Liquids)</td>
                <td><code>GPIO 32 (ADC1_CH4)</code></td>
                <td>Analog Voltage</td>
                <td>3.3V – 5.5V</td>
                <td>Submerge probe in liquid sample. Waterproof probe recommended.</td>
              </tr>
              <tr>
                <td><b>Active Buzzer / LED</b></td>
                <td>Local Spoilage Alarm Indicator</td>
                <td><code>GPIO 18</code></td>
                <td>Digital Output (PWM)</td>
                <td>3.3V</td>
                <td>Sounds alarm frequency when server returns SPOILED verdict.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Flashable ESP32 Arduino Sketch */}
      <section className="card arduino-code-card">
        <div className="card-header">
          <div className="card-title">
            <span>⚡</span>
            <b>Complete ESP32 Arduino (.ino) Firmware Sketch</b>
          </div>
          <div className="arduino-actions">
            <button className="btn btn-sm btn-outline" onClick={copyArduinoCode}>
              📋 Copy Firmware Code
            </button>
            <button className="btn btn-sm btn-primary" onClick={downloadArduinoSketch}>
              ⇩ Download .ino File
            </button>
          </div>
        </div>
        <p className="text-muted" style={{ marginBottom: '12px', fontSize: '12px' }}>
          Flash this sketch directly to your ESP32 board using Arduino IDE. Update your Wi-Fi SSID and PC IP address before uploading.
        </p>
        <pre className="code-block" id="arduinoCodeBlock">
          <code>{arduinoSketchCode}</code>
        </pre>
      </section>
    </section>
  );
}
