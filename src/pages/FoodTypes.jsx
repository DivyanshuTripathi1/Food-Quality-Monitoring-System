import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function FoodTypes() {
  const { foods, setFoods, fetchFoods, showToast } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null);

  const [addForm, setAddForm] = useState({
    key: '',
    name: '',
    icon: '🐟',
    color: '#3498db',
    phMin: 6.0,
    phMax: 6.8,
    gasMax: 180,
    tempMax: 4.0,
    humidityMin: 50,
    humidityMax: 80,
    tdsMax: 6.0,
    expectedColor: 'Fresh / Translucent',
    description: ''
  });

  const [editForm, setEditForm] = useState({
    key: '',
    name: '',
    icon: '',
    phMin: '',
    phMax: '',
    gasMax: '',
    tempMax: '',
    humidityMin: '',
    humidityMax: '',
    tdsMax: '',
    expectedColor: '',
    description: ''
  });

  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => setIsAddModalOpen(false);

  const openEditModal = (food) => {
    setEditingFood(food);
    setEditForm({
      key: food.key,
      name: food.name,
      icon: food.icon,
      phMin: food.phMin,
      phMax: food.phMax,
      gasMax: food.gasMax,
      tempMax: food.tempMax,
      humidityMin: food.humidityMin,
      humidityMax: food.humidityMax,
      tdsMax: food.tdsMax,
      expectedColor: food.expectedColor || '',
      description: food.description || ''
    });
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingFood(null);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...addForm,
        phMin: parseFloat(addForm.phMin),
        phMax: parseFloat(addForm.phMax),
        gasMax: parseInt(addForm.gasMax, 10),
        tempMax: parseFloat(addForm.tempMax),
        humidityMin: parseInt(addForm.humidityMin, 10),
        humidityMax: parseInt(addForm.humidityMax, 10),
        tdsMax: parseFloat(addForm.tdsMax)
      };

      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Food profile '${json.data.name}' added`, 'success');
        closeAddModal();
        fetchFoods();
      } else {
        showToast(json.message || 'Error creating profile', 'error');
      }
    } catch (err) {
      showToast('Failed to add profile', 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: editForm.name,
        icon: editForm.icon,
        phMin: parseFloat(editForm.phMin),
        phMax: parseFloat(editForm.phMax),
        gasMax: parseInt(editForm.gasMax, 10),
        tempMax: parseFloat(editForm.tempMax),
        humidityMin: parseInt(editForm.humidityMin, 10),
        humidityMax: parseInt(editForm.humidityMax, 10),
        tdsMax: parseFloat(editForm.tdsMax),
        expectedColor: editForm.expectedColor,
        description: editForm.description
      };

      const res = await fetch(`/api/foods/${editForm.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Thresholds updated for ${json.data.name}`, 'success');
        closeEditModal();
        fetchFoods();
      } else {
        showToast(json.message || 'Update failed', 'error');
      }
    } catch (err) {
      showToast('Failed to update thresholds', 'error');
    }
  };

  const deleteFoodProfile = async (key, name) => {
    if (!window.confirm(`Are you sure you want to delete '${name}' food profile?`)) return;
    try {
      const res = await fetch(`/api/foods/${key}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast(`Food profile '${name}' deleted`, 'info');
        setFoods(prev => prev.filter(f => f.key !== key));
      } else {
        showToast(json.message || 'Cannot delete profile', 'error');
      }
    } catch (e) {
      showToast('Error deleting profile', 'error');
    }
  };

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <h1>Food Types &amp; Safety Thresholds</h1>
          <p>
            Configured sensor thresholds, physicochemical tolerances, and evaluation parameters for each food category.
          </p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            ＋ Add New Food Profile
          </button>
        </div>
      </div>

      {/* Food Profiles Grid */}
      <div className="food-profiles-grid">
        {(foods || []).map(f => (
          <section
            key={f.key}
            className="card food-profile-card"
            id={`card-${f.key}`}
            style={{ borderTop: `4px solid ${f.color || '#2d9cdb'}` }}
          >
            <div className="food-card-header">
              <span className="food-profile-icon">{f.icon}</span>
              <div className="food-profile-title">
                <h2>{f.name}</h2>
                <span className="food-key-badge">ID: <code>{f.key}</code></span>
              </div>
              {!['milk', 'water'].includes(f.key) && (
                <button
                  className="btn-icon-danger"
                  onClick={() => deleteFoodProfile(f.key, f.name)}
                  title="Delete this food profile"
                >
                  🗑️
                </button>
              )}
            </div>

            <p className="food-profile-desc">{f.description}</p>

            <div className="thresholds-list">
              <div className="threshold-row">
                <span className="t-label">💧 Safe pH Range:</span>
                <b className="t-value">
                  {f.phMin} – {f.phMax} <small>(opt: {f.phOpt || f.phMin})</small>
                </b>
              </div>
              <div className="threshold-row">
                <span className="t-label">☁ MQ135 Gas Limit:</span>
                <b className="t-value">&lt; {f.gasMax} ppm</b>
              </div>
              <div className="threshold-row">
                <span className="t-label">♨ Cold Storage Max:</span>
                <b className="t-value">≤ {f.tempMax} °C</b>
              </div>
              <div className="threshold-row">
                <span className="t-label">💧 Humidity Range:</span>
                <b className="t-value">{f.humidityMin} – {f.humidityMax}%</b>
              </div>
              <div className="threshold-row">
                <span className="t-label">◉ TDS / Turbidity:</span>
                <b className="t-value">
                  TDS ≤ {f.tdsMax} | &lt; {f.turbidityMax || 5} NTU
                </b>
              </div>
              <div className="threshold-row">
                <span className="t-label">👁 Expected Color:</span>
                <b className="t-value">{f.expectedColor || 'Normal'}</b>
              </div>
            </div>

            <div className="food-card-actions">
              <Link to={`/?food=${f.key}`} className="btn btn-sm btn-outline">
                Monitor on Dashboard →
              </Link>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => openEditModal(f)}
              >
                ✏️ Edit Limits
              </button>
            </div>
          </section>
        ))}
      </div>

      {/* Add Food Profile Modal */}
      {isAddModalOpen && (
        <div id="addFoodModal" className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3>＋ Add New Food Profile</h3>
              <button className="modal-close" onClick={closeAddModal}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="newFoodKey">Unique Key (slug)</label>
                    <input
                      type="text"
                      id="newFoodKey"
                      name="key"
                      placeholder="e.g. fish, juice, cheese"
                      value={addForm.key}
                      onChange={(e) => setAddForm(prev => ({ ...prev, key: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodName">Display Name</label>
                    <input
                      type="text"
                      id="newFoodName"
                      name="name"
                      placeholder="e.g. Fresh Fish"
                      value={addForm.name}
                      onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodIcon">Emoji Icon</label>
                    <input
                      type="text"
                      id="newFoodIcon"
                      name="icon"
                      value={addForm.icon}
                      onChange={(e) => setAddForm(prev => ({ ...prev, icon: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodColor">Accent Color</label>
                    <input
                      type="color"
                      id="newFoodColor"
                      name="color"
                      value={addForm.color}
                      onChange={(e) => setAddForm(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodPhMin">Min pH</label>
                    <input
                      type="number"
                      id="newFoodPhMin"
                      name="phMin"
                      step="0.1"
                      value={addForm.phMin}
                      onChange={(e) => setAddForm(prev => ({ ...prev, phMin: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodPhMax">Max pH</label>
                    <input
                      type="number"
                      id="newFoodPhMax"
                      name="phMax"
                      step="0.1"
                      value={addForm.phMax}
                      onChange={(e) => setAddForm(prev => ({ ...prev, phMax: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodGasMax">Max MQ135 Gas (ppm)</label>
                    <input
                      type="number"
                      id="newFoodGasMax"
                      name="gasMax"
                      value={addForm.gasMax}
                      onChange={(e) => setAddForm(prev => ({ ...prev, gasMax: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodTempMax">Max Storage Temp (°C)</label>
                    <input
                      type="number"
                      id="newFoodTempMax"
                      name="tempMax"
                      step="0.1"
                      value={addForm.tempMax}
                      onChange={(e) => setAddForm(prev => ({ ...prev, tempMax: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodHumidityMin">Min Humidity (%)</label>
                    <input
                      type="number"
                      id="newFoodHumidityMin"
                      name="humidityMin"
                      value={addForm.humidityMin}
                      onChange={(e) => setAddForm(prev => ({ ...prev, humidityMin: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodHumidityMax">Max Humidity (%)</label>
                    <input
                      type="number"
                      id="newFoodHumidityMax"
                      name="humidityMax"
                      value={addForm.humidityMax}
                      onChange={(e) => setAddForm(prev => ({ ...prev, humidityMax: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodTdsMax">Max TDS</label>
                    <input
                      type="number"
                      id="newFoodTdsMax"
                      name="tdsMax"
                      step="0.1"
                      value={addForm.tdsMax}
                      onChange={(e) => setAddForm(prev => ({ ...prev, tdsMax: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newFoodColorDesc">Expected Appearance</label>
                    <input
                      type="text"
                      id="newFoodColorDesc"
                      name="expectedColor"
                      value={addForm.expectedColor}
                      onChange={(e) => setAddForm(prev => ({ ...prev, expectedColor: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="newFoodDesc">Description &amp; Spoilage Characteristics</label>
                    <textarea
                      id="newFoodDesc"
                      name="description"
                      rows="2"
                      placeholder="Sensory notes and cold chain requirements..."
                      value={addForm.description}
                      onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeAddModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Food Profile Modal */}
      {isEditModalOpen && (
        <div id="editFoodModal" className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 id="editModalTitle">✏️ Edit Food Thresholds ({editForm.name})</h3>
              <button className="modal-close" onClick={closeEditModal}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <input type="hidden" id="editFoodKey" name="key" value={editForm.key} />
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="editFoodName">Display Name</label>
                    <input
                      type="text"
                      id="editFoodName"
                      name="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editFoodIcon">Emoji Icon</label>
                    <input
                      type="text"
                      id="editFoodIcon"
                      name="icon"
                      value={editForm.icon}
                      onChange={(e) => setEditForm(prev => ({ ...prev, icon: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editFoodPhMin">Min pH</label>
                    <input
                      type="number"
                      id="editFoodPhMin"
                      name="phMin"
                      step="0.05"
                      value={editForm.phMin}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phMin: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editFoodPhMax">Max pH</label>
                    <input
                      type="number"
                      id="editFoodPhMax"
                      name="phMax"
                      step="0.05"
                      value={editForm.phMax}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phMax: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editFoodGasMax">Max MQ135 Gas (ppm)</label>
                    <input
                      type="number"
                      id="editFoodGasMax"
                      name="gasMax"
                      value={editForm.gasMax}
                      onChange={(e) => setEditForm(prev => ({ ...prev, gasMax: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editFoodTempMax">Max Storage Temp (°C)</label>
                    <input
                      type="number"
                      id="editFoodTempMax"
                      name="tempMax"
                      step="0.1"
                      value={editForm.tempMax}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tempMax: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editFoodHumidityMin">Min Humidity (%)</label>
                    <input
                      type="number"
                      id="editFoodHumidityMin"
                      name="humidityMin"
                      value={editForm.humidityMin}
                      onChange={(e) => setEditForm(prev => ({ ...prev, humidityMin: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editFoodHumidityMax">Max Humidity (%)</label>
                    <input
                      type="number"
                      id="editFoodHumidityMax"
                      name="humidityMax"
                      value={editForm.humidityMax}
                      onChange={(e) => setEditForm(prev => ({ ...prev, humidityMax: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editFoodTdsMax">Max TDS</label>
                    <input
                      type="number"
                      id="editFoodTdsMax"
                      name="tdsMax"
                      step="0.1"
                      value={editForm.tdsMax}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tdsMax: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editFoodColorDesc">Expected Appearance</label>
                    <input
                      type="text"
                      id="editFoodColorDesc"
                      name="expectedColor"
                      value={editForm.expectedColor}
                      onChange={(e) => setEditForm(prev => ({ ...prev, expectedColor: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="editFoodDesc">Description &amp; Spoilage Characteristics</label>
                    <textarea
                      id="editFoodDesc"
                      name="description"
                      rows="2"
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Thresholds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
