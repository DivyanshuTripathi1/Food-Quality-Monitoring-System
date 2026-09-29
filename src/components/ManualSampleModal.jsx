import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function ManualSampleModal({ onSampleEvaluated }) {
  const { isManualModalOpen, closeManualModal, foods, showToast, selectedFood } = useApp();

  const [formData, setFormData] = useState({
    foodType: selectedFood || 'milk',
    ph: 6.65,
    gas: 110,
    temperature: 5.5,
    humidity: 62,
    tds: 4.8,
    color: 'Normal',
    weight: 250
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isManualModalOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        foodType: formData.foodType,
        ph: parseFloat(formData.ph),
        gas: parseInt(formData.gas, 10),
        temperature: parseFloat(formData.temperature),
        humidity: parseInt(formData.humidity, 10),
        tds: parseFloat(formData.tds),
        color: formData.color,
        weight: parseInt(formData.weight, 10),
        source: 'MANUAL_TEST'
      };

      const res = await fetch('/api/sensor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        closeManualModal();
        showToast(
          `Sample evaluated: ${json.data.status} (Score: ${json.data.qualityScore}/100)`,
          json.data.status === 'FRESH' ? 'success' : 'warning'
        );
        if (onSampleEvaluated) {
          onSampleEvaluated(json.data);
        }
      } else {
        showToast(json.message || 'Error evaluating sample', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error evaluating sample', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="manualSampleModal" className="modal-backdrop" style={{ display: 'flex' }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>🔬 Manual Food Sample Test</h3>
          <button className="modal-close" onClick={closeManualModal}>✕</button>
        </div>
        <form id="manualSampleForm" onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="modal-desc">
              Enter custom sensor readings to test instant quality evaluation and classification.
            </p>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="modalFoodType">Food Type</label>
                <select
                  id="modalFoodType"
                  name="foodType"
                  value={formData.foodType}
                  onChange={handleChange}
                  required
                >
                  {(foods || []).map(f => (
                    <option key={f.key} value={f.key}>
                      {f.icon} {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="modalPh">pH Level (0 – 14)</label>
                <input
                  type="number"
                  id="modalPh"
                  name="ph"
                  step="0.01"
                  min="0"
                  max="14"
                  value={formData.ph}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modalGas">MQ135 Gas (ppm)</label>
                <input
                  type="number"
                  id="modalGas"
                  name="gas"
                  min="10"
                  max="1000"
                  value={formData.gas}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modalTemp">Temperature (°C)</label>
                <input
                  type="number"
                  id="modalTemp"
                  name="temperature"
                  step="0.1"
                  min="-10"
                  max="80"
                  value={formData.temperature}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modalHumidity">Humidity (%)</label>
                <input
                  type="number"
                  id="modalHumidity"
                  name="humidity"
                  min="0"
                  max="100"
                  value={formData.humidity}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modalTds">TDS</label>
                <input
                  type="number"
                  id="modalTds"
                  name="tds"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.tds}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="modalColor">Visual Color / Appearance</label>
                <select
                  id="modalColor"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                >
                  <option value="Normal">Normal / Expected Color</option>
                  <option value="Slight Yellow">Slight Yellow / Tinted</option>
                  <option value="Discolored">Discolored / Darkened</option>
                  <option value="Turbid / Murky">Turbid / Murky</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="modalWeight">Sample Weight (grams)</label>
                <input
                  type="number"
                  id="modalWeight"
                  name="weight"
                  min="1"
                  max="5000"
                  value={formData.weight}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeManualModal}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Evaluating...' : '🧪 Evaluate Sample'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
