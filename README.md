# FoodGuard - Smart Multi-Parameter Food Quality Detection System 🍃

A comprehensive, fully functional MVC-based IoT Food Quality Monitoring and Spoilage Detection platform developed for Final Year Engineering projects.

Features real-time continuous sensor ingestion, rule-based diagnostic evaluation, cold-chain compliance tracking, interactive simulator controls, flashable ESP32 Arduino firmware, and camera-based visual food inspection.

---

## 🚀 Key Features & Functionality

### 1. ⌂ Dashboard (`/`)
- **Real-Time Dynamic Telemetry**: Live polling every 3 seconds updating quality status, score, sensor cards, and recent records seamlessly without full page reload.
- **Dynamic Verdict Badge**: Color-coded status (`FRESH`, `WARNING`, `SPOILED`) with diagnostic summary explanation.
- **Sensor Parameter Cards**: Real-time pH, MQ-135 Gas (ppm), Temperature (°C), Relative Humidity (%), TDS solids, and Optical Color.
- **Interactive Multi-Axis Trend Chart**: Chart.js time-series graph with toggleable filters (All, pH, MQ135 Gas, Temperature, Quality Score).
- **Parameter Safety Compliance Bars**: Visual bars displaying exact distance from food-specific reference thresholds.
- **Functional Camera Inspection**: Live device webcam capture (`getUserMedia`), sample image upload, and optical discoloration / freshness analysis.
- **Interactive Quick Actions**:
  - `🔬 Test Sample Now`: Open manual test modal with custom sensor values.
  - `⚠️ Simulate Spoilage Anomaly`: Inject an instant spoiled reading to test buzzer alarms.
  - `⏸ Pause / ▶ Resume`: Toggle real-time stream.

### 2. ▥ Live Monitoring Cockpit (`/live`)
- **High-Frequency Telemetry**: Continuous streaming sensor cockpit with latency indicator.
- **Visual Gauge Meters**: Dedicated gauge bars for pH (0–14 with target marker), MQ-135 Gas (0–500 ppm), Temperature (0–40°C), and Humidity.
- **Circular Quality Score Gauge**: Animated SVG radial indicator with color transitions.
- **Live Event Log Stream**: Scrolling terminal console logging every sensor packet and alert in real-time.
- **On-The-Fly Slider Tester**: Adjust physical sensor sliders and click "Submit & Evaluate" for immediate rule classification.
- **Synthesized Audio Alarm Buzzer**: Web Audio API electronic alarm sounded when a spoiled reading is received.

### 3. ◷ Test History & Logs (`/history`)
- **Multi-Filter & Search**: Filter by food category, quality status (Fresh, Warning, Spoiled), or search keyword.
- **Pagination**: Navigate large historical test sets with Previous/Next controls.
- **Data Export**: One-click download to **CSV** (`/api/history/export-csv`) or raw **JSON**.
- **Inspection Certificate**: Click "Certificate ↗" to view the formal lab report for any historical reading.
- **Record Management**: Delete individual records or wipe the entire test database.

### 4. ⌁ Analytics & Intelligence (`/analytics`)
- **Executive KPI Cards**: Total Samples, Fresh Compliance Rate %, Warning Rate %, Spoilage Rate %, and Average Quality Score.
- **Interactive Visualizations**:
  - Classification Breakdown Donut Chart
  - Sample Volume by Food Category Bar Chart
  - Average Physicochemical Markers Across Foods
  - MQ-135 Gas Spikes vs Quality Score Correlation Timeline
- **Automated Insights**: Intelligence notes on primary spoilage indicators and cold chain degradation.

### 5. ◇ Food Profiles & Thresholds (`/food-types`)
- **Configurable Safety Profiles**: Complete profile manager for Milk, Paneer, Curd, Water, Packed Food, Meat, Juice, and custom items.
- **Threshold Configuration**: Min/Max pH, Max Gas (ppm), Max Storage Temp (°C), Humidity limits, TDS, Turbidity, and Expected Appearance.
- **Profile Modals**: Add custom food categories or update existing threshold parameters with instant persistence.

### 6. ⚡ Device & ESP32 Hardware Integration (`/device`)
- **Node Telemetry**: Track connection mode (ESP32 Hardware vs Mock Simulator), Wi-Fi SSID, IP, packet counter, uptime, and last seen timestamp.
- **Ping Diagnostic**: Measure round-trip ping latency to the IoT node.
- **Interactive API Console**: Test sending `POST /api/sensor-data` directly from the browser and inspect the JSON response.
- **ESP32 Firmware Generator**: View, copy, or download the complete, ready-to-flash `FoodGuard_ESP32.ino` Arduino sketch.
- **Sensor Pinout Guide**: Wiring specifications for Analog pH probe (GPIO34), MQ-135 Gas (GPIO35), DS18B20/DHT11 (GPIO4), TDS (GPIO32), and Buzzer (GPIO18).

### 7. ⚙ Settings & Calibration (`/settings`)
- **Simulator Toggle**: Enable or disable the background Mock ESP32 generator.
- **Simulator Frequency**: Configure reading interval in seconds (2s – 300s).
- **History Retention**: Configurable rolling cleanup window (7, 14, 20, 30 days).
- **Audible Buzzer**: Toggle audio alarm on/off.
- **Sensor Calibration**: Adjust probe calibration offsets (pH offset, Temperature offset).
- **Database Operations**: "Re-Seed Realistic 20-Day Dataset", "Download Full JSON Backup", or "Wipe Database".

### 8. 📜 Inspection Certificate (`/reading/:id`)
- Formal laboratory quality certificate with unique Certificate ID, timestamp, and source tag.
- Detailed parameter compliance table comparing measured vs reference ranges.
- Diagnostic findings explaining reason for point deductions.
- Storage and handling safety recommendations.
- Print-ready layout (`Ctrl+P` / `window.print()`).

---

## 🛠️ Technology Stack
- **Backend**: Node.js, Express 5, EJS templating, Morgan logger, dotenv.
- **Frontend**: Vanilla CSS Design System, Responsive Glassmorphism, Chart.js 4, Web Audio API, HTML5 MediaDevices (WebCam).
- **Data Layer**: Persisted atomic JSON stores (`data/readings.json`, `data/foodProfiles.json`, `data/settings.json`).
- **IoT Firmware**: C++ Arduino IDE sketch for ESP32 with WiFiClient and ArduinoJson.

---

## 💻 Quick Start

### 1. Installation
```bash
npm install
copy .env.example .env
npm start
```

### 2. Access Web Dashboard
Open your browser and navigate to:
```
http://localhost:8080
```

---

## 📡 Hardware Integration (ESP32)

Configure your ESP32 to send HTTP POST requests:
- **Endpoint**: `POST http://<YOUR-PC-IP>:8080/api/sensor-data`
- **Content-Type**: `application/json`

**Sample Payload**:
```json
{
  "foodType": "milk",
  "ph": 6.65,
  "gas": 110,
  "temperature": 5.8,
  "humidity": 62,
  "tds": 4.9,
  "turbidity": 1.4,
  "color": "Normal",
  "wifi": "FoodGuard-WiFi",
  "ip": "192.168.1.50"
}
```

The system automatically switches to `HARDWARE / ESP32` mode upon receiving real sensor packets.

---

## 👥 Project Team & Developers

### Lead Developers & System Architects
- **Divyanshu Tripathi** — Lead Full-Stack Developer & System Architect
  - Architected the complete MVC framework, Express REST APIs, multi-parameter quality evaluation engine, real-time live telemetry streaming, and frontend UI design system.
- **Pranjal Shahi** — IoT Hardware Engineer & Embedded Systems Developer
  - Engineered the ESP32 microcontroller firmware, analog sensor signal acquisition (MQ-135, pH probe, TDS), hardware wiring circuits, and Wi-Fi HTTP telemetry.

### Complete Final Year Project Members
1. **Divyanshu Tripathi** — Developer & System Architect (System architecture, backend development, live telemetry, UI styling)
2. **Pranjal Shahi** — Developer & IoT Engineer (ESP32 firmware, analog sensor calibration, hardware testing, circuit layout)
3. **Kritika Singh** — Quality Research & Sensor Testing (Biochemical threshold research, reference standards verification, sample testing)
4. **Pallavi Dubey** — Data Analytics & Documentation (Experimental documentation, technical report authoring, accuracy evaluation)

---

## 📄 License & Attribution
Developed for Final Year Engineering Project - FoodGuard Smart IoT Quality Detection System.
