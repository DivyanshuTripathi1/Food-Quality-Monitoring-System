import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutUs() {
  const developers = [
    {
      name: 'Divyanshu Tripathi',
      role: 'Lead Full-Stack Developer',
      badgeRole: 'System Architect & Full-Stack',
      photo: '/images/divyanshu.jpg',
      bio: 'Architected the complete MVC framework, Express REST APIs, multi-parameter food quality evaluation engine, real-time telemetry streaming, Chart.js analytics, camera inspection module, and responsive modern UI design system.',
      skills: ['Full-Stack Web', 'Node.js / Express', 'IoT Architecture', 'Evaluation Algorithms', 'UI/UX Design']
    },
    {
      name: 'Pranjal Shahi',
      role: 'IoT Hardware Engineer & Developer',
      badgeRole: 'IoT & Embedded Systems',
      photo: '/images/pranjal.png',
      bio: 'Engineered the ESP32 microcontroller firmware, analog sensor signal acquisition (MQ-135, pH probe, TDS), hardware wiring circuits, cold chain temperature monitoring, and Wi-Fi HTTP telemetry integration.',
      skills: ['ESP32 Firmware', 'Embedded C/C++', 'Circuit Design', 'MQ-135 Gas Sensing', 'Hardware Telemetry']
    }
  ];

  const teamMembers = [
    {
      name: 'Divyanshu Tripathi',
      role: 'Developer & Team Lead',
      photo: '/images/divyanshu.jpg',
      contribution: 'Full-stack software architecture, Express REST API, automated evaluation logic, real-time live telemetry, and UI styling.'
    },
    {
      name: 'Pranjal Shahi',
      role: 'Developer & IoT Engineer',
      photo: '/images/pranjal.png',
      contribution: 'ESP32 firmware development, analog sensor calibration, hardware circuit prototyping, and Wi-Fi transmission.'
    },
    {
      name: 'Kritika Singh',
      role: 'Quality Research & Testing',
      initials: 'KS',
      avatarColor: 'linear-gradient(135deg, #ec4899, #be185d)',
      contribution: 'Food spoilage biochemical threshold research, reference standards verification, sample testing, and validation analytics.'
    },
    {
      name: 'Pallavi Dubey',
      role: 'Analytics & Documentation',
      initials: 'PD',
      avatarColor: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      contribution: 'Experimental documentation, technical report authoring, accuracy evaluation, and project presentation assets.'
    }
  ];

  return (
    <section className="content">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>About FoodGuard &amp; Engineering Team</h1>
          <p>Smart Multi-Parameter Food Quality Detection System · Final Year Engineering Project</p>
        </div>
        <div className="heading-actions">
          <Link to="/" className="btn btn-primary">
            Open Dashboard →
          </Link>
        </div>
      </div>

      {/* Project Mission Hero */}
      <div className="about-hero-card">
        <div className="about-hero-text">
          <span className="badge badge-emerald" style={{ marginBottom: '12px', display: 'inline-block' }}>
            Final Year Engineering Capstone
          </span>
          <h2>Revolutionizing Food Safety with IoT &amp; Multi-Sensor Telemetry</h2>
          <p>
            FoodGuard is an advanced, automated food quality assessment and spoilage detection platform designed to eliminate reliance on subjective sensory checks. 
            By interfacing precision physicochemical sensors (analog pH, MQ-135 volatile organic gas detector, cold-chain temperature, humidity, and TDS solids) with an ESP32 microcontroller, 
            FoodGuard delivers real-time quality score verdicts, instant contamination alerts, and historical safety auditing.
          </p>
          <div className="hero-highlights">
            <div className="highlight-chip">⚡ Real-Time IoT Telemetry</div>
            <div className="highlight-chip">🔬 Multi-Parameter Rule Engine</div>
            <div className="highlight-chip">☁ MQ-135 Volatile Gas Sensing</div>
            <div className="highlight-chip">📷 Optical Sample Inspection</div>
          </div>
        </div>
      </div>

      {/* Lead Developers Section */}
      <div className="section-title-wrap">
        <span className="section-badge">CORE DEVELOPERS</span>
        <h2>System Architects &amp; Lead Engineers</h2>
        <p className="text-muted">The core software and hardware developers behind the FoodGuard platform architecture.</p>
      </div>

      <div className="developers-grid">
        {developers.map(dev => (
          <section className="card dev-card" key={dev.name}>
            <div className="dev-photo-wrap">
              <img src={dev.photo} alt={dev.name} className="dev-photo" />
              <span className="dev-verified-badge" title="Lead Developer">★</span>
            </div>
            <div className="dev-details">
              <span className="dev-badge-role">{dev.badgeRole}</span>
              <h3 className="dev-name">{dev.name}</h3>
              <p className="dev-role">{dev.role}</p>
              <p className="dev-bio">{dev.bio}</p>
              <div className="dev-skills">
                {dev.skills.map(s => (
                  <span className="skill-tag" key={s}>{s}</span>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Complete Project Team Section */}
      <div className="section-title-wrap" style={{ marginTop: '40px' }}>
        <span className="section-badge">PROJECT TEAM</span>
        <h2>Final Year Project Members</h2>
        <p className="text-muted">Dedicated engineering students collaborating on research, implementation, and quality verification.</p>
      </div>

      <div className="team-grid">
        {teamMembers.map(m => (
          <div className="card team-member-card" key={m.name}>
            <div className="member-header">
              {m.photo ? (
                <img src={m.photo} alt={m.name} className="member-photo" />
              ) : (
                <div className="member-avatar" style={{ background: m.avatarColor }}>
                  {m.initials}
                </div>
              )}
              <div>
                <h4>{m.name}</h4>
                <span className="member-tag">{m.role}</span>
              </div>
            </div>
            <p className="member-contribution">{m.contribution}</p>
          </div>
        ))}
      </div>

      {/* System Architecture & Technical Specifications */}
      <div className="grid mid-grid" style={{ marginTop: '40px' }}>
        <section className="card">
          <div className="card-header">
            <div className="card-title">
              <span>🔌</span>
              <b>Hardware Stack &amp; Sensors</b>
            </div>
            <span className="badge badge-emerald">Edge IoT</span>
          </div>
          <div className="tech-spec-list">
            <div className="spec-item">
              <b>ESP32 Microcontroller:</b>
              <span>Dual-core 240MHz Tensilica Xtensa, integrated 802.11 b/g/n Wi-Fi &amp; Bluetooth, 12-bit ADC channels.</span>
            </div>
            <div className="spec-item">
              <b>MQ-135 Gas Sensor:</b>
              <span>Semiconductor gas sensor sensitive to Ammonia (NH3), NOx, alcohol, benzene, smoke, and CO2 emitted during microbial degradation.</span>
            </div>
            <div className="spec-item">
              <b>Precision pH Probe:</b>
              <span>Electrochemical glass electrode measuring hydrogen-ion activity (0–14 pH) to detect lactic acidification or alkaline deterioration.</span>
            </div>
            <div className="spec-item">
              <b>DS18B20 / DHT11 Sensors:</b>
              <span>Precision digital temperature and relative humidity sensing for cold chain monitoring.</span>
            </div>
            <div className="spec-item">
              <b>TDS &amp; Turbidity Sensor:</b>
              <span>Conductivity and optical light scattering measurement for liquid purity verification.</span>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">
              <span>💻</span>
              <b>Software Architecture</b>
            </div>
            <span className="badge badge-subtle">MVC Framework</span>
          </div>
          <div className="tech-spec-list">
            <div className="spec-item">
              <b>Backend Engine:</b>
              <span>Node.js &amp; Express 5 implementing clean Model-View-Controller (MVC) separation of concerns.</span>
            </div>
            <div className="spec-item">
              <b>View Layer:</b>
              <span>Modern React.js component architecture with client-side routing and instant reactive state reconciliation.</span>
            </div>
            <div className="spec-item">
              <b>Visual Analytics:</b>
              <span>Chart.js 4 powering multi-axis trend analytics, donut classification splits, and correlation graphs.</span>
            </div>
            <div className="spec-item">
              <b>Audio &amp; Vision APIs:</b>
              <span>Web Audio API for synthesized local buzzer alarms and HTML5 MediaDevices for webcam sample inspection.</span>
            </div>
            <div className="spec-item">
              <b>Data Persistence:</b>
              <span>Atomic JSON datastores with automated 20-day rolling window data retention and CSV export streaming.</span>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
